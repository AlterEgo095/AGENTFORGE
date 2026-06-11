/**
 * ALTER EGO OS — Task Executor
 *
 * Executes individual tasks with:
 * - Configurable timeout (default 5 minutes)
 * - Retry with linear or exponential backoff
 * - Task handler registry — plugins provide handlers, the engine just orchestrates
 */

import type {
  DAGNode,
  NodeResult,
  RetryPolicy,
  TaskContext,
  TaskHandler,
} from './types.js';

// ─── Default Configuration ───────────────────────────────────

const DEFAULT_TIMEOUT = 300_000; // 5 minutes
const DEFAULT_RETRY: RetryPolicy = {
  maxAttempts: 1,
  delayMs: 1000,
  backoff: 'linear',
};

// ─── Task Executor ───────────────────────────────────────────

export class TaskExecutor {
  private readonly handlers: Map<string, TaskHandler> = new Map();

  /**
   * Register a task handler for a given task type.
   * Plugins call this to provide execution logic.
   */
  registerHandler(taskType: string, handler: TaskHandler): void {
    this.handlers.set(taskType, handler);
  }

  /**
   * Unregister a task handler.
   */
  unregisterHandler(taskType: string): void {
    this.handlers.delete(taskType);
  }

  /**
   * Check if a handler is registered for a task type.
   */
  hasHandler(taskType: string): boolean {
    return this.handlers.has(taskType);
  }

  /**
   * Execute a single node with timeout and retry logic.
   * Returns a NodeResult with status and output/error.
   */
  async execute(
    node: DAGNode,
    context: TaskContext,
  ): Promise<NodeResult> {
    const startedAt = new Date().toISOString();
    const retryPolicy = node.retryPolicy ?? DEFAULT_RETRY;
    let retryCount = 0;
    let lastError: string | undefined;

    for (let attempt = 1; attempt <= retryPolicy.maxAttempts; attempt++) {
      try {
        const output = await this.executeWithTimeout(node, context);
        return {
          nodeId: node.id,
          status: 'completed',
          output,
          startedAt,
          completedAt: new Date().toISOString(),
          retryCount: retryCount,
        };
      } catch (error) {
        retryCount = attempt - 1;
        lastError = error instanceof Error ? error.message : String(error);

        // If we have retries left, wait before retrying
        if (attempt < retryPolicy.maxAttempts) {
          const delay = this.calculateDelay(retryPolicy, attempt);
          await this.delay(delay);
        }
      }
    }

    // All attempts exhausted
    return {
      nodeId: node.id,
      status: 'failed',
      error: lastError ?? 'Unknown error',
      startedAt,
      completedAt: new Date().toISOString(),
      retryCount: retryCount,
    };
  }

  // ─── Private Methods ────────────────────────────────────

  /**
   * Execute the task with a timeout.
   */
  private async executeWithTimeout(
    node: DAGNode,
    context: TaskContext,
  ): Promise<unknown> {
    const timeout = node.timeout ?? DEFAULT_TIMEOUT;
    const handler = this.handlers.get(node.type);

    if (!handler) {
      // Fall back to using the node config's handler name if specified
      const handlerName = node.config['handler'] as string | undefined;
      if (handlerName && this.handlers.has(handlerName)) {
        return this.runWithTimeout(
          () => this.handlers.get(handlerName)!(context),
          timeout,
          node.id,
        );
      }
      throw new Error(`No handler registered for task type: ${node.type}`);
    }

    return this.runWithTimeout(
      () => handler(context),
      timeout,
      node.id,
    );
  }

  /**
   * Run an async function with a timeout.
   */
  private async runWithTimeout(
    fn: () => Promise<unknown>,
    timeoutMs: number,
    nodeId: string,
  ): Promise<unknown> {
    return new Promise<unknown>((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Task "${nodeId}" timed out after ${timeoutMs}ms`));
      }, timeoutMs);

      fn()
        .then((result) => {
          clearTimeout(timer);
          resolve(result);
        })
        .catch((error) => {
          clearTimeout(timer);
          reject(error);
        });
    });
  }

  /**
   * Calculate the delay before the next retry.
   */
  private calculateDelay(policy: RetryPolicy, attempt: number): number {
    if (policy.backoff === 'exponential') {
      return policy.delayMs * Math.pow(2, attempt - 1);
    }
    // Linear: delay * attempt
    return policy.delayMs * attempt;
  }

  /**
   * Simple delay utility.
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
