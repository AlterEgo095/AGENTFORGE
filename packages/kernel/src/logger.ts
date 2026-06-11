/**
 * ALTER EGO OS — Logger Implementation
 *
 * Structured logging with levels and transports.
 * Supports JSON output, multiple transports, and child loggers.
 */

import type { Logger, LogLevel, LogContext, LogEntry, LogTransport, LoggerConfig } from './types.js';

// ─── Log Level Priority ────────────────────────────────────────

const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

// ─── Console Transport ─────────────────────────────────────────

export class ConsoleTransport implements LogTransport {
  name = 'console';
  level: LogLevel;

  constructor(level: LogLevel = 'info') {
    this.level = level;
  }

  write(entry: LogEntry): void {
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

  private format(entry: LogEntry): string {
    return JSON.stringify(entry);
  }
}

// ─── In-Memory Transport (for testing) ─────────────────────────

export class InMemoryTransport implements LogTransport {
  name = 'in-memory';
  level: LogLevel;
  readonly entries: LogEntry[] = [];

  constructor(level: LogLevel = 'debug') {
    this.level = level;
  }

  write(entry: LogEntry): void {
    if (LOG_LEVEL_PRIORITY[entry.level] >= LOG_LEVEL_PRIORITY[this.level]) {
      this.entries.push(entry);
    }
  }

  clear(): void {
    this.entries.length = 0;
  }

  getEntries(level?: LogLevel): LogEntry[] {
    if (level) {
      return this.entries.filter((e) => e.level === level);
    }
    return [...this.entries];
  }
}

// ─── Logger Implementation ─────────────────────────────────────

export class LoggerImpl implements Logger {
  private minLevel: LogLevel;
  private baseContext: LogContext;
  private source: string;
  private readonly transports: Map<string, LogTransport> = new Map();

  constructor(config?: LoggerConfig) {
    this.minLevel = config?.minLevel ?? 'info';
    this.baseContext = {};
    this.source = config?.source ?? 'kernel';

    // Add default console transport
    const defaultTransports = config?.transports ?? [new ConsoleTransport(this.minLevel)];
    for (const transport of defaultTransports) {
      this.transports.set(transport.name, transport);
    }
  }

  debug(message: string, context?: LogContext): void {
    this.log('debug', message, undefined, context);
  }

  info(message: string, context?: LogContext): void {
    this.log('info', message, undefined, context);
  }

  warn(message: string, context?: LogContext): void {
    this.log('warn', message, undefined, context);
  }

  error(message: string, error?: Error, context?: LogContext): void {
    this.log('error', message, error, context);
  }

  child(context: LogContext): Logger {
    const childLogger = new LoggerImpl({
      minLevel: this.minLevel,
      source: this.source,
      transports: Array.from(this.transports.values()),
    });

    // Merge parent context with child context
    childLogger.baseContext = { ...this.baseContext, ...context };
    return childLogger;
  }

  getLevel(): LogLevel {
    return this.minLevel;
  }

  setLevel(level: LogLevel): void {
    this.minLevel = level;
  }

  addTransport(transport: LogTransport): void {
    this.transports.set(transport.name, transport);
  }

  removeTransport(name: string): void {
    this.transports.delete(name);
  }

  // ─── Private Helpers ─────────────────────────────────────

  private log(level: LogLevel, message: string, error?: Error, context?: LogContext): void {
    // Check minimum level
    if (LOG_LEVEL_PRIORITY[level] < LOG_LEVEL_PRIORITY[this.minLevel]) {
      return;
    }

    const entry: LogEntry = {
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
      } catch {
        // Silently ignore transport errors to prevent logging from crashing
      }
    }
  }
}
