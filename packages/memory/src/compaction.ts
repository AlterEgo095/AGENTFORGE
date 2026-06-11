/**
 * ALTER EGO OS — Compaction Engine
 *
 * Summarizes old memories when a threshold is exceeded.
 * Groups entries by type and creates summary entries for the oldest ones,
 * reducing memory footprint while preserving knowledge.
 */

import type {
  MemoryEntry,
  MemoryId,
  MemoryType,
  CompactionResult,
  CompactionSummary,
  MemoryStoreConfig,
} from './types.js';
import { MEMORY_TYPES } from './types.js';

/** Default compaction configuration */
const DEFAULT_COMPACTION_THRESHOLD = 1000;
const DEFAULT_MAX_ENTRIES_PER_TYPE = 500;
const COMPACTION_RATIO = 0.5; // Compact oldest 50% of entries

/**
 * CompactionEngine handles the summarization of old memory entries.
 * It groups entries by type and creates a summary entry for the oldest ones.
 */
export class CompactionEngine {
  private readonly config: Required<Pick<MemoryStoreConfig, 'compactionThreshold' | 'maxEntriesPerType'>>;

  constructor(config?: MemoryStoreConfig) {
    this.config = {
      compactionThreshold: config?.compactionThreshold ?? DEFAULT_COMPACTION_THRESHOLD,
      maxEntriesPerType: config?.maxEntriesPerType ?? DEFAULT_MAX_ENTRIES_PER_TYPE,
    };
  }

  /**
   * Determine which entries should be compacted for a given type.
   * Returns the entries to compact (oldest ones) and entries to keep.
   *
   * @param entries - All entries of a given type, sorted oldest first
   * @param maxKeep - Maximum entries to keep (defaults to config)
   * @returns Object with entries to compact and entries to keep
   */
  selectEntriesForCompaction(
    entries: MemoryEntry[],
    maxKeep?: number
  ): { toCompact: MemoryEntry[]; toKeep: MemoryEntry[] } {
    const keep = maxKeep ?? this.config.maxEntriesPerType;

    if (entries.length <= keep) {
      return { toCompact: [], toKeep: entries };
    }

    // Sort by createdAt ascending (oldest first)
    const sorted = [...entries].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );

    const compactCount = Math.max(
      Math.floor((sorted.length - keep) * COMPACTION_RATIO) + (sorted.length - keep),
      sorted.length - keep
    );

    // We want to compact the oldest entries, keeping the newest
    // The number to compact is however many exceed the keep limit
    const actualCompactCount = sorted.length - keep;

    return {
      toCompact: sorted.slice(0, actualCompactCount),
      toKeep: sorted.slice(actualCompactCount),
    };
  }

  /**
   * Create a summary of the compacted entries.
   * This produces a CompactionSummary that can be stored as a new memory entry.
   */
  createSummary(type: MemoryType, entries: MemoryEntry[]): CompactionSummary {
    if (entries.length === 0) {
      throw new Error('Cannot create summary from empty entries');
    }

    const sorted = [...entries].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );

    const from = sorted[0]!.createdAt;
    const to = sorted[sorted.length - 1]!.createdAt;
    const keys = sorted.map((e) => e.key);

    // Build a human-readable summary
    const summaryParts: string[] = [
      `Compacted ${entries.length} ${type} memories from ${from} to ${to}.`,
      `Keys: ${keys.join(', ')}.`,
    ];

    // Include tag summary
    const allTags = new Set<string>();
    for (const entry of sorted) {
      for (const tag of entry.tags) {
        allTags.add(tag);
      }
    }
    if (allTags.size > 0) {
      summaryParts.push(`Tags: ${[...allTags].join(', ')}.`);
    }

    return {
      type,
      entryCount: entries.length,
      from,
      to,
      summary: summaryParts.join(' '),
      keys,
    };
  }

  /**
   * Create a summary MemoryEntry from compacted entries.
   * This entry can be stored in the memory store.
   */
  createSummaryEntry(
    type: MemoryType,
    entries: MemoryEntry[],
    idGenerator: () => MemoryId
  ): MemoryEntry<CompactionSummary> {
    const summary = this.createSummary(type, entries);
    const now = new Date().toISOString();

    return {
      id: idGenerator(),
      type,
      key: `__compaction_${now}`,
      value: summary,
      tags: ['__compaction', '__summary'],
      createdAt: now,
      updatedAt: now,
      metadata: {
        compactedEntryCount: entries.length,
        compactedDateRange: { from: summary.from, to: summary.to },
      },
    };
  }

  /**
   * Check if compaction is needed for the total number of entries.
   */
  needsCompaction(totalEntries: number): boolean {
    return totalEntries >= this.config.compactionThreshold;
  }

  /**
   * Check if compaction is needed for a specific type.
   */
  needsCompactionByType(entriesOfType: number): boolean {
    return entriesOfType >= this.config.maxEntriesPerType;
  }

  /**
   * Run compaction on a set of entries grouped by type.
   * Returns compaction results for each type that was compacted.
   */
  compactAll(
    entriesByType: Map<MemoryType, MemoryEntry[]>,
    idGenerator: () => MemoryId
  ): { results: CompactionResult[]; summaryEntries: MemoryEntry[]; idsToRemove: Set<MemoryId> } {
    const results: CompactionResult[] = [];
    const summaryEntries: MemoryEntry[] = [];
    const idsToRemove = new Set<MemoryId>();

    for (const type of MEMORY_TYPES) {
      const entries = entriesByType.get(type);
      if (!entries || entries.length === 0) continue;

      if (!this.needsCompactionByType(entries.length)) continue;

      const { toCompact, toKeep } = this.selectEntriesForCompaction(entries);

      if (toCompact.length === 0) continue;

      // Create summary entry
      const summaryEntry = this.createSummaryEntry(type, toCompact, idGenerator);

      // Mark compacted entries for removal
      for (const entry of toCompact) {
        idsToRemove.add(entry.id);
      }

      results.push({
        type,
        compactedCount: toCompact.length,
        remainingCount: toKeep.length + 1, // +1 for summary entry
        summaryId: summaryEntry.id,
      });

      summaryEntries.push(summaryEntry);
    }

    return { results, summaryEntries, idsToRemove };
  }
}
