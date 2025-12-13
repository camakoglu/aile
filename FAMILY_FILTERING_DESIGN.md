# Family Filtering & Multiple Trees Design

## Problem Statement

With Google Sheets, we were limited to a single linear family tree. With a proper database, we can now support:

1. **Multiple marriages**: Same person married to different people over time
2. **Overlapping trees**: Multiple families that intermarry
3. **Family filtering**: Show/hide specific family branches

### Example Structure:
```
Y-Q   A-E
  |  / \
  B-C   D

- B is child of Y-Q
- C is child of A-E
- B marries C (connecting two families)
- D is also child of A-E (sibling of C)
```

## Design Solutions

### Option 1: Color-Coded Family Branches (Recommended)

**Visual Design:**
- Each family root gets a unique color
- Members inherit colors from their families
- Members in multiple families show blended colors or patterns
- Toggle families on/off via checkboxes

**UI Layout:**
```
┌─────────────────────────────────────────┐
│ Family Filters                    [×]    │
├─────────────────────────────────────────┤
│ ☑ Family of Yılmaz (Purple)            │
│   └─ 12 members                         │
│                                         │
│ ☑ Family of Ahmet (Green)              │
│   └─ 25 members                         │
│                                         │
│ ☐ Family of Selim (Blue)               │
│   └─ 8 members                          │
│                                         │
│ [Show All] [Hide All] [Invert]         │
└─────────────────────────────────────────┘
```

**Advantages:**
- Intuitive visual distinction
- Easy to understand relationships
- Works well with existing patrilineal toggle
- Minimal code changes

**Implementation Complexity:** Medium

---

### Option 2: Layered/Dimming View

**Visual Design:**
- All members always visible
- Selected families highlighted (full opacity)
- Non-selected families dimmed (low opacity)
- Connections between families always visible

**Advantages:**
- Shows context (where families connect)
- No jarring show/hide transitions
- Easy to explore relationships

**Disadvantages:**
- Can get cluttered with large trees
- Less clear which family you're focused on

**Implementation Complexity:** Low

---

### Option 3: Side-by-Side Trees with Connection Highlights

**Visual Design:**
- Multiple trees shown in separate panels
- Shared members appear in both trees
- Click a shared member to highlight connections

**Advantages:**
- Very clear separation
- Good for comparing families
- Works well for genealogy research

**Disadvantages:**
- Uses more screen space
- Complex layout management
- Harder to see overall structure

**Implementation Complexity:** High

---

## Recommended Approach: Hybrid (Options 1 + 2)

Combine color-coding with dimming for best of both worlds:

### Visual Design

```
┌──────────────────────────────────────────────────────────┐
│  [👨‍👦 Patrilineal] [🏠 Families ▼] [🔗 Share] [🔄 Reset]  │
└──────────────────────────────────────────────────────────┘
                      │
                      ▼ (Dropdown opens)
              ┌───────────────────┐
              │ ☑ All Families    │
              ├───────────────────┤
              │ ☑ 🟣 Yılmaz       │
              │ ☑ 🟢 Ahmet        │
              │ ☐ 🔵 Selim        │
              │ ☐ 🟠 Mehmet       │
              └───────────────────┘

Tree View:
- Selected families: Full color + Full opacity
- Unselected families: Grayscale + 30% opacity
- Connecting members: Show both colors (gradient)
- Hover: Show which families member belongs to
```

### Database Schema

```sql
-- Families table
CREATE TABLE families (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    color VARCHAR(7) NOT NULL, -- Hex color like #9333EA
    root_member_id INTEGER REFERENCES members(id),
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Family membership (many-to-many)
CREATE TABLE family_members (
    id SERIAL PRIMARY KEY,
    family_id INTEGER REFERENCES families(id) ON DELETE CASCADE,
    member_id INTEGER REFERENCES members(id) ON DELETE CASCADE,
    relationship_to_root VARCHAR(50), -- e.g., 'direct descendant', 'spouse', 'child'
    UNIQUE(family_id, member_id)
);

-- Indexes
CREATE INDEX idx_family_members_family ON family_members(family_id);
CREATE INDEX idx_family_members_member ON family_members(member_id);

-- Example data
INSERT INTO families (name, color, root_member_id) VALUES
    ('Family of Yılmaz', '#9333EA', 1),
    ('Family of Ahmet', '#22C55E', 5);

-- Assign members to families
INSERT INTO family_members (family_id, member_id, relationship_to_root) VALUES
    (1, 1, 'root'),      -- Yılmaz is root of family 1
    (1, 2, 'child'),     -- B is child
    (2, 5, 'root'),      -- Ahmet is root of family 2
    (2, 3, 'child'),     -- C is child
    (1, 3, 'spouse'),    -- C also belongs to family 1 (married B)
    (2, 3, 'child');     -- C is in both families!
```

### TypeScript Types

```typescript
export interface Family {
  id: number;
  name: string;
  color: string;
  root_member_id: number;
  description?: string;
  member_count?: number;
}

export interface FamilyMember {
  family_id: number;
  member_id: number;
  relationship_to_root: string;
}

export interface FamilyFilterState {
  activeFamilies: Set<number>; // Set of family IDs currently visible
  showAll: boolean;             // Override to show all families
}
```

### UI Components

#### 1. Family Selector Dropdown

```typescript
// src/ui/familyFilter/FamilySelector.ts
export class FamilySelector {
  private families: Family[];
  private activeFilters: Set<number>;
  private container: HTMLElement;

  constructor(families: Family[]) {
    this.families = families;
    this.activeFilters = new Set(families.map(f => f.id)); // All active by default
    this.render();
  }

  render() {
    // Create dropdown with checkboxes for each family
    // Color indicator next to each family name
  }

  onFilterChange(callback: (activeFilters: Set<number>) => void) {
    // Emit event when filters change
  }
}
```

#### 2. Node Color Logic

```typescript
// src/components/Tree/NodeHelpers.ts

/**
 * Get color(s) for a node based on family membership
 */
export function getNodeFamilyColors(
  node: D3Node,
  memberFamilies: Map<string, Family[]>,
  activeFilters: Set<number>
): string[] {
  const families = memberFamilies.get(node.data) || [];
  const activeColors = families
    .filter(f => activeFilters.has(f.id))
    .map(f => f.color);

  return activeColors.length > 0 ? activeColors : ['#6B7280']; // Gray if no active family
}

/**
 * Get opacity for node based on family filtering
 */
export function getNodeOpacity(
  node: D3Node,
  memberFamilies: Map<string, Family[]>,
  activeFilters: Set<number>
): number {
  const families = memberFamilies.get(node.data) || [];
  const hasActiveFamily = families.some(f => activeFilters.has(f.id));

  return hasActiveFamily ? 1.0 : 0.3; // Dim inactive families
}

/**
 * Create gradient for nodes in multiple families
 */
export function createFamilyGradient(
  svg: d3.Selection<any, any, any, any>,
  nodeId: string,
  colors: string[]
): string {
  if (colors.length === 1) return colors[0];

  const gradientId = `gradient-${nodeId}`;
  const gradient = svg.append('defs')
    .append('linearGradient')
    .attr('id', gradientId)
    .attr('x1', '0%')
    .attr('y1', '0%')
    .attr('x2', '100%')
    .attr('y2', '100%');

  colors.forEach((color, i) => {
    const offset = (i / (colors.length - 1)) * 100;
    gradient.append('stop')
      .attr('offset', `${offset}%`)
      .attr('stop-color', color);
  });

  return `url(#${gradientId})`;
}
```

### Store Updates

```typescript
// src/services/state/store.ts

interface FamilyTreeState {
  fullFamilyData: FamilyData | null;
  isPatrilineal: boolean;
  visibleNodes: Set<string>;
  transform: Transform | null;
  currentNode: string | null;

  // New family filtering state
  families: Family[];
  activeFamilies: Set<number>;
  memberFamilies: Map<string, Family[]>; // member_id -> families they belong to
}

class FamilyTreeStore {
  // ... existing methods ...

  setActiveFamilies(familyIds: Set<number>) {
    this.state.activeFamilies = familyIds;
    this.notifyObservers();
    this.saveToLocalStorage();
  }

  loadFamilies(families: Family[], memberFamilies: Map<string, Family[]>) {
    this.state.families = families;
    this.state.memberFamilies = memberFamilies;
    this.state.activeFamilies = new Set(families.map(f => f.id)); // All active by default
    this.notifyObservers();
  }
}
```

---

## Multiple Marriages Handling

### Current Issue
Currently, one union node per couple: `u_person1_person2`

### Solution: Timestamped Unions

```sql
-- Update unions table to support multiple marriages
ALTER TABLE unions ADD COLUMN union_order INTEGER DEFAULT 1;
ALTER TABLE unions ADD COLUMN divorce_date VARCHAR(50);
ALTER TABLE unions ADD COLUMN union_status VARCHAR(20) DEFAULT 'active'; -- active, divorced, widowed

-- Example: Person A marries B, then C
INSERT INTO unions (partner1_id, partner2_id, marriage_date, union_order)
VALUES (1, 2, '1990', 1); -- First marriage

INSERT INTO unions (partner1_id, partner2_id, marriage_date, union_order, divorce_date)
VALUES (1, 2, '1990', 1, '2000'); -- Divorced

INSERT INTO unions (partner1_id, partner2_id, marriage_date, union_order)
VALUES (1, 3, '2005', 2); -- Second marriage
```

### Visualization

```
    Person A
    /      \
   /        \
Union1     Union2
(1990)     (2005)
  |          |
  B          C
(divorced) (current)
  |
Child1
```

**Node IDs:**
- `u_1_2_1` - First union (A-B)
- `u_1_3_2` - Second union (A-C)

**Visual Indicators:**
- Different line styles (dashed for divorced)
- Labels: "1st marriage", "2nd marriage"
- Hover shows marriage/divorce dates

---

## Implementation Plan

### Phase 1: Database Schema (1-2 hours)
- [ ] Add `families` table
- [ ] Add `family_members` table
- [ ] Update `unions` table for multiple marriages
- [ ] Create indexes
- [ ] Update migration script

### Phase 2: Backend Service (2-3 hours)
- [ ] Update `databaseService.ts` to fetch families
- [ ] Create `FamilyService` class
- [ ] Add methods: `getFamilies()`, `getFamilyMembers()`, `assignMemberToFamily()`
- [ ] Update data loader to include family data

### Phase 3: UI Components (3-4 hours)
- [ ] Create `FamilySelector` component
- [ ] Add family filter dropdown to toolbar
- [ ] Update node rendering with colors/gradients
- [ ] Add opacity transitions for filtering
- [ ] Create family legend component

### Phase 4: State Management (1-2 hours)
- [ ] Add family state to Store
- [ ] Update URL state to include active families
- [ ] Add localStorage persistence for family filters
- [ ] Handle filter changes and tree updates

### Phase 5: Multiple Marriages Support (2-3 hours)
- [ ] Update union node generation
- [ ] Add visual indicators for marriage order
- [ ] Show divorce/widowed status
- [ ] Add tooltips with marriage history

### Phase 6: Testing & Polish (2-3 hours)
- [ ] Write tests for family filtering
- [ ] Test multiple marriages rendering
- [ ] Add keyboard shortcuts (toggle families)
- [ ] Performance optimization for large trees
- [ ] Update documentation

**Total Estimate: 11-17 hours**

---

## Alternative: Auto-Detect Families

Instead of manually assigning families, we could auto-detect them:

### Algorithm:
1. Find all "root" nodes (no parents)
2. Each root becomes a family patriarch/matriarch
3. Assign descendants to that family
4. When trees merge (via marriage), member gets both families

```typescript
function autoDetectFamilies(data: FamilyData): Family[] {
  const families: Family[] = [];
  const rootMembers = findRootMembers(data);

  rootMembers.forEach((rootId, index) => {
    const descendants = getAllDescendants(data, rootId);
    families.push({
      id: index + 1,
      name: `Family of ${data.members[rootId].name}`,
      color: generateColor(index),
      root_member_id: rootId,
      members: descendants
    });
  });

  return families;
}
```

**Pros:**
- No manual data entry
- Works with existing data
- Simple to understand

**Cons:**
- Less control over family groupings
- Might not match user's mental model

---

## Recommended Colors

For good contrast and accessibility:

```typescript
const FAMILY_COLORS = [
  '#9333EA', // Purple
  '#22C55E', // Green
  '#3B82F6', // Blue
  '#F59E0B', // Amber
  '#EF4444', // Red
  '#14B8A6', // Teal
  '#F97316', // Orange
  '#8B5CF6', // Violet
  '#06B6D4', // Cyan
  '#EC4899', // Pink
];
```

---

## User Experience Flow

### Scenario 1: Exploring Multiple Families

1. User opens tree (all families visible by default)
2. Clicks "Families" dropdown
3. Sees list: "Family of Yılmaz (12 members)", "Family of Ahmet (25 members)"
4. Unchecks "Family of Selim" - those members dim to 30% opacity
5. Tree updates smoothly with transition
6. Can still see connections but focus is on active families

### Scenario 2: Finding Connection Between Families

1. User selects only "Family of Yılmaz"
2. Notices one node (B) has a gradient color (purple + green)
3. Hovers over B: "Member of 2 families: Yılmaz, Ahmet"
4. Clicks to see details: "Married into Family of Ahmet"
5. Enables "Family of Ahmet" to see the connection

### Scenario 3: Viewing Multiple Marriages

1. User sees Person A with two union nodes below
2. First union labeled "⚭ 1990" with dashed line (divorced)
3. Second union labeled "⚭ 2005" with solid line (current)
4. Hover shows: "Married B (1990-2000), Married C (2005-present)"

---

## Future Enhancements

- **Search by family**: "Show all members of Family X"
- **Family statistics**: Average age, generation count, geographic distribution
- **Export by family**: Generate PDF for specific family branch
- **Family comparison**: Show two families side-by-side
- **Genetic inheritance view**: Show trait inheritance across families
- **Timeline view**: See marriages/births/deaths chronologically

---

## Questions to Consider

1. **Default state**: Show all families or just the main one?
2. **Color assignment**: Auto-generate or let user choose?
3. **Family naming**: Auto-name by patriarch or require manual input?
4. **Overlapping members**: Show gradient or let user pick primary family?
5. **URL sharing**: Include family filters in shared links?

Would you like me to proceed with the implementation?
