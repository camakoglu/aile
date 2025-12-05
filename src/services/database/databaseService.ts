import { getSupabaseClient } from './supabaseClient';
import type { FamilyData, Member } from '../../types/types';

/**
 * Database service for fetching and manipulating family tree data
 */
export class DatabaseService {
  /**
   * Fetch all family tree data from Supabase
   * Returns data in the same format as the Google Sheets loader
   */
  async fetchFamilyData(): Promise<FamilyData | null> {
    const client = getSupabaseClient();
    if (!client) {
      console.warn('Supabase client not available');
      return null;
    }

    try {
      // Fetch all members
      const { data: membersData, error: membersError } = await client
        .from('members')
        .select('*')
        .order('id', { ascending: true });

      if (membersError) {
        console.error('Error fetching members:', membersError);
        return null;
      }

      // Fetch all unions
      const { data: unionsData, error: unionsError } = await client
        .from('unions')
        .select('*');

      if (unionsError) {
        console.error('Error fetching unions:', unionsError);
        return null;
      }

      // Fetch all relationships
      const { data: relationshipsData, error: relationshipsError } = await client
        .from('relationships')
        .select('*');

      if (relationshipsError) {
        console.error('Error fetching relationships:', relationshipsError);
        return null;
      }

      // Convert database format to FamilyData format
      return this.convertToFamilyData(membersData || [], unionsData || [], relationshipsData || []);
    } catch (error) {
      console.error('Error in fetchFamilyData:', error);
      return null;
    }
  }

  /**
   * Convert database records to FamilyData format
   */
  private convertToFamilyData(
    members: any[],
    unions: any[],
    relationships: any[]
  ): FamilyData {
    const familyData: FamilyData = {
      start: '',
      members: {},
      links: [],
    };

    // Convert members
    for (const dbMember of members) {
      const memberId = `mem_${dbMember.id}`;
      familyData.members[memberId] = {
        id: memberId,
        name: dbMember.name,
        first_name: dbMember.first_name || '',
        last_name: dbMember.last_name || '',
        birth_date: dbMember.birth_date || undefined,
        death_date: dbMember.death_date || undefined,
        birth_place: dbMember.birth_place || undefined,
        death_place: dbMember.death_place || undefined,
        gender: dbMember.gender,
        gen: dbMember.gen || undefined,
        is_spouse: dbMember.is_spouse,
        occupation: dbMember.occupation || undefined,
        marriage: dbMember.marriage || undefined,
        note: dbMember.note || undefined,
        image_path: dbMember.image_path || undefined,
        row_index: dbMember.id, // Use database ID as row_index
      };
    }

    // Create union nodes and links
    const unionMap = new Map<number, string>(); // Maps union DB id to union node id
    for (const union of unions) {
      const unionId = `u_${union.partner1_id}_${union.partner2_id}`;
      unionMap.set(union.id, unionId);

      // Link both partners to union
      if (union.partner1_id) {
        familyData.links.push([`mem_${union.partner1_id}`, unionId]);
      }
      if (union.partner2_id) {
        familyData.links.push([`mem_${union.partner2_id}`, unionId]);
      }
    }

    // Create relationship links
    for (const rel of relationships) {
      if (!rel.parent_id || !rel.child_id) continue;

      // Find the union that this parent belongs to
      const parentUnion = unions.find(
        u => u.partner1_id === rel.parent_id || u.partner2_id === rel.parent_id
      );

      if (parentUnion) {
        const unionId = unionMap.get(parentUnion.id);
        if (unionId) {
          familyData.links.push([unionId, `mem_${rel.child_id}`]);
        }
      } else {
        // If no union found, create a single-parent union
        const unionId = `u_${rel.parent_id}_0`;
        familyData.links.push([`mem_${rel.parent_id}`, unionId]);
        familyData.links.push([unionId, `mem_${rel.child_id}`]);
      }
    }

    // Find the root node (lowest generation number, or first member)
    const membersArray = Object.values(familyData.members);
    if (membersArray.length > 0) {
      const rootMember = membersArray.reduce((prev, curr) => {
        const prevGen = prev.gen ?? Infinity;
        const currGen = curr.gen ?? Infinity;
        return currGen < prevGen ? curr : prev;
      });
      familyData.start = rootMember.id;
    }

    return familyData;
  }

  /**
   * Add a new member to the database
   */
  async addMember(member: Omit<Member, 'id' | 'row_index'>): Promise<string | null> {
    const client = getSupabaseClient();
    if (!client) return null;

    try {
      const { data, error } = await client
        .from('members')
        .insert({
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
        })
        .select()
        .single();

      if (error) {
        console.error('Error adding member:', error);
        return null;
      }

      return `mem_${data.id}`;
    } catch (error) {
      console.error('Error in addMember:', error);
      return null;
    }
  }

  /**
   * Update an existing member
   */
  async updateMember(memberId: string, updates: Partial<Member>): Promise<boolean> {
    const client = getSupabaseClient();
    if (!client) return false;

    // Extract numeric ID from mem_123 format
    const numericId = parseInt(memberId.replace('mem_', ''));
    if (isNaN(numericId)) return false;

    try {
      const { error } = await client
        .from('members')
        .update({
          name: updates.name,
          first_name: updates.first_name || null,
          last_name: updates.last_name || null,
          birth_date: updates.birth_date || null,
          death_date: updates.death_date || null,
          birth_place: updates.birth_place || null,
          death_place: updates.death_place || null,
          gender: updates.gender,
          gen: updates.gen || null,
          is_spouse: updates.is_spouse,
          occupation: updates.occupation || null,
          marriage: updates.marriage || null,
          note: updates.note || null,
          image_path: updates.image_path || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', numericId);

      if (error) {
        console.error('Error updating member:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in updateMember:', error);
      return false;
    }
  }

  /**
   * Delete a member from the database
   */
  async deleteMember(memberId: string): Promise<boolean> {
    const client = getSupabaseClient();
    if (!client) return false;

    const numericId = parseInt(memberId.replace('mem_', ''));
    if (isNaN(numericId)) return false;

    try {
      const { error } = await client.from('members').delete().eq('id', numericId);

      if (error) {
        console.error('Error deleting member:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in deleteMember:', error);
      return false;
    }
  }

  /**
   * Add a relationship between parent and child
   */
  async addRelationship(
    parentId: string,
    childId: string,
    relationshipType: string = 'biological'
  ): Promise<boolean> {
    const client = getSupabaseClient();
    if (!client) return false;

    const parentNumericId = parseInt(parentId.replace('mem_', ''));
    const childNumericId = parseInt(childId.replace('mem_', ''));

    if (isNaN(parentNumericId) || isNaN(childNumericId)) return false;

    try {
      const { error } = await client.from('relationships').insert({
        parent_id: parentNumericId,
        child_id: childNumericId,
        relationship_type: relationshipType,
      });

      if (error) {
        console.error('Error adding relationship:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in addRelationship:', error);
      return false;
    }
  }

  /**
   * Add a union between two partners
   */
  async addUnion(
    partner1Id: string,
    partner2Id: string,
    marriageDate?: string
  ): Promise<boolean> {
    const client = getSupabaseClient();
    if (!client) return false;

    const partner1NumericId = parseInt(partner1Id.replace('mem_', ''));
    const partner2NumericId = parseInt(partner2Id.replace('mem_', ''));

    if (isNaN(partner1NumericId) || isNaN(partner2NumericId)) return false;

    try {
      const { error } = await client.from('unions').insert({
        partner1_id: partner1NumericId,
        partner2_id: partner2NumericId,
        marriage_date: marriageDate || null,
      });

      if (error) {
        console.error('Error adding union:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in addUnion:', error);
      return false;
    }
  }
}

// Export singleton instance
export const databaseService = new DatabaseService();
