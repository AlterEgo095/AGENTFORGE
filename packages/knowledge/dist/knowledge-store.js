/**
 * ALTER EGO OS — Knowledge Store
 *
 * Main class implementing CRUD operations for the Knowledge Center.
 * Stores documents in an internal Map (in-memory for Phase 1).
 * Integrates with EventBus for event emission, SearchEngine for search,
 * VersionManager for versioning, and DocumentIndex for full-text search.
 */
import { SearchEngine } from './search-engine.js';
import { VersionManager } from './version-manager.js';
// ─── Event Names ─────────────────────────────────────────────
const EVENT_KNOWLEDGE_CREATED = 'knowledge.created';
const EVENT_KNOWLEDGE_UPDATED = 'knowledge.updated';
const EVENT_KNOWLEDGE_DELETED = 'knowledge.deleted';
const EVENT_KNOWLEDGE_SEARCHED = 'knowledge.searched';
const EVENT_KNOWLEDGE_VERSIONED = 'knowledge.versioned';
const EVENT_SOURCE = 'knowledge-center';
// ─── ID Generation ───────────────────────────────────────────
let idCounter = 0;
function generateDocumentId() {
    return `doc_${Date.now()}_${++idCounter}_${Math.random().toString(36).substring(2, 8)}`;
}
function generateRelationshipId() {
    return `rel_${Date.now()}_${++idCounter}_${Math.random().toString(36).substring(2, 8)}`;
}
// ─── KnowledgeStore Implementation ───────────────────────────
export class KnowledgeStore {
    /** Primary storage: DocumentId → KnowledgeDocument */
    documents = new Map();
    /** Document relationships */
    relationships = new Map();
    /** Relationships from a document's perspective: sourceId → relationship ids */
    outgoingRelationships = new Map();
    /** Relationships to a document: targetId → relationship ids */
    incomingRelationships = new Map();
    /** Search engine */
    searchEngine;
    /** Version manager */
    versionManager;
    /** Configuration */
    config;
    /** Optional event bus for emitting events */
    eventBus;
    constructor(config, eventBus) {
        this.eventBus = eventBus;
        this.config = {
            enableSemanticSearch: config?.enableSemanticSearch ?? true,
            maxVersionsPerDocument: config?.maxVersionsPerDocument ?? 50,
            defaultSearchLimit: config?.defaultSearchLimit ?? 20,
            autoSummarize: config?.autoSummarize ?? true,
        };
        this.searchEngine = new SearchEngine({
            enableSemanticSearch: this.config.enableSemanticSearch,
            defaultSearchLimit: this.config.defaultSearchLimit,
        });
        this.versionManager = new VersionManager(this.config.maxVersionsPerDocument);
    }
    // ─── CRUD Operations ────────────────────────────────────
    /**
     * Create a new knowledge document.
     */
    async create(options) {
        const now = new Date().toISOString();
        const doc = {
            id: generateDocumentId(),
            type: options.type,
            title: options.title,
            content: options.content,
            summary: options.summary ?? (this.config.autoSummarize ? this.generateSummary(options.content) : undefined),
            tags: options.tags ?? [],
            category: options.category,
            status: options.status ?? 'draft',
            version: 1,
            source: options.source,
            metadata: options.metadata,
            createdAt: now,
            updatedAt: now,
        };
        this.documents.set(doc.id, doc);
        this.searchEngine.indexDocument(doc);
        this.versionManager.recordInitialVersion(doc);
        await this.emitCreated(doc);
        return doc;
    }
    /**
     * Get a document by ID.
     */
    async get(id) {
        const doc = this.documents.get(id);
        if (!doc)
            return undefined;
        return { ...doc }; // Return a copy to prevent external mutation
    }
    /**
     * Update a document. This creates a new version.
     */
    async update(id, options) {
        const existing = this.documents.get(id);
        if (!existing) {
            throw new Error(`Document not found: ${id}`);
        }
        const now = new Date().toISOString();
        // Merge metadata if provided
        const mergedMetadata = options.metadata
            ? { ...existing.metadata, ...options.metadata }
            : existing.metadata;
        const updated = {
            ...existing,
            title: options.title ?? existing.title,
            content: options.content ?? existing.content,
            summary: options.summary ?? (options.content && this.config.autoSummarize ? this.generateSummary(options.content) : existing.summary),
            tags: options.tags ?? existing.tags,
            category: options.category ?? existing.category,
            status: options.status ?? existing.status,
            version: existing.version + 1,
            parentId: existing.parentId,
            metadata: mergedMetadata,
            updatedAt: now,
        };
        this.documents.set(id, updated);
        this.searchEngine.updateDocument(updated);
        this.versionManager.recordVersion(updated, options.changeDescription);
        await this.emitUpdated(updated);
        await this.emitVersioned(updated, options.changeDescription);
        return updated;
    }
    /**
     * Delete a document by ID.
     */
    async delete(id) {
        const doc = this.documents.get(id);
        if (!doc)
            return false;
        this.documents.delete(id);
        this.searchEngine.removeDocument(id);
        this.versionManager.removeHistory(id);
        // Remove all relationships involving this document
        this.removeRelationshipsForDocument(id);
        await this.emitDeleted(doc);
        return true;
    }
    // ─── Search Operations ──────────────────────────────────
    /**
     * Search for documents matching the given query.
     */
    async search(query) {
        const results = await this.searchEngine.search(query);
        await this.emitSearched(query.text ?? '', results.length);
        return results;
    }
    // ─── Version Operations ─────────────────────────────────
    /**
     * Get the version history for a document.
     */
    async getVersionHistory(id) {
        return this.versionManager.getVersionHistory(id);
    }
    /**
     * Get a specific version of a document.
     */
    async getVersion(id, version) {
        return this.versionManager.getVersion(id, version);
    }
    /**
     * Compare two versions of a document.
     */
    async diffVersions(id, fromVersion, toVersion) {
        return this.versionManager.diff(id, fromVersion, toVersion);
    }
    // ─── Relationship Operations ────────────────────────────
    /**
     * Create a relationship between two documents.
     */
    async addRelationship(sourceId, type, targetId, metadata) {
        // Validate both documents exist
        if (!this.documents.has(sourceId)) {
            throw new Error(`Source document not found: ${sourceId}`);
        }
        if (!this.documents.has(targetId)) {
            throw new Error(`Target document not found: ${targetId}`);
        }
        // Check for duplicate relationship
        const existing = this.findRelationship(sourceId, type, targetId);
        if (existing) {
            return existing;
        }
        const rel = {
            sourceId,
            type,
            targetId,
            createdAt: new Date().toISOString(),
            metadata,
        };
        const relId = generateRelationshipId();
        this.relationships.set(relId, rel);
        // Update outgoing index
        if (!this.outgoingRelationships.has(sourceId)) {
            this.outgoingRelationships.set(sourceId, new Set());
        }
        this.outgoingRelationships.get(sourceId).add(relId);
        // Update incoming index
        if (!this.incomingRelationships.has(targetId)) {
            this.incomingRelationships.set(targetId, new Set());
        }
        this.incomingRelationships.get(targetId).add(relId);
        return rel;
    }
    /**
     * Remove a relationship between two documents.
     */
    async removeRelationship(sourceId, type, targetId) {
        const rel = this.findRelationship(sourceId, type, targetId);
        if (!rel)
            return false;
        // Find and remove the relationship entry
        for (const [relId, relationship] of this.relationships) {
            if (relationship.sourceId === sourceId &&
                relationship.type === type &&
                relationship.targetId === targetId) {
                this.relationships.delete(relId);
                const outgoing = this.outgoingRelationships.get(sourceId);
                if (outgoing) {
                    outgoing.delete(relId);
                    if (outgoing.size === 0) {
                        this.outgoingRelationships.delete(sourceId);
                    }
                }
                const incoming = this.incomingRelationships.get(targetId);
                if (incoming) {
                    incoming.delete(relId);
                    if (incoming.size === 0) {
                        this.incomingRelationships.delete(targetId);
                    }
                }
                return true;
            }
        }
        return false;
    }
    /**
     * Get all relationships for a document (both outgoing and incoming).
     */
    async getRelationships(docId) {
        const results = [];
        const outgoing = this.outgoingRelationships.get(docId);
        if (outgoing) {
            for (const relId of outgoing) {
                const rel = this.relationships.get(relId);
                if (rel)
                    results.push(rel);
            }
        }
        const incoming = this.incomingRelationships.get(docId);
        if (incoming) {
            for (const relId of incoming) {
                const rel = this.relationships.get(relId);
                if (rel)
                    results.push(rel);
            }
        }
        return results;
    }
    /**
     * Get related documents for a given document.
     */
    async getRelatedDocuments(docId, type) {
        const relationships = await this.getRelationships(docId);
        const relatedIds = new Set();
        for (const rel of relationships) {
            if (type && rel.type !== type)
                continue;
            if (rel.sourceId === docId) {
                relatedIds.add(rel.targetId);
            }
            else {
                relatedIds.add(rel.sourceId);
            }
        }
        const documents = [];
        for (const id of relatedIds) {
            const doc = this.documents.get(id);
            if (doc)
                documents.push(doc);
        }
        return documents;
    }
    // ─── Statistics ─────────────────────────────────────────
    /**
     * Get knowledge store statistics.
     */
    async getStats() {
        const documentsByType = {};
        const documentsByStatus = {};
        let oldestDocument;
        let newestDocument;
        const allTags = new Set();
        for (const doc of this.documents.values()) {
            documentsByType[doc.type] = (documentsByType[doc.type] ?? 0) + 1;
            documentsByStatus[doc.status] = (documentsByStatus[doc.status] ?? 0) + 1;
            if (!oldestDocument || doc.createdAt < oldestDocument) {
                oldestDocument = doc.createdAt;
            }
            if (!newestDocument || doc.createdAt > newestDocument) {
                newestDocument = doc.createdAt;
            }
            for (const tag of doc.tags) {
                allTags.add(tag);
            }
        }
        return {
            totalDocuments: this.documents.size,
            documentsByType,
            documentsByStatus,
            totalRelationships: this.relationships.size,
            totalTags: allTags.size,
            oldestDocument,
            newestDocument,
            totalVersions: this.versionManager.getTotalVersionCount(),
        };
    }
    // ─── Export / Import ────────────────────────────────────
    /**
     * Export all knowledge as JSON.
     */
    async export() {
        const documents = [...this.documents.values()];
        const relationships = [...this.relationships.values()];
        return {
            version: '1.0.0',
            exportedAt: new Date().toISOString(),
            documents,
            relationships,
            config: {
                enableSemanticSearch: this.config.enableSemanticSearch,
                maxVersionsPerDocument: this.config.maxVersionsPerDocument,
                defaultSearchLimit: this.config.defaultSearchLimit,
                autoSummarize: this.config.autoSummarize,
            },
        };
    }
    /**
     * Import knowledge from a JSON export.
     * Existing documents with the same ID are overwritten.
     * Returns the number of documents imported.
     */
    async import(data) {
        let importedCount = 0;
        for (const doc of data.documents) {
            const existing = this.documents.get(doc.id);
            if (existing) {
                this.searchEngine.removeDocument(doc.id);
            }
            this.documents.set(doc.id, doc);
            this.searchEngine.indexDocument(doc);
            importedCount++;
        }
        // Import relationships
        for (const rel of data.relationships) {
            const relId = generateRelationshipId();
            this.relationships.set(relId, rel);
            if (!this.outgoingRelationships.has(rel.sourceId)) {
                this.outgoingRelationships.set(rel.sourceId, new Set());
            }
            this.outgoingRelationships.get(rel.sourceId).add(relId);
            if (!this.incomingRelationships.has(rel.targetId)) {
                this.incomingRelationships.set(rel.targetId, new Set());
            }
            this.incomingRelationships.get(rel.targetId).add(relId);
        }
        return importedCount;
    }
    // ─── Lifecycle ──────────────────────────────────────────
    /**
     * Clear all documents, relationships, and indexes.
     */
    async clear() {
        this.documents.clear();
        this.relationships.clear();
        this.outgoingRelationships.clear();
        this.incomingRelationships.clear();
        this.searchEngine.clear();
        this.versionManager.clear();
    }
    // ─── Private Helpers ────────────────────────────────────
    /**
     * Generate a simple summary from content.
     * For Phase 1, this just takes the first N characters.
     * In Phase 2, this will use an LLM.
     */
    generateSummary(content) {
        const maxSummaryLength = 200;
        const trimmed = content.trim();
        if (trimmed.length <= maxSummaryLength)
            return trimmed;
        // Try to cut at the last sentence boundary within the limit
        const truncated = trimmed.substring(0, maxSummaryLength);
        const lastSentenceEnd = Math.max(truncated.lastIndexOf('.'), truncated.lastIndexOf('!'), truncated.lastIndexOf('?'));
        if (lastSentenceEnd > maxSummaryLength * 0.5) {
            return truncated.substring(0, lastSentenceEnd + 1);
        }
        return truncated + '...';
    }
    /**
     * Find an existing relationship between two documents.
     */
    findRelationship(sourceId, type, targetId) {
        const outgoing = this.outgoingRelationships.get(sourceId);
        if (!outgoing)
            return undefined;
        for (const relId of outgoing) {
            const rel = this.relationships.get(relId);
            if (rel && rel.type === type && rel.targetId === targetId) {
                return rel;
            }
        }
        return undefined;
    }
    /**
     * Remove all relationships involving a given document.
     */
    removeRelationshipsForDocument(docId) {
        const relsToRemove = [];
        // Outgoing
        const outgoing = this.outgoingRelationships.get(docId);
        if (outgoing) {
            relsToRemove.push(...outgoing);
        }
        // Incoming
        const incoming = this.incomingRelationships.get(docId);
        if (incoming) {
            relsToRemove.push(...incoming);
        }
        for (const relId of relsToRemove) {
            const rel = this.relationships.get(relId);
            if (rel) {
                this.relationships.delete(relId);
                const srcOutgoing = this.outgoingRelationships.get(rel.sourceId);
                if (srcOutgoing) {
                    srcOutgoing.delete(relId);
                    if (srcOutgoing.size === 0) {
                        this.outgoingRelationships.delete(rel.sourceId);
                    }
                }
                const tgtIncoming = this.incomingRelationships.get(rel.targetId);
                if (tgtIncoming) {
                    tgtIncoming.delete(relId);
                    if (tgtIncoming.size === 0) {
                        this.incomingRelationships.delete(rel.targetId);
                    }
                }
            }
        }
    }
    // ─── Event Emission ─────────────────────────────────────
    async emitCreated(doc) {
        if (!this.eventBus)
            return;
        const payload = {
            id: doc.id,
            type: doc.type,
            title: doc.title,
        };
        await this.eventBus.emit({
            type: EVENT_KNOWLEDGE_CREATED,
            payload,
            source: EVENT_SOURCE,
        });
    }
    async emitUpdated(doc) {
        if (!this.eventBus)
            return;
        const payload = {
            id: doc.id,
            type: doc.type,
            title: doc.title,
            version: doc.version,
        };
        await this.eventBus.emit({
            type: EVENT_KNOWLEDGE_UPDATED,
            payload,
            source: EVENT_SOURCE,
        });
    }
    async emitDeleted(doc) {
        if (!this.eventBus)
            return;
        const payload = {
            id: doc.id,
            type: doc.type,
            title: doc.title,
        };
        await this.eventBus.emit({
            type: EVENT_KNOWLEDGE_DELETED,
            payload,
            source: EVENT_SOURCE,
        });
    }
    async emitSearched(query, resultCount) {
        if (!this.eventBus)
            return;
        const payload = {
            query,
            resultCount,
        };
        await this.eventBus.emit({
            type: EVENT_KNOWLEDGE_SEARCHED,
            payload,
            source: EVENT_SOURCE,
        });
    }
    async emitVersioned(doc, changeDescription) {
        if (!this.eventBus)
            return;
        const payload = {
            id: doc.id,
            version: doc.version,
            changeDescription,
        };
        await this.eventBus.emit({
            type: EVENT_KNOWLEDGE_VERSIONED,
            payload,
            source: EVENT_SOURCE,
        });
    }
}
//# sourceMappingURL=knowledge-store.js.map