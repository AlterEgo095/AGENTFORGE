/**
 * ALTER EGO OS — Version Manager
 *
 * Tracks document versions over time. Each update to a document creates
 * a new version entry while preserving the previous state.
 * Supports version history retrieval, version comparison, and rollback.
 */
import type { DocumentId, KnowledgeDocument, DocumentVersion } from './types.js';
export declare class VersionManager {
    /** Version history: DocumentId → array of version entries (ordered by version) */
    private readonly history;
    /** Current version number per document */
    private readonly currentVersions;
    /** Maximum versions to keep per document */
    private readonly maxVersions;
    constructor(maxVersions?: number);
    /**
     * Record the initial version of a document (version 1).
     */
    recordInitialVersion(doc: KnowledgeDocument): DocumentVersion;
    /**
     * Record a new version of a document.
     * Returns the new DocumentVersion.
     */
    recordVersion(doc: KnowledgeDocument, changeDescription?: string): DocumentVersion;
    /**
     * Get the version history for a document.
     * Returns versions ordered from oldest to newest.
     */
    getVersionHistory(docId: DocumentId): DocumentVersion[];
    /**
     * Get a specific version of a document.
     */
    getVersion(docId: DocumentId, version: number): DocumentVersion | undefined;
    /**
     * Get the current version number for a document.
     */
    getCurrentVersion(docId: DocumentId): number;
    /**
     * Compare two versions of a document.
     * Returns the changes between the two versions.
     */
    diff(docId: DocumentId, fromVersion: number, toVersion: number): {
        from: DocumentVersion;
        to: DocumentVersion;
        fieldsChanged: string[];
    } | undefined;
    /**
     * Remove all version history for a document.
     * Used when a document is permanently deleted.
     */
    removeHistory(docId: DocumentId): void;
    /**
     * Get the total number of version entries across all documents.
     */
    getTotalVersionCount(): number;
    /**
     * Clear all version history.
     */
    clear(): void;
}
//# sourceMappingURL=version-manager.d.ts.map