import type { FamilyData, Member } from '../types/types';
import { generateFamilyColor } from './colorGenerator';

/**
 * Represents a family tree branch
 */
export interface Family {
  id: string;              // "family_mem_1"
  name: string;            // "Family of Yılmaz"
  color: string;           // "#8B5CF6"
  rootMemberId: string;    // "mem_1"
  memberCount: number;     // 12
}

/**
 * Result of family detection
 */
export interface FamilyDetectionResult {
  families: Family[];
  memberToFamilies: Map<string, string[]>; // member_id -> family_ids[] (single for children, multiple for spouses)
  familyColors: Map<string, string>;       // family_id -> color
  memberBirthFamily: Map<string, string>;  // member_id -> birth_family_id (patrilineal)
}

/**
 * Detect families in the family tree data
 * Each root node (person with no parents) defines a family
 *
 * @param data Family tree data
 * @returns Detected families and member-to-family mappings
 */
export function detectFamilies(data: FamilyData): FamilyDetectionResult {
  // Step 1: Find all root nodes
  const rootMemberIds = findRootNodes(data);

  if (rootMemberIds.length === 0) {
    console.warn('No root nodes found in family tree data');
    return {
      families: [],
      memberToFamilies: new Map(),
      familyColors: new Map(),
      memberBirthFamily: new Map(),
    };
  }

  // Step 2: Create families from roots (patrilineal)
  const families: Family[] = [];
  const memberToFamilies = new Map<string, string[]>();
  const memberBirthFamily = new Map<string, string>(); // Tracks birth family (patrilineal line)
  const familyMemberSets = new Map<string, Set<string>>();

  rootMemberIds.forEach((rootId, index) => {
    const rootMember = data.members[rootId];
    if (!rootMember) {
      console.warn(`Root member ${rootId} not found in members`);
      return;
    }

    const familyId = `family_${rootId}`;
    const family: Family = {
      id: familyId,
      name: getFamilyName(rootMember),
      color: generateFamilyColor(index),
      rootMemberId: rootId,
      memberCount: 0, // Will be calculated later
    };

    families.push(family);
    familyMemberSets.set(familyId, new Set());
  });

  // Step 3: Assign patrilineal descendants to families
  families.forEach(family => {
    const members = familyMemberSets.get(family.id)!;
    assignDescendantsPatrilineal(data, family.rootMemberId, family.id, members, memberBirthFamily);
  });

  // Step 4: Assign spouses - they get gradient (birth family + spouse's family)
  families.forEach(family => {
    const members = familyMemberSets.get(family.id)!;
    assignSpousesToFamilies(data, family.id, members, memberBirthFamily, memberToFamilies);
  });

  // Step 5: Complete memberToFamilies map and update member counts
  // (Spouses already have entries from Step 4, now add non-spouse members)
  families.forEach(family => {
    const members = familyMemberSets.get(family.id)!;
    family.memberCount = members.size;

    members.forEach(memberId => {
      // If member doesn't have entry yet, add their birth family
      if (!memberToFamilies.has(memberId)) {
        const birthFamilyId = memberBirthFamily.get(memberId);
        memberToFamilies.set(memberId, birthFamilyId ? [birthFamilyId] : []);
      }
    });
  });

  // Step 6: Create family colors map
  const familyColors = new Map<string, string>();
  families.forEach(family => {
    familyColors.set(family.id, family.color);
  });

  return { families, memberToFamilies, familyColors, memberBirthFamily };
}

/**
 * Find all root nodes (members with no parents)
 */
function findRootNodes(data: FamilyData): string[] {
  // Find all members who are children (appear as target of union->member link)
  const childrenSet = new Set<string>();

  data.links.forEach(([from, to]) => {
    // Union -> Member link means Member is a child
    if (from.startsWith('u_') && !to.startsWith('u_')) {
      childrenSet.add(to);
    }
  });

  // Root nodes are members who:
  // 1. Are NOT in the children set
  // 2. Are NOT marked as spouse (spouses are added to tree, not roots)
  const roots: string[] = [];

  Object.keys(data.members).forEach(memberId => {
    const member = data.members[memberId];
    if (!childrenSet.has(memberId) && !member.is_spouse) {
      roots.push(memberId);
    }
  });

  // If no roots found but we have members, use the start node as root
  if (roots.length === 0 && Object.keys(data.members).length > 0) {
    console.warn('No natural roots found, using data.start as root');
    if (data.start && data.members[data.start]) {
      roots.push(data.start);
    }
  }

  return roots;
}

/**
 * Assign all patrilineal descendants of a root to a family
 * Only follows father's lineage - children inherit father's family
 * Uses BFS to traverse the tree
 */
function assignDescendantsPatrilineal(
  data: FamilyData,
  rootMemberId: string,
  familyId: string,
  familyMembers: Set<string>,
  memberBirthFamily: Map<string, string>
): void {
  const queue: string[] = [rootMemberId];
  const visited = new Set<string>();

  while (queue.length > 0) {
    const memberId = queue.shift()!;

    // Skip if already visited (prevent infinite loops)
    if (visited.has(memberId)) continue;
    visited.add(memberId);

    // Add to family
    familyMembers.add(memberId);

    // Track birth family (patrilineal line)
    if (!memberBirthFamily.has(memberId)) {
      memberBirthFamily.set(memberId, familyId);
    }

    // Find unions where this member is a parent
    const unionIds = getUnionsForMember(data, memberId);

    // For each union, find children where THIS member is the FATHER
    unionIds.forEach(unionId => {
      const partners = parseUnionId(unionId);
      const isFather = isPersonFatherInUnion(data, memberId, partners);

      // Only continue patrilineal line (where current member is father)
      if (isFather) {
        const children = getChildrenOfUnion(data, unionId);
        children.forEach(childId => {
          if (!visited.has(childId)) {
            queue.push(childId);
          }
        });
      }
    });
  }
}

/**
 * Check if a person is the father in a union
 * Father is determined by gender = 'E' (Erkek/Male)
 */
function isPersonFatherInUnion(
  data: FamilyData,
  personId: string,
  partners: string[]
): boolean {
  const person = data.members[personId];
  if (!person) return false;

  // If gender is explicitly male, they are the father
  if (person.gender === 'E') return true;

  // If gender is explicitly female, they are not the father
  if (person.gender === 'K') return false;

  // If gender is unknown, assume the person is father if their partner is female
  const partnerId = partners.find(p => p !== personId);
  if (partnerId) {
    const partner = data.members[partnerId];
    if (partner && partner.gender === 'K') return true;
  }

  // Default: assume male if no gender info
  return true;
}

/**
 * Assign spouses to their partner's families
 * Spouses show gradient: birth family + married family
 *
 * For example:
 * - Woman born in Family A (memberBirthFamily[woman] = A)
 * - Marries man from Family B
 * - memberToFamilies[woman] = [A, B] → shows A+B gradient
 */
function assignSpousesToFamilies(
  data: FamilyData,
  familyId: string,
  familyMembers: Set<string>,
  memberBirthFamily: Map<string, string>,
  memberToFamilies: Map<string, string[]>
): void {
  const originalMembers = new Set(familyMembers);

  originalMembers.forEach(memberId => {
    const unionIds = getUnionsForMember(data, memberId);

    unionIds.forEach(unionId => {
      const partners = parseUnionId(unionId);

      partners.forEach(partnerId => {
        // Skip self and invalid partners
        if (partnerId === memberId || partnerId === '0') return;
        if (!data.members[partnerId]) return;

        // Add spouse to family members set
        familyMembers.add(partnerId);

        // If spouse doesn't have a birth family yet, this becomes their birth family
        // (This handles cases where spouse is marked as is_spouse and has no parents)
        if (!memberBirthFamily.has(partnerId)) {
          memberBirthFamily.set(partnerId, familyId);
        }

        // Add spouse to memberToFamilies for gradient display
        // They will show both their birth family and married family
        if (!memberToFamilies.has(partnerId)) {
          memberToFamilies.set(partnerId, []);
        }

        const spouseFamilies = memberToFamilies.get(partnerId)!;
        const birthFamilyId = memberBirthFamily.get(partnerId);

        // Add birth family if it exists and not already in list
        if (birthFamilyId && !spouseFamilies.includes(birthFamilyId)) {
          spouseFamilies.push(birthFamilyId);
        }

        // Add married family if not already in list
        if (!spouseFamilies.includes(familyId)) {
          spouseFamilies.push(familyId);
        }
      });
    });
  });
}

/**
 * Get all union nodes that a member is part of
 */
function getUnionsForMember(data: FamilyData, memberId: string): string[] {
  const unions: string[] = [];

  data.links.forEach(([from, to]) => {
    // Member -> Union link
    if (from === memberId && to.startsWith('u_')) {
      unions.push(to);
    }
  });

  return unions;
}

/**
 * Get all children of a union node
 */
function getChildrenOfUnion(data: FamilyData, unionId: string): string[] {
  const children: string[] = [];

  data.links.forEach(([from, to]) => {
    // Union -> Member link (member is child)
    if (from === unionId && !to.startsWith('u_')) {
      children.push(to);
    }
  });

  return children;
}

/**
 * Parse union ID to get partner member IDs
 * Union ID format: u_<member1>_<member2>
 * Example: "u_mem_1_mem_2" or "u_1_2" -> ["mem_1", "mem_2"] or ["1", "2"]
 */
function parseUnionId(unionId: string): string[] {
  const match = unionId.match(/u_(.+)_(.+)/);
  if (!match) return [];

  const [, id1, id2] = match;

  // Handle both "mem_1" and "1" formats
  const partnerId1 = id1.startsWith('mem_') ? id1 : `mem_${id1}`;
  const partnerId2 = id2.startsWith('mem_') ? id2 : `mem_${id2}`;

  return [partnerId1, partnerId2];
}

/**
 * Generate a family name from the root member
 */
function getFamilyName(member: Member): string {
  // Use last name if available
  if (member.last_name && member.last_name.trim() !== '') {
    return `Family of ${member.last_name}`;
  }

  // Otherwise use full name
  const name = member.name || member.first_name || 'Unknown';
  return `Family of ${name}`;
}

/**
 * Get the default active families based on current node
 * Returns the birth family (patrilineal line) of the current node as primary
 */
export function getDefaultActiveFamilies(
  families: Family[],
  memberBirthFamily: Map<string, string>,
  currentNodeId?: string
): Set<string> {
  // If we have a current node, use its birth family (patrilineal line) as primary
  if (currentNodeId) {
    const birthFamilyId = memberBirthFamily.get(currentNodeId);
    if (birthFamilyId) {
      return new Set([birthFamilyId]);
    }
  }

  // Otherwise, show the first family as default (or all families)
  if (families.length > 0) {
    return new Set([families[0].id]);
  }

  return new Set();
}
