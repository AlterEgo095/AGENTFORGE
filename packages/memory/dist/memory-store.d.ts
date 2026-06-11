/**
 * ALTER EGO OS — Memory Store
 *
 * Main class implementing CRUD operations on episodic memory entries.
 * Stores entries in an internal Map (in-memory for Phase 1).
 * Integrates with EventBus for event emission and CompactionEngine for summarization.
 */
import type { EventBus } from '@alterego/event-bus';
import type { MemoryEntry, MemoryId, MemoryType, MemoryQuery, MemoryStats, MemoryStoreConfig, StoreOptions, MemoryExport, CompactionResult } from './types.js';
export declare class MemoryStore {
    /** Primary storage: MemoryId → MemoryEntry */
    private readonly entries;
    /** Secondary indexes for fast queries */
    private readonly index;
    /** Compaction engine */
    private readonly compactionEngine;
    /** Configuration */
    private readonly config;
    /** Optional event bus for emitting events */
    private readonly eventBus?;
    constructor(config?: MemoryStoreConfig, eventBus?: EventBus);
    /**
     * Store a memory entry.
     * If an entry with the same type+key exists, it will be overwritten (unless overwrite: false).
     */
    store<T = unknown>(type: MemoryType, key: string, value: T, options?: StoreOptions): Promise<MemoryEntry<T>>;
    /**
     * Recall a specific memory entry by type and key.
     * Returns undefined if not found or expired.
     */
    recall<T = unknown>(type: MemoryType, key: string): Promise<MemoryEntry<T> | undefined>;
    /**
     * Recall a memory entry with a fallback default value.
     */
    recallOrDefault<T = unknown>(type: MemoryType, key: string, defaultValue: T): Promise<T>;
    /**
     * Search memories with filters. Supports AND semantics for multiple filters.
     */
    search<T = unknown>(query: MemoryQuery): Promise<MemoryEntry<T>[]>;
    /**
     * Delete a specific memory by ID, or by type+key combination.
     */
    forget(idOrType: MemoryId, key?: string): Promise<boolean>;
    /**
     * Delete all memories of a given type.
     * Returns the number of entries deleted.
     */
    forgetByType(type: MemoryType): Promise<number>;
    /**
     * Compact old memories to save space.
     * If type is specified, only compact that type.
     * Otherwise, compact all types that exceed the threshold.
     */
    compact(type?: MemoryType): Promise<CompactionResult[]>;
    /**
     * Get memory statistics.
     */
    getStats(): Promise<MemoryStats>;
    /**
     * Export all memories as JSON.
     */
    export(): Promise<MemoryExport>;
    /**
     * Import memories from a JSON export.
     * Existing entries with the same ID are overwritten.
     */
    import(data: MemoryExport): Promise<number>;
    /**
     * Clear all memories.
     */
    clear(): Promise<void>;
    private calculateExpiresAt;
    private isExpired;
    private maybeAutoCompact;
    private emitStored;
    private emitRecalled;
    private emitForgotten;
    private emitCompacted;
}
//# sourceMappingURL=memory-store.d.ts.map