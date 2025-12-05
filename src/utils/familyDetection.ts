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
  memberToFamilies: Map<string, string[]>; // member_id -> family_ids[]
  familyColors: Map<string, string>;       // family_id -> color
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
    };
  }

  // Step 2: Create families from roots
  const families: Family[] = [];
  const memberToFamilies = new Map<string, string[]>();
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

  // Step 3: Assign descendants to families
  families.forEach(family => {
    const members = familyMemberSets.get(family.id)!;
    assignDescendants(data, family.rootMemberId, members);
  });

  // Step 4: Assign spouses to their spouse's families
  families.forEach(family => {
    const members = familyMemberSets.get(family.id)!;
    assignSpouses(data, members);
  });

  // Step 5: Build memberToFamilies map and update member counts
  families.forEach(family => {
    const members = familyMemberSets.get(family.id)!;
    family.memberCount = members.size;

    members.forEach(memberId => {
      if (!memberToFamilies.has(memberId)) {
        memberToFamilies.set(memberId, []);
      }
      memberToFamilies.get(memberId)!.push(family.id);
    });
  });

  // Step 6: Create family colors map
  const familyColors = new Map<string, string>();
  families.forEach(family => {
    familyColors.set(family.id, family.color);
  });

  return { families, memberToFamilies, familyColors };
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
 * Assign all descendants of a root to a family
 * Uses BFS to traverse the tree
 */
function assignDescendants(
  data: FamilyData,
  rootMemberId: string,
  familyMembers: Set<string>
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

    // Find unions this member is part of
    const unionIds = getUnionsForMember(data, memberId);

    // For each union, find children and add to queue
    unionIds.forEach(unionId => {
      const children = getChildrenOfUnion(data, unionId);
      children.forEach(childId => {
        if (!visited.has(childId)) {
          queue.push(childId);
        }
      });
    });
  }
}

/**
 * Assign spouses to their partner's families
 * If person A is in Family X and marries person B,
 * then person B also becomes part of Family X
 */
function assignSpouses(data: FamilyData, familyMembers: Set<string>): void {
  const originalMembers = new Set(familyMembers);

  originalMembers.forEach(memberId => {
    const unionIds = getUnionsForMember(data, memberId);

    unionIds.forEach(unionId => {
      const partners = parseUnionId(unionId);

      partners.forEach(partnerId => {
        // Skip self and invalid partners
        if (partnerId === memberId || partnerId === '0') return;
        if (!data.members[partnerId]) return;

        // Add spouse to family
        familyMembers.add(partnerId);
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
 * Returns families of the current node, or all families if no current node
 */
export function getDefaultActiveFamilies(
  families: Family[],
  memberToFamilies: Map<string, string[]>,
  currentNodeId?: string
): Set<string> {
  // If we have a current node, use its families
  if (currentNodeId) {
    const nodeFamilies = memberToFamilies.get(currentNodeId);
    if (nodeFamilies && nodeFamilies.length > 0) {
      return new Set(nodeFamilies);
    }
  }

  // Otherwise, show all families
  return new Set(families.map(f => f.id));
}
