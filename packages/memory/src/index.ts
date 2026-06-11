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

// Types
export type {
  MemoryId,
  MemoryType,
  ISOTimestamp,
  MemoryEntry,
  StoreOptions,
  MemoryQuery,
  MemoryStats,
  MemoryStoreConfig,
  CompactionResult,
  CompactionSummary,
  MemoryExport,
  MemoryStoredPayload,
  MemoryRecalledPayload,
  MemoryForgottenPayload,
  MemoryCompactedPayload,
} from './types.js';

// Constants
export { DEFAULT_TTL, MEMORY_TYPES } from './types.js';
