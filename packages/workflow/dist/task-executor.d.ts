/**
 * ALTER EGO OS — Task Executor
 *
 * Executes individual tasks with:
 * - Configurable timeout (default 5 minutes)
 * - Retry with linear or exponential backoff
 * - Task handler registry — plugins provide handlers, the engine just orchestrates
 */
import type { DAGNode, NodeResult, TaskContext, TaskHandler } from './types.js';
export declare class TaskExecutor {
    private readonly handlers;
    /**
     * Register a task handler for a given task type.
     * Plugins call this to provide execution logic.
     */
    registerHandler(taskType: string, handler: TaskHandler): void;
    /**
     * Unregister a task handler.
     */
    unregisterHandler(taskType: string): void;
    /**
     * Check if a handler is registered for a task type.
     */
    hasHandler(taskType: string): boolean;
    /**
     * Execute a single node with timeout and retry logic.
     * Returns a NodeResult with status and output/error.
     */
    execute(node: DAGNode, context: TaskContext): Promise<NodeResult>;
    /**
     * Execute the task with a timeout.
     */
    private executeWithTimeout;
    /**
     * Run an async function with a timeout.
     */
    private runWithTimeout;
    /**
     * Calculate the delay before the next retry.
     */
    private calculateDelay;
    /**
     * Simple delay utility.
     */
    private delay;
}
//# sourceMappingURL=task-executor.d.ts.map