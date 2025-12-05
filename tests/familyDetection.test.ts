import { describe, it, expect } from 'vitest';
import { detectFamilies, getDefaultActiveFamilies } from '../src/utils/familyDetection';
import { generateFamilyColor, generateFamilyColors } from '../src/utils/colorGenerator';
import type { FamilyData } from '../src/types/types';

describe('familyDetection', () => {
  describe('detectFamilies', () => {
    it('should detect single family with root and children', () => {
      const data: FamilyData = {
        start: 'mem_1',
        members: {
          mem_1: { id: 'mem_1', name: 'Root Person', first_name: 'Root', last_name: 'Person', is_spouse: false, gender: 'E' } as any,
          mem_2: { id: 'mem_2', name: 'Child 1', first_name: 'Child', last_name: 'Person', is_spouse: false, gender: 'E' } as any,
          mem_3: { id: 'mem_3', name: 'Child 2', first_name: 'Child2', last_name: 'Person', is_spouse: false, gender: 'K' } as any,
        },
        links: [
          ['mem_1', 'u_1_0'],
          ['u_1_0', 'mem_2'],
          ['u_1_0', 'mem_3'],
        ],
      };

      const result = detectFamilies(data);

      expect(result.families.length).toBe(1);
      expect(result.families[0].name).toBe('Family of Person');
      expect(result.families[0].rootMemberId).toBe('mem_1');
      expect(result.families[0].memberCount).toBe(3);

      // All members should be in the same family
      expect(result.memberToFamilies.get('mem_1')).toEqual([result.families[0].id]);
      expect(result.memberToFamilies.get('mem_2')).toEqual([result.families[0].id]);
      expect(result.memberToFamilies.get('mem_3')).toEqual([result.families[0].id]);
    });

    it('should detect two disconnected families', () => {
      const data: FamilyData = {
        start: 'mem_1',
        members: {
          mem_1: { id: 'mem_1', name: 'Family A Root', first_name: 'A', last_name: 'Smith', is_spouse: false, gender: 'E' } as any,
          mem_2: { id: 'mem_2', name: 'Family A Child', first_name: 'B', last_name: 'Smith', is_spouse: false, gender: 'E' } as any,
          mem_3: { id: 'mem_3', name: 'Family B Root', first_name: 'X', last_name: 'Jones', is_spouse: false, gender: 'E' } as any,
          mem_4: { id: 'mem_4', name: 'Family B Child', first_name: 'Y', last_name: 'Jones', is_spouse: false, gender: 'K' } as any,
        },
        links: [
          ['mem_1', 'u_1_0'],
          ['u_1_0', 'mem_2'],
          ['mem_3', 'u_3_0'],
          ['u_3_0', 'mem_4'],
        ],
      };

      const result = detectFamilies(data);

      expect(result.families.length).toBe(2);
      expect(result.families[0].name).toBe('Family of Smith');
      expect(result.families[1].name).toBe('Family of Jones');

      // Members in Family A
      const familyAId = result.families[0].id;
      expect(result.memberToFamilies.get('mem_1')).toContain(familyAId);
      expect(result.memberToFamilies.get('mem_2')).toContain(familyAId);

      // Members in Family B
      const familyBId = result.families[1].id;
      expect(result.memberToFamilies.get('mem_3')).toContain(familyBId);
      expect(result.memberToFamilies.get('mem_4')).toContain(familyBId);
    });

    it('should handle families connected by marriage', () => {
      const data: FamilyData = {
        start: 'mem_1',
        members: {
          mem_1: { id: 'mem_1', name: 'Family Y Root', first_name: 'Yılmaz', last_name: 'Y', is_spouse: false, gender: 'E' } as any,
          mem_2: { id: 'mem_2', name: 'B', first_name: 'B', last_name: 'Y', is_spouse: false, gender: 'E' } as any,
          mem_3: { id: 'mem_3', name: 'Family A Root', first_name: 'Ahmet', last_name: 'A', is_spouse: false, gender: 'E' } as any,
          mem_4: { id: 'mem_4', name: 'C', first_name: 'C', last_name: 'A', is_spouse: false, gender: 'K' } as any,
          mem_5: { id: 'mem_5', name: 'D', first_name: 'D', last_name: 'BC', is_spouse: false, gender: 'E' } as any,
        },
        links: [
          // Family Y
          ['mem_1', 'u_1_0'],
          ['u_1_0', 'mem_2'],
          // Family A
          ['mem_3', 'u_3_0'],
          ['u_3_0', 'mem_4'],
          // B marries C
          ['mem_2', 'u_2_4'],
          ['mem_4', 'u_2_4'],
          ['u_2_4', 'mem_5'], // Child D
        ],
      };

      const result = detectFamilies(data);

      expect(result.families.length).toBe(2);

      // B should be in both families (born in Y, married into A)
      const bFamilies = result.memberToFamilies.get('mem_2');
      expect(bFamilies?.length).toBe(2);

      // C should be in both families (born in A, married into Y)
      const cFamilies = result.memberToFamilies.get('mem_4');
      expect(cFamilies?.length).toBe(2);

      // D (child of B and C) should be in both families
      const dFamilies = result.memberToFamilies.get('mem_5');
      expect(dFamilies?.length).toBe(2);
    });

    it('should handle spouse marked with is_spouse flag', () => {
      const data: FamilyData = {
        start: 'mem_1',
        members: {
          mem_1: { id: 'mem_1', name: 'Root', first_name: 'Root', last_name: 'Person', is_spouse: false, gender: 'E' } as any,
          mem_2: { id: 'mem_2', name: 'Spouse', first_name: 'Spouse', last_name: 'Other', is_spouse: true, gender: 'K' } as any,
          mem_3: { id: 'mem_3', name: 'Child', first_name: 'Child', last_name: 'Person', is_spouse: false, gender: 'E' } as any,
        },
        links: [
          ['mem_1', 'u_1_2'],
          ['mem_2', 'u_1_2'],
          ['u_1_2', 'mem_3'],
        ],
      };

      const result = detectFamilies(data);

      // Should have 1 family (rooted at mem_1, not mem_2)
      expect(result.families.length).toBe(1);
      expect(result.families[0].rootMemberId).toBe('mem_1');

      // Spouse should be included in the family
      expect(result.memberToFamilies.get('mem_2')).toContain(result.families[0].id);
    });

    it('should handle empty family data', () => {
      const data: FamilyData = {
        start: '',
        members: {},
        links: [],
      };

      const result = detectFamilies(data);

      expect(result.families.length).toBe(0);
      expect(result.memberToFamilies.size).toBe(0);
    });

    it('should handle single orphan node', () => {
      const data: FamilyData = {
        start: 'mem_1',
        members: {
          mem_1: { id: 'mem_1', name: 'Orphan', first_name: 'Orphan', last_name: 'Alone', is_spouse: false, gender: 'E' } as any,
        },
        links: [],
      };

      const result = detectFamilies(data);

      expect(result.families.length).toBe(1);
      expect(result.families[0].rootMemberId).toBe('mem_1');
      expect(result.families[0].memberCount).toBe(1);
    });

    it('should handle multiple generations', () => {
      const data: FamilyData = {
        start: 'mem_1',
        members: {
          mem_1: { id: 'mem_1', name: 'Grandparent', first_name: 'GP', last_name: 'Smith', is_spouse: false, gender: 'E', gen: 1 } as any,
          mem_2: { id: 'mem_2', name: 'Parent', first_name: 'P', last_name: 'Smith', is_spouse: false, gender: 'E', gen: 2 } as any,
          mem_3: { id: 'mem_3', name: 'Child', first_name: 'C', last_name: 'Smith', is_spouse: false, gender: 'E', gen: 3 } as any,
          mem_4: { id: 'mem_4', name: 'Grandchild', first_name: 'GC', last_name: 'Smith', is_spouse: false, gender: 'K', gen: 4 } as any,
        },
        links: [
          ['mem_1', 'u_1_0'],
          ['u_1_0', 'mem_2'],
          ['mem_2', 'u_2_0'],
          ['u_2_0', 'mem_3'],
          ['mem_3', 'u_3_0'],
          ['u_3_0', 'mem_4'],
        ],
      };

      const result = detectFamilies(data);

      expect(result.families.length).toBe(1);
      expect(result.families[0].memberCount).toBe(4);

      // All generations should be in the same family
      const familyId = result.families[0].id;
      expect(result.memberToFamilies.get('mem_1')).toContain(familyId);
      expect(result.memberToFamilies.get('mem_2')).toContain(familyId);
      expect(result.memberToFamilies.get('mem_3')).toContain(familyId);
      expect(result.memberToFamilies.get('mem_4')).toContain(familyId);
    });

    it('should assign colors to families', () => {
      const data: FamilyData = {
        start: 'mem_1',
        members: {
          mem_1: { id: 'mem_1', name: 'Family 1', first_name: 'F1', last_name: 'One', is_spouse: false, gender: 'E' } as any,
          mem_2: { id: 'mem_2', name: 'Family 2', first_name: 'F2', last_name: 'Two', is_spouse: false, gender: 'E' } as any,
        },
        links: [],
      };

      const result = detectFamilies(data);

      expect(result.families.length).toBe(2);
      expect(result.families[0].color).toBeTruthy();
      expect(result.families[1].color).toBeTruthy();
      expect(result.families[0].color).not.toBe(result.families[1].color);

      // Should have color mappings
      expect(result.familyColors.size).toBe(2);
      expect(result.familyColors.get(result.families[0].id)).toBe(result.families[0].color);
    });

    it('should handle circular prevention (visited set)', () => {
      // This shouldn't happen in valid data, but we should handle it gracefully
      const data: FamilyData = {
        start: 'mem_1',
        members: {
          mem_1: { id: 'mem_1', name: 'Person A', first_name: 'A', last_name: 'Test', is_spouse: false, gender: 'E' } as any,
          mem_2: { id: 'mem_2', name: 'Person B', first_name: 'B', last_name: 'Test', is_spouse: false, gender: 'E' } as any,
        },
        links: [
          ['mem_1', 'u_1_0'],
          ['u_1_0', 'mem_2'],
          // Intentionally create a potential loop scenario
          ['mem_2', 'u_2_0'],
          ['u_2_0', 'mem_1'], // This would create a cycle
        ],
      };

      // Should not throw or hang
      expect(() => detectFamilies(data)).not.toThrow();
      const result = detectFamilies(data);
      expect(result.families.length).toBeGreaterThan(0);
    });
  });

  describe('getDefaultActiveFamilies', () => {
    it('should return families of current node if provided', () => {
      const families = [
        { id: 'family_mem_1', name: 'Family A', color: '#8B5CF6', rootMemberId: 'mem_1', memberCount: 5 },
        { id: 'family_mem_3', name: 'Family B', color: '#10B981', rootMemberId: 'mem_3', memberCount: 8 },
      ];

      const memberToFamilies = new Map<string, string[]>([
        ['mem_1', ['family_mem_1']],
        ['mem_2', ['family_mem_1', 'family_mem_3']], // In both families
        ['mem_3', ['family_mem_3']],
      ]);

      const result = getDefaultActiveFamilies(families, memberToFamilies, 'mem_2');

      expect(result.size).toBe(2);
      expect(result.has('family_mem_1')).toBe(true);
      expect(result.has('family_mem_3')).toBe(true);
    });

    it('should return all families if no current node', () => {
      const families = [
        { id: 'family_mem_1', name: 'Family A', color: '#8B5CF6', rootMemberId: 'mem_1', memberCount: 5 },
        { id: 'family_mem_3', name: 'Family B', color: '#10B981', rootMemberId: 'mem_3', memberCount: 8 },
      ];

      const memberToFamilies = new Map<string, string[]>();

      const result = getDefaultActiveFamilies(families, memberToFamilies);

      expect(result.size).toBe(2);
      expect(result.has('family_mem_1')).toBe(true);
      expect(result.has('family_mem_3')).toBe(true);
    });

    it('should return all families if current node not in any family', () => {
      const families = [
        { id: 'family_mem_1', name: 'Family A', color: '#8B5CF6', rootMemberId: 'mem_1', memberCount: 5 },
      ];

      const memberToFamilies = new Map<string, string[]>([['mem_1', ['family_mem_1']]]);

      const result = getDefaultActiveFamilies(families, memberToFamilies, 'mem_999');

      expect(result.size).toBe(1);
      expect(result.has('family_mem_1')).toBe(true);
    });
  });

  describe('colorGenerator', () => {
    it('should generate distinct colors for first 10 families', () => {
      const colors = generateFamilyColors(10);

      expect(colors.length).toBe(10);

      // All colors should be unique
      const uniqueColors = new Set(colors);
      expect(uniqueColors.size).toBe(10);

      // All colors should be valid hex
      colors.forEach(color => {
        expect(color).toMatch(/^#[0-9A-F]{6}$/i);
      });
    });

    it('should generate colors for more than 10 families', () => {
      const colors = generateFamilyColors(20);

      expect(colors.length).toBe(20);

      // All colors should be valid hex
      colors.forEach(color => {
        expect(color).toMatch(/^#[0-9A-F]{6}$/i);
      });
    });

    it('should return consistent color for same index', () => {
      const color1 = generateFamilyColor(0);
      const color2 = generateFamilyColor(0);

      expect(color1).toBe(color2);
    });

    it('should return different colors for different indices', () => {
      const color1 = generateFamilyColor(0);
      const color2 = generateFamilyColor(1);
      const color3 = generateFamilyColor(2);

      expect(color1).not.toBe(color2);
      expect(color2).not.toBe(color3);
      expect(color1).not.toBe(color3);
    });
  });
});
