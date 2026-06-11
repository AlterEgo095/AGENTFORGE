/**
 * ALTER EGO OS — Metrics Implementation
 *
 * Performance metrics collection and reporting.
 * Supports counters, gauges, histograms, and timings.
 */
import type { Metrics, MetricsSnapshot } from './types.js';
export declare class MetricsImpl implements Metrics {
    private readonly counters;
    private readonly gauges;
    private readonly histograms;
    private readonly timings;
    counter(name: string, labels?: Record<string, string>): void;
    gauge(name: string, value: number, labels?: Record<string, string>): void;
    histogram(name: string, value: number, labels?: Record<string, string>): void;
    timing(name: string, durationMs: number, labels?: Record<string, string>): void;
    snapshot(): MetricsSnapshot;
    reset(): void;
}
//# sourceMappingURL=metrics.d.ts.map