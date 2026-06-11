export function topologicalSort(template) {
    const nodes = new Map(template.nodes.map(n => [n.id, n]));
    const inDegree = new Map(template.nodes.map(n => [n.id, 0]));
    for (const edge of template.edges) {
        inDegree.set(edge.to, (inDegree.get(edge.to) || 0) + 1);
    }
    const levels = [];
    let currentLevel = template.nodes.filter(n => inDegree.get(n.id) === 0);
    while (currentLevel.length > 0) {
        levels.push(currentLevel);
        const nextLevel = [];
        for (const node of currentLevel) {
            const outEdges = template.edges.filter(e => e.from === node.id);
            for (const edge of outEdges) {
                const newDegree = (inDegree.get(edge.to) || 1) - 1;
                inDegree.set(edge.to, newDegree);
                if (newDegree === 0) {
                    const targetNode = nodes.get(edge.to);
                    if (targetNode)
                        nextLevel.push(targetNode);
                }
            }
        }
        currentLevel = nextLevel;
    }
    return levels;
}
export function validateDAG(template) {
    const errors = [];
    const nodeIds = new Set(template.nodes.map(n => n.id));
    // Check for missing node references in edges
    for (const edge of template.edges) {
        if (!nodeIds.has(edge.from))
            errors.push(`Edge references missing source node: ${edge.from}`);
        if (!nodeIds.has(edge.to))
            errors.push(`Edge references missing target node: ${edge.to}`);
    }
    // Check for cycles using DFS
    const adjacency = new Map();
    for (const node of template.nodes)
        adjacency.set(node.id, []);
    for (const edge of template.edges) {
        adjacency.get(edge.from)?.push(edge.to);
    }
    const visited = new Set();
    const recursionStack = new Set();
    function hasCycle(nodeId) {
        visited.add(nodeId);
        recursionStack.add(nodeId);
        const neighbors = adjacency.get(nodeId) || [];
        for (const neighbor of neighbors) {
            if (!visited.has(neighbor)) {
                if (hasCycle(neighbor))
                    return true;
            }
            else if (recursionStack.has(neighbor)) {
                return true;
            }
        }
        recursionStack.delete(nodeId);
        return false;
    }
    for (const node of template.nodes) {
        if (!visited.has(node.id)) {
            if (hasCycle(node.id)) {
                errors.push('DAG contains a cycle');
                break;
            }
        }
    }
    return { valid: errors.length === 0, errors };
}
//# sourceMappingURL=dag.js.map