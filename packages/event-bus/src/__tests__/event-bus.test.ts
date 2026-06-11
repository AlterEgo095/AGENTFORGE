/**
 * ALTER EGO OS — Event Bus Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { EventBus, getEventBus, resetEventBus } from '../index.js';
import type { Event, Subscription } from '../index.js';

describe('EventBus', () => {
  let bus: EventBus;

  beforeEach(() => {
    bus = new EventBus();
  });

  // ─── Publish / Subscribe ──────────────────────────────

  describe('subscribe + publish', () => {
    it('should deliver events to subscribers of the correct type', async () => {
      const handler = vi.fn();
      bus.subscribe('test.event', handler);

      await bus.emit({
        type: 'test.event',
        payload: { message: 'hello' },
        source: 'test',
      });

      expect(handler).toHaveBeenCalledOnce();
      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'test.event',
          payload: { message: 'hello' },
          source: 'test',
        })
      );
    });

    it('should NOT deliver events to subscribers of a different type', async () => {
      const handler = vi.fn();
      bus.subscribe('other.event', handler);

      await bus.emit({
        type: 'test.event',
        payload: {},
        source: 'test',
      });

      expect(handler).not.toHaveBeenCalled();
    });

    it('should deliver events to multiple subscribers', async () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();
      bus.subscribe('test.event', handler1);
      bus.subscribe('test.event', handler2);

      await bus.emit({
        type: 'test.event',
        payload: {},
        source: 'test',
      });

      expect(handler1).toHaveBeenCalledOnce();
      expect(handler2).toHaveBeenCalledOnce();
    });

    it('should support wildcard subscriptions', async () => {
      const handler = vi.fn();
      bus.subscribeAll(handler);

      await bus.emit({ type: 'any.event', payload: 1, source: 'test' });
      await bus.emit({ type: 'another.event', payload: 2, source: 'test' });

      expect(handler).toHaveBeenCalledTimes(2);
    });
  });

  // ─── Unsubscribe ──────────────────────────────────────

  describe('unsubscribe', () => {
    it('should stop receiving events after unsubscribe', async () => {
      const handler = vi.fn();
      const sub = bus.subscribe('test.event', handler);

      await bus.emit({ type: 'test.event', payload: 1, source: 'test' });
      expect(handler).toHaveBeenCalledTimes(1);

      sub.unsubscribe();

      await bus.emit({ type: 'test.event', payload: 2, source: 'test' });
      expect(handler).toHaveBeenCalledTimes(1); // Not called again
    });
  });

  // ─── Request / Reply ──────────────────────────────────

  describe('request / reply', () => {
    it('should handle request-reply pattern', async () => {
      bus.registerRequestHandler('data.fetch', async (event) => {
        return { result: `fetched-${event.payload}` };
      });

      const response = await bus.request<string, { result: string }>(
        'data.fetch',
        'item-42'
      );

      expect(response).toEqual({ result: 'fetched-item-42' });
    });

    it('should throw when no handler is registered', async () => {
      await expect(bus.request('unknown.type', {})).rejects.toThrow(
        'No request handler registered'
      );
    });
  });

  // ─── Middleware ────────────────────────────────────────

  describe('middleware', () => {
    it('should apply middleware in order', async () => {
      const order: string[] = [];

      bus.use(async (event, next) => {
        order.push('mw1-before');
        await next(event);
        order.push('mw1-after');
      });

      bus.use(async (event, next) => {
        order.push('mw2-before');
        await next(event);
        order.push('mw2-after');
      });

      const handler = vi.fn();
      bus.subscribe('test.event', handler);

      await bus.emit({ type: 'test.event', payload: {}, source: 'test' });

      expect(handler).toHaveBeenCalled();
      expect(order).toEqual([
        'mw1-before',
        'mw2-before',
        'mw2-after',
        'mw1-after',
      ]);
    });
  });

  // ─── Error Handling ───────────────────────────────────

  describe('error handling', () => {
    it('should retry failed handlers', async () => {
      let attempts = 0;
      const failingHandler = vi.fn(() => {
        attempts++;
        if (attempts < 3) throw new Error('fail');
      });

      const busWithRetry = new EventBus({ maxRetries: 3, retryDelay: 10 });
      busWithRetry.subscribe('test.event', failingHandler);

      await busWithRetry.emit({ type: 'test.event', payload: {}, source: 'test' });

      expect(attempts).toBe(3);
      expect(failingHandler).toHaveBeenCalledTimes(3);
    });

    it('should call error handler after all retries exhausted', async () => {
      const errorHandler = vi.fn();
      const busWithRetry = new EventBus({ maxRetries: 2, retryDelay: 10 });
      busWithRetry.onError(errorHandler);

      busWithRetry.subscribe('test.event', () => {
        throw new Error('persistent failure');
      });

      await busWithRetry.emit({ type: 'test.event', payload: {}, source: 'test' });

      expect(errorHandler).toHaveBeenCalledOnce();
    });
  });

  // ─── Metrics ──────────────────────────────────────────

  describe('metrics', () => {
    it('should track published events', async () => {
      bus.subscribe('test.event', vi.fn());

      await bus.emit({ type: 'test.event', payload: {}, source: 'test' });

      const metrics = bus.getMetrics();
      expect(metrics.totalPublished).toBe(1);
      expect(metrics.totalProcessed).toBe(1);
      expect(metrics.eventsByType['test.event']).toBe(1);
    });

    it('should track failed events', async () => {
      const busWithRetry = new EventBus({ maxRetries: 1, retryDelay: 10 });
      busWithRetry.subscribe('test.event', () => {
        throw new Error('fail');
      });

      await busWithRetry.emit({ type: 'test.event', payload: {}, source: 'test' });

      const metrics = busWithRetry.getMetrics();
      expect(metrics.totalFailed).toBe(1);
    });
  });

  // ─── Validation ───────────────────────────────────────

  describe('validation', () => {
    it('should reject events without a type', async () => {
      await expect(
        bus.publish({ id: '1', type: '', payload: {}, timestamp: new Date().toISOString(), priority: 'normal', source: '' })
      ).rejects.toThrow('Event must have a type');
    });

    it('should reject events without a source', async () => {
      await expect(
        bus.publish({ id: '1', type: 'test', payload: {}, timestamp: new Date().toISOString(), priority: 'normal', source: '' })
      ).rejects.toThrow('Event must have a source');
    });
  });

  // ─── Singleton ────────────────────────────────────────

  describe('singleton', () => {
    it('should return the same instance', () => {
      resetEventBus();
      const bus1 = getEventBus();
      const bus2 = getEventBus();
      expect(bus1).toBe(bus2);
      resetEventBus();
    });

    it('should create a new instance after reset', () => {
      const bus1 = getEventBus();
      resetEventBus();
      const bus2 = getEventBus();
      expect(bus1).not.toBe(bus2);
      resetEventBus();
    });
  });

  // ─── Event Structure ──────────────────────────────────

  describe('event structure', () => {
    it('should auto-generate event ID and timestamp', async () => {
      let receivedEvent: Event | undefined;
      bus.subscribe('test.event', (e) => { receivedEvent = e; });

      await bus.emit({ type: 'test.event', payload: 'data', source: 'test' });

      expect(receivedEvent).toBeDefined();
      expect(receivedEvent!.id).toMatch(/^evt_/);
      expect(receivedEvent!.timestamp).toBeDefined();
      expect(new Date(receivedEvent!.timestamp).getTime()).not.toBeNaN();
    });

    it('should preserve correlationId and metadata', async () => {
      let receivedEvent: Event | undefined;
      bus.subscribe('test.event', (e) => { receivedEvent = e; });

      await bus.emit({
        type: 'test.event',
        payload: {},
        source: 'test',
        correlationId: 'corr-123',
        metadata: { trace: true },
      });

      expect(receivedEvent!.correlationId).toBe('corr-123');
      expect(receivedEvent!.metadata).toEqual({ trace: true });
    });
  });
});
