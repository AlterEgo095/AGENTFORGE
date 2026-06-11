/**
 * ALTER EGO OS — Logger Implementation
 *
 * Structured logging with levels and transports.
 * Supports JSON output, multiple transports, and child loggers.
 */
import type { Logger, LogLevel, LogContext, LogEntry, LogTransport, LoggerConfig } from './types.js';
export declare class ConsoleTransport implements LogTransport {
    name: string;
    level: LogLevel;
    constructor(level?: LogLevel);
    write(entry: LogEntry): void;
    private format;
}
export declare class InMemoryTransport implements LogTransport {
    name: string;
    level: LogLevel;
    readonly entries: LogEntry[];
    constructor(level?: LogLevel);
    write(entry: LogEntry): void;
    clear(): void;
    getEntries(level?: LogLevel): LogEntry[];
}
export declare class LoggerImpl implements Logger {
    private minLevel;
    private baseContext;
    private source;
    private readonly transports;
    constructor(config?: LoggerConfig);
    debug(message: string, context?: LogContext): void;
    info(message: string, context?: LogContext): void;
    warn(message: string, context?: LogContext): void;
    error(message: string, error?: Error, context?: LogContext): void;
    child(context: LogContext): Logger;
    getLevel(): LogLevel;
    setLevel(level: LogLevel): void;
    addTransport(transport: LogTransport): void;
    removeTransport(name: string): void;
    private log;
}
//# sourceMappingURL=logger.d.ts.map