/**
 * ALTER EGO OS — Quality Gate Runner
 *
 * Validates task outputs against quality criteria.
 * Registered validators score outputs; the runner decides pass/fail
 * based on the configured minimum score and failure action.
 */

import type {
  QualityGateConfig,
  QualityGateResult,
  QualityGateValidator,
} from './types.js';

// ─── Quality Gate Runner ─────────────────────────────────────

export class QualityGateRunner {
  private readonly validators: Map<string, QualityGateValidator> = new Map();

  /**
   * Register a quality gate validator by name.
   */
  registerValidator(name: string, validator: QualityGateValidator): void {
    this.validators.set(name, validator);
  }

  /**
   * Unregister a quality gate validator.
   */
  unregisterValidator(name: string): void {
    this.validators.delete(name);
  }

  /**
   * Check if a validator is registered.
   */
  hasValidator(name: string): boolean {
    return this.validators.has(name);
  }

  /**
   * Run a quality gate validation against a task output.
   * Returns the validation result.
   * Throws if the validator is not registered.
   */
  async validate(
    output: unknown,
    config: QualityGateConfig,
  ): Promise<QualityGateResult> {
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
  async evaluate(
    output: unknown,
    config: QualityGateConfig,
  ): Promise<QualityGateResult> {
    const result = await this.validate(output, config);
    return {
      ...result,
      passed: result.score >= config.minScore,
    };
  }
}
