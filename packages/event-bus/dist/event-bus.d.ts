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
import type { Event, EventBusConfig, EventBusMetrics, EventHandler, EventMiddleware, ErrorHandler, Subscription, RequestHandler, CreateEventOptions } from './types.js';
export declare class EventBus {
    private readonly config;
    private readonly handlers;
    private readonly requestHandlers;
    private readonly middleware;
    private readonly metrics;
    private errorHandler?;
    private subscriptionCounter;
    private processingTimes;
    constructor(config?: EventBusConfig);
    /**
     * Subscribe to events of a given type.
     * Returns a Subscription handle that can be used to unsubscribe.
     */
    subscribe<T = unknown>(eventType: string, handler: EventHandler<T>): Subscription;
    /**
     * Publish an event to all subscribers.
     * Handlers are invoked asynchronously and in parallel.
     * Returns the number of handlers that were invoked.
     */
    publish<T = unknown>(event: Event<T>): Promise<number>;
    /**
     * Publish an event using simplified options.
     * Auto-generates event ID and timestamp.
     */
    emit<T = unknown>(options: CreateEventOptions<T>): Promise<number>;
    /**
     * Register a request handler for a given event type.
     * Only ONE handler can be registered per type (last one wins).
     * This is for synchronous request-reply communication between agents.
     */
    registerRequestHandler<TRequest = unknown, TResponse = unknown>(eventType: string, handler: RequestHandler<TRequest, TResponse>): void;
    /**
     * Send a request and wait for a reply.
     * Returns the response from the registered request handler.
     * Throws if no handler is registered for the event type.
     */
    request<TRequest = unknown, TResponse = unknown>(eventType: string, payload: TRequest, options?: Partial<CreateEventOptions<TRequest>>): Promise<TResponse>;
    /**
     * Add middleware to the event processing pipeline.
     * Middleware is executed in the order it is added.
     */
    use(middleware: EventMiddleware): void;
    /**
     * Set a global error handler for failed event processing.
     */
    onError(handler: ErrorHandler): void;
    /**
     * Get a snapshot of event bus metrics.
     */
    getMetrics(): EventBusMetrics;
    /**
     * Reset all metrics to zero.
     */
    resetMetrics(): void;
    /**
     * Remove all subscriptions, handlers, and middleware.
     */
    reset(): void;
    /**
     * Subscribe to ALL events.
     * Useful for logging, auditing, and debugging.
     */
    subscribeAll(handler: EventHandler): Subscription;
    private createEvent;
    private generateEventId;
    private validateEvent;
    private getHandlersForType;
    private applyMiddleware;
    private executeHandlerWithRetry;
    private delay;
    private trackProcessingTime;
}
/**
 * Get the global EventBus singleton.
 * Creates one on first call with optional config.
 */
export declare function getEventBus(config?: EventBusConfig): EventBus;
/**
 * Reset the global EventBus singleton.
 * Useful for testing.
 */
export declare function resetEventBus(): void;
//# sourceMappingURL=event-bus.d.ts.map