/**
 * ALTER EGO OS — Checkpoint Types
 *
 * Core type definitions for the standalone checkpoint system.
 * Used by the workflow engine and mission center for state persistence and recovery.
 */

// ─── Identifier Types ────────────────────────────────────────

/** Unique identifier for a checkpoint */
export type CheckpointId = string;

// ─── Checkpoint ──────────────────────────────────────────────

/** A snapshot of workflow/mission state at a point in time */
export interface Checkpoint {
  /** Unique checkpoint identifier */
  id: CheckpointId;
  /** The workflow this checkpoint belongs to */
  workflowId: string;
  /** Optional mission this checkpoint belongs to */
  missionId?: string;
  /** Current status of the workflow at checkpoint time */
  status: string;
  /** List of completed step IDs */
  completedSteps: string[];
  /** Results from completed steps, keyed by step ID */
  stepResults: Record<string, unknown>;
  /** ISO 8601 timestamp when checkpoint was created */
  createdAt: string;
  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

// ─── Checkpoint Store ────────────────────────────────────────

/** Abstract storage backend for checkpoints */
export interface CheckpointStore {
  /** Save a checkpoint (create or update) */
  save(checkpoint: Checkpoint): Promise<void>;
  /** Load a checkpoint by ID */
  load(id: CheckpointId): Promise<Checkpoint | null>;
  /** Load the most recent checkpoint for a workflow */
  loadLatest(workflowId: string): Promise<Checkpoint | null>;
  /** List all checkpoints for a workflow */
  list(workflowId: string): Promise<Checkpoint[]>;
  /** Delete a checkpoint by ID */
  delete(id: CheckpointId): Promise<void>;
  /** Remove checkpoints older than a given date; returns the count deleted */
  cleanup(beforeDate: string): Promise<number>;
}

// ─── Checkpoint Events ───────────────────────────────────────

/** Event emitted when a checkpoint is saved */
export interface CheckpointSavedEvent {
  checkpointId: CheckpointId;
  workflowId: string;
  missionId?: string;
  status: string;
  completedStepsCount: number;
}

/** Event emitted when a checkpoint is restored */
export interface CheckpointRestoredEvent {
  checkpointId: CheckpointId;
  workflowId: string;
  status: string;
}

/** Event emitted when checkpoints are cleaned up */
export interface CheckpointCleanedUpEvent {
  deletedCount: number;
  beforeDate: string;
}
