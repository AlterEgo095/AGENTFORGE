import type { DAGTemplate, DAGNode } from '../types';
export declare function topologicalSort(template: DAGTemplate): DAGNode[][];
export declare function validateDAG(template: DAGTemplate): {
    valid: boolean;
    errors: string[];
};
//# sourceMappingURL=dag.d.ts.map