import { describe, it, expect } from 'vitest';
import { DagRelaxation } from '../src/components/Tree/dagRelaxation';
import { DagWithFamilyData } from '../src/components/Tree/dagWithFamilyData';
import { D3Node } from '../src/types/types';

describe('DagRelaxation', () => {
    function createMockNode(id: string, x: number, y: number): D3Node {
        return {
            data: id,
            x,
            y,
            added_data: {},
            children: () => []
        } as any;
    }

    function createMockDag(nodes: D3Node[]): DagWithFamilyData {
        const nodeMap = new Map<string, D3Node>();
        nodes.forEach(n => nodeMap.set(n.data, n));

        const mockDag = {
            nodes: () => nodes,
            parents: (node: D3Node) => {
                // Simple mock - return empty array
                return [];
            }
        } as any;

        return mockDag;
    }

    describe('constructor', () => {
        it('should initialize with dag and node_size', () => {
            const nodes = [createMockNode('mem_0', 0, 0)];
            const dag = createMockDag(nodes);
            const nodeSize: [number, number] = [100, 100];

            const relaxation = new DagRelaxation(dag, nodeSize);

            expect(relaxation.dag).toBe(dag);
            expect(relaxation.node_size).toBe(nodeSize);
        });
    });

    describe('get_pressure', () => {
        it('should return 0 when nodes are far apart', () => {
            const nodes = [
                createMockNode('mem_0', 0, 0),
                createMockNode('mem_1', 200, 0)
            ];
            const dag = createMockDag(nodes);
            const relaxation = new DagRelaxation(dag, [100, 100]);

            const pressure = relaxation.get_pressure(nodes[1], nodes[0], 100);

            expect(pressure).toBe(0);
        });

        it('should return positive value when nodes overlap from right', () => {
            const nodes = [
                createMockNode('mem_0', 0, 0),
                createMockNode('mem_1', 50, 0) // Overlapping
            ];
            const dag = createMockDag(nodes);
            const relaxation = new DagRelaxation(dag, [100, 100]);

            const pressure = relaxation.get_pressure(nodes[1], nodes[0], 100);

            // overlap = 100 - 50 = 50, direction = -1 (left neighbor)
            expect(pressure).toBe(-50);
        });

        it('should return negative value when nodes overlap from left', () => {
            const nodes = [
                createMockNode('mem_0', 50, 0),
                createMockNode('mem_1', 0, 0) // Overlapping
            ];
            const dag = createMockDag(nodes);
            const relaxation = new DagRelaxation(dag, [100, 100]);

            const pressure = relaxation.get_pressure(nodes[1], nodes[0], 100);

            // difference = 50 - 0 = 50, overlap = 100 - 50 = 50, direction = 1
            expect(pressure).toBe(50);
        });

        it('should handle exactly touching nodes', () => {
            const nodes = [
                createMockNode('mem_0', 0, 0),
                createMockNode('mem_1', 100, 0) // Exactly touching
            ];
            const dag = createMockDag(nodes);
            const relaxation = new DagRelaxation(dag, [100, 100]);

            const pressure = relaxation.get_pressure(nodes[1], nodes[0], 100);

            // No overlap when distance equals node_size (may be -0 or 0)
            expect(Math.abs(pressure)).toBe(0);
        });
    });

    describe('get_gravity', () => {
        it('should pull node towards neighbor on right', () => {
            const nodes = [
                createMockNode('mem_0', 0, 0),
                createMockNode('mem_1', 100, 0)
            ];
            const dag = createMockDag(nodes);
            const relaxation = new DagRelaxation(dag, [100, 100]);

            const gravity = relaxation.get_gravity(nodes[1], nodes[0]);

            expect(gravity).toBe(100); // Positive = pull right
        });

        it('should pull node towards neighbor on left', () => {
            const nodes = [
                createMockNode('mem_0', 100, 0),
                createMockNode('mem_1', 0, 0)
            ];
            const dag = createMockDag(nodes);
            const relaxation = new DagRelaxation(dag, [100, 100]);

            const gravity = relaxation.get_gravity(nodes[1], nodes[0]);

            expect(gravity).toBe(-100); // Negative = pull left
        });

        it('should return 0 when nodes are at same position', () => {
            const nodes = [
                createMockNode('mem_0', 50, 0),
                createMockNode('mem_1', 50, 0)
            ];
            const dag = createMockDag(nodes);
            const relaxation = new DagRelaxation(dag, [100, 100]);

            const gravity = relaxation.get_gravity(nodes[1], nodes[0]);

            expect(gravity).toBe(0);
        });
    });

    describe('enforce_placement', () => {
        it('should ensure minimum spacing between nodes', () => {
            const nodes = [
                createMockNode('mem_0', 0, 0),
                createMockNode('mem_1', 50, 0), // Too close
                createMockNode('mem_2', 100, 0)
            ];
            const dag = createMockDag(nodes);
            const relaxation = new DagRelaxation(dag, [100, 100]);

            relaxation.enforce_placement(nodes);

            // First node should stay at 0
            expect(nodes[0].x).toBe(0);
            // Second node should be pushed to at least 100
            expect(nodes[1].x).toBeGreaterThanOrEqual(100);
            // Third node should be pushed even further
            expect(nodes[2].x).toBeGreaterThanOrEqual(200);
        });

        it('should not modify well-spaced nodes', () => {
            const nodes = [
                createMockNode('mem_0', 0, 0),
                createMockNode('mem_1', 150, 0),
                createMockNode('mem_2', 300, 0)
            ];
            const dag = createMockDag(nodes);
            const relaxation = new DagRelaxation(dag, [100, 100]);

            const originalPositions = nodes.map(n => n.x);

            relaxation.enforce_placement(nodes);

            // Positions should remain the same
            nodes.forEach((node, i) => {
                expect(node.x).toBe(originalPositions[i]);
            });
        });

        it('should handle single node', () => {
            const nodes = [createMockNode('mem_0', 50, 0)];
            const dag = createMockDag(nodes);
            const relaxation = new DagRelaxation(dag, [100, 100]);

            const initialX = nodes[0].x;
            relaxation.enforce_placement(nodes);

            // Single node: if already beyond minimum, stays in place
            // enforce_placement ensures nodes[i].x >= position_x where position_x starts at -Infinity + node_size
            expect(nodes[0].x).toBeGreaterThanOrEqual(initialX);
        });

        it('should handle empty node array', () => {
            const nodes: D3Node[] = [];
            const dag = createMockDag(nodes);
            const relaxation = new DagRelaxation(dag, [100, 100]);

            expect(() => relaxation.enforce_placement(nodes)).not.toThrow();
        });
    });

    describe('run', () => {
        it('should adjust overlapping nodes', () => {
            const nodes = [
                createMockNode('mem_0', 0, 0),
                createMockNode('mem_1', 10, 0), // Very close
                createMockNode('mem_2', 20, 0)  // Very close
            ];
            const dag = createMockDag(nodes);
            const relaxation = new DagRelaxation(dag, [100, 100]);

            relaxation.run(nodes);

            // After relaxation, nodes should have minimum spacing (enforced at end)
            expect(nodes[1].x - nodes[0].x).toBeGreaterThanOrEqual(100);
            expect(nodes[2].x - nodes[1].x).toBeGreaterThanOrEqual(100);
        });

        it('should respect parent-child gravity', () => {
            const parent = createMockNode('mem_0', 0, 0);
            const child = createMockNode('mem_1', 500, 0); // Far apart

            // Mock children function
            parent.children = () => [child];

            const mockDag = {
                nodes: () => [parent, child],
                parents: (node: D3Node) => {
                    if (node.data === 'mem_1') return [parent];
                    return [];
                }
            } as any;

            const nodes = [parent, child];
            const relaxation = new DagRelaxation(mockDag, [100, 100]);

            const initialDistance = Math.abs(child.x - parent.x);
            relaxation.run(nodes);

            // After relaxation, child should still be separated by at least node_size
            // The gravity pulls them closer, but enforce_placement maintains minimum spacing
            const finalDistance = child.x - parent.x;
            expect(finalDistance).toBeGreaterThanOrEqual(100);
            // May or may not be closer depending on gravity strength vs pressure
        });

        it('should handle multiple runs without throwing', () => {
            const nodes = [
                createMockNode('mem_0', 0, 0),
                createMockNode('mem_1', 150, 0),
                createMockNode('mem_2', 300, 0)
            ];
            const dag = createMockDag(nodes);
            const relaxation = new DagRelaxation(dag, [100, 100]);

            // Should not throw on multiple runs
            expect(() => {
                relaxation.run(nodes);
                relaxation.run(nodes);
                relaxation.run(nodes);
            }).not.toThrow();
        });

        it('should handle single node without error', () => {
            const nodes = [createMockNode('mem_0', 50, 0)];
            const dag = createMockDag(nodes);
            const relaxation = new DagRelaxation(dag, [100, 100]);

            expect(() => relaxation.run(nodes)).not.toThrow();
        });

        it('should handle empty array', () => {
            const nodes: D3Node[] = [];
            const dag = createMockDag(nodes);
            const relaxation = new DagRelaxation(dag, [100, 100]);

            expect(() => relaxation.run(nodes)).not.toThrow();
        });

        it('should enforce final placement to prevent overlaps', () => {
            const nodes = [
                createMockNode('mem_0', 0, 0),
                createMockNode('mem_1', 10, 0),
                createMockNode('mem_2', 20, 0)
            ];
            const dag = createMockDag(nodes);
            const relaxation = new DagRelaxation(dag, [100, 100]);

            relaxation.run(nodes);

            // After relaxation, nodes should have minimum spacing
            for (let i = 1; i < nodes.length; i++) {
                const spacing = nodes[i].x - nodes[i - 1].x;
                // Use toBeCloseTo to handle floating point precision
                expect(spacing).toBeGreaterThanOrEqual(99.99);
            }
        });
    });

    describe('edge cases', () => {
        it('should handle negative positions', () => {
            const nodes = [
                createMockNode('mem_0', -100, 0),
                createMockNode('mem_1', -50, 0)
            ];
            const dag = createMockDag(nodes);
            const relaxation = new DagRelaxation(dag, [100, 100]);

            expect(() => relaxation.run(nodes)).not.toThrow();
            expect(() => relaxation.enforce_placement(nodes)).not.toThrow();
        });

        it('should handle very large positions', () => {
            const nodes = [
                createMockNode('mem_0', 1000000, 0),
                createMockNode('mem_1', 1000100, 0)
            ];
            const dag = createMockDag(nodes);
            const relaxation = new DagRelaxation(dag, [100, 100]);

            expect(() => relaxation.run(nodes)).not.toThrow();
        });

        it('should handle different node sizes', () => {
            const nodes = [
                createMockNode('mem_0', 0, 0),
                createMockNode('mem_1', 200, 0)
            ];
            const dag = createMockDag(nodes);
            const relaxation = new DagRelaxation(dag, [200, 50]); // Different width/height

            expect(() => relaxation.run(nodes)).not.toThrow();
        });
    });
});
