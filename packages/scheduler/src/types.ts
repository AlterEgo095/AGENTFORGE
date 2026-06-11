/**
 * ALTER EGO OS — Scheduler Types
 *
 * Core type definitions for time-based and event-based mission triggers.
 * The Scheduler powers the Agenda IA — enabling automated, scheduled mission execution.
 */

// ─── Identifiers ─────────────────────────────────────────────

/** Unique identifier for a schedule */
export type ScheduleId = string;

/** Unique identifier for a schedule execution */
export type ExecutionId = string;

// ─── Schedule Types ──────────────────────────────────────────

/** Type of schedule trigger */
export type ScheduleType = 'cron' | 'interval' | 'one_time' | 'event';

/** A schedule definition */
export interface Schedule {
  /** Unique schedule identifier */
  id: ScheduleId;
  /** Human-readable schedule name */
  name: string;
  /** Type of schedule */
  type: ScheduleType;
  /** Mission template ID to execute when triggered */
  missionTemplateId: string;
  /** Parameters to pass to the mission */
  parameters: Record<string, unknown>;
  /** Whether this schedule is enabled */
  enabled: boolean;

  // ─── Cron / Interval fields ─────────────────────────────
  /** Cron expression (for cron type) — e.g., "0 7 * * *" for 7am daily */
  cronExpression?: string;
  /** Interval in milliseconds (for interval type) — e.g., 3600000 for hourly */
  intervalMs?: number;

  // ─── One-time fields ────────────────────────────────────
  /** ISO timestamp for one_time schedules */
  executeAt?: string;

  // ─── Event fields ───────────────────────────────────────
  /** Event type that triggers this schedule */
  triggerEventType?: string;

  // ─── Metadata ───────────────────────────────────────────
  /** When this schedule was last executed */
  lastExecutedAt?: string;
  /** When this schedule will execute next */
  nextExecutionAt?: string;
  /** Number of times this schedule has been executed */
  executionCount: number;
  /** When this schedule was created */
  createdAt: string;
}

// ─── Execution Tracking ──────────────────────────────────────

/** Status of a schedule execution */
export type ExecutionStatus = 'triggered' | 'running' | 'completed' | 'failed';

/** A record of a schedule execution */
export interface ScheduleExecution {
  /** Unique execution identifier */
  id: ExecutionId;
  /** The schedule that was executed */
  scheduleId: ScheduleId;
  /** The mission ID created by this execution */
  missionId: string;
  /** Execution status */
  status: ExecutionStatus;
  /** When the execution was triggered */
  triggeredAt: string;
  /** When the execution completed */
  completedAt?: string;
  /** Error message if execution failed */
  error?: string;
}

// ─── Cron Parse Result ───────────────────────────────────────

/** Result of parsing a cron expression */
export interface CronParseResult {
  /** Whether the expression is valid */
  valid: boolean;
  /** Error message if invalid */
  error?: string;
  /** Human-readable description */
  description?: string;
  /** Parsed field values */
  fields?: {
    minute: number[];
    hour: number[];
    day: number[];
    month: number[];
    dayOfWeek: number[];
  };
}

// ─── Scheduler Events ────────────────────────────────────────

/** Events emitted by the Scheduler */
export interface SchedulerEvents {
  'schedule.created': { scheduleId: ScheduleId };
  'schedule.updated': { scheduleId: ScheduleId };
  'schedule.deleted': { scheduleId: ScheduleId };
  'schedule.triggered': { scheduleId: ScheduleId; missionId: string };
  'schedule.completed': { scheduleId: ScheduleId; missionId: string };
  'schedule.failed': { scheduleId: ScheduleId; error: string };
}

// ─── Mission Delegate ────────────────────────────────────────

/**
 * Interface for the mission execution delegate.
 * The Scheduler delegates mission creation to any object implementing this interface.
 */
export interface MissionDelegate {
  /**
   * Execute a mission based on a schedule trigger.
   * Returns the mission ID.
   */
  executeMission(templateId: string, parameters: Record<string, unknown>): Promise<string>;
}

// ─── EventBus Interface ──────────────────────────────────────

export interface SchedulerEventBus {
  emit<T = unknown>(options: {
    type: string;
    payload: T;
    source: string;
  }): Promise<number>;

  subscribe<T = unknown>(
    eventType: string,
    handler: (event: { type: string; payload: T }) => void | Promise<void>
  ): { unsubscribe: () => void };
}
