/**
 * ALTER EGO OS — Memory Index
 *
 * In-memory secondary indexes for fast lookups by type, key, tags, and time range.
 * Maintains multiple index structures to support the MemoryQuery interface efficiently.
 */
/**
 * MemoryIndex provides O(1) lookups for common query patterns:
 * - By type → Set of entry IDs
 * - By type+key → Single entry ID
 * - By tag → Set of entry IDs
 * - By creation time → Sorted array for range queries
 */
export class MemoryIndex {
    /** type → Set of MemoryId */
    typeIndex = new Map();
    /** "type:key" → MemoryId (unique compound key) */
    keyIndex = new Map();
    /** tag → Set of MemoryId */
    tagIndex = new Map();
    /** Sorted array of [timestamp, MemoryId] for time-range queries */
    timeIndex = [];
    // ─── Indexing Operations ─────────────────────────────────
    /**
     * Add a memory entry to all indexes.
     */
    addEntry(entry) {
        const { id, type, key, tags, createdAt } = entry;
        // Type index
        if (!this.typeIndex.has(type)) {
            this.typeIndex.set(type, new Set());
        }
        this.typeIndex.get(type).add(id);
        // Key index (compound: type:key)
        const compoundKey = this.compoundKey(type, key);
        this.keyIndex.set(compoundKey, id);
        // Tag index
        for (const tag of tags) {
            if (!this.tagIndex.has(tag)) {
                this.tagIndex.set(tag, new Set());
            }
            this.tagIndex.get(tag).add(id);
        }
        // Time index (sorted insert)
        const timestamp = new Date(createdAt).getTime();
        this.insertIntoTimeIndex(timestamp, id);
    }
    /**
     * Remove a memory entry from all indexes.
     */
    removeEntry(entry) {
        const { id, type, key, tags } = entry;
        // Type index
        const typeSet = this.typeIndex.get(type);
        if (typeSet) {
            typeSet.delete(id);
            if (typeSet.size === 0) {
                this.typeIndex.delete(type);
            }
        }
        // Key index
        const compoundKey = this.compoundKey(type, key);
        this.keyIndex.delete(compoundKey);
        // Tag index
        for (const tag of tags) {
            const tagSet = this.tagIndex.get(tag);
            if (tagSet) {
                tagSet.delete(id);
                if (tagSet.size === 0) {
                    this.tagIndex.delete(tag);
                }
            }
        }
        // Time index (linear scan removal — acceptable for in-memory)
        const timeIdx = this.timeIndex.findIndex(([, eid]) => eid === id);
        if (timeIdx !== -1) {
            this.timeIndex.splice(timeIdx, 1);
        }
    }
    /**
     * Update an entry in indexes (remove old, add new).
     * Call this when tags or other indexed fields change.
     */
    updateEntry(oldEntry, newEntry) {
        if (oldEntry.id !== newEntry.id) {
            // ID changed — full reindex
            this.removeEntry(oldEntry);
            this.addEntry(newEntry);
            return;
        }
        // Check if tags changed
        const oldTags = new Set(oldEntry.tags);
        const newTags = new Set(newEntry.tags);
        const tagsChanged = oldTags.size !== newTags.size || oldEntry.tags.some((t) => !newTags.has(t));
        // Check if type or key changed
        const keyChanged = oldEntry.type !== newEntry.type || oldEntry.key !== newEntry.key;
        if (tagsChanged || keyChanged) {
            this.removeEntry(oldEntry);
            this.addEntry(newEntry);
        }
        else if (oldEntry.createdAt !== newEntry.createdAt) {
            // Only timestamp changed — update time index
            const timeIdx = this.timeIndex.findIndex(([, eid]) => eid === newEntry.id);
            if (timeIdx !== -1) {
                this.timeIndex.splice(timeIdx, 1);
            }
            const timestamp = new Date(newEntry.createdAt).getTime();
            this.insertIntoTimeIndex(timestamp, newEntry.id);
        }
    }
    // ─── Query Operations ───────────────────────────────────
    /**
     * Find entry IDs matching the given query using AND semantics.
     * Returns a Set of MemoryId for further processing.
     */
    query(query) {
        let candidateIds = null;
        // If no filter criteria at all, start with all IDs
        const hasFilters = query.type || query.key || query.keyPrefix || (query.tags && query.tags.length > 0) || query.from || query.to;
        if (!hasFilters) {
            candidateIds = new Set(this.timeIndex.map(([, id]) => id));
        }
        // Filter by type
        if (query.type) {
            const typeIds = this.typeIndex.get(query.type);
            if (!typeIds)
                return new Set();
            candidateIds = new Set(typeIds);
        }
        // Filter by exact key
        if (query.key) {
            const compoundKey = this.compoundKey(query.type ?? 'user', query.key);
            // Wait — if type is not specified, we need to search all types for the key
            if (query.type) {
                const id = this.keyIndex.get(compoundKey);
                if (!id)
                    return new Set();
                if (candidateIds) {
                    if (!candidateIds.has(id))
                        return new Set();
                    candidateIds = new Set([id]);
                }
                else {
                    candidateIds = new Set([id]);
                }
            }
            else {
                // No type specified — search all types for this key
                const keyMatches = new Set();
                for (const [ck, mid] of this.keyIndex) {
                    // compoundKey format is "type:key", check if key part matches
                    const colonIdx = ck.indexOf(':');
                    if (colonIdx !== -1 && ck.substring(colonIdx + 1) === query.key) {
                        keyMatches.add(mid);
                    }
                }
                if (candidateIds) {
                    candidateIds = intersection(candidateIds, keyMatches);
                }
                else {
                    candidateIds = keyMatches;
                }
            }
        }
        // Filter by key prefix
        if (query.keyPrefix) {
            const prefixMatches = new Set();
            for (const [ck, mid] of this.keyIndex) {
                const colonIdx = ck.indexOf(':');
                if (colonIdx !== -1) {
                    const keyPart = ck.substring(colonIdx + 1);
                    if (keyPart.startsWith(query.keyPrefix)) {
                        prefixMatches.add(mid);
                    }
                }
            }
            if (candidateIds) {
                candidateIds = intersection(candidateIds, prefixMatches);
            }
            else {
                candidateIds = prefixMatches;
            }
        }
        // Filter by tags (AND semantics)
        if (query.tags && query.tags.length > 0) {
            let tagMatches = null;
            for (const tag of query.tags) {
                const ids = this.tagIndex.get(tag);
                if (!ids)
                    return new Set(); // AND: if any tag has no matches, result is empty
                if (tagMatches) {
                    tagMatches = intersection(tagMatches, ids);
                }
                else {
                    tagMatches = new Set(ids);
                }
            }
            if (candidateIds && tagMatches) {
                candidateIds = intersection(candidateIds, tagMatches);
            }
            else if (tagMatches) {
                candidateIds = tagMatches;
            }
        }
        // Filter by time range
        if (query.from || query.to) {
            const timeMatches = this.queryByTimeRange(query.from, query.to);
            if (candidateIds) {
                candidateIds = intersection(candidateIds, timeMatches);
            }
            else {
                candidateIds = timeMatches;
            }
        }
        return candidateIds ?? new Set();
    }
    /**
     * Look up an entry ID by type and key.
     */
    getByKey(type, key) {
        return this.keyIndex.get(this.compoundKey(type, key));
    }
    /**
     * Get all entry IDs for a given type.
     */
    getByType(type) {
        return new Set(this.typeIndex.get(type) ?? []);
    }
    /**
     * Get all entry IDs for a given tag.
     */
    getByTag(tag) {
        return new Set(this.tagIndex.get(tag) ?? []);
    }
    /**
     * Count entries by type.
     */
    countByType(type) {
        return this.typeIndex.get(type)?.size ?? 0;
    }
    /**
     * Get all types that have entries.
     */
    getActiveTypes() {
        return [...this.typeIndex.keys()];
    }
    // ─── Bulk Operations ────────────────────────────────────
    /**
     * Remove all entries of a given type from the index.
     * Returns the IDs that were removed.
     */
    removeByType(type) {
        const ids = this.typeIndex.get(type);
        if (!ids)
            return [];
        const removedIds = [...ids];
        // Remove from key index
        for (const [compoundKey, id] of this.keyIndex) {
            if (ids.has(id)) {
                this.keyIndex.delete(compoundKey);
            }
        }
        // Remove from tag index
        for (const [tag, tagSet] of this.tagIndex) {
            for (const id of ids) {
                tagSet.delete(id);
            }
            if (tagSet.size === 0) {
                this.tagIndex.delete(tag);
            }
        }
        // Remove from time index
        for (let i = this.timeIndex.length - 1; i >= 0; i--) {
            if (ids.has(this.timeIndex[i][1])) {
                this.timeIndex.splice(i, 1);
            }
        }
        // Remove from type index
        this.typeIndex.delete(type);
        return removedIds;
    }
    /**
     * Clear all indexes.
     */
    clear() {
        this.typeIndex.clear();
        this.keyIndex.clear();
        this.tagIndex.clear();
        this.timeIndex.length = 0;
    }
    // ─── Private Helpers ────────────────────────────────────
    compoundKey(type, key) {
        return `${type}:${key}`;
    }
    insertIntoTimeIndex(timestamp, id) {
        // Binary search for insertion point
        let low = 0;
        let high = this.timeIndex.length;
        while (low < high) {
            const mid = (low + high) >>> 1;
            if (this.timeIndex[mid][0] < timestamp) {
                low = mid + 1;
            }
            else {
                high = mid;
            }
        }
        this.timeIndex.splice(low, 0, [timestamp, id]);
    }
    queryByTimeRange(from, to) {
        const fromMs = from ? new Date(from).getTime() : -Infinity;
        const toMs = to ? new Date(to).getTime() : Infinity;
        const result = new Set();
        // Binary search for start position
        let startIdx = 0;
        if (fromMs !== -Infinity) {
            startIdx = this.lowerBound(fromMs);
        }
        // Scan forward until we exceed toMs
        for (let i = startIdx; i < this.timeIndex.length; i++) {
            const [ts, id] = this.timeIndex[i];
            if (ts > toMs)
                break;
            if (ts >= fromMs) {
                result.add(id);
            }
        }
        return result;
    }
    /** Find the first index where timestamp >= target */
    lowerBound(target) {
        let low = 0;
        let high = this.timeIndex.length;
        while (low < high) {
            const mid = (low + high) >>> 1;
            if (this.timeIndex[mid][0] < target) {
                low = mid + 1;
            }
            else {
                high = mid;
            }
        }
        return low;
    }
}
// ─── Utility ─────────────────────────────────────────────────
/** Set intersection */
function intersection(a, b) {
    const result = new Set();
    // Iterate over the smaller set for efficiency
    const [smaller, larger] = a.size <= b.size ? [a, b] : [b, a];
    for (const item of smaller) {
        if (larger.has(item)) {
            result.add(item);
        }
    }
    return result;
}
//# sourceMappingURL=memory-index.js.map