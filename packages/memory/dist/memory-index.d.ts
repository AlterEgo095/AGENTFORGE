/**
 * ALTER EGO OS — Memory Index
 *
 * In-memory secondary indexes for fast lookups by type, key, tags, and time range.
 * Maintains multiple index structures to support the MemoryQuery interface efficiently.
 */
import type { MemoryEntry, MemoryId, MemoryType, MemoryQuery } from './types.js';
/**
 * MemoryIndex provides O(1) lookups for common query patterns:
 * - By type → Set of entry IDs
 * - By type+key → Single entry ID
 * - By tag → Set of entry IDs
 * - By creation time → Sorted array for range queries
 */
export declare class MemoryIndex {
    /** type → Set of MemoryId */
    private readonly typeIndex;
    /** "type:key" → MemoryId (unique compound key) */
    private readonly keyIndex;
    /** tag → Set of MemoryId */
    private readonly tagIndex;
    /** Sorted array of [timestamp, MemoryId] for time-range queries */
    private readonly timeIndex;
    /**
     * Add a memory entry to all indexes.
     */
    addEntry(entry: MemoryEntry): void;
    /**
     * Remove a memory entry from all indexes.
     */
    removeEntry(entry: MemoryEntry): void;
    /**
     * Update an entry in indexes (remove old, add new).
     * Call this when tags or other indexed fields change.
     */
    updateEntry(oldEntry: MemoryEntry, newEntry: MemoryEntry): void;
    /**
     * Find entry IDs matching the given query using AND semantics.
     * Returns a Set of MemoryId for further processing.
     */
    query(query: MemoryQuery): Set<MemoryId>;
    /**
     * Look up an entry ID by type and key.
     */
    getByKey(type: MemoryType, key: string): MemoryId | undefined;
    /**
     * Get all entry IDs for a given type.
     */
    getByType(type: MemoryType): Set<MemoryId>;
    /**
     * Get all entry IDs for a given tag.
     */
    getByTag(tag: string): Set<MemoryId>;
    /**
     * Count entries by type.
     */
    countByType(type: MemoryType): number;
    /**
     * Get all types that have entries.
     */
    getActiveTypes(): MemoryType[];
    /**
     * Remove all entries of a given type from the index.
     * Returns the IDs that were removed.
     */
    removeByType(type: MemoryType): MemoryId[];
    /**
     * Clear all indexes.
     */
    clear(): void;
    private compoundKey;
    private insertIntoTimeIndex;
    private queryByTimeRange;
    /** Find the first index where timestamp >= target */
    private lowerBound;
}
//# sourceMappingURL=memory-index.d.ts.map