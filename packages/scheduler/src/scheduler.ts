/**
 * ALTER EGO OS — Scheduler Implementation
 *
 * The Scheduler enables the Agenda IA — time-based and event-based triggers
 * for automated mission execution.
 *
 * Features:
 * - Cron-based scheduling (5-field expressions)
 * - Interval-based scheduling (milliseconds)
 * - One-time scheduling (execute at a specific time)
 * - Event-based scheduling (trigger on EventBus events)
 * - Start/stop lifecycle management
 * - In-memory storage for Phase 1
 */

import type {
  Schedule,
  ScheduleId,
  ScheduleExecution,
  ExecutionId,
  MissionDelegate,
  SchedulerEventBus,
} from './types.js';
import { getNextCronExecution } from './cron-parser.js';

// ─── Default Configuration ───────────────────────────────────

const DEFAULT_TICK_INTERVAL_MS = 60_000; // 1 minute
const MAX_EXECUTION_HISTORY = 1000;

// ─── No-op Mission Delegate ──────────────────────────────────

class NoOpMissionDelegate implements MissionDelegate {
  async executeMission(templateId: string, _parameters: Record<string, unknown>): Promise<string> {
    return `mission_scheduled_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }
}

// ─── Scheduler Implementation ────────────────────────────────

export class Scheduler {
  private readonly schedules: Map<ScheduleId, Schedule> = new Map();
  private readonly executions: ScheduleExecution[] = [];
  private readonly eventSubscriptions: Map<string, { unsubscribe: () => void }[]> = new Map();
  private missionDelegate: MissionDelegate;
  private eventBus?: SchedulerEventBus;
  private tickInterval?: ReturnType<typeof setInterval>;
  private running = false;
  private idCounter = 0;
  private executionCounter = 0;

  constructor(options?: {
    missionDelegate?: MissionDelegate;
    eventBus?: SchedulerEventBus;
  }) {
    this.missionDelegate = options?.missionDelegate ?? new NoOpMissionDelegate();
    this.eventBus = options?.eventBus;
  }

  // ─── Schedule CRUD ────────────────────────────────────

  /**
   * Create a new schedule.
   * Calculates and stores the next execution time.
   */
  createSchedule(schedule: Omit<Schedule, 'id' | 'executionCount' | 'createdAt' | 'nextExecutionAt' | 'lastExecutedAt'>): Schedule {
    const id = `sched_${++this.idCounter}_${Date.now()}`;
    const now = new Date().toISOString();

    const newSchedule: Schedule = {
      ...schedule,
      id,
      executionCount: 0,
      createdAt: now,
      enabled: schedule.enabled ?? true,
    };

    // Calculate next execution time
    newSchedule.nextExecutionAt = this.getNextExecution(newSchedule)?.toISOString() ?? undefined;

    this.schedules.set(id, newSchedule);

    // Register event trigger if event-based
    if (newSchedule.type === 'event' && newSchedule.triggerEventType && this.eventBus) {
      this.registerEventTrigger(newSchedule.triggerEventType);
    }

    // Emit event
    void this.emitEvent('schedule.created', { scheduleId: id });

    return newSchedule;
  }

  /**
   * Update an existing schedule.
   */
  updateSchedule(id: ScheduleId, updates: Partial<Schedule>): Schedule {
    const schedule = this.schedules.get(id);
    if (!schedule) {
      throw new Error(`Schedule not found: ${id}`);
    }

    // Don't allow changing the type after creation
    if (updates.type && updates.type !== schedule.type) {
      throw new Error('Cannot change schedule type after creation');
    }

    Object.assign(schedule, updates);

    // Recalculate next execution
    if (schedule.enabled) {
      schedule.nextExecutionAt = this.getNextExecution(schedule)?.toISOString() ?? undefined;
    } else {
      schedule.nextExecutionAt = undefined;
    }

    void this.emitEvent('schedule.updated', { scheduleId: id });

    return schedule;
  }

  /**
   * Delete a schedule.
   */
  deleteSchedule(id: ScheduleId): void {
    const schedule = this.schedules.get(id);
    if (!schedule) {
      throw new Error(`Schedule not found: ${id}`);
    }

    // Clean up event subscriptions if event-based
    if (schedule.triggerEventType) {
      const subs = this.eventSubscriptions.get(schedule.triggerEventType);
      if (subs) {
        subs.forEach((sub) => sub.unsubscribe());
        this.eventSubscriptions.delete(schedule.triggerEventType);
      }
    }

    this.schedules.delete(id);
    void this.emitEvent('schedule.deleted', { scheduleId: id });
  }

  /**
   * Enable a schedule.
   */
  enableSchedule(id: ScheduleId): void {
    const schedule = this.schedules.get(id);
    if (!schedule) {
      throw new Error(`Schedule not found: ${id}`);
    }
    schedule.enabled = true;
    schedule.nextExecutionAt = this.getNextExecution(schedule)?.toISOString() ?? undefined;
  }

  /**
   * Disable a schedule.
   */
  disableSchedule(id: ScheduleId): void {
    const schedule = this.schedules.get(id);
    if (!schedule) {
      throw new Error(`Schedule not found: ${id}`);
    }
    schedule.enabled = false;
    schedule.nextExecutionAt = undefined;
  }

  /**
   * List all schedules.
   */
  listSchedules(): Schedule[] {
    return Array.from(this.schedules.values());
  }

  // ─── Lifecycle ────────────────────────────────────────

  /**
   * Start the scheduler loop.
   * Begins periodic tick() calls to check and execute due schedules.
   */
  start(tickIntervalMs: number = DEFAULT_TICK_INTERVAL_MS): void {
    if (this.running) {
      return; // Already running
    }

    this.running = true;
    this.tickInterval = setInterval(() => {
      void this.tick();
    }, tickIntervalMs);

    // Also do an immediate tick
    void this.tick();
  }

  /**
   * Stop the scheduler.
   */
  stop(): void {
    if (this.tickInterval) {
      clearInterval(this.tickInterval);
      this.tickInterval = undefined;
    }
    this.running = false;
  }

  /**
   * Check if the scheduler is running.
   */
  isRunning(): boolean {
    return this.running;
  }

  /**
   * Check and execute all due schedules.
   * This is called automatically by start(), but can also be called manually.
   */
  async tick(): Promise<number> {
    const now = new Date();
    let executedCount = 0;

    for (const schedule of this.schedules.values()) {
      if (!schedule.enabled) continue;
      if (schedule.type === 'event') continue; // Event-based schedules are triggered differently

      const shouldExecute = this.shouldExecute(schedule, now);
      if (shouldExecute) {
        await this.executeSchedule(schedule);
        executedCount++;
      }
    }

    return executedCount;
  }

  // ─── Next Execution Calculation ───────────────────────

  /**
   * Calculate the next execution time for a schedule.
   * Returns null if the schedule type doesn't support time-based execution.
   */
  getNextExecution(schedule: Schedule): Date | null {
    if (!schedule.enabled) return null;

    switch (schedule.type) {
      case 'cron': {
        if (!schedule.cronExpression) return null;
        return getNextCronExecution(schedule.cronExpression, new Date());
      }

      case 'interval': {
        if (!schedule.intervalMs) return null;
        const last = schedule.lastExecutedAt
          ? new Date(schedule.lastExecutedAt)
          : new Date(schedule.createdAt);
        return new Date(last.getTime() + schedule.intervalMs);
      }

      case 'one_time': {
        if (!schedule.executeAt) return null;
        const execTime = new Date(schedule.executeAt);
        // If already past, no next execution
        if (execTime.getTime() <= Date.now()) return null;
        return execTime;
      }

      case 'event': {
        // Event-based schedules don't have predictable next execution times
        return null;
      }

      default:
        return null;
    }
  }

  // ─── Event Trigger Registration ───────────────────────

  /**
   * Register to listen for a specific event type.
   * When the event is received, all enabled schedules with that triggerEventType
   * will be executed.
   */
  registerEventTrigger(eventType: string): void {
    if (!this.eventBus) return;

    // Don't re-register if already listening for this event type
    if (this.eventSubscriptions.has(eventType)) return;

    const subscriptions: { unsubscribe: () => void }[] = [];

    const sub = this.eventBus.subscribe(eventType, async () => {
      // Find all schedules with this trigger event type
      for (const schedule of this.schedules.values()) {
        if (schedule.type === 'event' && schedule.triggerEventType === eventType && schedule.enabled) {
          await this.executeSchedule(schedule);
        }
      }
    });

    subscriptions.push(sub);
    this.eventSubscriptions.set(eventType, subscriptions);
  }

  // ─── Execution History ────────────────────────────────

  /**
   * Get execution history for a specific schedule.
   */
  getExecutions(scheduleId: ScheduleId): ScheduleExecution[] {
    return this.executions.filter((e) => e.scheduleId === scheduleId);
  }

  /**
   * Get all executions.
   */
  getAllExecutions(): ScheduleExecution[] {
    return [...this.executions];
  }

  // ─── Delegate Management ──────────────────────────────

  /**
   * Set the mission delegate.
   */
  setMissionDelegate(delegate: MissionDelegate): void {
    this.missionDelegate = delegate;
  }

  // ─── Private Methods ──────────────────────────────────

  private shouldExecute(schedule: Schedule, now: Date): boolean {
    switch (schedule.type) {
      case 'cron':
      case 'interval': {
        if (!schedule.nextExecutionAt) return false;
        const next = new Date(schedule.nextExecutionAt);
        return now.getTime() >= next.getTime();
      }

      case 'one_time': {
        if (!schedule.executeAt) return false;
        const execTime = new Date(schedule.executeAt);
        // Execute if the target time has passed and we haven't executed yet
        return now.getTime() >= execTime.getTime() && schedule.executionCount === 0;
      }

      default:
        return false;
    }
  }

  private async executeSchedule(schedule: Schedule): Promise<void> {
    const executionId = `exec_${++this.executionCounter}_${Date.now()}`;
    const now = new Date().toISOString();

    const execution: ScheduleExecution = {
      id: executionId,
      scheduleId: schedule.id,
      missionId: '', // Will be set after execution
      status: 'triggered',
      triggeredAt: now,
    };

    try {
      execution.status = 'running';
      const missionId = await this.missionDelegate.executeMission(
        schedule.missionTemplateId,
        schedule.parameters
      );

      execution.missionId = missionId;
      execution.status = 'completed';
      execution.completedAt = new Date().toISOString();

      // Update schedule metadata
      schedule.lastExecutedAt = now;
      schedule.executionCount++;

      // Calculate next execution
      schedule.nextExecutionAt = this.getNextExecution(schedule)?.toISOString() ?? undefined;

      // For one_time schedules, disable after execution
      if (schedule.type === 'one_time') {
        schedule.enabled = false;
        schedule.nextExecutionAt = undefined;
      }

      void this.emitEvent('schedule.completed', {
        scheduleId: schedule.id,
        missionId,
      });
    } catch (error) {
      execution.status = 'failed';
      execution.error = error instanceof Error ? error.message : String(error);
      execution.completedAt = new Date().toISOString();

      void this.emitEvent('schedule.failed', {
        scheduleId: schedule.id,
        error: execution.error,
      });
    }

    // Store execution
    this.executions.push(execution);

    // Trim history if needed
    if (this.executions.length > MAX_EXECUTION_HISTORY) {
      this.executions.splice(0, this.executions.length - MAX_EXECUTION_HISTORY);
    }
  }

  private async emitEvent<T>(type: string, payload: T): Promise<void> {
    if (this.eventBus) {
      await this.eventBus.emit({
        type,
        payload,
        source: 'scheduler',
      });
    }
  }
}
