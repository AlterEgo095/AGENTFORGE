# ADR-002: Event-Driven Communication Pattern

**Date**: 2026-06-11
**Status**: Accepted
**Deciders**: CTO, Enterprise Architect, Principal Engineer

## Context

ALTER EGO OS has 14 packages that need to communicate. The question is: should packages import each other directly, or communicate through an intermediary?

## Decision

All inter-package communication uses the **EventBus** with typed events. No package imports another package's implementation — only types and interfaces.

### Patterns Used

1. **Publish/Subscribe** — For fire-and-forget notifications (e.g., `memory.stored`, `knowledge.created`)
2. **Request/Reply** — For synchronous queries (e.g., an agent requesting memory recall)
3. **Middleware** — For cross-cutting concerns (logging, tracing, authorization)

### Event Naming Convention

```
{source}.{action}
```

Examples:
- `memory.stored` — Memory package stored an entry
- `workflow.node.completed` — Workflow package completed a node
- `mission.submitted` — Orchestrator received a mission
- `plugin.loaded` — PluginLoader loaded a plugin

### Event Envelope

All events carry a standard envelope:
```typescript
interface Event<T> {
  id: string;            // Unique event ID
  type: string;          // Event type (e.g., 'mission.completed')
  payload: T;            // Typed payload
  timestamp: string;     // ISO 8601
  priority: EventPriority; // critical | high | normal | low
  source: string;        // Package that emitted the event
  correlationId?: string; // For tracing event chains
  metadata?: Record<string, unknown>; // For cross-cutting data
}
```

## Rationale

### Why not direct imports?

| Direct Imports | EventBus |
|---------------|----------|
| Compile-time coupling | Runtime decoupling |
| Circular dependency risk | No circular dependencies possible |
| Must know the exact module | Subscribe by event type only |
| Hard to add cross-cutting concerns | Middleware pipeline |
| Hard to test in isolation | Mock the EventBus |

### Why not a shared state store?

Shared state (e.g., a global Redux store) creates implicit coupling — packages must agree on state shape, and changes to state structure break all consumers. EventBus creates explicit contracts through event types.

## Consequences

### Positive
- Packages can be developed, tested, and deployed independently
- New packages can subscribe to existing events without modifying publishers
- Cross-cutting concerns (logging, tracing, auth) are implemented as middleware
- Event sourcing is natural — all state changes are observable

### Negative
- Async-only communication adds latency
- Event chains can be hard to debug without proper tooling
- No compile-time checking that event handlers exist for published events

### Mitigations
- Correlation IDs for tracing event chains across packages
- EventBus metrics for latency monitoring
- Comprehensive event type documentation
- Wildcard subscriptions for audit logging
