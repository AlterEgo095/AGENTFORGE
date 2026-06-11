/**
 * ALTER EGO OS — Metrics Implementation
 *
 * Performance metrics collection and reporting.
 * Supports counters, gauges, histograms, and timings.
 */
// ─── Implementation ────────────────────────────────────────────
/** Default histogram bucket boundaries */
const DEFAULT_HISTOGRAM_BUCKETS = [0.01, 0.05, 0.1, 0.5, 1, 5, 10, 50, 100];
/** Generate a key from name + labels for map storage */
function metricKey(name, labels) {
    const sortedKeys = Object.keys(labels).sort();
    if (sortedKeys.length === 0)
        return name;
    const labelStr = sortedKeys.map((k) => `${k}=${labels[k]}`).join(',');
    return `${name}{${labelStr}}`;
}
export class MetricsImpl {
    counters = new Map();
    gauges = new Map();
    histograms = new Map();
    timings = new Map();
    counter(name, labels = {}) {
        const key = metricKey(name, labels);
        const existing = this.counters.get(key);
        if (existing) {
            existing.value += 1;
        }
        else {
            this.counters.set(key, {
                name,
                value: 1,
                labels,
            });
        }
    }
    gauge(name, value, labels = {}) {
        const key = metricKey(name, labels);
        this.gauges.set(key, {
            name,
            value,
            labels,
        });
    }
    histogram(name, value, labels = {}) {
        const key = metricKey(name, labels);
        const existing = this.histograms.get(key);
        if (existing) {
            existing.count += 1;
            existing.sum += value;
            existing.min = Math.min(existing.min, value);
            existing.max = Math.max(existing.max, value);
            existing.avg = existing.sum / existing.count;
            // Update buckets
            for (const boundary of DEFAULT_HISTOGRAM_BUCKETS) {
                const bucketKey = `<=${boundary}`;
                if (value <= boundary) {
                    existing.buckets[bucketKey] = (existing.buckets[bucketKey] ?? 0) + 1;
                }
            }
            // +Inf bucket always gets incremented
            existing.buckets['+Inf'] = (existing.buckets['+Inf'] ?? 0) + 1;
        }
        else {
            const buckets = {};
            for (const boundary of DEFAULT_HISTOGRAM_BUCKETS) {
                const bucketKey = `<=${boundary}`;
                if (value <= boundary) {
                    buckets[bucketKey] = 1;
                }
                else {
                    buckets[bucketKey] = 0;
                }
            }
            buckets['+Inf'] = 1;
            this.histograms.set(key, {
                name,
                count: 1,
                sum: value,
                min: value,
                max: value,
                avg: value,
                buckets,
                labels,
            });
        }
    }
    timing(name, durationMs, labels = {}) {
        const key = metricKey(name, labels);
        const existing = this.timings.get(key);
        if (existing) {
            existing.count += 1;
            existing.totalMs += durationMs;
            existing.avgMs = existing.totalMs / existing.count;
            existing.minMs = Math.min(existing.minMs, durationMs);
            existing.maxMs = Math.max(existing.maxMs, durationMs);
        }
        else {
            this.timings.set(key, {
                name,
                count: 1,
                totalMs: durationMs,
                avgMs: durationMs,
                minMs: durationMs,
                maxMs: durationMs,
                labels,
            });
        }
    }
    snapshot() {
        const counters = {};
        for (const [key, metric] of this.counters) {
            counters[key] = { ...metric };
        }
        const gauges = {};
        for (const [key, metric] of this.gauges) {
            gauges[key] = { ...metric };
        }
        const histograms = {};
        for (const [key, metric] of this.histograms) {
            histograms[key] = {
                ...metric,
                buckets: { ...metric.buckets },
            };
        }
        const timings = {};
        for (const [key, metric] of this.timings) {
            timings[key] = { ...metric };
        }
        return {
            timestamp: new Date().toISOString(),
            counters,
            gauges,
            histograms,
            timings,
        };
    }
    reset() {
        this.counters.clear();
        this.gauges.clear();
        this.histograms.clear();
        this.timings.clear();
    }
}
//# sourceMappingURL=metrics.js.map