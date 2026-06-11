/**
 * ALTER EGO OS — Knowledge Center
 *
 * Public API for the permanent document library.
 * Provides CRUD, search, versioning, relationships, and export/import.
 */
export { KnowledgeStore } from './knowledge-store.js';
export { SearchEngine } from './search-engine.js';
export { DocumentIndex } from './document-index.js';
export { VersionManager } from './version-manager.js';
export type { DocumentId, DocumentType, DocumentStatus, ISOTimestamp, KnowledgeDocument, CreateDocumentOptions, UpdateDocumentOptions, KnowledgeQuery, SearchResult, DocumentVersion, RelationshipType, DocumentRelationship, KnowledgeStoreConfig, KnowledgeStats, KnowledgeExport, KnowledgeCreatedPayload, KnowledgeUpdatedPayload, KnowledgeDeletedPayload, KnowledgeSearchedPayload, KnowledgeVersionedPayload, } from './types.js';
export { DOCUMENT_TYPES, DOCUMENT_STATUSES, RELATIONSHIP_TYPES } from './types.js';
//# sourceMappingURL=index.d.ts.map