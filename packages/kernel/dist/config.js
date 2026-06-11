/**
 * ALTER EGO OS — ConfigManager Implementation
 *
 * Loads and validates configuration from env/files.
 * Emits events on the EventBus when config changes.
 */
// ─── Implementation ────────────────────────────────────────────
export class ConfigManagerImpl {
    config = new Map();
    eventBus;
    constructor(eventBus, initial) {
        this.eventBus = eventBus;
        if (initial) {
            for (const [key, value] of Object.entries(initial)) {
                this.config.set(key, value);
            }
        }
    }
    get(key, defaultValue) {
        if (this.config.has(key)) {
            return this.config.get(key);
        }
        if (defaultValue !== undefined) {
            return defaultValue;
        }
        throw new Error(`Config key "${key}" not found and no default value provided`);
    }
    set(key, value) {
        const oldValue = this.config.get(key);
        this.config.set(key, value);
        // Emit change event only if the value actually changed
        if (oldValue !== value) {
            this.eventBus.emit({
                type: 'config.changed',
                payload: { key, oldValue, newValue: value },
                source: 'kernel.config',
            });
        }
    }
    has(key) {
        return this.config.has(key);
    }
    delete(key) {
        return this.config.delete(key);
    }
    loadFromEnv() {
        let keyCount = 0;
        for (const [envKey, envValue] of Object.entries(process.env)) {
            if (envKey.startsWith('ALTEREGO_') && envValue !== undefined) {
                // Convert ALTEREGO_SOME_KEY to some.key
                const configKey = envKey
                    .replace(/^ALTEREGO_/, '')
                    .toLowerCase()
                    .replace(/_/g, '.');
                // Attempt to parse JSON values (numbers, booleans, objects)
                let parsedValue = envValue;
                try {
                    parsedValue = JSON.parse(envValue);
                }
                catch {
                    // Keep as string if not valid JSON
                }
                this.config.set(configKey, parsedValue);
                keyCount++;
            }
        }
        this.eventBus.emit({
            type: 'config.loaded',
            payload: { source: 'env', keyCount },
            source: 'kernel.config',
        });
    }
    validate(schema) {
        const errors = [];
        for (const [key, rule] of Object.entries(schema)) {
            const value = this.config.has(key) ? this.config.get(key) : undefined;
            // Check required
            if (rule.required && (value === undefined || value === null)) {
                // Use default if available
                if (rule.default !== undefined) {
                    this.config.set(key, rule.default);
                }
                else {
                    errors.push({
                        key,
                        message: `Config key "${key}" is required but not set`,
                    });
                    continue;
                }
            }
            // If value is still undefined after defaults, skip further checks
            const effectiveValue = this.config.has(key) ? this.config.get(key) : rule.default;
            if (effectiveValue === undefined || effectiveValue === null) {
                continue;
            }
            // Check type
            if (!this.checkType(effectiveValue, rule.type)) {
                errors.push({
                    key,
                    message: `Config key "${key}" expected type "${rule.type}" but got "${typeof effectiveValue}"`,
                });
                continue;
            }
            // Check enum
            if (rule.enum && !rule.enum.includes(String(effectiveValue))) {
                errors.push({
                    key,
                    message: `Config key "${key}" value "${String(effectiveValue)}" is not one of: ${rule.enum.join(', ')}`,
                });
            }
            // Check min
            if (rule.min !== undefined && typeof effectiveValue === 'number' && effectiveValue < rule.min) {
                errors.push({
                    key,
                    message: `Config key "${key}" value ${effectiveValue} is less than minimum ${rule.min}`,
                });
            }
            // Check max
            if (rule.max !== undefined && typeof effectiveValue === 'number' && effectiveValue > rule.max) {
                errors.push({
                    key,
                    message: `Config key "${key}" value ${effectiveValue} is greater than maximum ${rule.max}`,
                });
            }
            // Custom validation
            if (rule.validate && !rule.validate(effectiveValue)) {
                errors.push({
                    key,
                    message: `Config key "${key}" failed custom validation`,
                });
            }
        }
        return {
            valid: errors.length === 0,
            errors,
        };
    }
    getAll() {
        const result = {};
        for (const [key, value] of this.config) {
            result[key] = value;
        }
        return result;
    }
    // ─── Private Helpers ─────────────────────────────────────
    checkType(value, expectedType) {
        switch (expectedType) {
            case 'string':
                return typeof value === 'string';
            case 'number':
                return typeof value === 'number' && !isNaN(value);
            case 'boolean':
                return typeof value === 'boolean';
            case 'object':
                return typeof value === 'object' && value !== null && !Array.isArray(value);
            case 'array':
                return Array.isArray(value);
            default:
                return false;
        }
    }
}
//# sourceMappingURL=config.js.map