# ALTER EGO OS — Architecture Overview

> **ALTER EGO OS — Your Digital Chief of Staff**
> A Cognitive Personal Operating System that transforms a simple intention into complete deliverables and autonomous actions, without ever compromising the stability of the kernel.

## Vision

ALTER EGO OS is NOT a chatbot. It is a **collaborateur numérique permanent** — a digital chief of staff that:

- Receives **missions** (not prompts)
- Decomposes them into **workflows** (not single API calls)
- Delegates to **specialized agents** (plugins, not hardcoded features)
- Learns from every execution
- Works even when you sleep (via Scheduler/Agenda IA)

The system is built on a core principle: **never break the kernel**. All new capabilities are plugins that implement well-defined interfaces and communicate via the Event Bus.

---

## System Architecture

```
                    ┌─────────────────┐
                    │   UTILISATEUR   │
                    └────────┬────────┘
                             │
                    "Prépare ma formation Docker"
                             │
                    ┌────────▼────────┐
                    │  MISSION CENTER │  ← User Interface
                    │  Agenda IA      │
                    │  Dashboard      │
                    │  Workspace      │
                    └────────┬────────┘
                             │
              ┌──────────────▼──────────────┐
              │     SUPER ORCHESTRATOR       │  ← The Brain
              │  Planner │ Scheduler         │
              │  Reflection │ CostOptimizer  │
              └──────────────┬──────────────┘
                             │
              ┌──────────────▼──────────────┐
              │     WORKFLOW ENGINE          │  ← The Hands
              │  DAG Runtime │ Quality Gates │
              │  Checkpointing │ Recovery    │
              └──────┬───────┬───────┬──────┘
                     │       │       │
            ┌────────▼┐  ┌──▼───┐  ┌▼────────┐
            │ Browser  │  │Writer│  │ VPS     │  ← Plugins (Phase 2+)
            │ Agent    │  │Agent │  │ Agent   │
            └────┬─────┘  └──┬───┘  └────┬────┘
                 │           │           │
         ┌───────▼───────────▼───────────▼───────┐
         │          MEMORY + KNOWLEDGE            │  ← The Base
         │  Épisodique │ Sémantique │ Documents   │
         └───────────────────┬───────────────────┘
                             │
         ┌───────────────────▼───────────────────┐
         │              KERNEL                    │  ← The Foundation
         │  EventBus │ PluginLoader │ Security   │
         │  CostTracker │ HealthMonitor │ Logger  │
         └───────────────────┬───────────────────┘
                             │
         ┌───────────────────▼───────────────────┐
         │         INFRASTRUCTURE                 │  ← The Terrain
         │  PostgreSQL │ Redis │ Docker │ SSH     │
         │  Browser │ APIs │ VPS │ GitHub         │
         └───────────────────────────────────────┘
```

---

## Phase 1 Packages — The Five Pillars

### 1. Kernel (`@alterego/kernel`)
The immutable foundation. Contains only infrastructure that never changes:
- **ConfigManager** — Environment and file-based configuration with validation
- **SecurityGate** — Authorization with glob patterns, sandboxing, audit logging
- **CostTracker** — Token/cost tracking per agent/mission with budget enforcement
- **HealthMonitor** — Heartbeat system with configurable intervals
- **Logger** — Structured JSON logging with child loggers and transports
- **Metrics** — Counters, gauges, histograms, timing measurements
- **Auth** — Authentication context management with role/permission checks

### 2. Event Bus (`@alterego/event-bus`)
The nervous system. All inter-package communication flows through typed async events:
- **Publish/Subscribe** — Async event delivery with wildcard support
- **Request/Reply** — Synchronous communication between agents
- **Middleware** — Pipeline for cross-cutting concerns (logging, tracing, auth)
- **Retry** — Automatic retry with configurable backoff for failed handlers
- **Metrics** — Event counting, processing time, error rates

### 3. Workflow Engine (`@alterego/workflow`)
The hands. Executes DAG-based workflows with:
- **DAG Validation** — No cycles, all nodes reachable, proper edge references
- **Parallel Execution** — Independent nodes run concurrently
- **Task Executor** — Timeout, retry (linear/exponential backoff)
- **Quality Gates** — Validate outputs after each step
- **Checkpointing** — Save/restore workflow state for recovery
- **Human Approval** — Pause for manual validation
- **Templates** — Reusable workflow definitions

### 4. Memory (`@alterego/memory`)
The episodic journal. 8 memory types with TTL:
- **User** (30d) — User preferences and habits
- **Project** (90d) — Project context and decisions
- **Prompt** (7d) — Prompt history and patterns
- **Decision** (180d) — Architectural and strategic decisions
- **Bug** (90d) — Errors encountered and fixes applied
- **Workflow** (30d) — Workflow execution history
- **Deployment** (60d) — Deployment records and outcomes
- **Architecture** (365d) — System architecture decisions

### 5. Knowledge (`@alterego/knowledge`)
The permanent library. Semantic document store with:
- **Document Types** — PDF, DOCX, Markdown, HTML, articles, code, courses, images, videos
- **Full-Text Search** — Inverted index with TF-IDF scoring and highlighting
- **Semantic Search** — Mock embeddings with cosine similarity (Phase 1), pgvector (Phase 2)
- **Versioning** — Every update creates a new version with history and diffs
- **Relationships** — References, depends-on, derived-from, related-to

---

## Cognitive Engines

### Orchestrator (`@alterego/orchestrator`)
The brain. Receives missions and orchestrates their execution:
- **Mission Parsing** — Extract intent, type, constraints from descriptions
- **Template-based Planning** — 9 pre-defined mission templates (formation, research, article, etc.)
- **DAG Generation** — Convert plans into validated DAG definitions
- **Execution Pipeline** — Plan → DAG → Workflow → Result → Reflection → Memory → Knowledge
- **Reflection Integration** — Evaluate execution quality and improvement opportunities

### Reflection (`@alterego/reflection`)
Never accepts the first solution:
- **Multi-strategy evaluation** — Compare approaches on cost, quality, security, performance
- **Weighted scoring** — Configurable criteria with weight-based ranking
- **Strategy fusion** — Combine best aspects of top strategies
- **Historical tracking** — Past reflections for trend analysis

### Learning (`@alterego/learning`)
Gets smarter with every mission:
- **Outcome recording** — Success/failure/corrections/time/cost/quality
- **Pattern discovery** — Identify trends in mission execution
- **Prediction** — Estimate cost/quality/duration for future missions (EWMA-based)
- **Insights** — Generate actionable optimization/warning/best-practice insights

---

## Operational Packages

### Mission Center (`@alterego/mission-center`)
User-facing interface for mission management:
- **5 templates**: Formation Complète, Veille Technologique, Article Professionnel, Présentation, Audit Infrastructure
- **Validation** — Parameter type checking, required field enforcement
- **Tracking** — Real-time mission progress with deliverable collection
- **OrchestratorDelegate** — Decoupled from actual orchestrator via interface

### Scheduler (`@alterego/scheduler`)
The Agenda IA — autonomous execution on schedule:
- **4 schedule types** — Cron, interval, one-time, event-triggered
- **Cron parser** — Supports *, ranges, steps, lists
- **Event triggers** — Execute missions in response to EventBus events
- **Execution history** — Track all scheduled executions with status

### Plugin Loader (`@alterego/plugin-loader`)
The extensibility engine:
- **Plugin lifecycle** — Register → Load → Active → Unload
- **Dependency validation** — Load-order enforcement for dependent plugins
- **PluginContext injection** — EventBus, Memory, Knowledge, Logger, Config
- **Health checking** — Monitor plugin health across the system
- **Capability queries** — Find plugins by type, status, or capability

### Quality Gates (`@alterego/quality-gates`)
Every step is validated:
- **9 domains** — Architecture, Security, Performance, Documentation, Tests, TypeScript, Lint, Build, Custom
- **Composite gates** — AND/OR combinations for complex validation
- **Auto-fix suggestions** — Guide remediation when gates fail

### Cost Optimizer (`@alterego/cost-optimizer`)
Smart model selection:
- **Model profiles** — Quality, speed, cost, capabilities for each LLM
- **Constraint-based selection** — Budget, quality, provider, capability filters
- **Usage tracking** — Per-agent, per-mission, per-model cost reports
- **Savings calculation** — Compare actual vs naive model selection

### Checkpoint (`@alterego/checkpoint`)
State persistence and recovery:
- **Pluggable storage** — InMemoryCheckpointStore (Phase 1), Redis/PostgreSQL (Phase 2)
- **Save/restore** — Workflow and mission state persistence
- **Cleanup** — Age-based checkpoint removal
- **Store swapping** — Change backend at runtime

---

## Package Dependency Graph

```
event-bus ◄──── kernel ◄──── workflow
                    │              │
                    │              ├── checkpoint
                    │              └── quality-gates
                    │
                    ├── memory ◄── knowledge
                    │     │
                    │     └── learning
                    │
                    ├── cost-optimizer
                    │
                    ├── reflection
                    │
                    └── orchestrator ◄── mission-center
                                │           │
                                └── scheduler
                                    │
                              plugin-loader
```

---

## Event Taxonomy

All inter-package communication uses these typed events:

| Event | Source | Purpose |
|-------|--------|---------|
| `config.changed` | Kernel | Configuration updated |
| `security.audit` | Kernel | Security action logged |
| `cost.budget-exceeded` | Kernel | Mission budget exceeded |
| `health.status-changed` | Kernel | Component health changed |
| `workflow.started` | Workflow | Workflow execution began |
| `workflow.completed` | Workflow | Workflow finished successfully |
| `workflow.failed` | Workflow | Workflow failed |
| `workflow.node.started` | Workflow | Node execution began |
| `workflow.node.completed` | Workflow | Node finished |
| `workflow.checkpoint.saved` | Workflow | Checkpoint persisted |
| `workflow.quality.failed` | Workflow | Quality gate failed |
| `memory.stored` | Memory | Memory entry stored |
| `memory.forgotten` | Memory | Memory entry deleted |
| `memory.compacted` | Memory | Memory compaction performed |
| `knowledge.created` | Knowledge | Document created |
| `knowledge.updated` | Knowledge | Document updated |
| `knowledge.deleted` | Knowledge | Document deleted |
| `knowledge.searched` | Knowledge | Search performed |
| `knowledge.versioned` | Knowledge | New version created |
| `mission.submitted` | Orchestrator | Mission submitted |
| `mission.planning` | Orchestrator | Planning in progress |
| `mission.executing` | Orchestrator | Execution in progress |
| `mission.completed` | Orchestrator | Mission completed |
| `mission.failed` | Orchestrator | Mission failed |
| `reflection.completed` | Reflection | Reflection performed |
| `learning.outcome.recorded` | Learning | Outcome recorded |
| `learning.pattern.discovered` | Learning | Pattern found |
| `learning.insight.generated` | Learning | Insight generated |
| `quality.gateEvaluated` | QualityGates | Gate evaluated |
| `quality.reportGenerated` | QualityGates | Report generated |
| `cost.modelSelected` | CostOptimizer | Model selected |
| `cost.usageRecorded` | CostOptimizer | Usage recorded |
| `checkpoint.saved` | Checkpoint | Checkpoint saved |
| `checkpoint.restored` | Checkpoint | Checkpoint restored |
| `plugin.registered` | PluginLoader | Plugin registered |
| `plugin.loaded` | PluginLoader | Plugin loaded |
| `plugin.unloaded` | PluginLoader | Plugin unloaded |
| `plugin.error` | PluginLoader | Plugin error |
| `mission.created` | MissionCenter | Mission created via center |
| `mission.cancelled` | MissionCenter | Mission cancelled |
| `scheduler.executed` | Scheduler | Scheduled execution triggered |

---

## Test Coverage Summary

| Package | Tests | Status |
|---------|-------|--------|
| event-bus | 18 | ✅ |
| kernel | 108 | ✅ |
| workflow | 62 | ✅ |
| memory | 79 | ✅ |
| knowledge | 94 | ✅ |
| reflection | 42 | ✅ |
| learning | 38 | ✅ |
| quality-gates | 35 | ✅ |
| cost-optimizer | 27 | ✅ |
| checkpoint | 30 | ✅ |
| orchestrator | 84 | ✅ |
| mission-center | 37 | ✅ |
| scheduler | 47 | ✅ |
| plugin-loader | 53 | ✅ |
| **TOTAL** | **754** | **✅** |

---

## Design Principles

1. **Never Break the Kernel** — The kernel is immutable. All extensions are plugins.
2. **Mission-Oriented** — Users submit missions, not prompts. The system plans and executes.
3. **Event-Driven** — All communication flows through the EventBus. No direct coupling.
4. **Reflection Before Action** — Never accept the first solution. Compare, evaluate, then decide.
5. **Learn From Every Execution** — Record outcomes, discover patterns, predict future costs.
6. **Quality Gates at Every Step** — No step completes without validation.
7. **Cost Awareness** — Track and optimize token usage across all operations.
8. **Checkpoint Everything** — Every workflow state is persistable and recoverable.
9. **Plugin Extensibility** — Agents, skills, and connectors are plugins, not core features.
10. **Memory + Knowledge** — Episodic memory for context, semantic knowledge for permanence.
