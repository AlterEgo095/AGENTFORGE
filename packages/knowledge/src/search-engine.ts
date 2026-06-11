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

// ─── Mock Embedding Generator ────────────────────────────────

/**
 * Generate a mock embedding vector from text.
 * Uses a simple hash-based approach to create deterministic vectors.
 * The vector has a fixed dimension of 128.
 * This is a placeholder for Phase 1 — will be replaced with
 * real embeddings (OpenAI, local model, etc.) in Phase 2.
 */
function generateMockEmbedding(text: string, dimensions: number = 128): number[] {
  const tokens = tokenizeSimple(text);
  const vector = new Array(dimensions).fill(0);

  for (let i = 0; i < tokens.length; i++) {
    const hash = simpleHash(tokens[i]!);
    for (let d = 0; d < dimensions; d++) {
      // Use hash + dimension to create pseudo-random values
      const seed = hash + d * 31 + i * 17;
      vector[d]! += Math.sin(seed) * 0.1;
    }
  }

  // Normalize the vector
  const magnitude = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0));
  if (magnitude > 0) {
    for (let i = 0; i < vector.length; i++) {
      vector[i] = vector[i]! / magnitude;
    }
  }

  return vector;
}

/**
 * Simple string hash function.
 */
function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}

/**
 * Simple tokenizer for embedding generation.
 */
function tokenizeSimple(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 1);
}

/**
 * Calculate cosine similarity between two vectors.
 * Returns a value between -1 and 1, where 1 means identical direction.
 */
function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;

  let dotProduct = 0;
  let magnitudeA = 0;
  let magnitudeB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i]! * b[i]!;
    magnitudeA += a[i]! * a[i]!;
    magnitudeB += b[i]! * b[i]!;
  }

  magnitudeA = Math.sqrt(magnitudeA);
  magnitudeB = Math.sqrt(magnitudeB);

  if (magnitudeA === 0 || magnitudeB === 0) return 0;

  return dotProduct / (magnitudeA * magnitudeB);
}

// ─── Search Engine Implementation ────────────────────────────

export class SearchEngine {
  /** Document index for full-text search */
  private readonly index: DocumentIndex;

  /** Document storage for retrieval */
  private readonly documents: Map<DocumentId, KnowledgeDocument> = new Map();

  /** Whether semantic search is enabled */
  private readonly enableSemanticSearch: boolean;

  /** Default search limit */
  private readonly defaultSearchLimit: number;

  constructor(options?: {
    index?: DocumentIndex;
    enableSemanticSearch?: boolean;
    defaultSearchLimit?: number;
  }) {
    this.index = options?.index ?? new DocumentIndex();
    this.enableSemanticSearch = options?.enableSemanticSearch ?? true;
    this.defaultSearchLimit = options?.defaultSearchLimit ?? 20;
  }

  /**
   * Index a document for search.
   */
  indexDocument(doc: KnowledgeDocument): void {
    // Generate embedding if semantic search is enabled
    if (this.enableSemanticSearch) {
      const embeddingText = [doc.title, doc.content, doc.summary ?? '', doc.category ?? '', ...doc.tags].join(' ');
      doc.embedding = generateMockEmbedding(embeddingText);
    }

    this.documents.set(doc.id, doc);
    this.index.addDocument(doc);
  }

  /**
   * Remove a document from the search index.
   */
  removeDocument(docId: DocumentId): void {
    this.index.removeDocument(docId);
    this.documents.delete(docId);
  }

  /**
   * Update a document in the search index.
   */
  updateDocument(doc: KnowledgeDocument): void {
    // Regenerate embedding if semantic search is enabled
    if (this.enableSemanticSearch) {
      const embeddingText = [doc.title, doc.content, doc.summary ?? '', doc.category ?? '', ...doc.tags].join(' ');
      doc.embedding = generateMockEmbedding(embeddingText);
    }

    this.documents.set(doc.id, doc);
    this.index.updateDocument(doc);
  }

  /**
   * Search for documents matching the given query.
   * Combines full-text search and semantic search results.
   */
  async search(query: KnowledgeQuery): Promise<SearchResult[]> {
    const limit = query.limit ?? this.defaultSearchLimit;
    const offset = query.offset ?? 0;

    let results: SearchResult[];

    if (query.text) {
      // Combine full-text and semantic search
      results = this.hybridSearch(query.text, query);
    } else {
      // Structured query only (no text search)
      results = this.structuredSearch(query);
    }

    // Sort by score descending
    results.sort((a, b) => b.score - a.score);

    // Apply offset and limit
    return results.slice(offset, offset + limit);
  }

  /**
   * Get the underlying document index.
   */
  getIndex(): DocumentIndex {
    return this.index;
  }

  /**
   * Clear the search engine.
   */
  clear(): void {
    this.index.clear();
    this.documents.clear();
  }

  // ─── Private Search Methods ─────────────────────────────

  /**
   * Hybrid search combining full-text and semantic search.
   */
  private hybridSearch(text: string, query: KnowledgeQuery): SearchResult[] {
    const fullTextResults = this.fullTextSearch(text, query);
    const semanticResults = this.semanticSearch(text, query);

    // Merge results with combined scoring
    const merged = new Map<DocumentId, SearchResult>();

    // Add full-text results with weight 0.6
    for (const result of fullTextResults) {
      merged.set(result.document.id, {
        document: result.document,
        score: result.score * 0.6,
        highlights: result.highlights,
      });
    }

    // Add semantic results with weight 0.4
    // Only add if there are full-text matches or the query has meaningful terms
    const hasFullTextMatches = fullTextResults.length > 0;
    for (const result of semanticResults) {
      const existing = merged.get(result.document.id);
      if (existing) {
        // Combine scores from both search methods
        existing.score = existing.score + result.score * 0.4;
      } else if (hasFullTextMatches) {
        // Only include semantic-only results when there are full-text matches too
        merged.set(result.document.id, {
          document: result.document,
          score: result.score * 0.4,
          highlights: result.highlights,
        });
      }
    }

    return [...merged.values()];
  }

  /**
   * Full-text search using the inverted index.
   */
  private fullTextSearch(text: string, query: KnowledgeQuery): SearchResult[] {
    // First get candidates from structured filters
    let candidateIds: Set<DocumentId> | undefined;

    if (query.type || query.status || (query.tags && query.tags.length > 0) || query.category || query.dateFrom || query.dateTo) {
      candidateIds = this.index.query(query);
    }

    // Then do full-text search
    const textMatches = this.index.searchText(text);

    // Combine
    const results: SearchResult[] = [];

    for (const match of textMatches) {
      if (candidateIds && !candidateIds.has(match.id)) continue;

      const doc = this.documents.get(match.id);
      if (!doc) continue;

      // Normalize score to 0-1 range
      const maxScore = textMatches.length > 0 ? textMatches[0]!.score : 1;
      const normalizedScore = maxScore > 0 ? match.score / maxScore : 0;

      const highlights = this.index.getHighlights(doc, text);

      results.push({
        document: doc,
        score: Math.min(normalizedScore, 1),
        highlights,
      });
    }

    return results;
  }

  /**
   * Semantic search using mock embeddings and cosine similarity.
   */
  private semanticSearch(text: string, query: KnowledgeQuery): SearchResult[] {
    if (!this.enableSemanticSearch) return [];

    const queryEmbedding = generateMockEmbedding(text);
    let candidateIds: Set<DocumentId> | undefined;

    if (query.type || query.status || (query.tags && query.tags.length > 0) || query.category || query.dateFrom || query.dateTo) {
      candidateIds = this.index.query(query);
    }

    const results: SearchResult[] = [];

    for (const [docId, doc] of this.documents) {
      if (candidateIds && !candidateIds.has(docId)) continue;
      if (!doc.embedding) continue;

      const similarity = cosineSimilarity(queryEmbedding, doc.embedding);

      // Only include results with meaningful similarity (threshold to avoid false positives from mock embeddings)
      if (similarity > 0.3) {
        results.push({
          document: doc,
          score: similarity,
          highlights: [],
        });
      }
    }

    return results;
  }

  /**
   * Structured search without text query.
   * Returns all documents matching the structured filters.
   */
  private structuredSearch(query: KnowledgeQuery): SearchResult[] {
    const candidateIds = this.index.query(query);
    const results: SearchResult[] = [];

    for (const id of candidateIds) {
      const doc = this.documents.get(id);
      if (doc) {
        results.push({
          document: doc,
          score: 1.0, // No text relevance, all matches are equal
        });
      }
    }

    // Sort by creation date (newest first) when no text query
    results.sort(
      (a, b) => new Date(b.document.createdAt).getTime() - new Date(a.document.createdAt).getTime()
    );

    return results;
  }
}
