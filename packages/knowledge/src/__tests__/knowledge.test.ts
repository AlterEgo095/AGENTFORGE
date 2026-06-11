/**
 * ALTER EGO OS — Knowledge Center Tests
 *
 * Comprehensive test suite for the KnowledgeStore, SearchEngine,
 * DocumentIndex, and VersionManager.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { KnowledgeStore } from '../knowledge-store.js';
import { SearchEngine } from '../search-engine.js';
import { DocumentIndex } from '../document-index.js';
import { VersionManager } from '../version-manager.js';
import { EventBus } from '@alterego/event-bus';
import type {
  KnowledgeDocument,
  KnowledgeQuery,
  KnowledgeStoreConfig,
  DocumentType,
} from '../types.js';
import { DOCUMENT_TYPES, DOCUMENT_STATUSES } from '../types.js';

// ─── Helpers ─────────────────────────────────────────────────

function createTestStore(config?: KnowledgeStoreConfig, eventBus?: EventBus): KnowledgeStore {
  return new KnowledgeStore(config, eventBus);
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function makeDoc(overrides: Partial<KnowledgeDocument> = {}): KnowledgeDocument {
  return {
    id: overrides.id ?? `doc_${Math.random().toString(36).substring(2, 8)}`,
    type: overrides.type ?? 'note',
    title: overrides.title ?? 'Test Document',
    content: overrides.content ?? 'This is test content for the knowledge document.',
    summary: overrides.summary,
    tags: overrides.tags ?? [],
    category: overrides.category,
    status: overrides.status ?? 'draft',
    version: overrides.version ?? 1,
    parentId: overrides.parentId,
    source: overrides.source,
    embedding: overrides.embedding,
    metadata: overrides.metadata,
    createdAt: overrides.createdAt ?? new Date().toISOString(),
    updatedAt: overrides.updatedAt ?? new Date().toISOString(),
  };
}

// ─── KnowledgeStore Tests ───────────────────────────────────

describe('KnowledgeStore', () => {
  let store: KnowledgeStore;

  beforeEach(() => {
    store = createTestStore();
  });

  // ─── Create Operation ─────────────────────────────────────

  describe('create()', () => {
    it('should create a new knowledge document', async () => {
      const doc = await store.create({
        type: 'markdown',
        title: 'Getting Started',
        content: 'Welcome to ALTER EGO OS Knowledge Center.',
      });

      expect(doc.id).toBeDefined();
      expect(doc.id).toMatch(/^doc_/);
      expect(doc.type).toBe('markdown');
      expect(doc.title).toBe('Getting Started');
      expect(doc.content).toBe('Welcome to ALTER EGO OS Knowledge Center.');
      expect(doc.version).toBe(1);
      expect(doc.status).toBe('draft');
      expect(doc.tags).toEqual([]);
      expect(doc.createdAt).toBeDefined();
      expect(doc.updatedAt).toBeDefined();
    });

    it('should create document with all options', async () => {
      const doc = await store.create({
        type: 'article',
        title: 'TypeScript Best Practices',
        content: 'Always use strict mode in TypeScript.',
        summary: 'A guide to TypeScript best practices',
        tags: ['typescript', 'programming', 'guide'],
        category: 'programming',
        status: 'published',
        source: { type: 'url', reference: 'https://example.com/ts-guide' },
        metadata: { author: 'Alice', difficulty: 'intermediate' },
      });

      expect(doc.summary).toBe('A guide to TypeScript best practices');
      expect(doc.tags).toEqual(['typescript', 'programming', 'guide']);
      expect(doc.category).toBe('programming');
      expect(doc.status).toBe('published');
      expect(doc.source).toEqual({ type: 'url', reference: 'https://example.com/ts-guide' });
      expect(doc.metadata).toEqual({ author: 'Alice', difficulty: 'intermediate' });
    });

    it('should auto-generate summary when autoSummarize is enabled', async () => {
      const longContent = 'This is a very long piece of content. '.repeat(20).trim();
      const doc = await store.create({
        type: 'note',
        title: 'Long Note',
        content: longContent,
      });

      expect(doc.summary).toBeDefined();
      expect(doc.summary!.length).toBeLessThanOrEqual(longContent.length);
    });

    it('should not auto-generate summary when autoSummarize is disabled', async () => {
      const noSummaryStore = createTestStore({ autoSummarize: false });
      const doc = await noSummaryStore.create({
        type: 'note',
        title: 'No Summary Note',
        content: 'Some content here.',
      });

      expect(doc.summary).toBeUndefined();
    });

    it('should use provided summary instead of auto-generating', async () => {
      const doc = await store.create({
        type: 'note',
        title: 'Custom Summary',
        content: 'Content goes here.',
        summary: 'My custom summary',
      });

      expect(doc.summary).toBe('My custom summary');
    });

    it('should support all document types', async () => {
      for (const type of DOCUMENT_TYPES) {
        const doc = await store.create({
          type,
          title: `Test ${type}`,
          content: `Content for ${type}`,
        });
        expect(doc.type).toBe(type);
      }

      const stats = await store.getStats();
      expect(stats.totalDocuments).toBe(DOCUMENT_TYPES.length);
    });

    it('should default status to draft', async () => {
      const doc = await store.create({
        type: 'note',
        title: 'Default Status',
        content: 'Content',
      });

      expect(doc.status).toBe('draft');
    });
  });

  // ─── Get Operation ────────────────────────────────────────

  describe('get()', () => {
    it('should get a document by ID', async () => {
      const created = await store.create({
        type: 'note',
        title: 'Test',
        content: 'Content',
      });

      const retrieved = await store.get(created.id);
      expect(retrieved).toBeDefined();
      expect(retrieved!.id).toBe(created.id);
      expect(retrieved!.title).toBe('Test');
    });

    it('should return undefined for non-existent ID', async () => {
      const result = await store.get('nonexistent-id');
      expect(result).toBeUndefined();
    });

    it('should return a copy of the document', async () => {
      const created = await store.create({
        type: 'note',
        title: 'Original',
        content: 'Content',
      });

      const retrieved = await store.get(created.id);
      retrieved!.title = 'Modified';

      const again = await store.get(created.id);
      expect(again!.title).toBe('Original');
    });
  });

  // ─── Update Operation ─────────────────────────────────────

  describe('update()', () => {
    it('should update a document and increment version', async () => {
      const created = await store.create({
        type: 'note',
        title: 'Original Title',
        content: 'Original content',
      });

      const updated = await store.update(created.id, {
        title: 'Updated Title',
        content: 'Updated content',
      });

      expect(updated.title).toBe('Updated Title');
      expect(updated.content).toBe('Updated content');
      expect(updated.version).toBe(2);
    });

    it('should throw when updating non-existent document', async () => {
      await expect(
        store.update('nonexistent', { title: 'New' })
      ).rejects.toThrow('Document not found');
    });

    it('should merge metadata on update', async () => {
      const created = await store.create({
        type: 'note',
        title: 'Test',
        content: 'Content',
        metadata: { author: 'Alice', version: 1 },
      });

      const updated = await store.update(created.id, {
        metadata: { version: 2, reviewed: true },
      });

      expect(updated.metadata).toEqual({ author: 'Alice', version: 2, reviewed: true });
    });

    it('should update tags', async () => {
      const created = await store.create({
        type: 'note',
        title: 'Test',
        content: 'Content',
        tags: ['old-tag'],
      });

      const updated = await store.update(created.id, {
        tags: ['new-tag', 'another-tag'],
      });

      expect(updated.tags).toEqual(['new-tag', 'another-tag']);
    });

    it('should update status', async () => {
      const created = await store.create({
        type: 'note',
        title: 'Test',
        content: 'Content',
      });

      const updated = await store.update(created.id, {
        status: 'published',
      });

      expect(updated.status).toBe('published');
    });

    it('should only update provided fields', async () => {
      const created = await store.create({
        type: 'note',
        title: 'Original Title',
        content: 'Original content',
        tags: ['keep-me'],
      });

      const updated = await store.update(created.id, {
        title: 'New Title',
      });

      expect(updated.title).toBe('New Title');
      expect(updated.content).toBe('Original content');
      expect(updated.tags).toEqual(['keep-me']);
    });

    it('should record version change description', async () => {
      const created = await store.create({
        type: 'note',
        title: 'Test',
        content: 'Content',
      });

      await store.update(created.id, {
        title: 'Updated',
        changeDescription: 'Fixed typo in title',
      });

      const history = await store.getVersionHistory(created.id);
      expect(history.length).toBe(2);
      expect(history[1]!.changeDescription).toBe('Fixed typo in title');
    });
  });

  // ─── Delete Operation ─────────────────────────────────────

  describe('delete()', () => {
    it('should delete a document', async () => {
      const created = await store.create({
        type: 'note',
        title: 'To Delete',
        content: 'Content',
      });

      const result = await store.delete(created.id);
      expect(result).toBe(true);

      const retrieved = await store.get(created.id);
      expect(retrieved).toBeUndefined();
    });

    it('should return false for non-existent document', async () => {
      const result = await store.delete('nonexistent');
      expect(result).toBe(false);
    });

    it('should remove relationships when deleting a document', async () => {
      const doc1 = await store.create({ type: 'note', title: 'Doc 1', content: 'Content 1' });
      const doc2 = await store.create({ type: 'note', title: 'Doc 2', content: 'Content 2' });

      await store.addRelationship(doc1.id, 'references', doc2.id);
      await store.delete(doc1.id);

      const relationships = await store.getRelationships(doc2.id);
      expect(relationships).toHaveLength(0);
    });
  });

  // ─── Search Operation ─────────────────────────────────────

  describe('search()', () => {
    beforeEach(async () => {
      await store.create({
        type: 'article',
        title: 'TypeScript Guide',
        content: 'Learn TypeScript from scratch. TypeScript adds static typing to JavaScript.',
        tags: ['typescript', 'programming'],
        category: 'programming',
        status: 'published',
      });
      await store.create({
        type: 'article',
        title: 'Python Tutorial',
        content: 'Python is a versatile programming language used for web development and data science.',
        tags: ['python', 'programming'],
        category: 'programming',
        status: 'published',
      });
      await store.create({
        type: 'note',
        title: 'Meeting Notes',
        content: 'Discussed the project timeline and architecture decisions.',
        tags: ['meeting', 'project'],
        category: 'project',
        status: 'draft',
      });
      await store.create({
        type: 'code',
        title: 'React Component',
        content: 'A reusable React component with TypeScript props.',
        tags: ['react', 'typescript', 'frontend'],
        category: 'programming',
        status: 'published',
      });
    });

    it('should search by text query', async () => {
      const results = await store.search({ text: 'TypeScript' });
      expect(results.length).toBeGreaterThan(0);
      // Should find both the TypeScript guide and the React component with TypeScript
      const titles = results.map((r) => r.document.title);
      expect(titles).toContain('TypeScript Guide');
    });

    it('should search by type', async () => {
      const results = await store.search({ type: 'article' });
      expect(results).toHaveLength(2);
      expect(results.every((r) => r.document.type === 'article')).toBe(true);
    });

    it('should search by tags with AND semantics', async () => {
      const results = await store.search({ tags: ['typescript', 'programming'] });
      expect(results).toHaveLength(1);
      expect(results[0]!.document.title).toBe('TypeScript Guide');
    });

    it('should search by category', async () => {
      const results = await store.search({ category: 'programming' });
      expect(results.length).toBe(3); // TypeScript Guide, Python Tutorial, React Component
    });

    it('should search by status', async () => {
      const results = await store.search({ status: 'draft' });
      expect(results).toHaveLength(1);
      expect(results[0]!.document.title).toBe('Meeting Notes');
    });

    it('should combine text search with filters', async () => {
      const results = await store.search({
        text: 'programming',
        type: 'article',
      });
      expect(results.length).toBeGreaterThan(0);
      expect(results.every((r) => r.document.type === 'article')).toBe(true);
    });

    it('should apply limit', async () => {
      const results = await store.search({ limit: 2 });
      expect(results.length).toBeLessThanOrEqual(2);
    });

    it('should apply offset', async () => {
      const all = await store.search({});
      const offset = await store.search({ offset: 2 });
      expect(offset.length).toBe(all.length - 2);
    });

    it('should return results with scores', async () => {
      const results = await store.search({ text: 'TypeScript' });
      for (const result of results) {
        expect(result.score).toBeGreaterThanOrEqual(0);
        expect(result.score).toBeLessThanOrEqual(1);
      }
    });

    it('should return empty results for non-matching query', async () => {
      const results = await store.search({ text: 'nonexistentxyz123' });
      expect(results).toHaveLength(0);
    });

    it('should support time range search', async () => {
      const past = new Date(Date.now() - 100000);
      const future = new Date(Date.now() + 100000);

      const results = await store.search({
        dateFrom: past.toISOString(),
        dateTo: future.toISOString(),
      });
      expect(results.length).toBeGreaterThan(0);
    });
  });

  // ─── Version Management ───────────────────────────────────

  describe('version management', () => {
    it('should track version history', async () => {
      const created = await store.create({
        type: 'note',
        title: 'V1',
        content: 'First version',
      });

      await store.update(created.id, { title: 'V2', content: 'Second version' });
      await store.update(created.id, { title: 'V3', content: 'Third version' });

      const history = await store.getVersionHistory(created.id);
      expect(history).toHaveLength(3);
      expect(history[0]!.version).toBe(1);
      expect(history[1]!.version).toBe(2);
      expect(history[2]!.version).toBe(3);
    });

    it('should get a specific version', async () => {
      const created = await store.create({
        type: 'note',
        title: 'Original',
        content: 'First',
      });

      await store.update(created.id, { title: 'Updated', content: 'Second' });

      const v1 = await store.getVersion(created.id, 1);
      expect(v1).toBeDefined();
      expect(v1!.document.title).toBe('Original');

      const v2 = await store.getVersion(created.id, 2);
      expect(v2).toBeDefined();
      expect(v2!.document.title).toBe('Updated');
    });

    it('should diff between versions', async () => {
      const created = await store.create({
        type: 'note',
        title: 'Original',
        content: 'First',
        tags: ['v1'],
      });

      await store.update(created.id, { title: 'Updated', tags: ['v2'] });

      const diff = await store.diffVersions(created.id, 1, 2);
      expect(diff).toBeDefined();
      expect(diff!.fieldsChanged).toContain('title');
      expect(diff!.fieldsChanged).toContain('tags');
      expect(diff!.fieldsChanged).toContain('version');
      // updatedAt may or may not be in the diff depending on test execution speed
    });

    it('should return undefined for non-existent version', async () => {
      const created = await store.create({
        type: 'note',
        title: 'Test',
        content: 'Content',
      });

      const version = await store.getVersion(created.id, 99);
      expect(version).toBeUndefined();
    });

    it('should remove version history on delete', async () => {
      const created = await store.create({
        type: 'note',
        title: 'Test',
        content: 'Content',
      });

      await store.update(created.id, { title: 'Updated' });
      await store.delete(created.id);

      const history = await store.getVersionHistory(created.id);
      expect(history).toHaveLength(0);
    });
  });

  // ─── Relationship Management ──────────────────────────────

  describe('relationship management', () => {
    let doc1: KnowledgeDocument;
    let doc2: KnowledgeDocument;
    let doc3: KnowledgeDocument;

    beforeEach(async () => {
      doc1 = await store.create({ type: 'note', title: 'Doc 1', content: 'Content 1' });
      doc2 = await store.create({ type: 'note', title: 'Doc 2', content: 'Content 2' });
      doc3 = await store.create({ type: 'note', title: 'Doc 3', content: 'Content 3' });
    });

    it('should add a relationship between documents', async () => {
      const rel = await store.addRelationship(doc1.id, 'references', doc2.id);

      expect(rel.sourceId).toBe(doc1.id);
      expect(rel.type).toBe('references');
      expect(rel.targetId).toBe(doc2.id);
      expect(rel.createdAt).toBeDefined();
    });

    it('should throw when adding relationship with non-existent source', async () => {
      await expect(
        store.addRelationship('nonexistent', 'references', doc2.id)
      ).rejects.toThrow('Source document not found');
    });

    it('should throw when adding relationship with non-existent target', async () => {
      await expect(
        store.addRelationship(doc1.id, 'references', 'nonexistent')
      ).rejects.toThrow('Target document not found');
    });

    it('should not create duplicate relationships', async () => {
      const rel1 = await store.addRelationship(doc1.id, 'references', doc2.id);
      const rel2 = await store.addRelationship(doc1.id, 'references', doc2.id);

      expect(rel1.sourceId).toBe(rel2.sourceId);
      expect(rel1.targetId).toBe(rel2.targetId);
    });

    it('should get relationships for a document', async () => {
      await store.addRelationship(doc1.id, 'references', doc2.id);
      await store.addRelationship(doc3.id, 'depends-on', doc1.id);

      const relationships = await store.getRelationships(doc1.id);
      expect(relationships).toHaveLength(2);

      const types = relationships.map((r) => r.type);
      expect(types).toContain('references');
      expect(types).toContain('depends-on');
    });

    it('should get related documents', async () => {
      await store.addRelationship(doc1.id, 'references', doc2.id);
      await store.addRelationship(doc1.id, 'related-to', doc3.id);

      const related = await store.getRelatedDocuments(doc1.id);
      expect(related).toHaveLength(2);
    });

    it('should get related documents filtered by relationship type', async () => {
      await store.addRelationship(doc1.id, 'references', doc2.id);
      await store.addRelationship(doc1.id, 'related-to', doc3.id);

      const references = await store.getRelatedDocuments(doc1.id, 'references');
      expect(references).toHaveLength(1);
      expect(references[0]!.id).toBe(doc2.id);
    });

    it('should remove a relationship', async () => {
      await store.addRelationship(doc1.id, 'references', doc2.id);

      const result = await store.removeRelationship(doc1.id, 'references', doc2.id);
      expect(result).toBe(true);

      const relationships = await store.getRelationships(doc1.id);
      expect(relationships).toHaveLength(0);
    });

    it('should return false when removing non-existent relationship', async () => {
      const result = await store.removeRelationship(doc1.id, 'references', doc2.id);
      expect(result).toBe(false);
    });
  });

  // ─── Statistics ────────────────────────────────────────────

  describe('getStats()', () => {
    it('should return empty stats for new store', async () => {
      const stats = await store.getStats();

      expect(stats.totalDocuments).toBe(0);
      expect(stats.totalRelationships).toBe(0);
      expect(stats.totalTags).toBe(0);
      expect(stats.totalVersions).toBe(0);
    });

    it('should count documents correctly', async () => {
      await store.create({ type: 'note', title: 'Note 1', content: 'Content', tags: ['tag1'] });
      await store.create({ type: 'article', title: 'Article 1', content: 'Content', tags: ['tag1', 'tag2'] });
      await store.create({ type: 'code', title: 'Code 1', content: 'Content', status: 'published' });

      const stats = await store.getStats();

      expect(stats.totalDocuments).toBe(3);
      expect(stats.documentsByType.note).toBe(1);
      expect(stats.documentsByType.article).toBe(1);
      expect(stats.documentsByType.code).toBe(1);
      expect(stats.documentsByStatus.draft).toBe(2);
      expect(stats.documentsByStatus.published).toBe(1);
      expect(stats.totalTags).toBe(2); // tag1 and tag2
      expect(stats.totalVersions).toBe(3); // 3 initial versions
    });

    it('should track oldest and newest documents', async () => {
      const first = await store.create({ type: 'note', title: 'First', content: 'Content' });
      await delay(10);
      const second = await store.create({ type: 'note', title: 'Second', content: 'Content' });

      const stats = await store.getStats();
      expect(stats.oldestDocument).toBe(first.createdAt);
      expect(stats.newestDocument).toBe(second.createdAt);
    });
  });

  // ─── Export / Import ──────────────────────────────────────

  describe('export() / import()', () => {
    it('should export all documents and relationships', async () => {
      const doc1 = await store.create({ type: 'note', title: 'Note 1', content: 'Content 1' });
      const doc2 = await store.create({ type: 'article', title: 'Article 1', content: 'Content 2' });
      await store.addRelationship(doc1.id, 'references', doc2.id);

      const exported = await store.export();

      expect(exported.version).toBe('1.0.0');
      expect(exported.exportedAt).toBeDefined();
      expect(exported.documents).toHaveLength(2);
      expect(exported.relationships).toHaveLength(1);
      expect(exported.config).toBeDefined();
    });

    it('should import documents from export', async () => {
      await store.create({ type: 'note', title: 'Note', content: 'Content' });

      const exported = await store.export();

      const newStore = createTestStore();
      const count = await newStore.import(exported);
      expect(count).toBe(1);

      const results = await newStore.search({ type: 'note' });
      expect(results).toHaveLength(1);
      expect(results[0]!.document.title).toBe('Note');
    });

    it('should overwrite existing documents on import', async () => {
      const doc = await store.create({ type: 'note', title: 'Original', content: 'Original content' });
      const exported = await store.export();

      const newStore = createTestStore();
      // Modify the document in the new store (same ID)
      await newStore.import(exported);

      const retrieved = await newStore.get(doc.id);
      expect(retrieved).toBeDefined();
      expect(retrieved!.title).toBe('Original');
    });
  });

  // ─── Clear ────────────────────────────────────────────────

  describe('clear()', () => {
    it('should clear all documents and relationships', async () => {
      await store.create({ type: 'note', title: 'Note 1', content: 'Content' });
      await store.create({ type: 'article', title: 'Article 1', content: 'Content' });

      await store.clear();

      const stats = await store.getStats();
      expect(stats.totalDocuments).toBe(0);
      expect(stats.totalRelationships).toBe(0);
      expect(stats.totalVersions).toBe(0);
    });
  });

  // ─── Event Bus Integration ────────────────────────────────

  describe('EventBus integration', () => {
    let eventBus: EventBus;
    let storeWithBus: KnowledgeStore;

    beforeEach(() => {
      eventBus = new EventBus();
      storeWithBus = createTestStore(undefined, eventBus);
    });

    it('should emit knowledge.created event on create', async () => {
      const handler = vi.fn();
      eventBus.subscribe('knowledge.created', handler);

      await storeWithBus.create({ type: 'note', title: 'Test', content: 'Content' });

      expect(handler).toHaveBeenCalledOnce();
      const event = handler.mock.calls[0]![0];
      expect(event.payload.type).toBe('note');
      expect(event.payload.title).toBe('Test');
    });

    it('should emit knowledge.updated event on update', async () => {
      const handler = vi.fn();
      eventBus.subscribe('knowledge.updated', handler);

      const doc = await storeWithBus.create({ type: 'note', title: 'Test', content: 'Content' });
      await storeWithBus.update(doc.id, { title: 'Updated' });

      expect(handler).toHaveBeenCalledOnce();
      const event = handler.mock.calls[0]![0];
      expect(event.payload.version).toBe(2);
    });

    it('should emit knowledge.deleted event on delete', async () => {
      const handler = vi.fn();
      eventBus.subscribe('knowledge.deleted', handler);

      const doc = await storeWithBus.create({ type: 'note', title: 'Test', content: 'Content' });
      await storeWithBus.delete(doc.id);

      expect(handler).toHaveBeenCalledOnce();
      const event = handler.mock.calls[0]![0];
      expect(event.payload.id).toBe(doc.id);
    });

    it('should emit knowledge.searched event on search', async () => {
      const handler = vi.fn();
      eventBus.subscribe('knowledge.searched', handler);

      await storeWithBus.create({ type: 'note', title: 'Test', content: 'Content' });
      await storeWithBus.search({ text: 'Test' });

      expect(handler).toHaveBeenCalledOnce();
      const event = handler.mock.calls[0]![0];
      expect(event.payload.query).toBe('Test');
    });

    it('should emit knowledge.versioned event on update', async () => {
      const handler = vi.fn();
      eventBus.subscribe('knowledge.versioned', handler);

      const doc = await storeWithBus.create({ type: 'note', title: 'Test', content: 'Content' });
      await storeWithBus.update(doc.id, { title: 'Updated', changeDescription: 'Updated title' });

      expect(handler).toHaveBeenCalledOnce();
      const event = handler.mock.calls[0]![0];
      expect(event.payload.version).toBe(2);
      expect(event.payload.changeDescription).toBe('Updated title');
    });

    it('should not emit events without event bus', async () => {
      // Just verify it doesn't throw
      await store.create({ type: 'note', title: 'Test', content: 'Content' });
      await store.update((await store.search({}))[0]!.document.id, { title: 'Updated' });
      await store.delete((await store.search({}))[0]!.document.id);
    });
  });
});

// ─── DocumentIndex Tests ────────────────────────────────────

describe('DocumentIndex', () => {
  let index: DocumentIndex;

  beforeEach(() => {
    index = new DocumentIndex();
  });

  describe('addDocument()', () => {
    it('should index a document', () => {
      const doc = makeDoc({ id: 'd1', title: 'Test Document', content: 'Hello world', tags: ['test'] });
      index.addDocument(doc);

      expect(index.size()).toBe(1);
    });

    it('should support full-text search', () => {
      index.addDocument(makeDoc({ id: 'd1', title: 'TypeScript Guide', content: 'Learn TypeScript programming' }));
      index.addDocument(makeDoc({ id: 'd2', title: 'Python Guide', content: 'Learn Python programming' }));

      const results = index.searchText('TypeScript');
      expect(results.length).toBeGreaterThan(0);
      expect(results[0]!.id).toBe('d1');
    });

    it('should rank results by relevance', () => {
      index.addDocument(makeDoc({ id: 'd1', title: 'TypeScript', content: 'TypeScript TypeScript TypeScript' }));
      index.addDocument(makeDoc({ id: 'd2', title: 'Other', content: 'Mentions TypeScript once' }));

      const results = index.searchText('TypeScript');
      expect(results[0]!.id).toBe('d1'); // Higher relevance
      expect(results[0]!.score).toBeGreaterThan(results[1]!.score);
    });
  });

  describe('removeDocument()', () => {
    it('should remove document from all indexes', () => {
      const doc = makeDoc({ id: 'd1', type: 'note', title: 'Test', content: 'Hello', tags: ['test'] });
      index.addDocument(doc);
      index.removeDocument('d1');

      expect(index.size()).toBe(0);
      expect(index.getByType('note').size).toBe(0);
      expect(index.getByTag('test').size).toBe(0);
    });
  });

  describe('updateDocument()', () => {
    it('should update document in index', () => {
      const doc = makeDoc({ id: 'd1', title: 'Old Title', content: 'Old content' });
      index.addDocument(doc);

      const updated = makeDoc({ id: 'd1', title: 'New Title', content: 'New content about Python' });
      index.updateDocument(updated);

      const results = index.searchText('Python');
      expect(results.length).toBe(1);
      expect(results[0]!.id).toBe('d1');
    });
  });

  describe('structured query', () => {
    beforeEach(() => {
      index.addDocument(makeDoc({ id: 'd1', type: 'article', status: 'published', tags: ['typescript', 'guide'], category: 'programming' }));
      index.addDocument(makeDoc({ id: 'd2', type: 'note', status: 'draft', tags: ['meeting'], category: 'project' }));
      index.addDocument(makeDoc({ id: 'd3', type: 'article', status: 'published', tags: ['python', 'guide'], category: 'programming' }));
    });

    it('should query by type', () => {
      const results = index.query({ type: 'article' });
      expect(results.size).toBe(2);
    });

    it('should query by status', () => {
      const results = index.query({ status: 'draft' });
      expect(results.size).toBe(1);
      expect(results.has('d2')).toBe(true);
    });

    it('should query by tags with AND semantics', () => {
      const results = index.query({ tags: ['guide', 'typescript'] });
      expect(results.size).toBe(1);
      expect(results.has('d1')).toBe(true);
    });

    it('should query by category', () => {
      const results = index.query({ category: 'programming' });
      expect(results.size).toBe(2);
    });

    it('should combine filters with AND semantics', () => {
      const results = index.query({ type: 'article', status: 'published', category: 'programming' });
      expect(results.size).toBe(2);
    });
  });

  describe('getHighlights()', () => {
    it('should extract relevant snippets', () => {
      const doc = makeDoc({
        content: 'TypeScript is a typed superset of JavaScript. TypeScript compiles to plain JavaScript. Use TypeScript for large projects.',
      });
      index.addDocument(doc);

      const highlights = index.getHighlights(doc, 'TypeScript');
      expect(highlights.length).toBeGreaterThan(0);
      expect(highlights.some((h) => h.toLowerCase().includes('typescript'))).toBe(true);
    });
  });

  describe('clear()', () => {
    it('should clear all indexes', () => {
      index.addDocument(makeDoc({ id: 'd1', type: 'note', title: 'Test', content: 'Hello' }));
      index.clear();

      expect(index.size()).toBe(0);
    });
  });
});

// ─── VersionManager Tests ───────────────────────────────────

describe('VersionManager', () => {
  let versionManager: VersionManager;

  beforeEach(() => {
    versionManager = new VersionManager();
  });

  describe('recordInitialVersion()', () => {
    it('should record the first version', () => {
      const doc = makeDoc({ id: 'd1', title: 'Test', content: 'Content' });
      const version = versionManager.recordInitialVersion(doc);

      expect(version.version).toBe(1);
      expect(version.document.title).toBe('Test');
      expect(version.changeDescription).toBe('Initial version');
    });
  });

  describe('recordVersion()', () => {
    it('should increment version number', () => {
      const doc = makeDoc({ id: 'd1', title: 'V1', content: 'Content' });
      versionManager.recordInitialVersion(doc);

      const updated = makeDoc({ id: 'd1', title: 'V2', content: 'New content' });
      const version = versionManager.recordVersion(updated, 'Updated title');

      expect(version.version).toBe(2);
      expect(version.changeDescription).toBe('Updated title');
    });
  });

  describe('getVersionHistory()', () => {
    it('should return all versions', () => {
      const doc = makeDoc({ id: 'd1', title: 'V1', content: 'Content' });
      versionManager.recordInitialVersion(doc);

      const updated = makeDoc({ id: 'd1', title: 'V2', content: 'New' });
      versionManager.recordVersion(updated);

      const history = versionManager.getVersionHistory('d1');
      expect(history).toHaveLength(2);
      expect(history[0]!.version).toBe(1);
      expect(history[1]!.version).toBe(2);
    });

    it('should return empty for non-existent document', () => {
      const history = versionManager.getVersionHistory('nonexistent');
      expect(history).toHaveLength(0);
    });
  });

  describe('getVersion()', () => {
    it('should return a specific version', () => {
      const doc = makeDoc({ id: 'd1', title: 'V1', content: 'Content' });
      versionManager.recordInitialVersion(doc);

      const v1 = versionManager.getVersion('d1', 1);
      expect(v1).toBeDefined();
      expect(v1!.document.title).toBe('V1');
    });

    it('should return undefined for non-existent version', () => {
      const doc = makeDoc({ id: 'd1', title: 'V1', content: 'Content' });
      versionManager.recordInitialVersion(doc);

      const v99 = versionManager.getVersion('d1', 99);
      expect(v99).toBeUndefined();
    });
  });

  describe('diff()', () => {
    it('should compare two versions', () => {
      const doc = makeDoc({ id: 'd1', title: 'V1', content: 'Content', tags: ['a'] });
      versionManager.recordInitialVersion(doc);

      const updated = makeDoc({ id: 'd1', title: 'V2', content: 'New content', tags: ['b'] });
      versionManager.recordVersion(updated);

      const diff = versionManager.diff('d1', 1, 2);
      expect(diff).toBeDefined();
      expect(diff!.fieldsChanged).toContain('title');
      expect(diff!.fieldsChanged).toContain('content');
      expect(diff!.fieldsChanged).toContain('tags');
    });
  });

  describe('removeHistory()', () => {
    it('should remove all version history', () => {
      const doc = makeDoc({ id: 'd1', title: 'V1', content: 'Content' });
      versionManager.recordInitialVersion(doc);
      versionManager.removeHistory('d1');

      const history = versionManager.getVersionHistory('d1');
      expect(history).toHaveLength(0);
    });
  });

  describe('max versions', () => {
    it('should trim old versions when exceeding max', () => {
      const manager = new VersionManager(5);
      const doc = makeDoc({ id: 'd1', title: 'V1', content: 'Content' });
      manager.recordInitialVersion(doc);

      for (let i = 2; i <= 8; i++) {
        manager.recordVersion(makeDoc({ id: 'd1', title: `V${i}`, content: `Content ${i}` }));
      }

      const history = manager.getVersionHistory('d1');
      expect(history.length).toBe(5);
      expect(history[0]!.version).toBe(4); // Oldest kept version
      expect(history[history.length - 1]!.version).toBe(8); // Newest
    });
  });

  describe('clear()', () => {
    it('should clear all version history', () => {
      const doc = makeDoc({ id: 'd1', title: 'V1', content: 'Content' });
      versionManager.recordInitialVersion(doc);
      versionManager.clear();

      expect(versionManager.getTotalVersionCount()).toBe(0);
    });
  });
});

// ─── SearchEngine Tests ────────────────────────────────────

describe('SearchEngine', () => {
  let searchEngine: SearchEngine;

  beforeEach(() => {
    searchEngine = new SearchEngine({ enableSemanticSearch: true });
  });

  describe('indexDocument()', () => {
    it('should index a document and make it searchable', async () => {
      const doc = makeDoc({ id: 'd1', title: 'TypeScript', content: 'Learn TypeScript' });
      searchEngine.indexDocument(doc);

      const results = await searchEngine.search({ text: 'TypeScript' });
      expect(results.length).toBeGreaterThan(0);
      expect(results[0]!.document.id).toBe('d1');
    });

    it('should generate embedding when semantic search is enabled', () => {
      const doc = makeDoc({ id: 'd1', title: 'Test', content: 'Content' });
      searchEngine.indexDocument(doc);

      expect(doc.embedding).toBeDefined();
      expect(doc.embedding!.length).toBe(128);
    });

    it('should not generate embedding when semantic search is disabled', () => {
      const engine = new SearchEngine({ enableSemanticSearch: false });
      const doc = makeDoc({ id: 'd1', title: 'Test', content: 'Content' });
      engine.indexDocument(doc);

      expect(doc.embedding).toBeUndefined();
    });
  });

  describe('removeDocument()', () => {
    it('should remove document from search results', async () => {
      const doc = makeDoc({ id: 'd1', title: 'TypeScript', content: 'Learn TypeScript' });
      searchEngine.indexDocument(doc);
      searchEngine.removeDocument('d1');

      const results = await searchEngine.search({ text: 'TypeScript' });
      expect(results).toHaveLength(0);
    });
  });

  describe('search()', () => {
    it('should combine full-text and semantic search', async () => {
      searchEngine.indexDocument(makeDoc({ id: 'd1', title: 'Machine Learning Guide', content: 'A comprehensive guide to machine learning algorithms and neural networks.' }));
      searchEngine.indexDocument(makeDoc({ id: 'd2', title: 'Cooking Tips', content: 'How to bake a perfect cake with chocolate frosting.' }));

      const results = await searchEngine.search({ text: 'machine learning' });
      expect(results.length).toBeGreaterThan(0);
      expect(results[0]!.document.id).toBe('d1');
    });

    it('should apply structured filters', async () => {
      searchEngine.indexDocument(makeDoc({ id: 'd1', type: 'article', title: 'TypeScript', content: 'TypeScript content', status: 'published' }));
      searchEngine.indexDocument(makeDoc({ id: 'd2', type: 'note', title: 'TypeScript Notes', content: 'Notes about TypeScript', status: 'draft' }));

      const results = await searchEngine.search({ text: 'TypeScript', type: 'article' });
      expect(results).toHaveLength(1);
      expect(results[0]!.document.id).toBe('d1');
    });

    it('should apply limit and offset', async () => {
      for (let i = 0; i < 5; i++) {
        searchEngine.indexDocument(makeDoc({ id: `d${i}`, title: `Doc ${i}`, content: `Content ${i} about programming` }));
      }

      const results = await searchEngine.search({ text: 'programming', limit: 3 });
      expect(results.length).toBeLessThanOrEqual(3);
    });

    it('should return structured results without text query', async () => {
      searchEngine.indexDocument(makeDoc({ id: 'd1', type: 'article', title: 'Test', content: 'Content', status: 'published' }));
      searchEngine.indexDocument(makeDoc({ id: 'd2', type: 'note', title: 'Test2', content: 'Content2', status: 'draft' }));

      const results = await searchEngine.search({ type: 'article' });
      expect(results).toHaveLength(1);
      expect(results[0]!.document.id).toBe('d1');
      expect(results[0]!.score).toBe(1.0);
    });
  });

  describe('clear()', () => {
    it('should clear all indexed documents', async () => {
      searchEngine.indexDocument(makeDoc({ id: 'd1', title: 'Test', content: 'Content' }));
      searchEngine.clear();

      const results = await searchEngine.search({ text: 'Test' });
      expect(results).toHaveLength(0);
    });
  });
});

// ─── Integration Tests ──────────────────────────────────────

describe('Knowledge Integration', () => {
  it('should support full lifecycle: create → search → update → version → delete', async () => {
    const eventBus = new EventBus();
    const events: unknown[] = [];
    eventBus.subscribe('knowledge.created', (e) => events.push(e));

    const store = createTestStore(undefined, eventBus);

    // Create
    const doc = await store.create({
      type: 'article',
      title: 'Getting Started with AI',
      content: 'Artificial intelligence is transforming how we build software. Machine learning models can now generate code.',
      tags: ['ai', 'programming'],
      category: 'technology',
    });

    expect(doc.version).toBe(1);

    // Search
    const found = await store.search({ text: 'artificial intelligence' });
    expect(found.length).toBeGreaterThan(0);

    // Update
    const updated = await store.update(doc.id, {
      title: 'Getting Started with AI - Updated',
      changeDescription: 'Added more details',
    });

    expect(updated.version).toBe(2);
    expect(updated.title).toBe('Getting Started with AI - Updated');

    // Version history
    const history = await store.getVersionHistory(doc.id);
    expect(history).toHaveLength(2);

    // Delete
    const deleted = await store.delete(doc.id);
    expect(deleted).toBe(true);

    // Verify gone
    const gone = await store.get(doc.id);
    expect(gone).toBeUndefined();

    // Events were emitted
    expect(events.length).toBeGreaterThan(0);
  });

  it('should support relationships between documents', async () => {
    const store = createTestStore();

    const doc1 = await store.create({ type: 'note', title: 'Architecture Decision', content: 'We decided to use microservices.' });
    const doc2 = await store.create({ type: 'note', title: 'API Design', content: 'The API follows REST principles.' });
    const doc3 = await store.create({ type: 'code', title: 'API Implementation', content: 'Express.js route handlers.' });

    await store.addRelationship(doc1.id, 'references', doc2.id);
    await store.addRelationship(doc2.id, 'depends-on', doc3.id);
    await store.addRelationship(doc1.id, 'related-to', doc3.id);

    const related = await store.getRelatedDocuments(doc1.id);
    expect(related).toHaveLength(2);

    const refs = await store.getRelatedDocuments(doc1.id, 'references');
    expect(refs).toHaveLength(1);
    expect(refs[0]!.id).toBe(doc2.id);
  });

  it('should support export and import round-trip', async () => {
    const store1 = createTestStore();
    const doc1 = await store1.create({ type: 'note', title: 'Note 1', content: 'Content 1', tags: ['test'] });
    const doc2 = await store1.create({ type: 'article', title: 'Article 1', content: 'Content 2' });
    await store1.addRelationship(doc1.id, 'references', doc2.id);

    const exported = await store1.export();

    const store2 = createTestStore();
    const imported = await store2.import(exported);

    expect(imported).toBe(2);

    const searchResults = await store2.search({ type: 'note' });
    expect(searchResults).toHaveLength(1);
    expect(searchResults[0]!.document.title).toBe('Note 1');
  });

  it('should handle concurrent operations', async () => {
    const store = createTestStore();

    const promises = Array.from({ length: 10 }, (_, i) =>
      store.create({ type: 'note', title: `Note ${i}`, content: `Content ${i}` })
    );

    const docs = await Promise.all(promises);
    expect(docs).toHaveLength(10);

    const stats = await store.getStats();
    expect(stats.totalDocuments).toBe(10);
  });

  it('should support complex search queries', async () => {
    const store = createTestStore();

    await store.create({
      type: 'article',
      title: 'React Hooks Guide',
      content: 'React hooks allow functional components to manage state and side effects.',
      tags: ['react', 'frontend', 'hooks'],
      category: 'frontend',
      status: 'published',
    });

    await store.create({
      type: 'article',
      title: 'Vue.js Composition API',
      content: 'Vue composition API provides a flexible way to organize component logic.',
      tags: ['vue', 'frontend'],
      category: 'frontend',
      status: 'published',
    });

    await store.create({
      type: 'note',
      title: 'Frontend Meeting',
      content: 'Discussed React and Vue.js frameworks for the new project.',
      tags: ['meeting', 'frontend'],
      category: 'meetings',
      status: 'draft',
    });

    // Search for frontend articles (published only)
    const results = await store.search({
      text: 'frontend',
      type: 'article',
      status: 'published',
    });

    expect(results.length).toBeGreaterThan(0);
    expect(results.every((r) => r.document.type === 'article')).toBe(true);
    expect(results.every((r) => r.document.status === 'published')).toBe(true);
  });
});
