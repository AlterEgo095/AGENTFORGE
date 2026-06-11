/**
 * ALTER EGO OS — Mission Center Types
 *
 * Core type definitions for mission creation, management, and tracking.
 * The Mission Center is the user-facing interface for creating and managing missions.
 */

// ─── Identifiers ─────────────────────────────────────────────

/** Unique identifier for mission templates */
export type MissionTemplateId = string;

/** Unique identifier for missions */
export type MissionId = string;

// ─── Mission Constraints ─────────────────────────────────────

/** Constraints that can be applied to a mission */
export interface MissionConstraints {
  /** Maximum cost in cents */
  maxCostCents?: number;
  /** Maximum duration in milliseconds */
  maxDurationMs?: number;
  /** Required quality score (0-1) */
  minQualityScore?: number;
  /** Allowed model types */
  allowedModels?: string[];
  /** Maximum number of retries */
  maxRetries?: number;
  /** Tags for categorization */
  tags?: string[];
}

// ─── Template Types ──────────────────────────────────────────

/** Parameter definition for a mission template */
export interface TemplateParameter {
  /** Parameter name (used as key in parameters Record) */
  name: string;
  /** Parameter type */
  type: 'string' | 'number' | 'boolean' | 'select' | 'multiselect';
  /** Human-readable label */
  label: string;
  /** Description of what this parameter controls */
  description?: string;
  /** Whether this parameter is required */
  required: boolean;
  /** Default value if not provided */
  defaultValue?: unknown;
  /** Options for select/multiselect types */
  options?: { label: string; value: string }[];
}

/** A mission template that defines the structure for a type of mission */
export interface MissionTemplate {
  /** Unique template identifier */
  id: MissionTemplateId;
  /** Human-readable template name */
  name: string;
  /** Template description */
  description: string;
  /** Mission type category */
  missionType: string; // 'formation', 'research', 'article', etc.
  /** Parameter definitions */
  parameters: TemplateParameter[];
  /** Default constraints for missions from this template */
  defaultConstraints: MissionConstraints;
  /** Estimated duration (human-readable) */
  estimatedDuration: string;
  /** Estimated cost (human-readable) */
  estimatedCost: string;
}

// ─── Mission Submission ──────────────────────────────────────

/** Priority levels for missions */
export type MissionPriority = 'critical' | 'high' | 'normal' | 'low';

/** A submission to create a new mission */
export interface MissionSubmission {
  /** Optional template to base the mission on */
  templateId?: MissionTemplateId;
  /** High-level mission description */
  description: string;
  /** Parameters for the mission (validated against template if templateId is provided) */
  parameters: Record<string, unknown>;
  /** Optional constraints (merged with template defaults) */
  constraints?: MissionConstraints;
  /** Mission priority */
  priority?: MissionPriority;
  /** ISO timestamp for scheduled execution */
  scheduledAt?: string;
}

// ─── Mission Status ──────────────────────────────────────────

/** Current status of a mission */
export type MissionStatus =
  | 'pending'
  | 'scheduled'
  | 'running'
  | 'completed'
  | 'failed'
  | 'cancelled';

/** A deliverable produced by a mission */
export interface Deliverable {
  /** Deliverable identifier */
  id: string;
  /** Deliverable name */
  name: string;
  /** Deliverable type */
  type: string;
  /** Deliverable content or reference */
  content: unknown;
  /** When the deliverable was created */
  createdAt: string;
}

/** Mission progress tracker */
export interface MissionTracker {
  /** Mission identifier */
  missionId: MissionId;
  /** Current mission status */
  status: MissionStatus;
  /** Progress percentage (0-100) */
  progress: number;
  /** Description of the current step */
  currentStep?: string;
  /** When the mission was started */
  startedAt?: string;
  /** Estimated completion time */
  estimatedCompletion?: string;
  /** Deliverables produced so far */
  deliverables: Deliverable[];
  /** Mission submission that created this mission */
  submission: MissionSubmission;
  /** Template used (if any) */
  templateId?: MissionTemplateId;
  /** Priority of the mission */
  priority: MissionPriority;
  /** When the mission was created */
  createdAt: string;
  /** When the mission was completed */
  completedAt?: string;
  /** Error message if mission failed */
  error?: string;
}

// ─── Orchestrator Delegate ───────────────────────────────────

/**
 * Interface for the Orchestrator delegate.
 * The Mission Center does NOT depend on the actual Orchestrator implementation.
 * Instead, it delegates mission execution to any object implementing this interface.
 */
export interface OrchestratorDelegate {
  /**
   * Submit a mission for execution.
   * Returns the mission ID.
   */
  submitMission(submission: MissionSubmission): Promise<MissionId>;

  /**
   * Cancel a running mission.
   */
  cancelMission(missionId: MissionId): Promise<void>;
}

// ─── Validation ──────────────────────────────────────────────

/** Result of validating a submission against a template */
export interface ValidationResult {
  /** Whether the submission is valid */
  valid: boolean;
  /** Validation error messages */
  errors: string[];
  /** Validation warning messages */
  warnings: string[];
}

// ─── Events ──────────────────────────────────────────────────

/** Event types emitted by the Mission Center */
export interface MissionCenterEvents {
  'mission.created': { missionId: MissionId; templateId?: MissionTemplateId };
  'mission.cancelled': { missionId: MissionId };
  'mission.completed': { missionId: MissionId };
  'mission.failed': { missionId: MissionId; error: string };
  'template.registered': { templateId: MissionTemplateId };
}
