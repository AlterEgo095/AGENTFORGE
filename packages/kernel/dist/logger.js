/**
 * ALTER EGO OS — Logger Implementation
 *
 * Structured logging with levels and transports.
 * Supports JSON output, multiple transports, and child loggers.
 */
// ─── Log Level Priority ────────────────────────────────────────
const LOG_LEVEL_PRIORITY = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
};
// ─── Console Transport ─────────────────────────────────────────
export class ConsoleTransport {
    name = 'console';
    level;
    constructor(level = 'info') {
        this.level = level;
    }
    write(entry) {
        if (LOG_LEVEL_PRIORITY[entry.level] < LOG_LEVEL_PRIORITY[this.level]) {
            return;
        }
        const formatted = this.format(entry);
        switch (entry.level) {
            case 'debug':
                console.debug(formatted);
                break;
            case 'info':
                console.info(formatted);
                break;
            case 'warn':
                console.warn(formatted);
                break;
            case 'error':
                console.error(formatted);
                break;
        }
    }
    format(entry) {
        return JSON.stringify(entry);
    }
}
// ─── In-Memory Transport (for testing) ─────────────────────────
export class InMemoryTransport {
    name = 'in-memory';
    level;
    entries = [];
    constructor(level = 'debug') {
        this.level = level;
    }
    write(entry) {
        if (LOG_LEVEL_PRIORITY[entry.level] >= LOG_LEVEL_PRIORITY[this.level]) {
            this.entries.push(entry);
        }
    }
    clear() {
        this.entries.length = 0;
    }
    getEntries(level) {
        if (level) {
            return this.entries.filter((e) => e.level === level);
        }
        return [...this.entries];
    }
}
// ─── Logger Implementation ─────────────────────────────────────
export class LoggerImpl {
    minLevel;
    baseContext;
    source;
    transports = new Map();
    constructor(config) {
        this.minLevel = config?.minLevel ?? 'info';
        this.baseContext = {};
        this.source = config?.source ?? 'kernel';
        // Add default console transport
        const defaultTransports = config?.transports ?? [new ConsoleTransport(this.minLevel)];
        for (const transport of defaultTransports) {
            this.transports.set(transport.name, transport);
        }
    }
    debug(message, context) {
        this.log('debug', message, undefined, context);
    }
    info(message, context) {
        this.log('info', message, undefined, context);
    }
    warn(message, context) {
        this.log('warn', message, undefined, context);
    }
    error(message, error, context) {
        this.log('error', message, error, context);
    }
    child(context) {
        const childLogger = new LoggerImpl({
            minLevel: this.minLevel,
            source: this.source,
            transports: Array.from(this.transports.values()),
        });
        // Merge parent context with child context
        childLogger.baseContext = { ...this.baseContext, ...context };
        return childLogger;
    }
    getLevel() {
        return this.minLevel;
    }
    setLevel(level) {
        this.minLevel = level;
    }
    addTransport(transport) {
        this.transports.set(transport.name, transport);
    }
    removeTransport(name) {
        this.transports.delete(name);
    }
    // ─── Private Helpers ─────────────────────────────────────
    log(level, message, error, context) {
        // Check minimum level
        if (LOG_LEVEL_PRIORITY[level] < LOG_LEVEL_PRIORITY[this.minLevel]) {
            return;
        }
        const entry = {
            timestamp: new Date().toISOString(),
            level,
            message,
            context: { ...this.baseContext, ...context },
            source: this.source,
        };
        if (error) {
            entry.error = {
                name: error.name,
                message: error.message,
                stack: error.stack,
            };
        }
        // Write to all transports
        for (const transport of this.transports.values()) {
            try {
                transport.write(entry);
            }
            catch {
                // Silently ignore transport errors to prevent logging from crashing
            }
        }
    }
}
//# sourceMappingURL=logger.js.map