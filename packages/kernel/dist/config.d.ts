/**
 * ALTER EGO OS — ConfigManager Implementation
 *
 * Loads and validates configuration from env/files.
 * Emits events on the EventBus when config changes.
 */
import { EventBus } from '@alterego/event-bus';
import type { ConfigManager, ConfigRule, ValidationResult } from './types.js';
export declare class ConfigManagerImpl implements ConfigManager {
    private readonly config;
    private readonly eventBus;
    constructor(eventBus: EventBus, initial?: Record<string, unknown>);
    get<T>(key: string, defaultValue?: T): T;
    set(key: string, value: unknown): void;
    has(key: string): boolean;
    delete(key: string): boolean;
    loadFromEnv(): void;
    validate(schema: Record<string, ConfigRule>): ValidationResult;
    getAll(): Record<string, unknown>;
    private checkType;
}
//# sourceMappingURL=config.d.ts.map