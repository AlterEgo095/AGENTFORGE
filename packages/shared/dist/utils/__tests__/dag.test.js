// ============================================================
// AgentForge - DAG Utilities Unit Tests
// Tests for topological sort (level-grouped), cycle detection,
// missing node references, and empty DAG handling
// ============================================================
import { describe, it, expect } from 'vitest';
import { topologicalSort, validateDAG } from '../dag';
// Helper to create a DAGNode
function node(id, label, level = 0) {
    return {
        id,
        label: label ?? id,
        level,
        type: 'process',
        agentRole: 'default',
    };
}
describe('DAG Utilities', () => {
    // ═══════════════════════════════════════════════════════
    // Topological Sort
    // ═══════════════════════════════════════════════════════
    describe('topologicalSort', () => {
        it('should return level-grouped arrays for a simple chain', () => {
            const template = {
                nodes: [node('A'), node('B'), node('C')],
                edges: [
                    { from: 'A', to: 'B' },
                    { from: 'B', to: 'C' },
                ],
            };
            const levels = topologicalSort(template);
            expect(levels).toHaveLength(3);
            expect(levels[0].map(n => n.id)).toEqual(['A']);
            expect(levels[1].map(n => n.id)).toEqual(['B']);
            expect(levels[2].map(n => n.id)).toEqual(['C']);
        });
        it('should group independent nodes at the same level', () => {
            const template = {
                nodes: [node('A'), node('B'), node('C')],
                edges: [
                    { from: 'A', to: 'C' },
                    { from: 'B', to: 'C' },
                ],
            };
            const levels = topologicalSort(template);
            expect(levels).toHaveLength(2);
            // First level should have both A and B
            const firstLevelIds = levels[0].map(n => n.id).sort();
            expect(firstLevelIds).toEqual(['A', 'B']);
            expect(levels[1].map(n => n.id)).toEqual(['C']);
        });
        it('should handle diamond-shaped DAG', () => {
            //     A
            //    / \
            //   B   C
            //    \ /
            //     D
            const template = {
                nodes: [node('A'), node('B'), node('C'), node('D')],
                edges: [
                    { from: 'A', to: 'B' },
                    { from: 'A', to: 'C' },
                    { from: 'B', to: 'D' },
                    { from: 'C', to: 'D' },
                ],
            };
            const levels = topologicalSort(template);
            expect(levels).toHaveLength(3);
            expect(levels[0].map(n => n.id)).toEqual(['A']);
            const secondLevel = levels[1].map(n => n.id).sort();
            expect(secondLevel).toEqual(['B', 'C']);
            expect(levels[2].map(n => n.id)).toEqual(['D']);
        });
        it('should handle disconnected components', () => {
            const template = {
                nodes: [node('A'), node('B'), node('C'), node('D')],
                edges: [
                    { from: 'A', to: 'B' },
                    // C and D are disconnected
                ],
            };
            const levels = topologicalSort(template);
            // First level should have A, C, D (no incoming edges)
            const firstLevelIds = levels[0].map(n => n.id).sort();
            expect(firstLevelIds).toContain('A');
            expect(firstLevelIds).toContain('C');
            expect(firstLevelIds).toContain('D');
            // Second level should have B
            expect(levels[1].map(n => n.id)).toEqual(['B']);
        });
        it('should handle a single node with no edges', () => {
            const template = {
                nodes: [node('A')],
                edges: [],
            };
            const levels = topologicalSort(template);
            expect(levels).toHaveLength(1);
            expect(levels[0].map(n => n.id)).toEqual(['A']);
        });
        it('should return correct levels for a complex DAG', () => {
            // Level 0: A, B
            // Level 1: C (depends on A), D (depends on B)
            // Level 2: E (depends on C, D)
            const template = {
                nodes: [node('A'), node('B'), node('C'), node('D'), node('E')],
                edges: [
                    { from: 'A', to: 'C' },
                    { from: 'B', to: 'D' },
                    { from: 'C', to: 'E' },
                    { from: 'D', to: 'E' },
                ],
            };
            const levels = topologicalSort(template);
            expect(levels).toHaveLength(3);
            const level0Ids = levels[0].map(n => n.id).sort();
            expect(level0Ids).toEqual(['A', 'B']);
            const level1Ids = levels[1].map(n => n.id).sort();
            expect(level1Ids).toEqual(['C', 'D']);
            expect(levels[2].map(n => n.id)).toEqual(['E']);
        });
    });
    // ═══════════════════════════════════════════════════════
    // Cycle Detection
    // ═══════════════════════════════════════════════════════
    describe('cycle detection', () => {
        it('should detect a simple cycle', () => {
            const template = {
                nodes: [node('A'), node('B')],
                edges: [
                    { from: 'A', to: 'B' },
                    { from: 'B', to: 'A' },
                ],
            };
            const result = validateDAG(template);
            expect(result.valid).toBe(false);
            expect(result.errors).toContain('DAG contains a cycle');
        });
        it('should detect a self-loop', () => {
            const template = {
                nodes: [node('A')],
                edges: [{ from: 'A', to: 'A' }],
            };
            const result = validateDAG(template);
            expect(result.valid).toBe(false);
            expect(result.errors).toContain('DAG contains a cycle');
        });
        it('should detect a longer cycle', () => {
            const template = {
                nodes: [node('A'), node('B'), node('C')],
                edges: [
                    { from: 'A', to: 'B' },
                    { from: 'B', to: 'C' },
                    { from: 'C', to: 'A' },
                ],
            };
            const result = validateDAG(template);
            expect(result.valid).toBe(false);
            expect(result.errors).toContain('DAG contains a cycle');
        });
        it('should validate a DAG without cycles', () => {
            const template = {
                nodes: [node('A'), node('B'), node('C')],
                edges: [
                    { from: 'A', to: 'B' },
                    { from: 'B', to: 'C' },
                ],
            };
            const result = validateDAG(template);
            expect(result.valid).toBe(true);
            expect(result.errors).toHaveLength(0);
        });
        it('should detect cycle in part of a larger graph', () => {
            // A → B → C → D (linear)
            //      ↑    ↓
            //      └────┘ (cycle between B and C)
            const template = {
                nodes: [node('A'), node('B'), node('C'), node('D')],
                edges: [
                    { from: 'A', to: 'B' },
                    { from: 'B', to: 'C' },
                    { from: 'C', to: 'B' }, // Creates a cycle
                    { from: 'C', to: 'D' },
                ],
            };
            const result = validateDAG(template);
            expect(result.valid).toBe(false);
            expect(result.errors).toContain('DAG contains a cycle');
        });
    });
    // ═══════════════════════════════════════════════════════
    // Missing Node References
    // ═══════════════════════════════════════════════════════
    describe('missing node references', () => {
        it('should detect missing source node in edge', () => {
            const template = {
                nodes: [node('B')],
                edges: [{ from: 'A', to: 'B' }], // A doesn't exist
            };
            const result = validateDAG(template);
            expect(result.valid).toBe(false);
            expect(result.errors).toContain('Edge references missing source node: A');
        });
        it('should detect missing target node in edge', () => {
            const template = {
                nodes: [node('A')],
                edges: [{ from: 'A', to: 'B' }], // B doesn't exist
            };
            const result = validateDAG(template);
            expect(result.valid).toBe(false);
            expect(result.errors).toContain('Edge references missing target node: B');
        });
        it('should detect multiple missing nodes', () => {
            const template = {
                nodes: [node('A')],
                edges: [
                    { from: 'X', to: 'A' }, // X missing
                    { from: 'A', to: 'Y' }, // Y missing
                ],
            };
            const result = validateDAG(template);
            expect(result.valid).toBe(false);
            expect(result.errors).toHaveLength(2);
            expect(result.errors).toContain('Edge references missing source node: X');
            expect(result.errors).toContain('Edge references missing target node: Y');
        });
        it('should detect both missing nodes and cycles', () => {
            const template = {
                nodes: [node('A'), node('B')],
                edges: [
                    { from: 'A', to: 'B' },
                    { from: 'B', to: 'A' },
                    { from: 'C', to: 'A' }, // C missing
                ],
            };
            const result = validateDAG(template);
            expect(result.valid).toBe(false);
            expect(result.errors.length).toBeGreaterThanOrEqual(2);
        });
    });
    // ═══════════════════════════════════════════════════════
    // Empty DAG Handling
    // ═══════════════════════════════════════════════════════
    describe('empty DAG handling', () => {
        it('should handle empty nodes and edges', () => {
            const template = {
                nodes: [],
                edges: [],
            };
            const levels = topologicalSort(template);
            expect(levels).toHaveLength(0);
            const validation = validateDAG(template);
            expect(validation.valid).toBe(true);
        });
        it('should handle nodes with no edges', () => {
            const template = {
                nodes: [node('A'), node('B'), node('C')],
                edges: [],
            };
            const levels = topologicalSort(template);
            expect(levels).toHaveLength(1);
            const levelIds = levels[0].map(n => n.id).sort();
            expect(levelIds).toEqual(['A', 'B', 'C']);
        });
        it('should validate an empty DAG as valid', () => {
            const template = {
                nodes: [],
                edges: [],
            };
            const result = validateDAG(template);
            expect(result.valid).toBe(true);
            expect(result.errors).toHaveLength(0);
        });
        it('should handle edges with no nodes', () => {
            const template = {
                nodes: [],
                edges: [{ from: 'A', to: 'B' }],
            };
            const result = validateDAG(template);
            expect(result.valid).toBe(false);
            expect(result.errors.length).toBeGreaterThan(0);
        });
    });
});
//# sourceMappingURL=dag.test.js.map