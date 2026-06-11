/**
 * ALTER EGO OS — Document Index
 *
 * Inverted index for fast full-text search across knowledge documents.
 * Supports word matching, term frequency ranking, and multi-field indexing.
 * Indexes the title, content, summary, tags, and category fields.
 */
import type { DocumentId, DocumentType, DocumentStatus, KnowledgeDocument, KnowledgeQuery } from './types.js';
export declare class DocumentIndex {
    /** Inverted index: term → Set of DocumentId */
    private readonly invertedIndex;
    /** Document metadata and term frequencies for ranking */
    private readonly entries;
    /** Type index: type → Set of DocumentId */
    private readonly typeIndex;
    /** Status index: status → Set of DocumentId */
    private readonly statusIndex;
    /** Tag index: tag → Set of DocumentId */
    private readonly tagIndex;
    /** Category index: category → Set of DocumentId */
    private readonly categoryIndex;
    /** Time index: sorted array of [timestamp, DocumentId] */
    private readonly timeIndex;
    /**
     * Add a document to all indexes.
     */
    addDocument(doc: KnowledgeDocument): void;
    /**
     * Remove a document from all indexes.
     */
    removeDocument(docId: DocumentId): void;
    /**
     * Update a document in the index (remove old, add new).
     */
    updateDocument(doc: KnowledgeDocument): void;
    /**
     * Search the inverted index for documents matching the given text.
     * Returns an array of [DocumentId, score] sorted by relevance (highest first).
     * Uses a simplified TF-IDF-like scoring.
     */
    searchText(query: string, limit?: number): Array<{
        id: DocumentId;
        score: number;
    }>;
    /**
     * Extract text highlights (snippets) for a query within a document's content.
     */
    getHighlights(doc: KnowledgeDocument, query: string, maxSnippets?: number): string[];
    /**
     * Query documents using structured filters with AND semantics.
     * Returns a Set of DocumentIds matching all criteria.
     */
    query(query: KnowledgeQuery): Set<DocumentId>;
    /**
     * Get all document IDs for a given type.
     */
    getByType(type: DocumentType): Set<DocumentId>;
    /**
     * Get all document IDs for a given status.
     */
    getByStatus(status: DocumentStatus): Set<DocumentId>;
    /**
     * Get all document IDs for a given tag.
     */
    getByTag(tag: string): Set<DocumentId>;
    /**
     * Get all document IDs for a given category.
     */
    getByCategory(category: string): Set<DocumentId>;
    /**
     * Get the total number of indexed documents.
     */
    size(): number;
    /**
     * Clear all indexes.
     */
    clear(): void;
    private insertIntoTimeIndex;
    private queryByTimeRange;
    private lowerBound;
}
//# sourceMappingURL=document-index.d.ts.map