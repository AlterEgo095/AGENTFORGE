/**
 * ALTER EGO OS — Knowledge Center Types
 *
 * Core type definitions for the permanent document library.
 * Supports multiple document types, semantic search, versioning,
 * tagging, categorization, and document relationships.
 */
// ─── Constants ───────────────────────────────────────────────
/** All valid document types */
export const DOCUMENT_TYPES = [
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
export const DOCUMENT_STATUSES = [
    'draft',
    'published',
    'archived',
    'deprecated',
];
/** All valid relationship types */
export const RELATIONSHIP_TYPES = [
    'references',
    'depends-on',
    'derived-from',
    'related-to',
];
//# sourceMappingURL=types.js.map