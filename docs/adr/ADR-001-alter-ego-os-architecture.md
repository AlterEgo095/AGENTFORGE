# ADR-001: ALTER EGO OS — Kernel-Plugin Architecture

**Date**: 2026-06-11
**Status**: Accepted
**Deciders**: CTO, Enterprise Architect, Principal Engineer

## Context

AgentForge (v2.1) has reached 828 tests, 0 CVE, 0 TS errors. However, the architecture is a monolithic Next.js application where all services (orchestrator, agent-registry, cost-optimizer, cache, autofix, reflection) are tightly coupled in `src/lib/services/`. Adding new capabilities (Browser Agent, Writer Agent, VPS Agent) requires modifying existing code, risking regressions.

The user's vision is to transform AgentForge into **ALTER EGO OS** — a Cognitive Personal Operating System where new capabilities are added as plugins without modifying the kernel.

## Decision

We adopt a **Kernel-Plugin Architecture** with these rules:

1. **The Kernel NEVER changes** — It contains only infrastructure: EventBus, Config, Security, CostTracker, HealthMonitor, Logger, Metrics
2. **All capabilities are plugins** — Agents, skills, connectors are loaded dynamically via the Plugin Loader
3. **Communication via EventBus only** — No direct imports between plugins. All inter-plugin communication uses typed async events
4. **5 permanent pillars** — Kernel, Orchestrator, Memory, Knowledge, Workflow. Everything else is a plugin
5. **Mission-oriented API** — Users submit missions, not prompts. The Orchestrator plans and delegates

## Rationale

### Why Kernel-Plugin over Monolith?

| Monolith | Kernel-Plugin |
|----------|---------------|
| Adding agents requires modifying core code | Adding agents requires registering a plugin |
| Services are tightly coupled | Plugins communicate via EventBus |
| Testing requires the full application | Each plugin is independently testable |
| Growing complexity leads to fragility | Growth is horizontal (more plugins, not more complexity) |
| Risk of regressions with every change | Kernel stability is guaranteed |

### Why 5 Permanent Pillars?

Each pillar answers a fundamental question:
- **Kernel**: How does everything connect?
- **Orchestrator**: Who decides what to do?
- **Memory**: How does the system remember?
- **Knowledge**: How does the system accumulate knowledge?
- **Workflow**: How do tasks chain together?

Removing any pillar makes the system incomplete. Everything else is a plugin that can be added, removed, or replaced independently.

### Why EventBus over Direct Imports?

Direct imports create compile-time coupling. EventBus creates runtime decoupling:
- Plugins can be loaded/unloaded without recompilation
- New plugins can subscribe to existing events without modifying publishers
- Middleware can intercept and transform events for cross-cutting concerns
- Testing is simplified (mock the EventBus, not the entire dependency tree)

## Consequences

### Positive
- **Zero regression risk** — The kernel never changes
- **Unlimited extensibility** — Any new capability is a plugin
- **Independent testability** — Each package has its own test suite
- **Clear boundaries** — Every package has a well-defined interface
- **Event sourcing** — All state changes are observable through events

### Negative
- **Runtime overhead** — EventBus adds a small latency vs direct function calls
- **Debugging complexity** — Event chains can be harder to trace than call stacks
- **Type safety trade-off** — EventBus events are typed at the package level but not at compile-time across packages
- **Learning curve** — Developers must understand the event-driven paradigm

### Mitigations
- Correlation IDs on all events for traceability
- Structured logging with event IDs for debugging
- TypeScript interfaces for all event payloads
- EventBus metrics for performance monitoring

## Implementation

Phase 1 created 14 packages with 754 tests:

```
packages/
├── event-bus/         (18 tests)  — Foundation: typed pub/sub
├── kernel/            (108 tests) — Infrastructure: config, security, cost, health, logger, metrics
├── workflow/          (62 tests)  — DAG runtime with parallel execution, checkpoints, quality gates
├── memory/            (79 tests)  — 8-type episodic memory with TTL and compaction
├── knowledge/         (94 tests)  — Document library with full-text + semantic search
├── orchestrator/      (84 tests)  — Super orchestrator with template-based planning
├── mission-center/    (37 tests)  — User-facing mission management
├── reflection/        (42 tests)  — Multi-strategy evaluation and fusion
├── learning/          (38 tests)  — Outcome recording and pattern discovery
├── scheduler/         (47 tests)  — Cron/interval/event/one-time scheduling
├── plugin-loader/     (53 tests)  — Dynamic plugin lifecycle management
├── cost-optimizer/    (27 tests)  — Model selection and cost tracking
├── quality-gates/     (35 tests)  — Multi-domain validation gates
└── checkpoint/        (30 tests)  — Workflow state persistence
```
