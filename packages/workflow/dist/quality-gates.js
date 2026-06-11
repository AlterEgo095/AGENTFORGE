/**
 * ALTER EGO OS — Quality Gate Runner
 *
 * Validates task outputs against quality criteria.
 * Registered validators score outputs; the runner decides pass/fail
 * based on the configured minimum score and failure action.
 */
// ─── Quality Gate Runner ─────────────────────────────────────
export class QualityGateRunner {
    validators = new Map();
    /**
     * Register a quality gate validator by name.
     */
    registerValidator(name, validator) {
        this.validators.set(name, validator);
    }
    /**
     * Unregister a quality gate validator.
     */
    unregisterValidator(name) {
        this.validators.delete(name);
    }
    /**
     * Check if a validator is registered.
     */
    hasValidator(name) {
        return this.validators.has(name);
    }
    /**
     * Run a quality gate validation against a task output.
     * Returns the validation result.
     * Throws if the validator is not registered.
     */
    async validate(output, config) {
        const validator = this.validators.get(config.validator);
        if (!validator) {
            throw new Error(`Quality gate validator not registered: ${config.validator}`);
        }
        return validator(output, config);
    }
    /**
     * Run validation and determine if it passed based on the minimum score.
     * Returns the full result with pass/fail status.
     */
    async evaluate(output, config) {
        const result = await this.validate(output, config);
        return {
            ...result,
            passed: result.score >= config.minScore,
        };
    }
}
//# sourceMappingURL=quality-gates.js.map