/**
 * ALTER EGO OS — Memory Engine Types
 *
 * Core type definitions for the episodic memory system.
 * Supports 8 memory types with TTL, indexing, and compaction.
 */
// ─── Default TTL Values ──────────────────────────────────────
/** Default TTL per memory type in milliseconds */
export const DEFAULT_TTL = {
    user: 30 * 24 * 60 * 60 * 1000, // 30 days
    project: 90 * 24 * 60 * 60 * 1000, // 90 days
    prompt: 7 * 24 * 60 * 60 * 1000, // 7 days
    decision: 180 * 24 * 60 * 60 * 1000, // 180 days
    bug: 90 * 24 * 60 * 60 * 1000, // 90 days
    workflow: 30 * 24 * 60 * 60 * 1000, // 30 days
    deployment: 60 * 24 * 60 * 60 * 1000, // 60 days
    architecture: 365 * 24 * 60 * 60 * 1000, // 365 days
};
/** All valid memory types */
export const MEMORY_TYPES = [
    'user',
    'project',
    'prompt',
    'decision',
    'bug',
    'workflow',
    'deployment',
    'architecture',
];
//# sourceMappingURL=types.js.map