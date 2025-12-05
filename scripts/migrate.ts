/**
 * Migration script to convert Google Sheets data to Supabase
 *
 * Usage:
 *   npm run migrate          - Migrate from Google Sheets URL in .env
 *   npm run migrate -- --dry-run  - Preview SQL without executing
 *   npm run migrate -- --sql-only - Output SQL file only
 */

import { loadFromGoogleSheet } from '../src/services/data/sheetLoader';
import { getSupabaseClient } from '../src/services/database/supabaseClient';
import { FamilyData, Member } from '../src/types/types';
import * as fs from 'fs';
import * as path from 'path';

// Parse command line arguments
const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const isSqlOnly = args.includes('--sql-only');

interface UnionRecord {
  partner1_id: number;
  partner2_id: number;
  marriage_date: string | null;
}

interface RelationshipRecord {
  parent_id: number;
  child_id: number;
  relationship_type: string;
}

async function migrate() {
  console.log('🚀 Starting migration from Google Sheets to Supabase...\n');

  // Load Google Sheets URL from environment
  const googleSheetUrl = process.env.VITE_GOOGLE_SHEET_CSV_URL;
  if (!googleSheetUrl) {
    console.error('❌ Error: VITE_GOOGLE_SHEET_CSV_URL not set in .env file');
    process.exit(1);
  }

  // Load data from Google Sheets
  console.log('📥 Loading data from Google Sheets...');
  let data: FamilyData;
  try {
    data = await loadFromGoogleSheet(googleSheetUrl);
    console.log(`✅ Loaded ${Object.keys(data.members).length} members\n`);
  } catch (error) {
    console.error('❌ Failed to load Google Sheets data:', error);
    process.exit(1);
  }

  // Convert to SQL format
  console.log('🔄 Converting to SQL format...');
  const { membersSql, unionsSql, relationshipsSql } = generateSQL(data);

  // Output SQL to file if requested
  if (isSqlOnly || isDryRun) {
    const outputPath = path.join(process.cwd(), 'migration.sql');
    const fullSql = `-- Migration from Google Sheets to Supabase
-- Generated at: ${new Date().toISOString()}

-- Clear existing data (optional - remove if you want to preserve data)
-- TRUNCATE members, unions, relationships CASCADE;

-- Insert members
${membersSql}

-- Insert unions
${unionsSql}

-- Insert relationships
${relationshipsSql}

-- Verify counts
SELECT 'members' as table_name, COUNT(*) as count FROM members
UNION ALL
SELECT 'unions', COUNT(*) FROM unions
UNION ALL
SELECT 'relationships', COUNT(*) FROM relationships;
`;

    fs.writeFileSync(outputPath, fullSql, 'utf-8');
    console.log(`✅ SQL written to: ${outputPath}\n`);

    if (isDryRun) {
      console.log('📋 Dry run mode - SQL file generated but not executed');
      console.log('To execute, run without --dry-run flag\n');
      return;
    }

    if (isSqlOnly) {
      console.log('✅ SQL-only mode - file generated successfully');
      console.log('Import this file manually in Supabase SQL Editor\n');
      return;
    }
  }

  // Execute migration to Supabase
  console.log('📤 Migrating data to Supabase...');
  const client = getSupabaseClient();

  if (!client) {
    console.error('❌ Error: Supabase client not configured');
    console.error('Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env file');
    process.exit(1);
  }

  try {
    // Clear existing data (optional - comment out if you want to preserve)
    console.log('🗑️  Clearing existing data...');
    await client.from('relationships').delete().neq('id', 0);
    await client.from('unions').delete().neq('id', 0);
    await client.from('members').delete().neq('id', 0);

    // Insert members
    console.log('👥 Inserting members...');
    const membersData = convertMembersToSupabase(data);
    const { error: membersError } = await client.from('members').insert(membersData);
    if (membersError) {
      console.error('❌ Error inserting members:', membersError);
      throw membersError;
    }
    console.log(`✅ Inserted ${membersData.length} members`);

    // Get inserted member IDs (we need to fetch them since IDs are auto-generated)
    const { data: insertedMembers, error: fetchError } = await client
      .from('members')
      .select('id, name, gen')
      .order('id', { ascending: true });

    if (fetchError || !insertedMembers) {
      console.error('❌ Error fetching inserted members:', fetchError);
      throw fetchError;
    }

    // Create ID mapping (old mem_X ID → new database ID)
    const idMap = new Map<string, number>();
    const membersList = Object.values(data.members);
    membersList.forEach((member, index) => {
      if (insertedMembers[index]) {
        idMap.set(member.id, insertedMembers[index].id);
      }
    });

    // Insert unions
    console.log('💍 Inserting unions...');
    const unionsData = extractUnions(data, idMap);
    if (unionsData.length > 0) {
      const { error: unionsError } = await client.from('unions').insert(unionsData);
      if (unionsError) {
        console.error('❌ Error inserting unions:', unionsError);
        throw unionsError;
      }
      console.log(`✅ Inserted ${unionsData.length} unions`);
    } else {
      console.log('ℹ️  No unions to insert');
    }

    // Insert relationships
    console.log('👨‍👩‍👧‍👦 Inserting relationships...');
    const relationshipsData = extractRelationships(data, idMap);
    if (relationshipsData.length > 0) {
      const { error: relationshipsError } = await client
        .from('relationships')
        .insert(relationshipsData);
      if (relationshipsError) {
        console.error('❌ Error inserting relationships:', relationshipsError);
        throw relationshipsError;
      }
      console.log(`✅ Inserted ${relationshipsData.length} relationships`);
    } else {
      console.log('ℹ️  No relationships to insert');
    }

    console.log('\n✅ Migration completed successfully!');
    console.log('\n📊 Summary:');
    console.log(`   Members: ${membersData.length}`);
    console.log(`   Unions: ${unionsData.length}`);
    console.log(`   Relationships: ${relationshipsData.length}`);
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  }
}

function convertMembersToSupabase(data: FamilyData) {
  return Object.values(data.members).map((member) => ({
    name: member.name,
    first_name: member.first_name || null,
    last_name: member.last_name || null,
    birth_date: member.birth_date || null,
    death_date: member.death_date || null,
    birth_place: member.birth_place || null,
    death_place: member.death_place || null,
    gender: member.gender,
    gen: member.gen || null,
    is_spouse: member.is_spouse,
    occupation: member.occupation || null,
    marriage: member.marriage || null,
    note: member.note || null,
    image_path: member.image_path || null,
  }));
}

function extractUnions(data: FamilyData, idMap: Map<string, number>): UnionRecord[] {
  const unions: UnionRecord[] = [];
  const processedPairs = new Set<string>();

  for (const link of data.links) {
    const [from, to] = link;

    // Union links: member -> union
    if (!from.startsWith('u_') && to.startsWith('u_')) {
      // Parse union ID: u_X_Y where X and Y are member IDs
      const unionMatch = to.match(/u_(\w+)_(\w+)/);
      if (!unionMatch) continue;

      const partner1Id = `mem_${unionMatch[1]}`;
      const partner2Id = `mem_${unionMatch[2]}`;

      // Skip if partner2 is 0 (single parent union)
      if (partner2Id === 'mem_0') continue;

      // Create unique key for this pair (sorted to avoid duplicates)
      const pairKey = [partner1Id, partner2Id].sort().join('_');
      if (processedPairs.has(pairKey)) continue;
      processedPairs.add(pairKey);

      const dbId1 = idMap.get(partner1Id);
      const dbId2 = idMap.get(partner2Id);

      if (dbId1 && dbId2) {
        const member1 = data.members[partner1Id];
        const member2 = data.members[partner2Id];

        unions.push({
          partner1_id: dbId1,
          partner2_id: dbId2,
          marriage_date: member1?.marriage || member2?.marriage || null,
        });
      }
    }
  }

  return unions;
}

function extractRelationships(
  data: FamilyData,
  idMap: Map<string, number>
): RelationshipRecord[] {
  const relationships: RelationshipRecord[] = [];
  const processedPairs = new Set<string>();

  for (const link of data.links) {
    const [from, to] = link;

    // Relationship links: union -> member (child)
    if (from.startsWith('u_') && !to.startsWith('u_')) {
      // Parse union ID to get parent IDs
      const unionMatch = from.match(/u_(\w+)_(\w+)/);
      if (!unionMatch) continue;

      const partner1Id = `mem_${unionMatch[1]}`;
      const partner2Id = `mem_${unionMatch[2]}`;
      const childId = to;

      const dbParent1Id = idMap.get(partner1Id);
      const dbChildId = idMap.get(childId);

      if (dbParent1Id && dbChildId) {
        const pairKey = `${dbParent1Id}_${dbChildId}`;
        if (!processedPairs.has(pairKey)) {
          processedPairs.add(pairKey);
          relationships.push({
            parent_id: dbParent1Id,
            child_id: dbChildId,
            relationship_type: 'biological',
          });
        }
      }

      // Also add relationship for partner2 if exists
      if (partner2Id !== 'mem_0') {
        const dbParent2Id = idMap.get(partner2Id);
        if (dbParent2Id && dbChildId) {
          const pairKey = `${dbParent2Id}_${dbChildId}`;
          if (!processedPairs.has(pairKey)) {
            processedPairs.add(pairKey);
            relationships.push({
              parent_id: dbParent2Id,
              child_id: dbChildId,
              relationship_type: 'biological',
            });
          }
        }
      }
    }
  }

  return relationships;
}

function generateSQL(data: FamilyData): {
  membersSql: string;
  unionsSql: string;
  relationshipsSql: string;
} {
  const members = Object.values(data.members);

  // Generate members SQL
  const membersSql = members
    .map((member, index) => {
      const id = index + 1;
      const escape = (val: any) => {
        if (val === null || val === undefined || val === '') return 'NULL';
        return `'${String(val).replace(/'/g, "''")}'`;
      };

      return `INSERT INTO members (id, name, first_name, last_name, birth_date, death_date, birth_place, death_place, gender, gen, is_spouse, occupation, marriage, note, image_path)
VALUES (${id}, ${escape(member.name)}, ${escape(member.first_name)}, ${escape(member.last_name)}, ${escape(member.birth_date)}, ${escape(member.death_date)}, ${escape(member.birth_place)}, ${escape(member.death_place)}, ${escape(member.gender)}, ${member.gen || 'NULL'}, ${member.is_spouse}, ${escape(member.occupation)}, ${escape(member.marriage)}, ${escape(member.note)}, ${escape(member.image_path)});`;
    })
    .join('\n');

  // Create ID mapping for SQL generation
  const idMap = new Map<string, number>();
  members.forEach((member, index) => {
    idMap.set(member.id, index + 1);
  });

  // Generate unions SQL
  const unions = extractUnions(data, idMap);
  const unionsSql =
    unions.length > 0
      ? unions
          .map(
            (u) =>
              `INSERT INTO unions (partner1_id, partner2_id, marriage_date) VALUES (${u.partner1_id}, ${u.partner2_id}, ${u.marriage_date ? `'${u.marriage_date}'` : 'NULL'});`
          )
          .join('\n')
      : '-- No unions to insert';

  // Generate relationships SQL
  const relationships = extractRelationships(data, idMap);
  const relationshipsSql =
    relationships.length > 0
      ? relationships
          .map(
            (r) =>
              `INSERT INTO relationships (parent_id, child_id, relationship_type) VALUES (${r.parent_id}, ${r.child_id}, '${r.relationship_type}');`
          )
          .join('\n')
      : '-- No relationships to insert';

  return { membersSql, unionsSql, relationshipsSql };
}

// Run migration
migrate().catch((error) => {
  console.error('Unhandled error:', error);
  process.exit(1);
});
