/**
 * ALTER EGO OS — Mission Center Implementation
 *
 * The Mission Center is the user-facing interface for creating and managing
 * missions. It translates high-level mission descriptions into structured
 * Mission objects and submits them to the Orchestrator via a delegate pattern.
 *
 * Key design decisions:
 * - Uses OrchestratorDelegate interface to avoid tight coupling with the actual Orchestrator
 * - In-memory storage for Phase 1
 * - EventBus integration for mission lifecycle events
 * - Template-based validation for mission parameters
 */

import type {
  MissionTemplate,
  MissionTemplateId,
  MissionSubmission,
  MissionTracker,
  MissionId,
  MissionPriority,
  MissionStatus,
  OrchestratorDelegate,
  ValidationResult,
  TemplateParameter,
  MissionConstraints,
} from './types.js';
import { PREDEFINED_TEMPLATES } from './templates.js';

// ─── Simple EventBus Interface ───────────────────────────────
// We depend on a minimal interface to stay decoupled from the actual EventBus

export interface MinimalEventBus {
  emit<T = unknown>(options: {
    type: string;
    payload: T;
    source: string;
  }): Promise<number>;
}

// ─── Default Orchestrator Delegate (no-op) ───────────────────

class NoOpOrchestratorDelegate implements OrchestratorDelegate {
  async submitMission(_submission: MissionSubmission): Promise<MissionId> {
    return `mission_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  async cancelMission(_missionId: MissionId): Promise<void> {
    // No-op
  }
}

// ─── MissionCenter Implementation ────────────────────────────

export class MissionCenter {
  private readonly templates: Map<MissionTemplateId, MissionTemplate> = new Map();
  private readonly trackers: Map<MissionId, MissionTracker> = new Map();
  private readonly missionOrder: MissionId[] = [];
  private orchestratorDelegate: OrchestratorDelegate;
  private eventBus?: MinimalEventBus;

  constructor(options?: {
    orchestratorDelegate?: OrchestratorDelegate;
    eventBus?: MinimalEventBus;
    loadPredefined?: boolean;
  }) {
    this.orchestratorDelegate = options?.orchestratorDelegate ?? new NoOpOrchestratorDelegate();
    this.eventBus = options?.eventBus;

    // Load pre-defined templates by default
    if (options?.loadPredefined !== false) {
      for (const template of PREDEFINED_TEMPLATES) {
        this.templates.set(template.id, template);
      }
    }
  }

  // ─── Template Management ───────────────────────────────

  /**
   * Register a new mission template.
   * Throws if a template with the same ID already exists.
   */
  registerTemplate(template: MissionTemplate): void {
    if (this.templates.has(template.id)) {
      throw new Error(`Template already registered: ${template.id}`);
    }
    this.templates.set(template.id, template);
  }

  /**
   * List all available templates.
   */
  listTemplates(): MissionTemplate[] {
    return Array.from(this.templates.values());
  }

  /**
   * Get a specific template by ID.
   * Returns undefined if not found.
   */
  getTemplate(id: MissionTemplateId): MissionTemplate | undefined {
    return this.templates.get(id);
  }

  // ─── Mission Submission ────────────────────────────────

  /**
   * Submit a new mission.
   * Validates parameters against the template (if provided),
   * merges constraints, and delegates to the Orchestrator.
   */
  async submit(submission: MissionSubmission): Promise<MissionTracker> {
    // Validate against template if templateId is provided
    if (submission.templateId) {
      const template = this.templates.get(submission.templateId);
      if (!template) {
        throw new Error(`Template not found: ${submission.templateId}`);
      }
      const validation = this.validateSubmission(submission);
      if (!validation.valid) {
        throw new Error(`Invalid submission: ${validation.errors.join('; ')}`);
      }
    }

    // Merge constraints with template defaults
    const constraints = this.mergeConstraints(submission);

    const enrichedSubmission: MissionSubmission = {
      ...submission,
      constraints,
    };

    // Delegate to orchestrator
    const missionId = await this.orchestratorDelegate.submitMission(enrichedSubmission);

    // Create tracker
    const now = new Date().toISOString();
    const status: MissionStatus = submission.scheduledAt ? 'scheduled' : 'pending';
    const priority: MissionPriority = submission.priority ?? 'normal';

    const tracker: MissionTracker = {
      missionId,
      status,
      progress: 0,
      deliverables: [],
      submission: enrichedSubmission,
      templateId: submission.templateId,
      priority,
      createdAt: now,
    };

    this.trackers.set(missionId, tracker);
    this.missionOrder.push(missionId);

    // Emit event
    await this.emitEvent('mission.created', {
      missionId,
      templateId: submission.templateId,
    });

    return tracker;
  }

  /**
   * Validate a submission against its template.
   * If no templateId is provided, only basic validation is performed.
   */
  validateSubmission(submission: MissionSubmission): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Basic validation
    if (!submission.description || submission.description.trim().length === 0) {
      errors.push('Mission description is required');
    }

    // Template-based validation
    if (submission.templateId) {
      const template = this.templates.get(submission.templateId);
      if (!template) {
        errors.push(`Template not found: ${submission.templateId}`);
        return { valid: false, errors, warnings };
      }

      // Validate each required parameter
      for (const param of template.parameters) {
        const value = submission.parameters[param.name];

        if (param.required && (value === undefined || value === null || value === '')) {
          errors.push(`Required parameter missing: ${param.name} (${param.label})`);
          continue;
        }

        if (value === undefined || value === null) continue;

        // Type validation
        const typeError = this.validateParameterType(param, value);
        if (typeError) {
          errors.push(typeError);
        }

        // Options validation for select/multiselect
        if (param.type === 'select' && param.options) {
          const validValues = param.options.map((o) => o.value);
          if (!validValues.includes(String(value))) {
            errors.push(
              `Invalid value for ${param.name}: "${value}". Valid options: ${validValues.join(', ')}`
            );
          }
        }

        if (param.type === 'multiselect' && param.options && Array.isArray(value)) {
          const validValues = param.options.map((o) => o.value);
          for (const item of value) {
            if (!validValues.includes(String(item))) {
              warnings.push(
                `Invalid option for ${param.name}: "${item}". Valid options: ${validValues.join(', ')}`
              );
            }
          }
        }
      }

      // Warn about extra parameters not in the template
      const templateParamNames = new Set(template.parameters.map((p) => p.name));
      for (const key of Object.keys(submission.parameters)) {
        if (!templateParamNames.has(key)) {
          warnings.push(`Unknown parameter: ${key} (not in template)`);
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  // ─── Mission Tracking ─────────────────────────────────

  /**
   * Get the progress tracker for a mission.
   * Returns undefined if the mission ID is not found.
   */
  getTracker(missionId: MissionId): MissionTracker | undefined {
    return this.trackers.get(missionId);
  }

  /**
   * Update the tracker for a mission (used internally or by the Orchestrator).
   */
  updateTracker(missionId: MissionId, updates: Partial<MissionTracker>): void {
    const tracker = this.trackers.get(missionId);
    if (!tracker) {
      throw new Error(`Mission not found: ${missionId}`);
    }
    Object.assign(tracker, updates);

    // Emit events for status changes
    if (updates.status === 'completed') {
      void this.emitEvent('mission.completed', { missionId });
    } else if (updates.status === 'failed') {
      void this.emitEvent('mission.failed', {
        missionId,
        error: updates.error ?? 'Unknown error',
      });
    }
  }

  /**
   * Cancel a running mission.
   */
  async cancelMission(missionId: MissionId): Promise<void> {
    const tracker = this.trackers.get(missionId);
    if (!tracker) {
      throw new Error(`Mission not found: ${missionId}`);
    }

    if (tracker.status === 'completed' || tracker.status === 'cancelled') {
      throw new Error(`Cannot cancel mission in status: ${tracker.status}`);
    }

    await this.orchestratorDelegate.cancelMission(missionId);

    tracker.status = 'cancelled';
    tracker.completedAt = new Date().toISOString();

    await this.emitEvent('mission.cancelled', { missionId });
  }

  /**
   * Get mission history (past missions).
   * Returns missions sorted by creation date (newest first).
   */
  getMissionHistory(limit?: number): MissionTracker[] {
    const all = Array.from(this.trackers.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    return limit ? all.slice(0, limit) : all;
  }

  // ─── Delegate Management ──────────────────────────────

  /**
   * Set the Orchestrator delegate.
   * This allows swapping the delegate at runtime.
   */
  setOrchestratorDelegate(delegate: OrchestratorDelegate): void {
    this.orchestratorDelegate = delegate;
  }

  // ─── Private Methods ──────────────────────────────────

  private validateParameterType(param: TemplateParameter, value: unknown): string | null {
    switch (param.type) {
      case 'string':
        if (typeof value !== 'string') {
          return `Parameter ${param.name} must be a string`;
        }
        break;
      case 'number':
        if (typeof value !== 'number' || isNaN(value)) {
          return `Parameter ${param.name} must be a number`;
        }
        break;
      case 'boolean':
        if (typeof value !== 'boolean') {
          return `Parameter ${param.name} must be a boolean`;
        }
        break;
      case 'select':
        if (typeof value !== 'string') {
          return `Parameter ${param.name} must be a string for select type`;
        }
        break;
      case 'multiselect':
        if (!Array.isArray(value)) {
          return `Parameter ${param.name} must be an array for multiselect type`;
        }
        break;
    }
    return null;
  }

  private mergeConstraints(submission: MissionSubmission): MissionConstraints {
    if (!submission.templateId) {
      return submission.constraints ?? {};
    }

    const template = this.templates.get(submission.templateId);
    if (!template) {
      return submission.constraints ?? {};
    }

    return {
      ...template.defaultConstraints,
      ...submission.constraints,
    };
  }

  private async emitEvent<T>(type: string, payload: T): Promise<void> {
    if (this.eventBus) {
      await this.eventBus.emit({
        type,
        payload,
        source: 'mission-center',
      });
    }
  }
}
