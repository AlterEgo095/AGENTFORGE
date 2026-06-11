/**
 * ALTER EGO OS — Quality Gate Runner
 *
 * Validates task outputs against quality criteria.
 * Registered validators score outputs; the runner decides pass/fail
 * based on the configured minimum score and failure action.
 */
import type { QualityGateConfig, QualityGateResult, QualityGateValidator } from './types.js';
export declare class QualityGateRunner {
    private readonly validators;
    /**
     * Register a quality gate validator by name.
     */
    registerValidator(name: string, validator: QualityGateValidator): void;
    /**
     * Unregister a quality gate validator.
     */
    unregisterValidator(name: string): void;
    /**
     * Check if a validator is registered.
     */
    hasValidator(name: string): boolean;
    /**
     * Run a quality gate validation against a task output.
     * Returns the validation result.
     * Throws if the validator is not registered.
     */
    validate(output: unknown, config: QualityGateConfig): Promise<QualityGateResult>;
    /**
     * Run validation and determine if it passed based on the minimum score.
     * Returns the full result with pass/fail status.
     */
    evaluate(output: unknown, config: QualityGateConfig): Promise<QualityGateResult>;
}
//# sourceMappingURL=quality-gates.d.ts.map