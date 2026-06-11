/**
 * ALTER EGO OS — Knowledge Store
 *
 * Main class implementing CRUD operations for the Knowledge Center.
 * Stores documents in an internal Map (in-memory for Phase 1).
 * Integrates with EventBus for event emission, SearchEngine for search,
 * VersionManager for versioning, and DocumentIndex for full-text search.
 */
import type { EventBus } from '@alterego/event-bus';
import type { DocumentId, KnowledgeDocument, KnowledgeQuery, KnowledgeStats, KnowledgeStoreConfig, KnowledgeExport, CreateDocumentOptions, UpdateDocumentOptions, SearchResult, DocumentVersion, DocumentRelationship, RelationshipType } from './types.js';
export declare class KnowledgeStore {
    /** Primary storage: DocumentId → KnowledgeDocument */
    private readonly documents;
    /** Document relationships */
    private readonly relationships;
    /** Relationships from a document's perspective: sourceId → relationship ids */
    private readonly outgoingRelationships;
    /** Relationships to a document: targetId → relationship ids */
    private readonly incomingRelationships;
    /** Search engine */
    private readonly searchEngine;
    /** Version manager */
    private readonly versionManager;
    /** Configuration */
    private readonly config;
    /** Optional event bus for emitting events */
    private readonly eventBus?;
    constructor(config?: KnowledgeStoreConfig, eventBus?: EventBus);
    /**
     * Create a new knowledge document.
     */
    create(options: CreateDocumentOptions): Promise<KnowledgeDocument>;
    /**
     * Get a document by ID.
     */
    get(id: DocumentId): Promise<KnowledgeDocument | undefined>;
    /**
     * Update a document. This creates a new version.
     */
    update(id: DocumentId, options: UpdateDocumentOptions): Promise<KnowledgeDocument>;
    /**
     * Delete a document by ID.
     */
    delete(id: DocumentId): Promise<boolean>;
    /**
     * Search for documents matching the given query.
     */
    search(query: KnowledgeQuery): Promise<SearchResult[]>;
    /**
     * Get the version history for a document.
     */
    getVersionHistory(id: DocumentId): Promise<DocumentVersion[]>;
    /**
     * Get a specific version of a document.
     */
    getVersion(id: DocumentId, version: number): Promise<DocumentVersion | undefined>;
    /**
     * Compare two versions of a document.
     */
    diffVersions(id: DocumentId, fromVersion: number, toVersion: number): Promise<{
        from: DocumentVersion;
        to: DocumentVersion;
        fieldsChanged: string[];
    } | undefined>;
    /**
     * Create a relationship between two documents.
     */
    addRelationship(sourceId: DocumentId, type: RelationshipType, targetId: DocumentId, metadata?: Record<string, unknown>): Promise<DocumentRelationship>;
    /**
     * Remove a relationship between two documents.
     */
    removeRelationship(sourceId: DocumentId, type: RelationshipType, targetId: DocumentId): Promise<boolean>;
    /**
     * Get all relationships for a document (both outgoing and incoming).
     */
    getRelationships(docId: DocumentId): Promise<DocumentRelationship[]>;
    /**
     * Get related documents for a given document.
     */
    getRelatedDocuments(docId: DocumentId, type?: RelationshipType): Promise<KnowledgeDocument[]>;
    /**
     * Get knowledge store statistics.
     */
    getStats(): Promise<KnowledgeStats>;
    /**
     * Export all knowledge as JSON.
     */
    export(): Promise<KnowledgeExport>;
    /**
     * Import knowledge from a JSON export.
     * Existing documents with the same ID are overwritten.
     * Returns the number of documents imported.
     */
    import(data: KnowledgeExport): Promise<number>;
    /**
     * Clear all documents, relationships, and indexes.
     */
    clear(): Promise<void>;
    /**
     * Generate a simple summary from content.
     * For Phase 1, this just takes the first N characters.
     * In Phase 2, this will use an LLM.
     */
    private generateSummary;
    /**
     * Find an existing relationship between two documents.
     */
    private findRelationship;
    /**
     * Remove all relationships involving a given document.
     */
    private removeRelationshipsForDocument;
    private emitCreated;
    private emitUpdated;
    private emitDeleted;
    private emitSearched;
    private emitVersioned;
}
//# sourceMappingURL=knowledge-store.d.ts.map