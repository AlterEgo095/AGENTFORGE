/**
 * ALTER EGO OS — Event Bus Implementation
 *
 * Typed async pub/sub system with:
 * - Publish/Subscribe pattern
 * - Request/Reply pattern (for synchronous communication between agents)
 * - Middleware pipeline
 * - Error handling with retry
 * - Metrics collection
 * - Event prioritization
 */

import type {
  Event,
  EventId,
  EventBusConfig,
  EventBusMetrics,
  EventHandler,
  EventMiddleware,
  EventPriority,
  ErrorHandler,
  Subscription,
  RequestHandler,
  CreateEventOptions,
} from './types.js';

// ─── Default Configuration ───────────────────────────────────

const DEFAULT_CONFIG: Required<EventBusConfig> = {
  maxConcurrency: 10,
  debug: false,
  maxRetries: 3,
  retryDelay: 1000,
  maxPayloadSize: 1024 * 1024, // 1MB
  eventTTL: 300_000, // 5 minutes
};

// ─── Event Bus Implementation ────────────────────────────────

export class EventBus {
  private readonly config: Required<EventBusConfig>;
  private readonly handlers: Map<string, Set<EventHandler>> = new Map();
  private readonly requestHandlers: Map<string, RequestHandler> = new Map();
  private readonly middleware: EventMiddleware[] = [];
  private readonly metrics: EventBusMetrics;
  private errorHandler?: ErrorHandler;
  private subscriptionCounter = 0;
  private processingTimes: number[] = [];

  constructor(config?: EventBusConfig) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.metrics = {
      totalPublished: 0,
      totalProcessed: 0,
      totalFailed: 0,
      activeSubscriptions: 0,
      avgProcessingTimeMs: 0,
      eventsByType: {},
      errorsByType: {},
    };
  }

  // ─── Publish / Subscribe ─────────────────────────────────

  /**
   * Subscribe to events of a given type.
   * Returns a Subscription handle that can be used to unsubscribe.
   */
  subscribe<T = unknown>(eventType: string, handler: EventHandler<T>): Subscription {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, new Set());
    }

    const typedHandler = handler as EventHandler;
    this.handlers.get(eventType)!.add(typedHandler);

    const subscriptionId = `sub_${++this.subscriptionCounter}`;
    this.metrics.activeSubscriptions++;

    return {
      id: subscriptionId,
      eventType,
      unsubscribe: () => {
        const handlers = this.handlers.get(eventType);
        if (handlers) {
          handlers.delete(typedHandler);
          if (handlers.size === 0) {
            this.handlers.delete(eventType);
          }
        }
        this.metrics.activeSubscriptions--;
      },
    };
  }

  /**
   * Publish an event to all subscribers.
   * Handlers are invoked asynchronously and in parallel.
   * Returns the number of handlers that were invoked.
   */
  async publish<T = unknown>(event: Event<T>): Promise<number> {
    this.validateEvent(event);

    // Update metrics
    this.metrics.totalPublished++;
    this.metrics.eventsByType[event.type] = (this.metrics.eventsByType[event.type] || 0) + 1;

    // Apply middleware pipeline
    const processedEvent = await this.applyMiddleware(event);

    // Get handlers for this event type and wildcard
    const handlers = this.getHandlersForType(processedEvent.type);

    if (handlers.length === 0) {
      if (this.config.debug) {
        console.debug(`[EventBus] No handlers for event type: ${processedEvent.type}`);
      }
      return 0;
    }

    // Execute all handlers concurrently
    const startTime = Date.now();
    const results = await Promise.allSettled(
      handlers.map((handler) => this.executeHandlerWithRetry(handler, processedEvent))
    );

    // Track processing time
    const elapsed = Date.now() - startTime;
    this.trackProcessingTime(elapsed);

    // Count successes and failures
    let successCount = 0;
    for (const result of results) {
      if (result.status === 'fulfilled') {
        successCount++;
        this.metrics.totalProcessed++;
      } else {
        this.metrics.totalFailed++;
        this.metrics.errorsByType[processedEvent.type] =
          (this.metrics.errorsByType[processedEvent.type] || 0) + 1;
        if (this.errorHandler) {
          this.errorHandler(result.reason as Error, processedEvent);
        }
      }
    }

    return successCount;
  }

  /**
   * Publish an event using simplified options.
   * Auto-generates event ID and timestamp.
   */
  async emit<T = unknown>(options: CreateEventOptions<T>): Promise<number> {
    const event = this.createEvent(options);
    return this.publish(event);
  }

  // ─── Request / Reply ─────────────────────────────────────

  /**
   * Register a request handler for a given event type.
   * Only ONE handler can be registered per type (last one wins).
   * This is for synchronous request-reply communication between agents.
   */
  registerRequestHandler<TRequest = unknown, TResponse = unknown>(
    eventType: string,
    handler: RequestHandler<TRequest, TResponse>
  ): void {
    this.requestHandlers.set(eventType, handler as RequestHandler);
  }

  /**
   * Send a request and wait for a reply.
   * Returns the response from the registered request handler.
   * Throws if no handler is registered for the event type.
   */
  async request<TRequest = unknown, TResponse = unknown>(
    eventType: string,
    payload: TRequest,
    options?: Partial<CreateEventOptions<TRequest>>
  ): Promise<TResponse> {
    const handler = this.requestHandlers.get(eventType);
    if (!handler) {
      throw new Error(`No request handler registered for event type: ${eventType}`);
    }

    const event = this.createEvent<TRequest>({
      type: eventType,
      payload,
      source: options?.source ?? 'request',
      priority: options?.priority ?? 'normal',
      correlationId: options?.correlationId,
      metadata: options?.metadata,
    });

    this.metrics.totalPublished++;
    this.metrics.eventsByType[event.type] = (this.metrics.eventsByType[event.type] || 0) + 1;

    try {
      const response = (await handler(event)) as TResponse;
      this.metrics.totalProcessed++;
      return response;
    } catch (error) {
      this.metrics.totalFailed++;
      this.metrics.errorsByType[event.type] = (this.metrics.errorsByType[event.type] || 0) + 1;
      throw error;
    }
  }

  // ─── Middleware ──────────────────────────────────────────

  /**
   * Add middleware to the event processing pipeline.
   * Middleware is executed in the order it is added.
   */
  use(middleware: EventMiddleware): void {
    this.middleware.push(middleware);
  }

  // ─── Error Handling ─────────────────────────────────────

  /**
   * Set a global error handler for failed event processing.
   */
  onError(handler: ErrorHandler): void {
    this.errorHandler = handler;
  }

  // ─── Metrics ────────────────────────────────────────────

  /**
   * Get a snapshot of event bus metrics.
   */
  getMetrics(): EventBusMetrics {
    return { ...this.metrics };
  }

  /**
   * Reset all metrics to zero.
   */
  resetMetrics(): void {
    this.metrics.totalPublished = 0;
    this.metrics.totalProcessed = 0;
    this.metrics.totalFailed = 0;
    this.metrics.activeSubscriptions = Object.values(this.handlers).reduce(
      (sum, set) => sum + set.size,
      0
    );
    this.metrics.avgProcessingTimeMs = 0;
    this.metrics.eventsByType = {};
    this.metrics.errorsByType = {};
    this.processingTimes = [];
  }

  // ─── Lifecycle ──────────────────────────────────────────

  /**
   * Remove all subscriptions, handlers, and middleware.
   */
  reset(): void {
    this.handlers.clear();
    this.requestHandlers.clear();
    this.middleware.length = 0;
    this.errorHandler = undefined;
    this.subscriptionCounter = 0;
    this.resetMetrics();
  }

  // ─── Wildcard Subscription ──────────────────────────────

  /**
   * Subscribe to ALL events.
   * Useful for logging, auditing, and debugging.
   */
  subscribeAll(handler: EventHandler): Subscription {
    return this.subscribe('*', handler);
  }

  // ─── Private Methods ────────────────────────────────────

  private createEvent<T>(options: CreateEventOptions<T>): Event<T> {
    return {
      id: this.generateEventId(),
      type: options.type,
      payload: options.payload,
      timestamp: new Date().toISOString(),
      priority: options.priority ?? 'normal',
      source: options.source,
      correlationId: options.correlationId,
      metadata: options.metadata,
    };
  }

  private generateEventId(): EventId {
    return `evt_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  private validateEvent(event: Event): void {
    if (!event.type) {
      throw new Error('Event must have a type');
    }
    if (!event.source) {
      throw new Error('Event must have a source');
    }

    // Check TTL
    if (event.timestamp) {
      const age = Date.now() - new Date(event.timestamp).getTime();
      if (age > this.config.eventTTL) {
        throw new Error(`Event expired: age ${age}ms exceeds TTL ${this.config.eventTTL}ms`);
      }
    }

    // Check payload size (rough estimate)
    const payloadSize = JSON.stringify(event.payload).length;
    if (payloadSize > this.config.maxPayloadSize) {
      throw new Error(
        `Event payload too large: ${payloadSize} bytes exceeds max ${this.config.maxPayloadSize} bytes`
      );
    }
  }

  private getHandlersForType(eventType: string): EventHandler[] {
    const directHandlers = this.handlers.get(eventType) ?? new Set();
    const wildcardHandlers = this.handlers.get('*') ?? new Set();
    return [...directHandlers, ...wildcardHandlers];
  }

  private async applyMiddleware<T>(event: Event<T>): Promise<Event<T>> {
    if (this.middleware.length === 0) return event;

    let currentEvent: Event<T> = event;

    // Build the chain from the last middleware to the first
    // Each middleware calls next() to pass to the next one
    const chain = this.middleware.reduceRight<
      ((e: Event<T>) => Promise<void>)[]
    >(
      (nextChain, mw) => {
        const nextFunc = nextChain.length > 0 ? nextChain[0] : async () => {};
        return [
          async (e: Event<T>) => {
            await mw(e, async (processed) => {
              currentEvent = processed as Event<T>;
              await nextFunc(currentEvent);
            });
          },
        ];
      },
      []
    );

    if (chain.length > 0) {
      await chain[0](event);
    }

    return currentEvent;
  }

  private async executeHandlerWithRetry<T>(
    handler: EventHandler<T>,
    event: Event<T>,
    attempt = 1
  ): Promise<void> {
    try {
      await handler(event);
    } catch (error) {
      if (attempt < this.config.maxRetries) {
        await this.delay(this.config.retryDelay * attempt);
        return this.executeHandlerWithRetry(handler, event, attempt + 1);
      }
      throw error;
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private trackProcessingTime(elapsedMs: number): void {
    this.processingTimes.push(elapsedMs);
    // Keep only last 100 samples
    if (this.processingTimes.length > 100) {
      this.processingTimes.shift();
    }
    const sum = this.processingTimes.reduce((a, b) => a + b, 0);
    this.metrics.avgProcessingTimeMs = sum / this.processingTimes.length;
  }
}

// ─── Singleton Factory ───────────────────────────────────────

let instance: EventBus | null = null;

/**
 * Get the global EventBus singleton.
 * Creates one on first call with optional config.
 */
export function getEventBus(config?: EventBusConfig): EventBus {
  if (!instance) {
    instance = new EventBus(config);
  }
  return instance;
}

/**
 * Reset the global EventBus singleton.
 * Useful for testing.
 */
export function resetEventBus(): void {
  if (instance) {
    instance.reset();
  }
  instance = null;
}
