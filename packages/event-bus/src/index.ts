/**
 * ALTER EGO OS — Event Bus
 *
 * Public API for the typed async pub/sub event system.
 */

export { EventBus, getEventBus, resetEventBus } from './event-bus.js';
export type {
  Event,
  EventId,
  ISOTimestamp,
  EventPriority,
  EventBusConfig,
  EventBusMetrics,
  EventHandler,
  EventMiddleware,
  ErrorHandler,
  Subscription,
  RequestHandler,
  CreateEventOptions,
} from './types.js';
