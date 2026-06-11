/**
 * ALTER EGO OS — Knowledge Center Types
 *
 * Core type definitions for the permanent document library.
 * Supports multiple document types, semantic search, versioning,
 * tagging, categorization, and document relationships.
 */

// ─── Identifiers & Primitives ────────────────────────────────

/** Unique identifier for a knowledge document */
export type DocumentId = string;

/** The supported document types */
export type DocumentType =
  | 'pdf'
  | 'docx'
  | 'markdown'
  | 'html'
  | 'article'
  | 'code'
  | 'course'
  | 'image'
  | 'video'
  | 'reference'
  | 'note';

/** Document lifecycle status */
export type DocumentStatus = 'draft' | 'published' | 'archived' | 'deprecated';

/** ISO 8601 timestamp */
export type ISOTimestamp = string;

// ─── Core Interfaces ─────────────────────────────────────────

/** A knowledge document — the fundamental unit of the Knowledge Center */
export interface KnowledgeDocument {
  /** Unique document identifier */
  id: DocumentId;
  /** Document type classification */
  type: DocumentType;
  /** Document title */
  title: string;
  /** Raw text content */
  content: string;
  /** Auto-generated summary */
  summary?: string;
  /** Tags for categorization and search */
  tags: string[];
  /** Category grouping */
  category?: string;
  /** Document lifecycle status */
  status: DocumentStatus;
  /** Version number (incremented on each update) */
  version: number;
  /** Parent document ID (for versioning chain) */
  parentId?: DocumentId;
  /** Source information */
  source?: {
    type: 'url' | 'file' | 'manual' | 'agent';
    reference: string;
  };
  /** Vector embedding (mock for Phase 1) */
  embedding?: number[];
  /** Arbitrary metadata */
  metadata?: Record<string, unknown>;
  /** When this document was created */
  createdAt: ISOTimestamp;
  /** When this document was last updated */
  updatedAt: ISOTimestamp;
}

/** Options when creating a knowledge document */
export interface CreateDocumentOptions {
  /** Document type */
  type: DocumentType;
  /** Document title */
  title: string;
  /** Raw text content */
  content: string;
  /** Summary (auto-generated if not provided) */
  summary?: string;
  /** Tags */
  tags?: string[];
  /** Category */
  category?: string;
  /** Initial status (default: 'draft') */
  status?: DocumentStatus;
  /** Source information */
  source?: {
    type: 'url' | 'file' | 'manual' | 'agent';
    reference: string;
  };
  /** Arbitrary metadata */
  metadata?: Record<string, unknown>;
}

/** Options when updating a knowledge document */
export interface UpdateDocumentOptions {
  /** Updated title */
  title?: string;
  /** Updated content */
  content?: string;
  /** Updated summary */
  summary?: string;
  /** Updated tags (replaces existing) */
  tags?: string[];
  /** Updated category */
  category?: string;
  /** Updated status */
  status?: DocumentStatus;
  /** Description of the change */
  changeDescription?: string;
  /** Updated metadata (merges with existing) */
  metadata?: Record<string, unknown>;
}

/** Query parameters for searching knowledge documents */
export interface KnowledgeQuery {
  /** Full-text search query */
  text?: string;
  /** Filter by document type */
  type?: DocumentType;
  /** Filter by tags (AND semantics) */
  tags?: string[];
  /** Filter by category */
  category?: string;
  /** Filter by status */
  status?: DocumentStatus;
  /** Only documents created at or after this timestamp */
  dateFrom?: string;
  /** Only documents created at or before this timestamp */
  dateTo?: string;
  /** Maximum number of results */
  limit?: number;
  /** Number of results to skip */
  offset?: number;
}

/** A single search result with relevance scoring */
export interface SearchResult {
  /** The matched document */
  document: KnowledgeDocument;
  /** Relevance score 0-1 */
  score: number;
  /** Text snippets matching the query */
  highlights?: string[];
}

/** A document version snapshot */
export interface DocumentVersion {
  /** Version number */
  version: number;
  /** The document at this version */
  document: KnowledgeDocument;
  /** When this version was created */
  changedAt: string;
  /** Description of the change */
  changeDescription?: string;
}

/** Relationship type between documents */
export type RelationshipType = 'references' | 'depends-on' | 'derived-from' | 'related-to';

/** A relationship between two documents */
export interface DocumentRelationship {
  /** Source document ID */
  sourceId: DocumentId;
  /** Relationship type */
  type: RelationshipType;
  /** Target document ID */
  targetId: DocumentId;
  /** When the relationship was created */
  createdAt: ISOTimestamp;
  /** Arbitrary metadata about the relationship */
  metadata?: Record<string, unknown>;
}

/** Knowledge Center configuration */
export interface KnowledgeStoreConfig {
  /** Enable semantic search with mock embeddings (default: true) */
  enableSemanticSearch?: boolean;
  /** Maximum number of versions to keep per document (default: 50) */
  maxVersionsPerDocument?: number;
  /** Maximum documents to return in a search (default: 20) */
  defaultSearchLimit?: number;
  /** Whether to auto-generate summaries (default: true for Phase 1 mock) */
  autoSummarize?: boolean;
}

/** Statistics about the knowledge store */
export interface KnowledgeStats {
  /** Total number of documents */
  totalDocuments: number;
  /** Count of documents per type */
  documentsByType: Partial<Record<DocumentType, number>>;
  /** Count of documents per status */
  documentsByStatus: Partial<Record<DocumentStatus, number>>;
  /** Total number of document relationships */
  totalRelationships: number;
  /** Total number of tags used */
  totalTags: number;
  /** Oldest document creation timestamp */
  oldestDocument?: ISOTimestamp;
  /** Newest document creation timestamp */
  newestDocument?: ISOTimestamp;
  /** Total version history entries */
  totalVersions: number;
}

// ─── Export / Import Types ───────────────────────────────────

/** Export format for knowledge backup */
export interface KnowledgeExport {
  /** Format version */
  version: string;
  /** When the export was created */
  exportedAt: ISOTimestamp;
  /** The documents */
  documents: KnowledgeDocument[];
  /** The relationships */
  relationships: DocumentRelationship[];
  /** Configuration at time of export */
  config: KnowledgeStoreConfig;
}

// ─── Event Payloads ──────────────────────────────────────────

/** Payload for knowledge.created event */
export interface KnowledgeCreatedPayload {
  id: DocumentId;
  type: DocumentType;
  title: string;
}

/** Payload for knowledge.updated event */
export interface KnowledgeUpdatedPayload {
  id: DocumentId;
  type: DocumentType;
  title: string;
  version: number;
}

/** Payload for knowledge.deleted event */
export interface KnowledgeDeletedPayload {
  id: DocumentId;
  type: DocumentType;
  title: string;
}

/** Payload for knowledge.searched event */
export interface KnowledgeSearchedPayload {
  query: string;
  resultCount: number;
}

/** Payload for knowledge.versioned event */
export interface KnowledgeVersionedPayload {
  id: DocumentId;
  version: number;
  changeDescription?: string;
}

// ─── Constants ───────────────────────────────────────────────

/** All valid document types */
export const DOCUMENT_TYPES: DocumentType[] = [
  'pdf',
  'docx',
  'markdown',
  'html',
  'article',
  'code',
  'course',
  'image',
  'video',
  'reference',
  'note',
];

/** All valid document statuses */
export const DOCUMENT_STATUSES: DocumentStatus[] = [
  'draft',
  'published',
  'archived',
  'deprecated',
];

/** All valid relationship types */
export const RELATIONSHIP_TYPES: RelationshipType[] = [
  'references',
  'depends-on',
  'derived-from',
  'related-to',
];
