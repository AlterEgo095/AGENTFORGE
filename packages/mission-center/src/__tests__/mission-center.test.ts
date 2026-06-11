/**
 * ALTER EGO OS — Mission Center Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MissionCenter } from '../index.js';
import { PREDEFINED_TEMPLATES } from '../index.js';
import type {
  MissionSubmission,
  MissionTemplate,
  OrchestratorDelegate,
  MissionId,
} from '../index.js';

// ─── Mock Orchestrator Delegate ──────────────────────────────

function createMockDelegate(): OrchestratorDelegate & { submissions: MissionSubmission[]; cancelled: MissionId[] } {
  let counter = 0;
  return {
    submissions: [],
    cancelled: [],
    async submitMission(submission: MissionSubmission): Promise<MissionId> {
      this.submissions.push(submission);
      return `mission_${++counter}_${Date.now()}`;
    },
    async cancelMission(missionId: MissionId): Promise<void> {
      this.cancelled.push(missionId);
    },
  };
}

// ─── Mock EventBus ───────────────────────────────────────────

function createMockEventBus() {
  const events: { type: string; payload: unknown }[] = [];
  return {
    events,
    async emit<T>(options: { type: string; payload: T; source: string }): Promise<number> {
      events.push({ type: options.type, payload: options.payload });
      return 1;
    },
  };
}

// ─── Tests ───────────────────────────────────────────────────

describe('MissionCenter', () => {
  let missionCenter: MissionCenter;
  let mockDelegate: ReturnType<typeof createMockDelegate>;

  beforeEach(() => {
    mockDelegate = createMockDelegate();
    missionCenter = new MissionCenter({
      orchestratorDelegate: mockDelegate,
      loadPredefined: true,
    });
  });

  // ─── Template Management ──────────────────────────────

  describe('registerTemplate', () => {
    it('should register a new template', () => {
      const template: MissionTemplate = {
        id: 'custom-template',
        name: 'Custom Template',
        description: 'A custom template for testing',
        missionType: 'custom',
        parameters: [
          {
            name: 'input',
            type: 'string',
            label: 'Input',
            required: true,
          },
        ],
        defaultConstraints: {},
        estimatedDuration: '5 minutes',
        estimatedCost: '~1€',
      };

      missionCenter.registerTemplate(template);
      expect(missionCenter.getTemplate('custom-template')).toEqual(template);
    });

    it('should throw if a template with the same ID already exists', () => {
      const template: MissionTemplate = {
        id: 'formation-complete',
        name: 'Duplicate',
        description: 'Should fail',
        missionType: 'formation',
        parameters: [],
        defaultConstraints: {},
        estimatedDuration: '5 min',
        estimatedCost: '~1€',
      };

      expect(() => missionCenter.registerTemplate(template)).toThrow(
        'Template already registered: formation-complete'
      );
    });
  });

  describe('listTemplates', () => {
    it('should list all pre-defined templates', () => {
      const templates = missionCenter.listTemplates();
      expect(templates.length).toBeGreaterThanOrEqual(5);
      expect(templates.map((t) => t.id)).toContain('formation-complete');
      expect(templates.map((t) => t.id)).toContain('veille-technologique');
      expect(templates.map((t) => t.id)).toContain('article-professionnel');
      expect(templates.map((t) => t.id)).toContain('presentation');
      expect(templates.map((t) => t.id)).toContain('audit-infrastructure');
    });
  });

  describe('getTemplate', () => {
    it('should return a specific template by ID', () => {
      const template = missionCenter.getTemplate('formation-complete');
      expect(template).toBeDefined();
      expect(template!.name).toBe('Formation Complète');
    });

    it('should return undefined for unknown template IDs', () => {
      const template = missionCenter.getTemplate('nonexistent');
      expect(template).toBeUndefined();
    });
  });

  // ─── Mission Submission ───────────────────────────────

  describe('submit', () => {
    it('should submit a mission with a template and return a tracker', async () => {
      const submission: MissionSubmission = {
        templateId: 'formation-complete',
        description: 'Create a React training course',
        parameters: {
          topic: 'React',
          targetAudience: 'Developers',
          duration: '2h',
        },
        priority: 'high',
      };

      const tracker = await missionCenter.submit(submission);

      expect(tracker.missionId).toBeDefined();
      expect(tracker.status).toBe('pending');
      expect(tracker.progress).toBe(0);
      expect(tracker.priority).toBe('high');
      expect(tracker.templateId).toBe('formation-complete');
      expect(tracker.createdAt).toBeDefined();
      expect(tracker.deliverables).toEqual([]);
    });

    it('should submit a mission without a template', async () => {
      const submission: MissionSubmission = {
        description: 'Do something custom',
        parameters: {},
        priority: 'normal',
      };

      const tracker = await missionCenter.submit(submission);

      expect(tracker.missionId).toBeDefined();
      expect(tracker.templateId).toBeUndefined();
      expect(tracker.priority).toBe('normal');
    });

    it('should default priority to normal if not specified', async () => {
      const submission: MissionSubmission = {
        description: 'A mission without priority',
        parameters: {},
      };

      const tracker = await missionCenter.submit(submission);
      expect(tracker.priority).toBe('normal');
    });

    it('should set status to scheduled if scheduledAt is provided', async () => {
      const submission: MissionSubmission = {
        description: 'Scheduled mission',
        parameters: {},
        scheduledAt: new Date(Date.now() + 3600000).toISOString(),
      };

      const tracker = await missionCenter.submit(submission);
      expect(tracker.status).toBe('scheduled');
    });

    it('should merge constraints with template defaults', async () => {
      const submission: MissionSubmission = {
        templateId: 'formation-complete',
        description: 'Test constraints merging',
        parameters: {
          topic: 'Test',
          targetAudience: 'Devs',
          duration: '2h',
        },
        constraints: {
          maxCostCents: 1000,
        },
      };

      const tracker = await missionCenter.submit(submission);
      // The merged constraints should have both template defaults and submission overrides
      expect(tracker.submission.constraints?.maxCostCents).toBe(1000);
      // Template defaults should be preserved for non-overridden fields
      expect(tracker.submission.constraints?.tags).toEqual(['formation', 'education']);
    });

    it('should throw if template is not found', async () => {
      const submission: MissionSubmission = {
        templateId: 'nonexistent-template',
        description: 'Test',
        parameters: {},
      };

      await expect(missionCenter.submit(submission)).rejects.toThrow(
        'Template not found: nonexistent-template'
      );
    });

    it('should throw if required parameters are missing', async () => {
      const submission: MissionSubmission = {
        templateId: 'formation-complete',
        description: 'Missing params',
        parameters: {},
      };

      await expect(missionCenter.submit(submission)).rejects.toThrow(
        'Invalid submission'
      );
    });

    it('should delegate to the orchestrator', async () => {
      const submission: MissionSubmission = {
        description: 'Test delegation',
        parameters: {},
      };

      await missionCenter.submit(submission);

      expect(mockDelegate.submissions.length).toBe(1);
      expect(mockDelegate.submissions[0].description).toBe('Test delegation');
    });
  });

  // ─── Validation ───────────────────────────────────────

  describe('validateSubmission', () => {
    it('should validate a correct submission', () => {
      const submission: MissionSubmission = {
        templateId: 'formation-complete',
        description: 'Valid mission',
        parameters: {
          topic: 'React',
          targetAudience: 'Devs',
          duration: '2h',
        },
      };

      const result = missionCenter.validateSubmission(submission);
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should report missing required parameters', () => {
      const submission: MissionSubmission = {
        templateId: 'formation-complete',
        description: 'Missing params',
        parameters: {},
      };

      const result = missionCenter.validateSubmission(submission);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors.some((e) => e.includes('topic'))).toBe(true);
      expect(result.errors.some((e) => e.includes('targetAudience'))).toBe(true);
    });

    it('should report wrong parameter types', () => {
      const submission: MissionSubmission = {
        templateId: 'formation-complete',
        description: 'Wrong types',
        parameters: {
          topic: 123, // should be string
          targetAudience: 'Devs',
          duration: '2h',
          includeExercises: 'yes', // should be boolean
        },
      };

      const result = missionCenter.validateSubmission(submission);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('string'))).toBe(true);
    });

    it('should warn about unknown parameters', () => {
      const submission: MissionSubmission = {
        templateId: 'formation-complete',
        description: 'Extra params',
        parameters: {
          topic: 'React',
          targetAudience: 'Devs',
          duration: '2h',
          unknownParam: 'value',
        },
      };

      const result = missionCenter.validateSubmission(submission);
      expect(result.warnings.some((w) => w.includes('unknownParam'))).toBe(true);
    });

    it('should validate select parameter options', () => {
      const submission: MissionSubmission = {
        templateId: 'formation-complete',
        description: 'Invalid select value',
        parameters: {
          topic: 'React',
          targetAudience: 'Devs',
          duration: 'invalid-option',
        },
      };

      const result = missionCenter.validateSubmission(submission);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('Invalid value'))).toBe(true);
    });

    it('should validate multiselect parameter options', () => {
      const submission: MissionSubmission = {
        templateId: 'veille-technologique',
        description: 'Invalid multiselect',
        parameters: {
          domain: 'AI',
          sources: ['web', 'invalid-source'],
        },
      };

      const result = missionCenter.validateSubmission(submission);
      expect(result.warnings.some((w) => w.includes('invalid-source'))).toBe(true);
    });

    it('should fail validation for empty description', () => {
      const submission: MissionSubmission = {
        description: '',
        parameters: {},
      };

      const result = missionCenter.validateSubmission(submission);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('description'))).toBe(true);
    });

    it('should pass basic validation without a template', () => {
      const submission: MissionSubmission = {
        description: 'A simple mission',
        parameters: {},
      };

      const result = missionCenter.validateSubmission(submission);
      expect(result.valid).toBe(true);
    });
  });

  // ─── Mission Tracking ────────────────────────────────

  describe('getTracker', () => {
    it('should return the tracker for a submitted mission', async () => {
      const submission: MissionSubmission = {
        description: 'Trackable mission',
        parameters: {},
      };

      const tracker = await missionCenter.submit(submission);
      const retrieved = missionCenter.getTracker(tracker.missionId);

      expect(retrieved).toBeDefined();
      expect(retrieved!.missionId).toBe(tracker.missionId);
    });

    it('should return undefined for unknown mission IDs', () => {
      const tracker = missionCenter.getTracker('nonexistent');
      expect(tracker).toBeUndefined();
    });
  });

  describe('updateTracker', () => {
    it('should update the tracker with new values', async () => {
      const submission: MissionSubmission = {
        description: 'Updatable mission',
        parameters: {},
      };

      const tracker = await missionCenter.submit(submission);
      missionCenter.updateTracker(tracker.missionId, {
        status: 'running',
        progress: 25,
        currentStep: 'Step 1',
        startedAt: new Date().toISOString(),
      });

      const updated = missionCenter.getTracker(tracker.missionId);
      expect(updated!.status).toBe('running');
      expect(updated!.progress).toBe(25);
      expect(updated!.currentStep).toBe('Step 1');
    });

    it('should throw if mission not found', () => {
      expect(() =>
        missionCenter.updateTracker('nonexistent', { progress: 50 })
      ).toThrow('Mission not found');
    });
  });

  // ─── Mission Cancellation ────────────────────────────

  describe('cancelMission', () => {
    it('should cancel a pending mission', async () => {
      const submission: MissionSubmission = {
        description: 'Cancellable mission',
        parameters: {},
      };

      const tracker = await missionCenter.submit(submission);
      await missionCenter.cancelMission(tracker.missionId);

      const cancelled = missionCenter.getTracker(tracker.missionId);
      expect(cancelled!.status).toBe('cancelled');
      expect(cancelled!.completedAt).toBeDefined();
    });

    it('should delegate cancellation to the orchestrator', async () => {
      const submission: MissionSubmission = {
        description: 'Delegate cancel',
        parameters: {},
      };

      const tracker = await missionCenter.submit(submission);
      await missionCenter.cancelMission(tracker.missionId);

      expect(mockDelegate.cancelled).toContain(tracker.missionId);
    });

    it('should throw if mission is already completed', async () => {
      const submission: MissionSubmission = {
        description: 'Completed mission',
        parameters: {},
      };

      const tracker = await missionCenter.submit(submission);
      missionCenter.updateTracker(tracker.missionId, { status: 'completed' });

      await expect(missionCenter.cancelMission(tracker.missionId)).rejects.toThrow(
        'Cannot cancel mission in status: completed'
      );
    });

    it('should throw if mission is not found', async () => {
      await expect(missionCenter.cancelMission('nonexistent')).rejects.toThrow(
        'Mission not found'
      );
    });
  });

  // ─── Mission History ─────────────────────────────────

  describe('getMissionHistory', () => {
    it('should return all missions', async () => {
      await missionCenter.submit({ description: 'Mission 1', parameters: {} });
      await missionCenter.submit({ description: 'Mission 2', parameters: {} });
      await missionCenter.submit({ description: 'Mission 3', parameters: {} });

      const history = missionCenter.getMissionHistory();
      expect(history.length).toBe(3);
      // All missions should be present
      const descriptions = history.map((h) => h.submission.description);
      expect(descriptions).toContain('Mission 1');
      expect(descriptions).toContain('Mission 2');
      expect(descriptions).toContain('Mission 3');
    });

    it('should limit the number of results', async () => {
      for (let i = 0; i < 10; i++) {
        await missionCenter.submit({ description: `Mission ${i}`, parameters: {} });
      }

      const history = missionCenter.getMissionHistory(5);
      expect(history.length).toBe(5);
    });
  });

  // ─── EventBus Integration ────────────────────────────

  describe('EventBus integration', () => {
    it('should emit mission.created event on submit', async () => {
      const mockBus = createMockEventBus();
      const mc = new MissionCenter({
        orchestratorDelegate: mockDelegate,
        eventBus: mockBus,
      });

      await mc.submit({ description: 'Event test', parameters: {} });

      expect(mockBus.events.some((e) => e.type === 'mission.created')).toBe(true);
    });

    it('should emit mission.cancelled event on cancel', async () => {
      const mockBus = createMockEventBus();
      const mc = new MissionCenter({
        orchestratorDelegate: mockDelegate,
        eventBus: mockBus,
      });

      const tracker = await mc.submit({ description: 'Cancel event test', parameters: {} });
      await mc.cancelMission(tracker.missionId);

      expect(mockBus.events.some((e) => e.type === 'mission.cancelled')).toBe(true);
    });
  });

  // ─── Delegate Management ─────────────────────────────

  describe('setOrchestratorDelegate', () => {
    it('should allow swapping the delegate at runtime', async () => {
      const newDelegate = createMockDelegate();
      missionCenter.setOrchestratorDelegate(newDelegate);

      await missionCenter.submit({ description: 'New delegate', parameters: {} });

      expect(newDelegate.submissions.length).toBe(1);
      expect(mockDelegate.submissions.length).toBe(0);
    });
  });

  // ─── Pre-defined Templates ───────────────────────────

  describe('pre-defined templates', () => {
    it('should load all 5 pre-defined templates', () => {
      const templates = missionCenter.listTemplates();
      expect(templates.length).toBe(5);
    });

    it('should not load pre-defined templates when loadPredefined is false', () => {
      const mc = new MissionCenter({
        orchestratorDelegate: mockDelegate,
        loadPredefined: false,
      });
      expect(mc.listTemplates()).toEqual([]);
    });

    it('should have valid parameters in all pre-defined templates', () => {
      for (const template of PREDEFINED_TEMPLATES) {
        expect(template.id).toBeTruthy();
        expect(template.name).toBeTruthy();
        expect(template.description).toBeTruthy();
        expect(template.missionType).toBeTruthy();
        expect(Array.isArray(template.parameters)).toBe(true);
        expect(template.estimatedDuration).toBeTruthy();
        expect(template.estimatedCost).toBeTruthy();
      }
    });
  });
});
