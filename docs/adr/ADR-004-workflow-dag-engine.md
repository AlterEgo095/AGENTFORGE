# ADR-004: DAG-Based Workflow Engine

**Date**: 2026-06-11
**Status**: Accepted
**Deciders**: CTO, Principal Engineer, AI Engineer

## Context

ALTER EGO OS needs to execute complex, multi-step missions where some steps can run in parallel and others have dependencies. The question is: how should we model and execute these workflows?

## Decision

We implement a **DAG (Directed Acyclic Graph) Runtime** where:
- Each step is a **Node** with a type (task, gateway, approval, parallel, subworkflow)
- Dependencies are **Edges** connecting nodes
- Independent nodes execute in **parallel**
- Each node can have **timeout**, **retry policy**, and **quality gate**
- Workflow state is **checkpointed** after each node completion
- **Human approval** nodes pause execution until manually approved

### DAG Validation Rules
1. No cycles (acyclic by definition)
2. No self-loops
3. All edge references must point to existing nodes
4. At least one entry node (no incoming edges)
5. All nodes must be reachable from an entry node

### Execution Model

```
Topological Sort → Execution Layers → Parallel Within Layers → Sequential Across Layers

Layer 0: [Research]          ← all run in parallel
Layer 1: [Plan]              ← depends on Research
Layer 2: [Write, Slides, Quiz] ← all run in parallel (depend on Plan)
Layer 3: [Export PDF, Export DOCX] ← depend on Write
Layer 4: [Archive]           ← depends on everything
```

## Rationale

### Why DAG over Linear Pipeline?

| Linear Pipeline | DAG |
|----------------|-----|
| Steps run sequentially | Independent steps run in parallel |
| No branching | Conditional edges for branching |
| No parallelism | Natural parallelism |
| Slow for complex missions | Fast for complex missions |

### Why DAG over State Machine?

| State Machine | DAG |
|--------------|-----|
| States and transitions | Nodes and edges |
| Good for event-driven logic | Good for task dependency logic |
| Can have cycles (loops) | No cycles (prevents infinite loops) |
- State machines are better for reactive systems (e.g., user session management)
- DAGs are better for task orchestration (e.g., mission execution)

We chose DAG because ALTER EGO OS missions are **task-oriented**, not **event-oriented**. A mission has a clear beginning and end, with well-defined steps and dependencies.

## Consequences

### Positive
- Natural parallelism for independent tasks (e.g., generate PDF and DOCX simultaneously)
- No infinite loops (acyclic by definition)
- Checkpoint and resume is straightforward (completed nodes are skipped on resume)
- Quality gates fit naturally between layers

### Negative
- Cannot express loops (e.g., "retry until quality > 90") — must use retry policy instead
- Conditional branching requires edge conditions (more complex DAG definitions)
- Large DAGs can be hard to visualize and debug

### Mitigations
- Retry policies at the node level for quality-driven re-execution
- Visual DAG editor in the Dashboard (Phase 2)
- Workflow templates for common patterns (abstract away DAG complexity)
