/**
 * ALTER EGO OS — Mission Parser
 *
 * Parses natural-language mission descriptions into structured data.
 * Phase 1 uses keyword-based heuristics; Phase 2 will use LLM-based parsing.
 *
 * The parser extracts:
 * - Mission type (from keywords)
 * - Intent (main goal)
 * - Scope (areas of work)
 * - Constraints (budget, time, quality)
 * - Expected deliverables
 */

import type { MissionType, MissionConstraints, ParsedMission } from './types.js';

// ─── Keyword Maps ────────────────────────────────────────────

/** Keywords that map to mission types */
const TYPE_KEYWORDS: Record<MissionType, string[]> = {
  formation: ['course', 'formation', 'curriculum', 'training', 'education', 'learn', 'teach', 'module', 'syllabus'],
  research: ['research', 'investigate', 'study', 'explore', 'literature', 'survey', 'bibliography'],
  article: ['article', 'blog', 'post', 'write-up', 'essay', 'opinion piece', 'column'],
  presentation: ['presentation', 'slides', 'keynote', 'slideshow', 'deck', 'powerpoint', 'talk'],
  audit: ['audit', 'security', 'compliance', 'review', 'assessment', 'vulnerability', 'penetration'],
  deployment: ['deploy', 'release', 'ship', 'launch', 'rollout', 'ci/cd', 'pipeline', 'publish'],
  monitoring: ['monitor', 'observe', 'track', 'alert', 'health', 'uptime', 'dashboard', 'metrics'],
  analysis: ['analyze', 'analysis', 'insight', 'data', 'statistics', 'trend', 'report on', 'evaluate'],
  custom: [],
};

/** Keywords that indicate budget constraints */
const BUDGET_KEYWORDS = ['budget', 'cost', 'spend', 'maximum', 'max', 'usd', 'dollar', '$', 'cheap', 'affordable'];

/** Keywords that indicate time constraints */
const TIME_KEYWORDS = ['deadline', 'urgent', 'asap', 'immediately', 'hours', 'minutes', 'quickly', 'fast', 'by'];

/** Keywords that indicate quality requirements */
const QUALITY_KEYWORDS = ['quality', 'high-quality', 'premium', 'best', 'excellent', 'thorough', 'detailed', 'comprehensive'];

/** Keywords that indicate format requirements */
const FORMAT_KEYWORDS: Record<string, string> = {
  'pdf': 'pdf',
  'docx': 'docx',
  'word': 'docx',
  'pptx': 'pptx',
  'powerpoint': 'pptx',
  'markdown': 'markdown',
  'md': 'markdown',
  'html': 'html',
  'slides': 'pptx',
  'report': 'report',
  'code': 'code',
};

// ─── Parser Implementation ───────────────────────────────────

/**
 * Parse a mission description into structured data.
 *
 * Phase 1 uses keyword-based heuristics. The confidence score reflects
 * how certain the parser is about the detected type and constraints.
 */
export function parseMission(description: string): ParsedMission {
  const lower = description.toLowerCase();

  // Detect mission type
  const type = detectType(lower);
  const typeConfidence = calculateTypeConfidence(lower, type);

  // Extract intent — the core goal of the mission
  const intent = extractIntent(description);

  // Extract scope — areas of work mentioned
  const scope = extractScope(lower);

  // Extract constraints
  const constraints = extractConstraints(lower);

  // Extract expected deliverables
  const deliverables = extractDeliverables(lower);

  // Extract keywords
  const keywords = extractKeywords(lower);

  return {
    type,
    intent,
    scope,
    constraints,
    deliverables,
    keywords,
    confidence: typeConfidence,
  };
}

/**
 * Detect the mission type from keywords in the description.
 * Falls back to 'custom' if no clear type is detected.
 */
function detectType(lowerDescription: string): MissionType {
  let bestType: MissionType = 'custom';
  let bestScore = 0;

  for (const [type, keywords] of Object.entries(TYPE_KEYWORDS) as [MissionType, string[]][]) {
    let score = 0;
    for (const keyword of keywords) {
      if (lowerDescription.includes(keyword)) {
        score += keyword.length; // Longer matches = more specific
      }
    }
    if (score > bestScore) {
      bestScore = score;
      bestType = type;
    }
  }

  return bestType;
}

/**
 * Calculate confidence of the type detection.
 * Higher when more keywords match; lower when few or competing types.
 */
function calculateTypeConfidence(lowerDescription: string, detectedType: MissionType): number {
  if (detectedType === 'custom') return 0.3; // Low confidence for custom

  const typeKeywords = TYPE_KEYWORDS[detectedType];
  const matchCount = typeKeywords.filter((kw) => lowerDescription.includes(kw)).length;
  const ratio = matchCount / typeKeywords.length;

  // Confidence scales with keyword match ratio, capped at 0.95
  return Math.min(0.95, 0.4 + ratio * 0.55);
}

/**
 * Extract the intent — the main goal of the mission.
 * For Phase 1, uses the first sentence or up to 200 chars.
 */
function extractIntent(description: string): string {
  const trimmed = description.trim();

  // Try to get the first sentence
  const sentenceEnd = trimmed.search(/[.!?]/);
  if (sentenceEnd > 0 && sentenceEnd < 200) {
    return trimmed.substring(0, sentenceEnd + 1);
  }

  // Fall back to first 200 characters
  if (trimmed.length <= 200) return trimmed;
  return trimmed.substring(0, 197) + '...';
}

/**
 * Extract scope — areas of work mentioned in the description.
 */
function extractScope(lowerDescription: string): string[] {
  const scopeKeywords = [
    'frontend', 'backend', 'database', 'api', 'ui', 'ux',
    'security', 'performance', 'testing', 'documentation',
    'deployment', 'infrastructure', 'design', 'content',
    'marketing', 'analytics', 'integration', 'migration',
  ];

  return scopeKeywords.filter((kw) => lowerDescription.includes(kw));
}

/**
 * Extract constraints from the description.
 */
function extractConstraints(lowerDescription: string): MissionConstraints {
  const constraints: MissionConstraints = {};

  // Budget detection
  if (BUDGET_KEYWORDS.some((kw) => lowerDescription.includes(kw))) {
    // Try to extract a dollar amount
    const dollarMatch = lowerDescription.match(/\$(\d+(?:\.\d+)?)/);
    if (dollarMatch?.[1]) {
      constraints.maxBudgetUsd = parseFloat(dollarMatch[1]);
    }

    // Try to extract "max X usd" or "budget of X"
    const budgetMatch = lowerDescription.match(/(?:max|budget|spend|cost)(?:\s+of)?\s+(\d+(?:\.\d+)?)/);
    if (budgetMatch?.[1] && !constraints.maxBudgetUsd) {
      constraints.maxBudgetUsd = parseFloat(budgetMatch[1]);
    }
  }

  // Time detection
  if (TIME_KEYWORDS.some((kw) => lowerDescription.includes(kw))) {
    // Try to extract duration in hours/minutes
    const hoursMatch = lowerDescription.match(/(\d+)\s*hours?/);
    const minutesMatch = lowerDescription.match(/(\d+)\s*minutes?/);

    if (hoursMatch?.[1]) {
      constraints.maxDurationMs = parseInt(hoursMatch[1], 10) * 3600_000;
    } else if (minutesMatch?.[1]) {
      constraints.maxDurationMs = parseInt(minutesMatch[1], 10) * 60_000;
    }
  }

  // Quality detection
  if (QUALITY_KEYWORDS.some((kw) => lowerDescription.includes(kw))) {
    constraints.minQualityScore = 80; // High quality requested
  }

  // Format detection
  const detectedFormats: string[] = [];
  for (const [keyword, format] of Object.entries(FORMAT_KEYWORDS)) {
    if (lowerDescription.includes(keyword) && !detectedFormats.includes(format)) {
      detectedFormats.push(format);
    }
  }
  if (detectedFormats.length > 0) {
    constraints.requiredFormats = detectedFormats;
  }

  // Language detection
  const langMatch = lowerDescription.match(/(?:in|language)\s+(spanish|french|german|chinese|japanese|portuguese|italian|english)/);
  if (langMatch?.[1]) {
    constraints.language = langMatch[1];
  }

  return constraints;
}

/**
 * Extract expected deliverables from the description.
 */
function extractDeliverables(lowerDescription: string): string[] {
  const deliverables: string[] = [];

  const deliverablePatterns: [string, string][] = [
    ['report', 'Research Report'],
    ['article', 'Article'],
    ['blog', 'Blog Post'],
    ['slides', 'Presentation Slides'],
    ['presentation', 'Presentation'],
    ['course', 'Course Content'],
    ['quiz', 'Assessment Quiz'],
    ['audit', 'Audit Report'],
    ['dashboard', 'Dashboard'],
    ['documentation', 'Documentation'],
    ['code', 'Source Code'],
    ['analysis', 'Analysis Report'],
  ];

  for (const [keyword, deliverable] of deliverablePatterns) {
    if (lowerDescription.includes(keyword) && !deliverables.includes(deliverable)) {
      deliverables.push(deliverable);
    }
  }

  return deliverables;
}

/**
 * Extract significant keywords from the description.
 */
function extractKeywords(lowerDescription: string): string[] {
  // Simple keyword extraction: split on whitespace and punctuation,
  // filter out common stop words, keep meaningful terms
  const stopWords = new Set([
    'a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
    'of', 'with', 'by', 'from', 'is', 'are', 'was', 'were', 'be', 'been',
    'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would',
    'could', 'should', 'may', 'might', 'shall', 'can', 'need', 'must',
    'it', 'its', 'this', 'that', 'these', 'those', 'i', 'me', 'my',
    'we', 'us', 'our', 'you', 'your', 'he', 'she', 'they', 'them',
    'over', 'under', 'into', 'about', 'between', 'through', 'during',
    'before', 'after', 'above', 'below', 'just', 'also', 'very',
  ]);

  const words = lowerDescription
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2 && !stopWords.has(w));

  // Deduplicate and return
  return [...new Set(words)];
}
