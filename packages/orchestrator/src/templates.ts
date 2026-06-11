/**
 * ALTER EGO OS — Mission Templates
 *
 * Pre-defined templates for common mission types.
 * Phase 1 uses these templates for deterministic planning.
 * Phase 2 will add LLM-based customization on top.
 *
 * Each template defines:
 * - Ordered steps with agent types
 * - Dependencies between steps
 * - Default estimates for cost, duration, and quality
 */

import type { MissionTemplate, MissionType, StepDependency } from './types.js';

// ─── Formation Template ──────────────────────────────────────

const formationTemplate: MissionTemplate = {
  type: 'formation',
  name: 'Course Formation',
  description: 'Create a complete educational formation: research, plan, write course, create slides, quiz, export, and archive',
  steps: [
    {
      name: 'Research Topic',
      description: 'Research the course topic, gather sources and references',
      agentType: 'researcher',
      input: { task: 'research' },
    },
    {
      name: 'Plan Curriculum',
      description: 'Plan the course structure, modules, and learning objectives',
      agentType: 'planner',
      input: { task: 'plan_curriculum' },
    },
    {
      name: 'Write Course Content',
      description: 'Write the course content for all modules',
      agentType: 'writer',
      input: { task: 'write_course' },
    },
    {
      name: 'Create Slides',
      description: 'Create presentation slides from the course content',
      agentType: 'presenter',
      input: { task: 'create_slides' },
    },
    {
      name: 'Create Quiz',
      description: 'Create assessment quizzes for the course',
      agentType: 'assessor',
      input: { task: 'create_quiz' },
    },
    {
      name: 'Export PDF',
      description: 'Export the course as a PDF document',
      agentType: 'exporter',
      input: { task: 'export_pdf' },
    },
    {
      name: 'Export DOCX',
      description: 'Export the course as a DOCX document',
      agentType: 'exporter',
      input: { task: 'export_docx' },
    },
    {
      name: 'Archive',
      description: 'Archive all deliverables in the knowledge base',
      agentType: 'archiver',
      input: { task: 'archive' },
    },
  ],
  dependencies: [
    { from: 'step_0', to: 'step_1' },
    { from: 'step_1', to: 'step_2' },
    { from: 'step_2', to: 'step_3' },
    { from: 'step_2', to: 'step_4' },
    { from: 'step_3', to: 'step_5' },
    { from: 'step_4', to: 'step_6' },
    { from: 'step_5', to: 'step_7' },
    { from: 'step_6', to: 'step_7' },
  ],
  estimatedCostUsd: 2.50,
  estimatedDurationMs: 600_000, // 10 minutes
  estimatedQualityScore: 82,
};

// ─── Research Template ───────────────────────────────────────

const researchTemplate: MissionTemplate = {
  type: 'research',
  name: 'Research Report',
  description: 'Browse sources, analyze, synthesize, and write a research report',
  steps: [
    {
      name: 'Browse Sources',
      description: 'Search and browse relevant sources on the topic',
      agentType: 'researcher',
      input: { task: 'browse_sources' },
    },
    {
      name: 'Analyze Findings',
      description: 'Analyze and evaluate the gathered information',
      agentType: 'analyst',
      input: { task: 'analyze' },
    },
    {
      name: 'Synthesize Results',
      description: 'Synthesize the analysis into a coherent narrative',
      agentType: 'synthesizer',
      input: { task: 'synthesize' },
    },
    {
      name: 'Write Report',
      description: 'Write the final research report',
      agentType: 'writer',
      input: { task: 'write_report' },
    },
    {
      name: 'Archive',
      description: 'Archive the report in the knowledge base',
      agentType: 'archiver',
      input: { task: 'archive' },
    },
  ],
  dependencies: [
    { from: 'step_0', to: 'step_1' },
    { from: 'step_1', to: 'step_2' },
    { from: 'step_2', to: 'step_3' },
    { from: 'step_3', to: 'step_4' },
  ],
  estimatedCostUsd: 1.20,
  estimatedDurationMs: 300_000, // 5 minutes
  estimatedQualityScore: 78,
};

// ─── Article Template ────────────────────────────────────────

const articleTemplate: MissionTemplate = {
  type: 'article',
  name: 'Article Writing',
  description: 'Research, write, review, export, and publish an article',
  steps: [
    {
      name: 'Research Topic',
      description: 'Research the article topic',
      agentType: 'researcher',
      input: { task: 'research' },
    },
    {
      name: 'Write Article',
      description: 'Write the article draft',
      agentType: 'writer',
      input: { task: 'write_article' },
    },
    {
      name: 'Review Draft',
      description: 'Review and refine the article',
      agentType: 'reviewer',
      input: { task: 'review' },
    },
    {
      name: 'Export Article',
      description: 'Export the final article in the required format',
      agentType: 'exporter',
      input: { task: 'export' },
    },
    {
      name: 'Archive',
      description: 'Archive the article in the knowledge base',
      agentType: 'archiver',
      input: { task: 'archive' },
    },
  ],
  dependencies: [
    { from: 'step_0', to: 'step_1' },
    { from: 'step_1', to: 'step_2' },
    { from: 'step_2', to: 'step_3' },
    { from: 'step_3', to: 'step_4' },
  ],
  estimatedCostUsd: 0.80,
  estimatedDurationMs: 240_000, // 4 minutes
  estimatedQualityScore: 80,
};

// ─── Presentation Template ───────────────────────────────────

const presentationTemplate: MissionTemplate = {
  type: 'presentation',
  name: 'Presentation Creation',
  description: 'Research, outline, create slides, review, and export a presentation',
  steps: [
    {
      name: 'Research Topic',
      description: 'Research the presentation topic',
      agentType: 'researcher',
      input: { task: 'research' },
    },
    {
      name: 'Create Outline',
      description: 'Create the presentation outline and structure',
      agentType: 'planner',
      input: { task: 'create_outline' },
    },
    {
      name: 'Create Slides',
      description: 'Create the presentation slides',
      agentType: 'presenter',
      input: { task: 'create_slides' },
    },
    {
      name: 'Review Presentation',
      description: 'Review the presentation for quality and completeness',
      agentType: 'reviewer',
      input: { task: 'review' },
    },
    {
      name: 'Export Presentation',
      description: 'Export the final presentation',
      agentType: 'exporter',
      input: { task: 'export' },
    },
  ],
  dependencies: [
    { from: 'step_0', to: 'step_1' },
    { from: 'step_1', to: 'step_2' },
    { from: 'step_2', to: 'step_3' },
    { from: 'step_3', to: 'step_4' },
  ],
  estimatedCostUsd: 1.00,
  estimatedDurationMs: 300_000, // 5 minutes
  estimatedQualityScore: 79,
};

// ─── Audit Template ──────────────────────────────────────────

const auditTemplate: MissionTemplate = {
  type: 'audit',
  name: 'Security Audit',
  description: 'Scan, analyze, report, and provide recommendations for an audit',
  steps: [
    {
      name: 'Scan Target',
      description: 'Scan the target system for potential issues',
      agentType: 'scanner',
      input: { task: 'scan' },
    },
    {
      name: 'Analyze Findings',
      description: 'Analyze the scan results and identify vulnerabilities',
      agentType: 'analyst',
      input: { task: 'analyze' },
    },
    {
      name: 'Generate Report',
      description: 'Generate the audit report',
      agentType: 'writer',
      input: { task: 'generate_report' },
    },
    {
      name: 'Recommend Actions',
      description: 'Provide actionable recommendations based on findings',
      agentType: 'advisor',
      input: { task: 'recommend' },
    },
  ],
  dependencies: [
    { from: 'step_0', to: 'step_1' },
    { from: 'step_1', to: 'step_2' },
    { from: 'step_1', to: 'step_3' },
  ],
  estimatedCostUsd: 1.50,
  estimatedDurationMs: 360_000, // 6 minutes
  estimatedQualityScore: 85,
};

// ─── Deployment Template ─────────────────────────────────────

const deploymentTemplate: MissionTemplate = {
  type: 'deployment',
  name: 'Deployment Pipeline',
  description: 'Build, test, deploy, verify, and monitor a deployment',
  steps: [
    {
      name: 'Build',
      description: 'Build the project artifacts',
      agentType: 'builder',
      input: { task: 'build' },
    },
    {
      name: 'Test',
      description: 'Run tests on the built artifacts',
      agentType: 'tester',
      input: { task: 'test' },
    },
    {
      name: 'Deploy',
      description: 'Deploy the verified artifacts to the target environment',
      agentType: 'deployer',
      input: { task: 'deploy' },
    },
    {
      name: 'Verify Deployment',
      description: 'Verify the deployment is working correctly',
      agentType: 'verifier',
      input: { task: 'verify' },
    },
    {
      name: 'Monitor',
      description: 'Set up monitoring for the deployment',
      agentType: 'monitor',
      input: { task: 'monitor' },
    },
  ],
  dependencies: [
    { from: 'step_0', to: 'step_1' },
    { from: 'step_1', to: 'step_2' },
    { from: 'step_2', to: 'step_3' },
    { from: 'step_3', to: 'step_4' },
  ],
  estimatedCostUsd: 0.50,
  estimatedDurationMs: 180_000, // 3 minutes
  estimatedQualityScore: 88,
};

// ─── Monitoring Template ─────────────────────────────────────

const monitoringTemplate: MissionTemplate = {
  type: 'monitoring',
  name: 'System Monitoring',
  description: 'Collect metrics, analyze trends, alert, and report on system health',
  steps: [
    {
      name: 'Collect Metrics',
      description: 'Collect system metrics and performance data',
      agentType: 'collector',
      input: { task: 'collect_metrics' },
    },
    {
      name: 'Analyze Trends',
      description: 'Analyze trends and detect anomalies',
      agentType: 'analyst',
      input: { task: 'analyze_trends' },
    },
    {
      name: 'Generate Alerts',
      description: 'Generate alerts for detected anomalies',
      agentType: 'alerter',
      input: { task: 'generate_alerts' },
    },
    {
      name: 'Report Status',
      description: 'Generate a status report',
      agentType: 'reporter',
      input: { task: 'report_status' },
    },
  ],
  dependencies: [
    { from: 'step_0', to: 'step_1' },
    { from: 'step_1', to: 'step_2' },
    { from: 'step_1', to: 'step_3' },
  ],
  estimatedCostUsd: 0.30,
  estimatedDurationMs: 120_000, // 2 minutes
  estimatedQualityScore: 75,
};

// ─── Analysis Template ───────────────────────────────────────

const analysisTemplate: MissionTemplate = {
  type: 'analysis',
  name: 'Data Analysis',
  description: 'Gather data, process, analyze, visualize, and produce insights',
  steps: [
    {
      name: 'Gather Data',
      description: 'Gather the data to be analyzed',
      agentType: 'collector',
      input: { task: 'gather_data' },
    },
    {
      name: 'Process Data',
      description: 'Clean and process the raw data',
      agentType: 'processor',
      input: { task: 'process_data' },
    },
    {
      name: 'Analyze Data',
      description: 'Perform the core analysis on the processed data',
      agentType: 'analyst',
      input: { task: 'analyze' },
    },
    {
      name: 'Visualize Results',
      description: 'Create visualizations of the analysis results',
      agentType: 'visualizer',
      input: { task: 'visualize' },
    },
    {
      name: 'Produce Insights',
      description: 'Summarize key insights and recommendations',
      agentType: 'advisor',
      input: { task: 'produce_insights' },
    },
  ],
  dependencies: [
    { from: 'step_0', to: 'step_1' },
    { from: 'step_1', to: 'step_2' },
    { from: 'step_2', to: 'step_3' },
    { from: 'step_2', to: 'step_4' },
  ],
  estimatedCostUsd: 1.00,
  estimatedDurationMs: 300_000, // 5 minutes
  estimatedQualityScore: 80,
};

// ─── Template Registry ───────────────────────────────────────

/** All built-in mission templates indexed by type */
const TEMPLATES: Record<MissionType, MissionTemplate> = {
  formation: formationTemplate,
  research: researchTemplate,
  article: articleTemplate,
  presentation: presentationTemplate,
  audit: auditTemplate,
  deployment: deploymentTemplate,
  monitoring: monitoringTemplate,
  analysis: analysisTemplate,
  custom: {
    type: 'custom',
    name: 'Custom Mission',
    description: 'A custom mission with no pre-defined template (placeholder for Phase 2 LLM-based planning)',
    steps: [
      {
        name: 'Plan Custom Steps',
        description: 'Plan the steps needed for this custom mission',
        agentType: 'planner',
        input: { task: 'plan_custom' },
      },
      {
        name: 'Execute Custom Task',
        description: 'Execute the custom task',
        agentType: 'executor',
        input: { task: 'execute_custom' },
      },
      {
        name: 'Archive Results',
        description: 'Archive the results',
        agentType: 'archiver',
        input: { task: 'archive' },
      },
    ],
    dependencies: [
      { from: 'step_0', to: 'step_1' },
      { from: 'step_1', to: 'step_2' },
    ],
    estimatedCostUsd: 1.00,
    estimatedDurationMs: 300_000,
    estimatedQualityScore: 70,
  },
};

/**
 * Get a mission template by type.
 * Returns undefined if the type is not recognized (should not happen with the MissionType union).
 */
export function getTemplate(type: MissionType): MissionTemplate {
  return TEMPLATES[type];
}

/**
 * Get all available mission templates.
 */
export function getAllTemplates(): MissionTemplate[] {
  return Object.values(TEMPLATES);
}

/**
 * Check if a template exists for the given mission type.
 */
export function hasTemplate(type: MissionType): boolean {
  return type in TEMPLATES;
}
