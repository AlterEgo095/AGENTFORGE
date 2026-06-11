/**
 * ALTER EGO OS — Version Manager
 *
 * Tracks document versions over time. Each update to a document creates
 * a new version entry while preserving the previous state.
 * Supports version history retrieval, version comparison, and rollback.
 */

import type { DocumentId, KnowledgeDocument, DocumentVersion } from './types.js';

// ─── Version History Entry ───────────────────────────────────

interface VersionHistoryEntry {
  version: number;
  document: KnowledgeDocument;
  changedAt: string;
  changeDescription?: string;
}

// ─── Version Manager Implementation ──────────────────────────

export class VersionManager {
  /** Version history: DocumentId → array of version entries (ordered by version) */
  private readonly history: Map<DocumentId, VersionHistoryEntry[]> = new Map();

  /** Current version number per document */
  private readonly currentVersions: Map<DocumentId, number> = new Map();

  /** Maximum versions to keep per document */
  private readonly maxVersions: number;

  constructor(maxVersions: number = 50) {
    this.maxVersions = maxVersions;
  }

  /**
   * Record the initial version of a document (version 1).
   */
  recordInitialVersion(doc: KnowledgeDocument): DocumentVersion {
    const version: VersionHistoryEntry = {
      version: 1,
      document: { ...doc },
      changedAt: doc.createdAt,
      changeDescription: 'Initial version',
    };

    this.history.set(doc.id, [version]);
    this.currentVersions.set(doc.id, 1);

    return {
      version: version.version,
      document: version.document,
      changedAt: version.changedAt,
      changeDescription: version.changeDescription,
    };
  }

  /**
   * Record a new version of a document.
   * Returns the new DocumentVersion.
   */
  recordVersion(
    doc: KnowledgeDocument,
    changeDescription?: string
  ): DocumentVersion {
    const currentVersion = this.currentVersions.get(doc.id) ?? 0;
    const newVersion = currentVersion + 1;

    const entry: VersionHistoryEntry = {
      version: newVersion,
      document: { ...doc },
      changedAt: doc.updatedAt,
      changeDescription,
    };

    let versions = this.history.get(doc.id);
    if (!versions) {
      versions = [];
      this.history.set(doc.id, versions);
    }

    versions.push(entry);
    this.currentVersions.set(doc.id, newVersion);

    // Trim old versions if exceeding max
    if (versions.length > this.maxVersions) {
      versions.splice(0, versions.length - this.maxVersions);
    }

    return {
      version: entry.version,
      document: entry.document,
      changedAt: entry.changedAt,
      changeDescription: entry.changeDescription,
    };
  }

  /**
   * Get the version history for a document.
   * Returns versions ordered from oldest to newest.
   */
  getVersionHistory(docId: DocumentId): DocumentVersion[] {
    const versions = this.history.get(docId);
    if (!versions) return [];

    return versions.map((v) => ({
      version: v.version,
      document: v.document,
      changedAt: v.changedAt,
      changeDescription: v.changeDescription,
    }));
  }

  /**
   * Get a specific version of a document.
   */
  getVersion(docId: DocumentId, version: number): DocumentVersion | undefined {
    const versions = this.history.get(docId);
    if (!versions) return undefined;

    const entry = versions.find((v) => v.version === version);
    if (!entry) return undefined;

    return {
      version: entry.version,
      document: entry.document,
      changedAt: entry.changedAt,
      changeDescription: entry.changeDescription,
    };
  }

  /**
   * Get the current version number for a document.
   */
  getCurrentVersion(docId: DocumentId): number {
    return this.currentVersions.get(docId) ?? 0;
  }

  /**
   * Compare two versions of a document.
   * Returns the changes between the two versions.
   */
  diff(docId: DocumentId, fromVersion: number, toVersion: number): {
    from: DocumentVersion;
    to: DocumentVersion;
    fieldsChanged: string[];
  } | undefined {
    const from = this.getVersion(docId, fromVersion);
    const to = this.getVersion(docId, toVersion);

    if (!from || !to) return undefined;

    const fieldsChanged: string[] = [];

    const keys = new Set<string>([
      ...Object.keys(from.document),
      ...Object.keys(to.document),
    ]);

    for (const key of keys) {
      const fromVal = JSON.stringify((from.document as Record<string, unknown>)[key]);
      const toVal = JSON.stringify((to.document as Record<string, unknown>)[key]);
      if (fromVal !== toVal) {
        fieldsChanged.push(key);
      }
    }

    return { from, to, fieldsChanged };
  }

  /**
   * Remove all version history for a document.
   * Used when a document is permanently deleted.
   */
  removeHistory(docId: DocumentId): void {
    this.history.delete(docId);
    this.currentVersions.delete(docId);
  }

  /**
   * Get the total number of version entries across all documents.
   */
  getTotalVersionCount(): number {
    let total = 0;
    for (const versions of this.history.values()) {
      total += versions.length;
    }
    return total;
  }

  /**
   * Clear all version history.
   */
  clear(): void {
    this.history.clear();
    this.currentVersions.clear();
  }
}
