/**
 * ALTER EGO OS — Compaction Engine
 *
 * Summarizes old memories when a threshold is exceeded.
 * Groups entries by type and creates summary entries for the oldest ones,
 * reducing memory footprint while preserving knowledge.
 */
import type { MemoryEntry, MemoryId, MemoryType, CompactionResult, CompactionSummary, MemoryStoreConfig } from './types.js';
/**
 * CompactionEngine handles the summarization of old memory entries.
 * It groups entries by type and creates a summary entry for the oldest ones.
 */
export declare class CompactionEngine {
    private readonly config;
    constructor(config?: MemoryStoreConfig);
    /**
     * Determine which entries should be compacted for a given type.
     * Returns the entries to compact (oldest ones) and entries to keep.
     *
     * @param entries - All entries of a given type, sorted oldest first
     * @param maxKeep - Maximum entries to keep (defaults to config)
     * @returns Object with entries to compact and entries to keep
     */
    selectEntriesForCompaction(entries: MemoryEntry[], maxKeep?: number): {
        toCompact: MemoryEntry[];
        toKeep: MemoryEntry[];
    };
    /**
     * Create a summary of the compacted entries.
     * This produces a CompactionSummary that can be stored as a new memory entry.
     */
    createSummary(type: MemoryType, entries: MemoryEntry[]): CompactionSummary;
    /**
     * Create a summary MemoryEntry from compacted entries.
     * This entry can be stored in the memory store.
     */
    createSummaryEntry(type: MemoryType, entries: MemoryEntry[], idGenerator: () => MemoryId): MemoryEntry<CompactionSummary>;
    /**
     * Check if compaction is needed for the total number of entries.
     */
    needsCompaction(totalEntries: number): boolean;
    /**
     * Check if compaction is needed for a specific type.
     */
    needsCompactionByType(entriesOfType: number): boolean;
    /**
     * Run compaction on a set of entries grouped by type.
     * Returns compaction results for each type that was compacted.
     */
    compactAll(entriesByType: Map<MemoryType, MemoryEntry[]>, idGenerator: () => MemoryId): {
        results: CompactionResult[];
        summaryEntries: MemoryEntry[];
        idsToRemove: Set<MemoryId>;
    };
}
//# sourceMappingURL=compaction.d.ts.map