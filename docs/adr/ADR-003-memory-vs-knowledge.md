# ADR-003: Memory vs Knowledge Separation

**Date**: 2026-06-11
**Status**: Accepted
**Deciders**: CTO, Enterprise Architect, AI Engineer

## Context

ALTER EGO OS needs to persist information for future use. The question is: should there be one unified store, or two separate stores with different characteristics?

## Decision

We implement two distinct stores:

### Memory (`@alterego/memory`) — The Journal
- **Nature**: Episodic (timestamped events)
- **Granularity**: Fragments (a decision, an error, a prompt, a correction)
- **Lifecycle**: TTL-based expiration (7-365 days depending on type)
- **Access**: By exact key or time-range query
- **8 types**: User, Project, Prompt, Decision, Bug, Workflow, Deployment, Architecture

### Knowledge (`@alterego/knowledge`) — The Library
- **Nature**: Semantic (meaningful documents)
- **Granularity**: Complete documents (an article, a course, a report)
- **Lifecycle**: Permanent with versioning
- **Access**: By full-text search or semantic search (embeddings)
- **11 types**: PDF, DOCX, Markdown, HTML, article, code, course, image, video, reference, note

## Rationale

| Dimension | Memory | Knowledge |
|-----------|--------|-----------|
| Analogy | Your personal journal | Your bookshelf |
| Purpose | Remember what happened | Accumulate what you know |
| Query | "What did I decide about X on June 5?" | "Find everything I know about Docker networking" |
| Expiry | Yes (TTL) | No (permanent, versioned) |
| Size | Small fragments | Large documents |
| Search | Key + time range | Full-text + semantic |

### Why not merge them?

1. **Different access patterns** — Memory is accessed by key/time (fast lookup), Knowledge by content similarity (search)
2. **Different retention** — Memory expires (old prompts are irrelevant), Knowledge is permanent (a course remains valuable)
3. **Different storage optimization** — Memory benefits from indexing by type/key, Knowledge benefits from inverted index + vector embeddings
4. **Different growth patterns** — Memory grows linearly (then compacts), Knowledge grows indefinitely (then versions)

## Consequences

### Positive
- Clear separation of concerns
- Each store can be optimized for its access pattern
- Memory compaction doesn't affect Knowledge integrity
- Knowledge search quality isn't polluted by transient memory entries

### Negative
- Two stores to maintain
- Potential duplication (a mission outcome in Memory AND a deliverable in Knowledge)
- Need to coordinate between stores (e.g., "store the outcome in Memory AND archive the deliverable in Knowledge")

### Mitigations
- The Orchestrator coordinates both stores — it writes to Memory AND Knowledge after each mission
- Knowledge documents reference Memory entries via correlation IDs
- Future: unify the storage backend (PostgreSQL with different table schemas) while keeping the API separate
