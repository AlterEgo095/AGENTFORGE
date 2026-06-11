/**
 * ALTER EGO OS — Event Bus Types
 *
 * Core type definitions for the typed async pub/sub event system.
 * All events flow through this bus — it is the nervous system of the OS.
 */
/** Unique identifier for events */
export type EventId = string;
/** ISO 8601 timestamp */
export type ISOTimestamp = string;
/** Priority levels for event processing */
export type EventPriority = 'critical' | 'high' | 'normal' | 'low';
/** Base event envelope — all events extend this */
export interface Event<T = unknown> {
    /** Unique event identifier */
    id: EventId;
    /** Event type (e.g., 'mission.created', 'workflow.completed') */
    type: string;
    /** Event payload */
    payload: T;
    /** When the event was created */
    timestamp: ISOTimestamp;
    /** Event priority for ordering */
    priority: EventPriority;
    /** Source that emitted the event */
    source: string;
    /** Correlation ID for tracing event chains */
    correlationId?: string;
    /** Metadata for cross-cutting concerns */
    metadata?: Record<string, unknown>;
}
/** Subscription handle for unsubscribing */
export interface Subscription {
    /** Unique subscription ID */
    id: string;
    /** The event type this subscription listens to */
    eventType: string;
    /** Unsubscribe from this subscription */
    unsubscribe: () => void;
}
/** Event handler function */
export type EventHandler<T = unknown> = (event: Event<T>) => void | Promise<void>;
/** Request handler for request-reply pattern */
export type RequestHandler<TRequest = unknown, TResponse = unknown> = (request: Event<TRequest>) => Promise<TResponse>;
/** Error handler for failed event processing */
export type ErrorHandler = (error: Error, event: Event) => void;
/** Middleware that intercepts events before processing */
export type EventMiddleware = (event: Event, next: (event: Event) => void | Promise<void>) => void | Promise<void>;
/** Event Bus configuration */
export interface EventBusConfig {
    /** Maximum concurrent handlers per event type (default: 10) */
    maxConcurrency?: number;
    /** Whether to log all events (default: false) */
    debug?: boolean;
    /** Maximum retry attempts for failed handlers (default: 3) */
    maxRetries?: number;
    /** Delay between retries in ms (default: 1000) */
    retryDelay?: number;
    /** Maximum event payload size in bytes (default: 1MB) */
    maxPayloadSize?: number;
    /** Event TTL in ms — events older than this are discarded (default: 300000 = 5min) */
    eventTTL?: number;
}
/** Event bus metrics snapshot */
export interface EventBusMetrics {
    /** Total events published */
    totalPublished: number;
    /** Total events processed successfully */
    totalProcessed: number;
    /** Total events that failed processing */
    totalFailed: number;
    /** Current active subscriptions */
    activeSubscriptions: number;
    /** Average processing time in ms */
    avgProcessingTimeMs: number;
    /** Events per type count */
    eventsByType: Record<string, number>;
    /** Errors per type count */
    errorsByType: Record<string, number>;
}
/** Options for creating an event */
export interface CreateEventOptions<T> {
    type: string;
    payload: T;
    source: string;
    priority?: EventPriority;
    correlationId?: string;
    metadata?: Record<string, unknown>;
}
//# sourceMappingURL=types.d.ts.map