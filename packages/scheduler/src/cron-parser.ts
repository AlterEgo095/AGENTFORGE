/**
 * ALTER EGO OS — Simple Cron Expression Parser
 *
 * Supports standard 5-field cron expressions: minute hour day month dayOfWeek
 *
 * Supported syntax:
 * - * (wildcard — any value)
 * - Specific values (e.g., 5)
 * - Ranges (e.g., 1-5)
 * - Step values (e.g., star/5, 1-10/2)
 * - Lists (e.g., 1,3,5)
 *
 * NOT supported (by design for Phase 1):
 * - L (last day of month)
 * - W (nearest weekday)
 * - # (nth day of week)
 * - Named months/days (JAN, MON, etc.)
 */

import type { CronParseResult } from './types.js';

// ─── Field Limits ────────────────────────────────────────────

interface FieldLimit {
  min: number;
  max: number;
}

const FIELD_LIMITS: [FieldLimit, FieldLimit, FieldLimit, FieldLimit, FieldLimit] = [
  { min: 0, max: 59 },  // minute
  { min: 0, max: 23 },  // hour
  { min: 1, max: 31 },  // day of month
  { min: 1, max: 12 },  // month
  { min: 0, max: 6 },   // day of week (0 = Sunday)
];

const FIELD_NAMES = ['minute', 'hour', 'day', 'month', 'dayOfWeek'] as const;

// ─── Parsing ─────────────────────────────────────────────────

/**
 * Parse a 5-field cron expression and return the expanded field values.
 */
export function parseCronExpression(expression: string): CronParseResult {
  const trimmed = expression.trim();

  if (!trimmed) {
    return { valid: false, error: 'Cron expression cannot be empty' };
  }

  const fields = trimmed.split(/\s+/);
  if (fields.length !== 5) {
    return {
      valid: false,
      error: `Expected 5 fields, got ${fields.length}. Format: minute hour day month dayOfWeek`,
    };
  }

  const parsedFields: CronParseResult['fields'] = {
    minute: [],
    hour: [],
    day: [],
    month: [],
    dayOfWeek: [],
  };

  for (let i = 0; i < 5; i++) {
    const fieldName = FIELD_NAMES[i];
    const limit = FIELD_LIMITS[i];
    const result = parseField(fields[i], limit, fieldName);

    if (!result.valid) {
      return { valid: false, error: result.error };
    }

    parsedFields[fieldName] = result.values!;
  }

  const description = describeCron(parsedFields);

  return {
    valid: true,
    description,
    fields: parsedFields,
  };
}

// ─── Field Parsing ───────────────────────────────────────────

interface FieldParseResult {
  valid: boolean;
  values?: number[];
  error?: string;
}

function parseField(field: string, limit: FieldLimit, fieldName: string): FieldParseResult {
  // Handle comma-separated lists (e.g., "1,3,5")
  if (field.includes(',')) {
    const parts = field.split(',');
    const allValues: number[] = [];

    for (const part of parts) {
      const result = parseFieldPart(part.trim(), limit, fieldName);
      if (!result.valid) return result;
      allValues.push(...result.values!);
    }

    // Deduplicate and sort
    const unique = [...new Set(allValues)].sort((a, b) => a - b);
    return { valid: true, values: unique };
  }

  return parseFieldPart(field, limit, fieldName);
}

function parseFieldPart(part: string, limit: FieldLimit, fieldName: string): FieldParseResult {
  // Handle step values (e.g., */5, 1-10/2, 5/3)
  if (part.includes('/')) {
    const [rangePart, stepPart] = part.split('/');
    const step = parseInt(stepPart, 10);

    if (isNaN(step) || step <= 0) {
      return { valid: false, error: `Invalid step value in ${fieldName}: ${stepPart}` };
    }

    let baseValues: number[];

    if (rangePart === '*') {
      baseValues = rangeToArray(limit.min, limit.max);
    } else if (rangePart.includes('-')) {
      const rangeResult = parseRange(rangePart, limit, fieldName);
      if (!rangeResult.valid) return rangeResult;
      baseValues = rangeResult.values!;
    } else {
      const val = parseInt(rangePart, 10);
      if (isNaN(val) || val < limit.min || val > limit.max) {
        return {
          valid: false,
          error: `Invalid value in ${fieldName}: ${rangePart} (must be ${limit.min}-${limit.max})`,
        };
      }
      baseValues = rangeToArray(val, limit.max);
    }

    // Apply step
    const steppedValues: number[] = [];
    for (let i = 0; i < baseValues.length; i += step) {
      steppedValues.push(baseValues[i]);
    }

    return { valid: true, values: steppedValues };
  }

  // Handle ranges (e.g., 1-5)
  if (part.includes('-')) {
    return parseRange(part, limit, fieldName);
  }

  // Handle wildcard
  if (part === '*') {
    return { valid: true, values: rangeToArray(limit.min, limit.max) };
  }

  // Handle specific value
  const val = parseInt(part, 10);
  if (isNaN(val) || val < limit.min || val > limit.max) {
    return {
      valid: false,
      error: `Invalid value in ${fieldName}: ${part} (must be ${limit.min}-${limit.max})`,
    };
  }

  return { valid: true, values: [val] };
}

function parseRange(range: string, limit: FieldLimit, fieldName: string): FieldParseResult {
  const parts = range.split('-');
  if (parts.length !== 2) {
    return { valid: false, error: `Invalid range in ${fieldName}: ${range}` };
  }

  const start = parseInt(parts[0], 10);
  const end = parseInt(parts[1], 10);

  if (isNaN(start) || isNaN(end)) {
    return { valid: false, error: `Invalid range in ${fieldName}: ${range}` };
  }

  if (start < limit.min || end > limit.max) {
    return {
      valid: false,
      error: `Range out of bounds in ${fieldName}: ${range} (must be ${limit.min}-${limit.max})`,
    };
  }

  if (start > end) {
    return { valid: false, error: `Invalid range in ${fieldName}: start (${start}) > end (${end})` };
  }

  return { valid: true, values: rangeToArray(start, end) };
}

// ─── Next Execution Time ────────────────────────────────────

/**
 * Calculate the next execution time for a cron expression from the given date.
 * Returns an ISO timestamp or null if no matching time can be found.
 */
export function getNextCronExecution(
  expression: string,
  fromDate: Date = new Date()
): Date | null {
  const result = parseCronExpression(expression);
  if (!result.valid || !result.fields) return null;

  const { minute, hour, day, month, dayOfWeek } = result.fields;

  // Start from the next minute
  const candidate = new Date(fromDate);
  candidate.setSeconds(0, 0);
  candidate.setMinutes(candidate.getMinutes() + 1);

  // Try for up to 2 years to find a match
  const maxIterations = 525600; // minutes in a year
  for (let i = 0; i < maxIterations; i++) {
    const cMin = candidate.getMinutes();
    const cHour = candidate.getHours();
    const cDay = candidate.getDate();
    const cMonth = candidate.getMonth() + 1;
    const cDow = candidate.getDay();

    if (
      minute.includes(cMin) &&
      hour.includes(cHour) &&
      day.includes(cDay) &&
      month.includes(cMonth) &&
      dayOfWeek.includes(cDow)
    ) {
      return candidate;
    }

    // Advance by 1 minute
    candidate.setMinutes(candidate.getMinutes() + 1);
  }

  return null;
}

// ─── Helpers ─────────────────────────────────────────────────

function rangeToArray(start: number, end: number): number[] {
  const result: number[] = [];
  for (let i = start; i <= end; i++) {
    result.push(i);
  }
  return result;
}

function describeCron(fields: NonNullable<CronParseResult['fields']>): string {
  const { minute, hour, day, month, dayOfWeek } = fields;

  const parts: string[] = [];

  // Frequency description
  if (minute.length === 60 && hour.length === 24 && day.length === 31 && month.length === 12 && dayOfWeek.length === 7) {
    return 'Every minute';
  }

  if (hour.length === 24 && day.length === 31 && month.length === 12 && dayOfWeek.length === 7) {
    if (minute.length === 1) {
      return `Every hour at minute ${minute[0]}`;
    }
    return `Every hour at minutes ${minute.join(',')}`;
  }

  if (day.length === 31 && month.length === 12 && dayOfWeek.length === 7) {
    const timeStr = formatTime(hour, minute);
    return `Daily at ${timeStr}`;
  }

  if (month.length === 12 && dayOfWeek.length === 7) {
    const timeStr = formatTime(hour, minute);
    return `On day ${day.join(',')} of every month at ${timeStr}`;
  }

  if (dayOfWeek.length < 7) {
    const dayNames = dayOfWeek.map((d) => ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d]);
    const timeStr = formatTime(hour, minute);
    return `Every ${dayNames.join(', ')} at ${timeStr}`;
  }

  // Generic description
  return `Minute: ${minute.join(',')}, Hour: ${hour.join(',')}, Day: ${day.join(',')}, Month: ${month.join(',')}, DoW: ${dayOfWeek.join(',')}`;
}

function formatTime(hours: number[], minutes: number[]): string {
  if (hours.length === 1 && minutes.length === 1) {
    return `${String(hours[0]).padStart(2, '0')}:${String(minutes[0]).padStart(2, '0')}`;
  }
  return `${hours.map((h) => String(h).padStart(2, '0')).join(',')}:${minutes.map((m) => String(m).padStart(2, '0')).join(',')}`;
}
