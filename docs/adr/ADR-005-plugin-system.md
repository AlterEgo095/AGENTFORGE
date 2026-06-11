# ADR-005: Plugin System for Agent Extensibility

**Date**: 2026-06-11
**Status**: Accepted
**Deciders**: CTO, Enterprise Architect, Product Designer

## Context

ALTER EGO OS needs to support an ever-growing set of specialized agents (Browser, Writer, PDF, DOCX, Slides, VPS, GitHub, etc.). The question is: should these agents be built into the core system, or loaded as plugins?

## Decision

All agents are **plugins** loaded via the `@alterego/plugin-loader`. The kernel knows nothing about any agent.

### Plugin Lifecycle

```
Register → Load → Active → Unload
         ↓
        Error (recoverable)
```

### Plugin Contract

Every plugin must:
1. Provide a **Manifest** (id, name, version, type, capabilities, dependencies)
2. Implement an **Initializer** function that receives a PluginContext and returns the plugin instance
3. Optionally implement `dispose()`, `destroy()`, or `healthCheck()` methods

### Plugin Context

```typescript
interface PluginContext {
  eventBus: EventBus;     // For inter-plugin communication
  memory: MemoryStore;    // For episodic memory access
  knowledge: KnowledgeStore; // For document library access
  logger: Logger;         // For structured logging
  config: Record<string, unknown>; // Plugin-specific configuration
}
```

### Dependency Validation

If plugin B depends on plugin A, then:
- A must be registered AND loaded before B can be loaded
- The PluginLoader validates dependencies before loading
- Circular dependencies are rejected

## Rationale

### Why plugins over built-in agents?

| Built-in Agents | Plugin Agents |
|----------------|---------------|
| Modify core code to add agents | Register a plugin to add agents |
| All agents are always loaded | Load only needed agents |
- Risk of core instability with each new agent
- Cannot disable agents without code changes
- Testing requires all agents to be present
| Tight coupling | Loose coupling via EventBus |
| Hard to version independently | Each plugin has its own version |

### Why not microservices?

| Microservices | Plugins |
|---------------|---------|
| Network communication overhead | In-process communication |
| Complex deployment | Simple deployment (copy files) |
| Independent scaling | Shared process scaling |
- Overkill for a personal OS
- Network latency is unacceptable for real-time orchestration
- Deployment complexity is not justified for a single-user system

## Consequences

### Positive
- The kernel NEVER changes — absolute stability guarantee
- Agents can be added, removed, or updated independently
- Plugin marketplace is possible (Phase 5)
- Each plugin is independently testable
- System footprint is minimal (load only what you need)

### Negative
- Plugin loading order matters (dependency validation)
- No compile-time checking that plugins implement the correct interface
- Plugin errors can affect the entire system if not properly sandboxed

### Mitigations
- PluginLoader validates dependencies before loading
- SecurityGate provides sandboxing for untrusted plugins
- HealthMonitor tracks plugin health and can auto-restart failed plugins
- TypeScript interfaces for plugin contracts (runtime check + type hints)
