/**
 * ALTER EGO OS — Memory Engine Types
 *
 * Core type definitions for the episodic memory system.
 * Supports 8 memory types with TTL, indexing, and compaction.
 */

// ─── Identifiers & Primitives ────────────────────────────────

/** Unique identifier for a memory entry */
export type MemoryId = string;

/** The 8 supported memory types */
export type MemoryType =
  | 'user'
  | 'project'
  | 'prompt'
  | 'decision'
  | 'bug'
  | 'workflow'
  | 'deployment'
  | 'architecture';

/** ISO 8601 timestamp */
export type ISOTimestamp = string;

// ─── Core Interfaces ─────────────────────────────────────────

/** A single episodic memory entry (timestamped event) */
export interface MemoryEntry<T = unknown> {
  /** Unique memory identifier */
  id: MemoryId;
  /** Memory type classification */
  type: MemoryType;
  /** Lookup key within the type namespace */
  key: string;
  /** The stored value */
  value: T;
  /** Tags for categorization and search */
  tags: string[];
  /** When this memory was created */
  createdAt: ISOTimestamp;
  /** When this memory was last updated */
  updatedAt: ISOTimestamp;
  /** When this memory expires (optional) */
  expiresAt?: ISOTimestamp;
  /** Arbitrary metadata */
  metadata?: Record<string, unknown>;
}

/** Options when storing a memory entry */
export interface StoreOptions {
  /** Tags to attach to the memory */
  tags?: string[];
  /** Custom TTL in milliseconds (overrides default for type) */
  ttl?: number;
  /** Arbitrary metadata */
  metadata?: Record<string, unknown>;
  /** Whether to overwrite an existing entry with same type+key (default: true) */
  overwrite?: boolean;
}

/** Query parameters for searching memories */
export interface MemoryQuery {
  /** Filter by memory type */
  type?: MemoryType;
  /** Filter by exact key */
  key?: string;
  /** Filter by key prefix */
  keyPrefix?: string;
  /** Filter by tags (AND semantics — entry must have ALL specified tags) */
  tags?: string[];
  /** Only entries created at or after this timestamp */
  from?: ISOTimestamp;
  /** Only entries created at or before this timestamp */
  to?: ISOTimestamp;
  /** Maximum number of results */
  limit?: number;
  /** Number of results to skip */
  offset?: number;
}

/** Statistics about the memory store */
export interface MemoryStats {
  /** Total number of entries (including expired but not yet cleaned) */
  totalEntries: number;
  /** Count of entries per type */
  entriesByType: Record<MemoryType, number>;
  /** Oldest entry creation timestamp */
  oldestEntry?: ISOTimestamp;
  /** Newest entry creation timestamp */
  newestEntry?: ISOTimestamp;
  /** Number of expired entries still in the store */
  expiredEntries: number;
}

/** Configuration for the memory store */
export interface MemoryStoreConfig {
  /** TTL in milliseconds per memory type */
  defaultTTL?: Partial<Record<MemoryType, number>>;
  /** Maximum entries per type before compaction is triggered */
  maxEntriesPerType?: number;
  /** Compact when total entries exceed this threshold */
  compactionThreshold?: number;
  /** Whether to auto-compact when threshold is exceeded */
  enableAutoCompaction?: boolean;
}

// ─── Compaction Types ────────────────────────────────────────

/** Result of a compaction operation */
export interface CompactionResult {
  /** The memory type that was compacted (undefined if all types) */
  type?: MemoryType;
  /** Number of entries that were compacted (removed) */
  compactedCount: number;
  /** Number of entries remaining after compaction */
  remainingCount: number;
  /** ID of the summary entry created (if any) */
  summaryId?: MemoryId;
}

/** Summary entry produced by compaction */
export interface CompactionSummary {
  /** The type of memories that were summarized */
  type: MemoryType;
  /** How many entries were summarized */
  entryCount: number;
  /** Date range of summarized entries */
  from: ISOTimestamp;
  to: ISOTimestamp;
  /** The summary text or structured data */
  summary: string;
  /** Keys of the entries that were summarized */
  keys: string[];
}

// ─── Export / Import Types ───────────────────────────────────

/** Export format for memory backup */
export interface MemoryExport {
  /** Format version */
  version: string;
  /** When the export was created */
  exportedAt: ISOTimestamp;
  /** The memory entries */
  entries: MemoryEntry[];
  /** Configuration at time of export */
  config: MemoryStoreConfig;
}

// ─── Event Payloads ──────────────────────────────────────────

/** Payload for memory.stored event */
export interface MemoryStoredPayload {
  id: MemoryId;
  type: MemoryType;
  key: string;
}

/** Payload for memory.recalled event */
export interface MemoryRecalledPayload {
  id: MemoryId;
  type: MemoryType;
  key: string;
  hit: boolean;
}

/** Payload for memory.forgotten event */
export interface MemoryForgottenPayload {
  id: MemoryId;
  type: MemoryType;
  key: string;
}

/** Payload for memory.compacted event */
export interface MemoryCompactedPayload {
  type?: MemoryType;
  compactedCount: number;
  remainingCount: number;
}

// ─── Default TTL Values ──────────────────────────────────────

/** Default TTL per memory type in milliseconds */
export const DEFAULT_TTL: Record<MemoryType, number> = {
  user: 30 * 24 * 60 * 60 * 1000,        // 30 days
  project: 90 * 24 * 60 * 60 * 1000,      // 90 days
  prompt: 7 * 24 * 60 * 60 * 1000,        // 7 days
  decision: 180 * 24 * 60 * 60 * 1000,    // 180 days
  bug: 90 * 24 * 60 * 60 * 1000,          // 90 days
  workflow: 30 * 24 * 60 * 60 * 1000,     // 30 days
  deployment: 60 * 24 * 60 * 60 * 1000,   // 60 days
  architecture: 365 * 24 * 60 * 60 * 1000, // 365 days
};

/** All valid memory types */
export const MEMORY_TYPES: MemoryType[] = [
  'user',
  'project',
  'prompt',
  'decision',
  'bug',
  'workflow',
  'deployment',
  'architecture',
];
