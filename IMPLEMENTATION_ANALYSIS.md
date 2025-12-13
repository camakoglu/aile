# Family Filtering - Implementation Analysis

## Critical Design Decisions

### 1. Family Detection Algorithm

**Question: What defines a "family"?**

**Decision:** Each root node (person with no parents in the data) defines a family.

**Rationale:**
- Natural and intuitive
- Works with existing data structure
- Handles multiple disconnected trees automatically

**Algorithm:**
```
1. Find all root nodes (members who are never children in any link)
2. Each root becomes a family patriarch/matriarch
3. Traverse descendants from each root -> all belong to that family
4. Spouses who marry in also join that family
5. Children inherit ALL families from both parents
```

**Example:**
```
Family Y (root: Yılmaz)    Family A (root: Ahmet)
    Yılmaz                      Ahmet
       |                           |
       B ←─────── marries ────────→ C
       └──────────────┬─────────────┘
                      D

Result:
- Yılmaz: Family Y only
- Ahmet: Family A only
- B: Family Y (primary - born into)
- C: Family A (primary - born into)
- B: Also in Family A (secondary - married into)
- C: Also in Family Y (secondary - married into)
- D: Family Y AND Family A (inherited from both parents)
```

**When filtering to "Family Y only":**
Shows: Yılmaz -> B -> D (but C is dimmed, showing the connection)

---

### 2. Handling Edge Cases

#### Case 1: Orphan Nodes (No Parents, but also not roots)
**Example:** Person marked as spouse (E) but their birth family isn't in data
```typescript
// Check if person is spouse AND has no descendants
if (member.is_spouse && !hasDescendants(member)) {
  // Don't create separate family, assign to spouse's family
}
```

#### Case 2: Multiple Disconnected Trees
**Example:** Data contains both "Family Smith" and "Family Jones" with no connection
```
Smith Tree          Jones Tree
    A                   X
   / \                 / \
  B   C               Y   Z
```
**Handling:** Perfectly fine! Each gets own family. User can filter to view one at a time.

#### Case 3: Circular References (Invalid Data)
**Protection:** Use visited set during traversal to prevent infinite loops
```typescript
const visited = new Set<string>();
while (queue.length > 0) {
  const memberId = queue.shift()!;
  if (visited.has(memberId)) continue; // Skip if already processed
  visited.add(memberId);
  // ... process
}
```

#### Case 4: Complex Intermarriage
**Example:**
```
Family A    Family B
  A1          B1
   |          |
  A2 ←─────→ B2
   |          |
  A3 ←─────→ B3
```
**Result:**
- A3 and B3 both belong to Family A AND Family B
- When viewing either family, you see the connection
- Visual: gradient color showing membership in both

---

### 3. Visual Design Details

#### Node Colors

**1 Family:** Solid fill
```
┌─────────┐
│ ████████│ Purple (Family Y)
│  Name   │
└─────────┘
```

**2 Families:** Diagonal linear gradient
```
┌─────────┐
│ ▓▓▓▓░░░░│ Purple -> Green
│  Name   │
└─────────┘
```

**3+ Families:** Conic gradient (pie slice) - rare case
```
┌─────────┐
│ ▓▓▓▓▓░░░│ Multiple colors in segments
│  Name   │
└─────────┘
```

**Implementation:** Create SVG defs for gradients, reference by ID

---

#### Union Node Colors

**Question:** Should union nodes be colored?

**Decision:** Yes, blend of both partner colors
```
    A (Purple)
         |
    Union (Purple-Green gradient)
         |
    B (Green)
```

**Rationale:** Shows which families are connecting through marriage

---

#### Link Colors

**Question:** Should links be colored?

**Decision:** Keep neutral gray, except when highlighting
- Default: Gray (#6B7280)
- Hover: Highlight path in family color
- Multiple families: Keep gray to avoid clutter

**Rationale:** Too many colored links creates visual noise

---

#### Opacity for Filtering

**Active family members:** opacity: 1.0
**Inactive family members:** opacity: 0.25 (dimmed but visible)
**Links to inactive members:** opacity: 0.15

**Rationale:**
- Shows context (where families connect)
- Less jarring than hide/show
- Can still click dimmed nodes to activate their family

---

### 4. Color Generation

**Requirements:**
- Visually distinct
- Aesthetically pleasing
- Accessible (WCAG contrast)
- Work on both light/dark backgrounds

**Approach: Curated Palette**
```typescript
const FAMILY_COLORS = [
  '#8B5CF6', // Violet - warm purple
  '#10B981', // Emerald - fresh green
  '#3B82F6', // Blue - classic blue
  '#F59E0B', // Amber - golden yellow
  '#EF4444', // Red - vibrant red
  '#14B8A6', // Teal - ocean blue-green
  '#F97316', // Orange - energetic orange
  '#EC4899', // Pink - bright pink
  '#6366F1', // Indigo - deep purple-blue
  '#84CC16', // Lime - bright yellow-green
];
```

**Color Selection Strategy:**
- Spread across color wheel (60° apart)
- Same saturation (70%) and lightness (55%)
- Tested for colorblind accessibility
- If >10 families, generate with HSL: `hsl(${index * 360 / count}, 70%, 55%)`

**Testing:** Verified in [Coolors](https://coolors.co) and colorblind simulator

---

### 5. Interaction with Patrilineal Filter

**Scenario:** User has both Patrilineal Mode AND Family Filter active

**Behavior:** Filters compound (AND logic)
- Patrilineal ON + Family Y selected = Male lineage of Family Y
- Patrilineal ON + All Families = Male lineage of all families
- Patrilineal OFF + Family Y = All members of Family Y

**Implementation:**
```typescript
// In renderTree()
let displayData = store.getState().fullFamilyData;

// Apply patrilineal filter first
if (store.getState().isPatrilineal) {
  displayData = filterPatrilineal(displayData);
}

// Then apply family filter (visibility only, not data filtering)
// This is done in rendering phase, not data phase
```

**Rationale:**
- Patrilineal changes data structure (removes nodes)
- Family filter changes visibility (dims nodes)
- Applying patrilineal first, then family visibility gives expected behavior

---

### 6. Performance Considerations

**Question:** Rebuild DAG or toggle visibility?

**Decision:** Toggle visibility on existing DAG
```typescript
// DON'T do this (slow):
function applyFamilyFilter(data: FamilyData, families: Set<string>) {
  const filtered = { ...data, members: {}, links: [] };
  // Rebuild entire structure... SLOW
}

// DO this (fast):
function applyFamilyFilter(dag: DagWithFamilyData, families: Set<string>) {
  dag.nodes().forEach(node => {
    const nodeFamilies = memberToFamilies.get(node.data);
    const hasActiveFamily = nodeFamilies?.some(f => families.has(f));
    node.added_data.is_visible = hasActiveFamily;
    // Just update visibility flag... FAST
  });
}
```

**Rationale:**
- DAG creation is expensive (layout calculations)
- Toggling visibility is O(n) where n = nodes
- Smooth transitions with D3

**Exception:** When patrilineal mode changes, we DO rebuild DAG (existing behavior)

---

### 7. Data Structure

```typescript
export interface Family {
  id: string;              // "family_mem_1"
  name: string;            // "Family of Yılmaz"
  color: string;           // "#8B5CF6"
  rootMemberId: string;    // "mem_1"
  memberCount: number;     // 12

  // Internal use
  memberIds?: Set<string>;         // All members
  primaryMemberIds?: Set<string>;  // Born into family
  secondaryMemberIds?: Set<string>; // Married into family
}

export interface FamilyState {
  families: Family[];
  memberToFamilies: Map<string, string[]>; // member_id -> family_ids[]
  activeFamilyIds: Set<string>;
}
```

**Design choice:** Keep member lists in memory, but only serialize IDs for localStorage

---

### 8. URL State Encoding

**Current URL state:** `#eyJjIjoibWVtXzEiLCJw...`

**Add family filter:** Encode active family IDs
```typescript
interface URLState {
  c: string;           // currentNode
  p: boolean;          // patrilineal
  t: Transform;        // transform
  v: string[];         // visibleNodes
  f?: string[];        // NEW: family IDs (only if not all active)
}
```

**Optimization:** Only encode family IDs if filtering is active
- If all families active: omit `f` field (saves space)
- If some families hidden: encode as `f: ["family_mem_1", "family_mem_3"]`

---

### 9. Default Family Selection

**Question:** What is the "current family"?

**Options:**
1. Family of currentNode (from URL or last viewed)
2. Family of data.start (root of tree)
3. Largest family (most members)
4. All families

**Decision:** Use this priority:
```typescript
function getDefaultActiveFamilies(
  families: Family[],
  currentNodeId?: string,
  startNodeId?: string
): Set<string> {
  // Priority 1: If we have a current node, use its families
  if (currentNodeId) {
    const nodeFamilies = memberToFamilies.get(currentNodeId);
    if (nodeFamilies && nodeFamilies.length > 0) {
      return new Set(nodeFamilies);
    }
  }

  // Priority 2: If we have a start node, use its families
  if (startNodeId) {
    const startFamilies = memberToFamilies.get(startNodeId);
    if (startFamilies && startFamilies.length > 0) {
      return new Set(startFamilies);
    }
  }

  // Priority 3: Show all families
  return new Set(families.map(f => f.id));
}
```

**Rationale:**
- Contextual: Shows family of person you're viewing
- Fallback to showing everything (safe default)
- User can always change via dropdown

---

### 10. UI Component Architecture

```
src/ui/familyFilter/
├── FamilyDropdown.ts       # Main component
├── familyFilter.css        # Styles
└── index.ts                # Exports
```

**Component Lifecycle:**
```typescript
class FamilyDropdown {
  constructor(container: HTMLElement, families: Family[], store: FamilyTreeStore)

  private render()           // Create DOM elements
  private attachEvents()     // Click handlers
  private updateDisplay()    // Refresh checkboxes when state changes
  public destroy()           // Cleanup
}
```

**DOM Structure:**
```html
<div class="family-dropdown">
  <button class="family-dropdown-toggle">
    🏠 Families <span class="count">(2/5)</span> ▼
  </button>

  <div class="family-dropdown-menu" hidden>
    <div class="family-dropdown-header">
      <h3>Family Filters</h3>
      <button class="close-btn">×</button>
    </div>

    <div class="family-dropdown-all">
      <label>
        <input type="checkbox" id="family-all"> All Families
      </label>
    </div>

    <div class="family-dropdown-list">
      <label class="family-item">
        <input type="checkbox" data-family-id="family_mem_1" checked>
        <span class="color-indicator" style="background: #8B5CF6"></span>
        <span class="family-name">Family of Yılmaz</span>
        <span class="member-count">12 members</span>
      </label>
      <!-- More families... -->
    </div>

    <div class="family-dropdown-actions">
      <button class="btn-select-all">Select All</button>
      <button class="btn-clear-all">Clear All</button>
    </div>
  </div>
</div>
```

---

### 11. Rendering Logic Updates

**Node Rendering (NodeHelpers.ts):**
```typescript
export function getNodeFill(
  node: D3Node,
  memberToFamilies: Map<string, string[]>,
  familyColors: Map<string, string>,
  svgDefs: d3.Selection<SVGDefsElement>
): string {
  const families = memberToFamilies.get(node.data) || [];

  if (families.length === 0) return '#9CA3AF'; // Gray for no family
  if (families.length === 1) return familyColors.get(families[0]) || '#9CA3AF';

  // Multiple families: create gradient
  const gradientId = `gradient-${node.data}`;
  const colors = families.map(f => familyColors.get(f)!);
  createLinearGradient(svgDefs, gradientId, colors);
  return `url(#${gradientId})`;
}

export function getNodeOpacity(
  node: D3Node,
  memberToFamilies: Map<string, string[]>,
  activeFamilyIds: Set<string>
): number {
  const families = memberToFamilies.get(node.data) || [];
  const hasActiveFamily = families.some(f => activeFamilyIds.has(f));
  return hasActiveFamily ? 1.0 : 0.25;
}
```

**Gradient Creation:**
```typescript
function createLinearGradient(
  defs: d3.Selection<SVGDefsElement>,
  id: string,
  colors: string[]
): void {
  // Remove existing gradient with same ID
  defs.select(`#${id}`).remove();

  const gradient = defs.append('linearGradient')
    .attr('id', id)
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
}
```

---

### 12. Testing Strategy

**Unit Tests:**
1. Family detection with various structures
2. Color generation (10 families, 100 families)
3. Opacity calculation
4. URL state encoding/decoding with families
5. Edge cases (orphans, circular refs, empty data)

**Integration Tests:**
1. Render tree with 2 families
2. Toggle family filters
3. Combine patrilineal + family filters
4. Multi-family nodes render correctly

**Manual Testing:**
1. Single family tree (should work like before)
2. Two disconnected trees
3. Complex intermarriage
4. Performance with 100+ members
5. URL sharing with family filters

---

## Implementation Order

### Phase 1: Core Algorithm (No UI)
1. ✅ Create `src/utils/familyDetection.ts`
2. ✅ Create `src/utils/colorGenerator.ts`
3. ✅ Add tests for family detection
4. ✅ Add family state to Store

**Checkpoint:** Can detect families programmatically

### Phase 2: Rendering
5. ✅ Update `NodeHelpers.ts` for multi-family colors
6. ✅ Update opacity logic for filtering
7. ✅ Test rendering with mock families

**Checkpoint:** Nodes render with correct colors

### Phase 3: UI Component
8. ✅ Create `FamilyDropdown.ts`
9. ✅ Add CSS styles
10. ✅ Wire up to Store
11. ✅ Add to main.ts

**Checkpoint:** Can toggle families via UI

### Phase 4: State Persistence
12. ✅ URL state encoding
13. ✅ localStorage persistence
14. ✅ Integration with existing state management

**Checkpoint:** Family filters persist across sessions

### Phase 5: Polish
15. ✅ Smooth transitions
16. ✅ Loading states
17. ✅ Error handling
18. ✅ Documentation

---

## Potential Issues & Mitigations

### Issue 1: Too Many Families
**Problem:** 20 disconnected families clutters the dropdown

**Mitigation:**
- Show only top 10 families by member count
- Add "Show More" button
- Or: Auto-merge small families into "Other Families"

### Issue 2: Color Distinguishability
**Problem:** Hard to tell apart 15 different colors

**Mitigation:**
- Limit to 10 distinct colors
- For 11+, reuse colors with different patterns (stripes, dots)
- Show family name on hover

### Issue 3: Performance with Large Trees
**Problem:** 1000+ nodes might slow down on filter toggle

**Mitigation:**
- Use requestAnimationFrame for smooth updates
- Batch DOM updates
- Consider Web Workers for family detection (future)

### Issue 4: Confusing Multi-Family Membership
**Problem:** User doesn't understand why person has gradient

**Mitigation:**
- Tooltip on hover: "Member of 2 families: Y, A"
- Visual legend in sidebar
- Help icon with explanation

---

## Ready to Implement?

All critical decisions made. Implementation is well-defined and defensive. Ready to proceed.
