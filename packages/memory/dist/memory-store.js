/**
 * ALTER EGO OS — Memory Store
 *
 * Main class implementing CRUD operations on episodic memory entries.
 * Stores entries in an internal Map (in-memory for Phase 1).
 * Integrates with EventBus for event emission and CompactionEngine for summarization.
 */
import { DEFAULT_TTL, MEMORY_TYPES } from './types.js';
import { MemoryIndex } from './memory-index.js';
import { CompactionEngine } from './compaction.js';
// ─── Event Names ─────────────────────────────────────────────
const EVENT_MEMORY_STORED = 'memory.stored';
const EVENT_MEMORY_RECALLED = 'memory.recalled';
const EVENT_MEMORY_FORGOTTEN = 'memory.forgotten';
const EVENT_MEMORY_COMPACTED = 'memory.compacted';
const EVENT_SOURCE = 'memory-engine';
// ─── ID Generation ───────────────────────────────────────────
let idCounter = 0;
function generateMemoryId() {
    return `mem_${Date.now()}_${++idCounter}_${Math.random().toString(36).substring(2, 8)}`;
}
// ─── MemoryStore Implementation ──────────────────────────────
export class MemoryStore {
    /** Primary storage: MemoryId → MemoryEntry */
    entries = new Map();
    /** Secondary indexes for fast queries */
    index = new MemoryIndex();
    /** Compaction engine */
    compactionEngine;
    /** Configuration */
    config;
    /** Optional event bus for emitting events */
    eventBus;
    constructor(config, eventBus) {
        this.eventBus = eventBus;
        const defaultTTL = { ...DEFAULT_TTL };
        this.config = {
            defaultTTL: { ...defaultTTL, ...config?.defaultTTL },
            maxEntriesPerType: config?.maxEntriesPerType ?? 500,
            compactionThreshold: config?.compactionThreshold ?? 1000,
            enableAutoCompaction: config?.enableAutoCompaction ?? false,
        };
        this.compactionEngine = new CompactionEngine({
            maxEntriesPerType: this.config.maxEntriesPerType,
            compactionThreshold: this.config.compactionThreshold,
        });
    }
    // ─── CRUD Operations ────────────────────────────────────
    /**
     * Store a memory entry.
     * If an entry with the same type+key exists, it will be overwritten (unless overwrite: false).
     */
    async store(type, key, value, options) {
        const now = new Date().toISOString();
        // Check for existing entry with same type+key
        const existingId = this.index.getByKey(type, key);
        if (existingId) {
            const existing = this.entries.get(existingId);
            if (existing && options?.overwrite !== false) {
                // Update existing entry
                const updated = {
                    ...existing,
                    value,
                    tags: options?.tags ?? existing.tags,
                    updatedAt: now,
                    expiresAt: this.calculateExpiresAt(type, options?.ttl),
                    metadata: options?.metadata ?? existing.metadata,
                };
                this.entries.set(existingId, updated);
                this.index.updateEntry(existing, updated);
                await this.emitStored(updated);
                return updated;
            }
            if (options?.overwrite === false) {
                throw new Error(`Memory entry already exists: ${type}:${key}`);
            }
        }
        // Create new entry
        const entry = {
            id: generateMemoryId(),
            type,
            key,
            value,
            tags: options?.tags ?? [],
            createdAt: now,
            updatedAt: now,
            expiresAt: this.calculateExpiresAt(type, options?.ttl),
            metadata: options?.metadata,
        };
        this.entries.set(entry.id, entry);
        this.index.addEntry(entry);
        await this.emitStored(entry);
        // Auto-compaction check
        if (this.config.enableAutoCompaction) {
            await this.maybeAutoCompact();
        }
        return entry;
    }
    /**
     * Recall a specific memory entry by type and key.
     * Returns undefined if not found or expired.
     */
    async recall(type, key) {
        const id = this.index.getByKey(type, key);
        if (!id) {
            await this.emitRecalled(type, key, false);
            return undefined;
        }
        const entry = this.entries.get(id);
        if (!entry) {
            await this.emitRecalled(type, key, false);
            return undefined;
        }
        // Check expiration
        if (this.isExpired(entry)) {
            await this.forget(entry.id);
            await this.emitRecalled(type, key, false);
            return undefined;
        }
        await this.emitRecalled(type, key, true);
        return entry;
    }
    /**
     * Recall a memory entry with a fallback default value.
     */
    async recallOrDefault(type, key, defaultValue) {
        const entry = await this.recall(type, key);
        return entry?.value ?? defaultValue;
    }
    /**
     * Search memories with filters. Supports AND semantics for multiple filters.
     */
    async search(query) {
        // Use index to get candidate IDs
        const candidateIds = this.index.query(query);
        // Fetch entries and filter expired
        const results = [];
        for (const id of candidateIds) {
            const entry = this.entries.get(id);
            if (entry && !this.isExpired(entry)) {
                results.push(entry);
            }
        }
        // Sort by createdAt descending (newest first)
        results.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        // Apply offset and limit
        const offset = query.offset ?? 0;
        const limit = query.limit ?? results.length;
        return results.slice(offset, offset + limit);
    }
    /**
     * Delete a specific memory by ID, or by type+key combination.
     */
    async forget(idOrType, key) {
        let entry;
        if (key !== undefined) {
            // First arg is type, second is key
            const eid = this.index.getByKey(idOrType, key);
            if (!eid)
                return false;
            entry = this.entries.get(eid);
        }
        else {
            // First arg is a MemoryId
            entry = this.entries.get(idOrType);
        }
        if (!entry)
            return false;
        this.entries.delete(entry.id);
        this.index.removeEntry(entry);
        await this.emitForgotten(entry);
        return true;
    }
    /**
     * Delete all memories of a given type.
     * Returns the number of entries deleted.
     */
    async forgetByType(type) {
        const ids = this.index.removeByType(type);
        let count = 0;
        for (const id of ids) {
            const entry = this.entries.get(id);
            if (entry) {
                this.entries.delete(id);
                await this.emitForgotten(entry);
                count++;
            }
        }
        return count;
    }
    // ─── Compaction ─────────────────────────────────────────
    /**
     * Compact old memories to save space.
     * If type is specified, only compact that type.
     * Otherwise, compact all types that exceed the threshold.
     */
    async compact(type) {
        const entriesByType = new Map();
        if (type) {
            const ids = this.index.getByType(type);
            const entries = [];
            for (const id of ids) {
                const entry = this.entries.get(id);
                if (entry && !this.isExpired(entry)) {
                    entries.push(entry);
                }
            }
            entriesByType.set(type, entries);
        }
        else {
            // Group all entries by type
            for (const t of MEMORY_TYPES) {
                const ids = this.index.getByType(t);
                const entries = [];
                for (const id of ids) {
                    const entry = this.entries.get(id);
                    if (entry && !this.isExpired(entry)) {
                        entries.push(entry);
                    }
                }
                if (entries.length > 0) {
                    entriesByType.set(t, entries);
                }
            }
        }
        const { results, summaryEntries, idsToRemove } = this.compactionEngine.compactAll(entriesByType, generateMemoryId);
        // Remove compacted entries
        for (const id of idsToRemove) {
            const entry = this.entries.get(id);
            if (entry) {
                this.entries.delete(id);
                this.index.removeEntry(entry);
            }
        }
        // Store summary entries
        for (const summaryEntry of summaryEntries) {
            this.entries.set(summaryEntry.id, summaryEntry);
            this.index.addEntry(summaryEntry);
        }
        // Emit compaction events
        for (const result of results) {
            await this.emitCompacted(result);
        }
        return results;
    }
    // ─── Statistics ─────────────────────────────────────────
    /**
     * Get memory statistics.
     */
    async getStats() {
        const entriesByType = {};
        for (const type of MEMORY_TYPES) {
            entriesByType[type] = 0;
        }
        let oldestEntry;
        let newestEntry;
        let expiredCount = 0;
        let totalEntries = 0;
        for (const entry of this.entries.values()) {
            totalEntries++;
            entriesByType[entry.type]++;
            if (!oldestEntry || entry.createdAt < oldestEntry) {
                oldestEntry = entry.createdAt;
            }
            if (!newestEntry || entry.createdAt > newestEntry) {
                newestEntry = entry.createdAt;
            }
            if (this.isExpired(entry)) {
                expiredCount++;
            }
        }
        return {
            totalEntries,
            entriesByType,
            oldestEntry,
            newestEntry,
            expiredEntries: expiredCount,
        };
    }
    // ─── Export / Import ────────────────────────────────────
    /**
     * Export all memories as JSON.
     */
    async export() {
        const entries = [...this.entries.values()];
        // Filter out expired entries from export
        const activeEntries = entries.filter((e) => !this.isExpired(e));
        return {
            version: '1.0.0',
            exportedAt: new Date().toISOString(),
            entries: activeEntries,
            config: {
                defaultTTL: this.config.defaultTTL,
                maxEntriesPerType: this.config.maxEntriesPerType,
                compactionThreshold: this.config.compactionThreshold,
                enableAutoCompaction: this.config.enableAutoCompaction,
            },
        };
    }
    /**
     * Import memories from a JSON export.
     * Existing entries with the same ID are overwritten.
     */
    async import(data) {
        let importedCount = 0;
        for (const entry of data.entries) {
            // Skip expired entries
            if (this.isExpired(entry))
                continue;
            const existing = this.entries.get(entry.id);
            if (existing) {
                this.index.removeEntry(existing);
            }
            this.entries.set(entry.id, entry);
            this.index.addEntry(entry);
            importedCount++;
        }
        return importedCount;
    }
    // ─── Lifecycle ──────────────────────────────────────────
    /**
     * Clear all memories.
     */
    async clear() {
        this.entries.clear();
        this.index.clear();
    }
    // ─── Private Helpers ────────────────────────────────────
    calculateExpiresAt(type, customTTL) {
        const ttl = customTTL ?? this.config.defaultTTL[type];
        if (ttl === undefined || ttl === null)
            return undefined;
        const expiresAt = new Date(Date.now() + ttl);
        return expiresAt.toISOString();
    }
    isExpired(entry) {
        if (!entry.expiresAt)
            return false;
        return new Date(entry.expiresAt).getTime() <= Date.now();
    }
    async maybeAutoCompact() {
        if (this.entries.size >= this.config.compactionThreshold) {
            await this.compact();
        }
    }
    // ─── Event Emission ─────────────────────────────────────
    async emitStored(entry) {
        if (!this.eventBus)
            return;
        const payload = {
            id: entry.id,
            type: entry.type,
            key: entry.key,
        };
        await this.eventBus.emit({
            type: EVENT_MEMORY_STORED,
            payload,
            source: EVENT_SOURCE,
        });
    }
    async emitRecalled(type, key, hit) {
        if (!this.eventBus)
            return;
        const payload = { id: '', type, key, hit };
        await this.eventBus.emit({
            type: EVENT_MEMORY_RECALLED,
            payload,
            source: EVENT_SOURCE,
        });
    }
    async emitForgotten(entry) {
        if (!this.eventBus)
            return;
        const payload = {
            id: entry.id,
            type: entry.type,
            key: entry.key,
        };
        await this.eventBus.emit({
            type: EVENT_MEMORY_FORGOTTEN,
            payload,
            source: EVENT_SOURCE,
        });
    }
    async emitCompacted(result) {
        if (!this.eventBus)
            return;
        const payload = {
            type: result.type,
            compactedCount: result.compactedCount,
            remainingCount: result.remainingCount,
        };
        await this.eventBus.emit({
            type: EVENT_MEMORY_COMPACTED,
            payload,
            source: EVENT_SOURCE,
        });
    }
}
//# sourceMappingURL=memory-store.js.map