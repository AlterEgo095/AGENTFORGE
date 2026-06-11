/**
 * ALTER EGO OS — Memory Engine
 *
 * Public API for the episodic memory system.
 * Provides CRUD operations, search, compaction, and export/import.
 */
// Main class
export { MemoryStore } from './memory-store.js';
// Supporting classes
export { MemoryIndex } from './memory-index.js';
export { CompactionEngine } from './compaction.js';
// Constants
export { DEFAULT_TTL, MEMORY_TYPES } from './types.js';
//# sourceMappingURL=index.js.map