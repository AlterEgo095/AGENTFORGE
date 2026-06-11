/**
 * ALTER EGO OS — Document Index
 *
 * Inverted index for fast full-text search across knowledge documents.
 * Supports word matching, term frequency ranking, and multi-field indexing.
 * Indexes the title, content, summary, tags, and category fields.
 */

import type { DocumentId, DocumentType, DocumentStatus, KnowledgeDocument, KnowledgeQuery } from './types.js';

// ─── Tokenizer ───────────────────────────────────────────────

/**
 * Tokenize text into searchable terms.
 * Lowercases, removes non-alphanumeric characters, and splits on whitespace.
 */
function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter((token) => token.length > 0);
}

/**
 * Calculate term frequency for a document's text.
 * Returns a Map of term → count.
 */
function termFrequencies(text: string): Map<string, number> {
  const tokens = tokenize(text);
  const freq = new Map<string, number>();
  for (const token of tokens) {
    freq.set(token, (freq.get(token) ?? 0) + 1);
  }
  return freq;
}

// ─── Index Entry ─────────────────────────────────────────────

interface IndexEntry {
  documentId: DocumentId;
  type: DocumentType;
  status: DocumentStatus;
  tags: string[];
  category?: string;
  createdAt: string;
  termFrequencies: Map<string, number>;
  totalTerms: number;
}

// ─── DocumentIndex Implementation ────────────────────────────

export class DocumentIndex {
  /** Inverted index: term → Set of DocumentId */
  private readonly invertedIndex: Map<string, Set<DocumentId>> = new Map();

  /** Document metadata and term frequencies for ranking */
  private readonly entries: Map<DocumentId, IndexEntry> = new Map();

  /** Type index: type → Set of DocumentId */
  private readonly typeIndex: Map<DocumentType, Set<DocumentId>> = new Map();

  /** Status index: status → Set of DocumentId */
  private readonly statusIndex: Map<DocumentStatus, Set<DocumentId>> = new Map();

  /** Tag index: tag → Set of DocumentId */
  private readonly tagIndex: Map<string, Set<DocumentId>> = new Map();

  /** Category index: category → Set of DocumentId */
  private readonly categoryIndex: Map<string, Set<DocumentId>> = new Map();

  /** Time index: sorted array of [timestamp, DocumentId] */
  private readonly timeIndex: [number, DocumentId][] = [];

  // ─── Indexing Operations ─────────────────────────────────

  /**
   * Add a document to all indexes.
   */
  addDocument(doc: KnowledgeDocument): void {
    // Build combined searchable text from title, content, summary, tags, category
    const searchableParts = [doc.title, doc.content];
    if (doc.summary) searchableParts.push(doc.summary);
    if (doc.category) searchableParts.push(doc.category);
    if (doc.tags.length > 0) searchableParts.push(doc.tags.join(' '));

    const combinedText = searchableParts.join(' ');
    const frequencies = termFrequencies(combinedText);
    const tokens = tokenize(combinedText);

    const entry: IndexEntry = {
      documentId: doc.id,
      type: doc.type,
      status: doc.status,
      tags: [...doc.tags],
      category: doc.category,
      createdAt: doc.createdAt,
      termFrequencies: frequencies,
      totalTerms: tokens.length,
    };

    this.entries.set(doc.id, entry);

    // Build inverted index
    for (const term of frequencies.keys()) {
      if (!this.invertedIndex.has(term)) {
        this.invertedIndex.set(term, new Set());
      }
      this.invertedIndex.get(term)!.add(doc.id);
    }

    // Type index
    if (!this.typeIndex.has(doc.type)) {
      this.typeIndex.set(doc.type, new Set());
    }
    this.typeIndex.get(doc.type)!.add(doc.id);

    // Status index
    if (!this.statusIndex.has(doc.status)) {
      this.statusIndex.set(doc.status, new Set());
    }
    this.statusIndex.get(doc.status)!.add(doc.id);

    // Tag index
    for (const tag of doc.tags) {
      const normalizedTag = tag.toLowerCase();
      if (!this.tagIndex.has(normalizedTag)) {
        this.tagIndex.set(normalizedTag, new Set());
      }
      this.tagIndex.get(normalizedTag)!.add(doc.id);
    }

    // Category index
    if (doc.category) {
      const normalizedCategory = doc.category.toLowerCase();
      if (!this.categoryIndex.has(normalizedCategory)) {
        this.categoryIndex.set(normalizedCategory, new Set());
      }
      this.categoryIndex.get(normalizedCategory)!.add(doc.id);
    }

    // Time index
    const timestamp = new Date(doc.createdAt).getTime();
    this.insertIntoTimeIndex(timestamp, doc.id);
  }

  /**
   * Remove a document from all indexes.
   */
  removeDocument(docId: DocumentId): void {
    const entry = this.entries.get(docId);
    if (!entry) return;

    // Remove from inverted index
    for (const term of entry.termFrequencies.keys()) {
      const set = this.invertedIndex.get(term);
      if (set) {
        set.delete(docId);
        if (set.size === 0) {
          this.invertedIndex.delete(term);
        }
      }
    }

    // Remove from type index
    const typeSet = this.typeIndex.get(entry.type);
    if (typeSet) {
      typeSet.delete(docId);
      if (typeSet.size === 0) {
        this.typeIndex.delete(entry.type);
      }
    }

    // Remove from status index
    const statusSet = this.statusIndex.get(entry.status);
    if (statusSet) {
      statusSet.delete(docId);
      if (statusSet.size === 0) {
        this.statusIndex.delete(entry.status);
      }
    }

    // Remove from tag index
    for (const tag of entry.tags) {
      const normalizedTag = tag.toLowerCase();
      const tagSet = this.tagIndex.get(normalizedTag);
      if (tagSet) {
        tagSet.delete(docId);
        if (tagSet.size === 0) {
          this.tagIndex.delete(normalizedTag);
        }
      }
    }

    // Remove from category index
    if (entry.category) {
      const normalizedCategory = entry.category.toLowerCase();
      const catSet = this.categoryIndex.get(normalizedCategory);
      if (catSet) {
        catSet.delete(docId);
        if (catSet.size === 0) {
          this.categoryIndex.delete(normalizedCategory);
        }
      }
    }

    // Remove from time index
    const timeIdx = this.timeIndex.findIndex(([, id]) => id === docId);
    if (timeIdx !== -1) {
      this.timeIndex.splice(timeIdx, 1);
    }

    // Remove entry
    this.entries.delete(docId);
  }

  /**
   * Update a document in the index (remove old, add new).
   */
  updateDocument(doc: KnowledgeDocument): void {
    this.removeDocument(doc.id);
    this.addDocument(doc);
  }

  // ─── Full-Text Search ────────────────────────────────────

  /**
   * Search the inverted index for documents matching the given text.
   * Returns an array of [DocumentId, score] sorted by relevance (highest first).
   * Uses a simplified TF-IDF-like scoring.
   */
  searchText(query: string, limit?: number): Array<{ id: DocumentId; score: number }> {
    const queryTerms = tokenize(query);
    if (queryTerms.length === 0) return [];

    const totalDocuments = this.entries.size;
    const scores = new Map<DocumentId, number>();

    for (const term of queryTerms) {
      const matchingIds = this.invertedIndex.get(term);
      if (!matchingIds) continue;

      // IDF component: rarer terms get higher weight
      const idf = Math.log((totalDocuments + 1) / (matchingIds.size + 1)) + 1;

      for (const docId of matchingIds) {
        const entry = this.entries.get(docId);
        if (!entry) continue;

        // TF component: term frequency in this document
        const tf = entry.termFrequencies.get(term) ?? 0;
        const normalizedTf = entry.totalTerms > 0 ? tf / entry.totalTerms : 0;

        const currentScore = scores.get(docId) ?? 0;
        scores.set(docId, currentScore + normalizedTf * idf);
      }
    }

    // Sort by score descending
    const results = [...scores.entries()]
      .map(([id, score]) => ({ id, score }))
      .sort((a, b) => b.score - a.score);

    if (limit !== undefined) {
      return results.slice(0, limit);
    }
    return results;
  }

  /**
   * Extract text highlights (snippets) for a query within a document's content.
   */
  getHighlights(doc: KnowledgeDocument, query: string, maxSnippets: number = 3): string[] {
    const queryTerms = new Set(tokenize(query));
    const sentences = doc.content.split(/[.!?]+/).filter((s) => s.trim().length > 0);
    const highlights: string[] = [];

    for (const sentence of sentences) {
      if (highlights.length >= maxSnippets) break;
      const sentenceTokens = new Set(tokenize(sentence));
      const hasOverlap = [...queryTerms].some((term) => sentenceTokens.has(term));
      if (hasOverlap) {
        highlights.push(sentence.trim());
      }
    }

    return highlights;
  }

  // ─── Structured Query ────────────────────────────────────

  /**
   * Query documents using structured filters with AND semantics.
   * Returns a Set of DocumentIds matching all criteria.
   */
  query(query: KnowledgeQuery): Set<DocumentId> {
    let candidateIds: Set<DocumentId> | null = null;

    // Filter by type
    if (query.type) {
      const typeIds = this.typeIndex.get(query.type);
      if (!typeIds) return new Set();
      candidateIds = new Set(typeIds);
    }

    // Filter by status
    if (query.status) {
      const statusIds = this.statusIndex.get(query.status);
      if (!statusIds) return new Set();
      if (candidateIds) {
        candidateIds = intersection(candidateIds, statusIds);
      } else {
        candidateIds = new Set(statusIds);
      }
    }

    // Filter by tags (AND semantics)
    if (query.tags && query.tags.length > 0) {
      let tagMatches: Set<DocumentId> | null = null;
      for (const tag of query.tags) {
        const normalizedTag = tag.toLowerCase();
        const ids = this.tagIndex.get(normalizedTag);
        if (!ids) return new Set(); // AND: no matches for this tag
        if (tagMatches) {
          tagMatches = intersection(tagMatches, ids);
        } else {
          tagMatches = new Set(ids);
        }
      }
      if (candidateIds && tagMatches) {
        candidateIds = intersection(candidateIds, tagMatches);
      } else if (tagMatches) {
        candidateIds = tagMatches;
      }
    }

    // Filter by category
    if (query.category) {
      const normalizedCategory = query.category.toLowerCase();
      const catIds = this.categoryIndex.get(normalizedCategory);
      if (!catIds) return new Set();
      if (candidateIds) {
        candidateIds = intersection(candidateIds, catIds);
      } else {
        candidateIds = new Set(catIds);
      }
    }

    // Filter by time range
    if (query.dateFrom || query.dateTo) {
      const timeMatches = this.queryByTimeRange(query.dateFrom, query.dateTo);
      if (candidateIds) {
        candidateIds = intersection(candidateIds, timeMatches);
      } else {
        candidateIds = timeMatches;
      }
    }

    // If no filters applied, return all documents
    if (candidateIds === null) {
      candidateIds = new Set(this.entries.keys());
    }

    return candidateIds;
  }

  // ─── Utility Operations ─────────────────────────────────

  /**
   * Get all document IDs for a given type.
   */
  getByType(type: DocumentType): Set<DocumentId> {
    return new Set(this.typeIndex.get(type) ?? []);
  }

  /**
   * Get all document IDs for a given status.
   */
  getByStatus(status: DocumentStatus): Set<DocumentId> {
    return new Set(this.statusIndex.get(status) ?? []);
  }

  /**
   * Get all document IDs for a given tag.
   */
  getByTag(tag: string): Set<DocumentId> {
    return new Set(this.tagIndex.get(tag.toLowerCase()) ?? []);
  }

  /**
   * Get all document IDs for a given category.
   */
  getByCategory(category: string): Set<DocumentId> {
    return new Set(this.categoryIndex.get(category.toLowerCase()) ?? []);
  }

  /**
   * Get the total number of indexed documents.
   */
  size(): number {
    return this.entries.size;
  }

  /**
   * Clear all indexes.
   */
  clear(): void {
    this.invertedIndex.clear();
    this.entries.clear();
    this.typeIndex.clear();
    this.statusIndex.clear();
    this.tagIndex.clear();
    this.categoryIndex.clear();
    this.timeIndex.length = 0;
  }

  // ─── Private Helpers ────────────────────────────────────

  private insertIntoTimeIndex(timestamp: number, id: DocumentId): void {
    let low = 0;
    let high = this.timeIndex.length;
    while (low < high) {
      const mid = (low + high) >>> 1;
      if (this.timeIndex[mid]![0] < timestamp) {
        low = mid + 1;
      } else {
        high = mid;
      }
    }
    this.timeIndex.splice(low, 0, [timestamp, id]);
  }

  private queryByTimeRange(from?: string, to?: string): Set<DocumentId> {
    const fromMs = from ? new Date(from).getTime() : -Infinity;
    const toMs = to ? new Date(to).getTime() : Infinity;

    const result = new Set<DocumentId>();

    let startIdx = 0;
    if (fromMs !== -Infinity) {
      startIdx = this.lowerBound(fromMs);
    }

    for (let i = startIdx; i < this.timeIndex.length; i++) {
      const [ts, id] = this.timeIndex[i]!;
      if (ts > toMs) break;
      if (ts >= fromMs) {
        result.add(id);
      }
    }

    return result;
  }

  private lowerBound(target: number): number {
    let low = 0;
    let high = this.timeIndex.length;
    while (low < high) {
      const mid = (low + high) >>> 1;
      if (this.timeIndex[mid]![0] < target) {
        low = mid + 1;
      } else {
        high = mid;
      }
    }
    return low;
  }
}

// ─── Utility ─────────────────────────────────────────────────

/** Set intersection */
function intersection<T>(a: Set<T>, b: Set<T>): Set<T> {
  const result = new Set<T>();
  const [smaller, larger] = a.size <= b.size ? [a, b] : [b, a];
  for (const item of smaller) {
    if (larger.has(item)) {
      result.add(item);
    }
  }
  return result;
}
