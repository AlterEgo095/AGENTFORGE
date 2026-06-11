/**
 * ALTER EGO OS — Search Engine
 *
 * Provides full-text search and semantic search capabilities.
 * For Phase 1, semantic search uses mock hash-based vectors with
 * cosine similarity. Full-text search uses the DocumentIndex
 * inverted index with TF-IDF-like scoring.
 */
import type { DocumentId, KnowledgeDocument, KnowledgeQuery, SearchResult } from './types.js';
import { DocumentIndex } from './document-index.js';
export declare class SearchEngine {
    /** Document index for full-text search */
    private readonly index;
    /** Document storage for retrieval */
    private readonly documents;
    /** Whether semantic search is enabled */
    private readonly enableSemanticSearch;
    /** Default search limit */
    private readonly defaultSearchLimit;
    constructor(options?: {
        index?: DocumentIndex;
        enableSemanticSearch?: boolean;
        defaultSearchLimit?: number;
    });
    /**
     * Index a document for search.
     */
    indexDocument(doc: KnowledgeDocument): void;
    /**
     * Remove a document from the search index.
     */
    removeDocument(docId: DocumentId): void;
    /**
     * Update a document in the search index.
     */
    updateDocument(doc: KnowledgeDocument): void;
    /**
     * Search for documents matching the given query.
     * Combines full-text search and semantic search results.
     */
    search(query: KnowledgeQuery): Promise<SearchResult[]>;
    /**
     * Get the underlying document index.
     */
    getIndex(): DocumentIndex;
    /**
     * Clear the search engine.
     */
    clear(): void;
    /**
     * Hybrid search combining full-text and semantic search.
     */
    private hybridSearch;
    /**
     * Full-text search using the inverted index.
     */
    private fullTextSearch;
    /**
     * Semantic search using mock embeddings and cosine similarity.
     */
    private semanticSearch;
    /**
     * Structured search without text query.
     * Returns all documents matching the structured filters.
     */
    private structuredSearch;
}
//# sourceMappingURL=search-engine.d.ts.map