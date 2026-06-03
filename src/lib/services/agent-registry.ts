export type AgentType = 'DEV' | 'SLIDES' | 'DOC' | 'DATA' | 'RESEARCH' | 'EMAIL' | 'MARKETING';

export interface AgentConfigType {
  type: AgentType;
  name: string;
  description: string;
  icon: string;
  dagDefinition: {
    stages: { id: string; name: string; parallel: boolean; subtasks: string[] }[];
  };
  reflectionCriteria: { name: string; weight: number }[];
  modelRouting: { taskType: string; models: string[]; priority: 'quality' | 'cost' | 'speed' }[];
  threshold: number;
}

const AGENT_CONFIGS: AgentConfigType[] = [
  {
    type: 'DEV',
    name: 'Dev Agent',
    description: 'Full-stack code generation with multi-model orchestration. Generates production-ready code with AST validation and auto-fix.',
    icon: 'Code2',
    dagDefinition: {
      stages: [
        { id: 'decompose', name: 'Task Decomposition', parallel: false, subtasks: ['analyze', 'plan'] },
        { id: 'generate', name: 'Code Generation', parallel: true, subtasks: ['frontend', 'backend', 'tests'] },
        { id: 'validate', name: 'AST Validation', parallel: false, subtasks: ['syntax-check', 'type-check'] },
        { id: 'reflect', name: 'Reflection', parallel: false, subtasks: ['quality-score', 'security-audit'] },
      ],
    },
    reflectionCriteria: [
      { name: 'Correctness', weight: 0.25 },
      { name: 'Code Quality', weight: 0.20 },
      { name: 'Security', weight: 0.20 },
      { name: 'Performance', weight: 0.15 },
      { name: 'Readability', weight: 0.10 },
      { name: 'Testability', weight: 0.10 },
    ],
    modelRouting: [
      { taskType: 'code', models: ['gpt-4o', 'claude-sonnet', 'gemini-pro'], priority: 'quality' },
      { taskType: 'analysis', models: ['claude-sonnet', 'gpt-4o'], priority: 'quality' },
      { taskType: 'refinement', models: ['gpt-4o-mini', 'gemini-flash'], priority: 'speed' },
    ],
    threshold: 0.92,
  },
  {
    type: 'SLIDES',
    name: 'Slides Agent',
    description: 'AI-powered presentation creation with layout optimization, content structuring, and visual design suggestions.',
    icon: 'Presentation',
    dagDefinition: {
      stages: [
        { id: 'decompose', name: 'Content Planning', parallel: false, subtasks: ['outline', 'structure'] },
        { id: 'generate', name: 'Slide Generation', parallel: true, subtasks: ['title-slide', 'content-slides', 'visual-slides'] },
        { id: 'design', name: 'Design Optimization', parallel: false, subtasks: ['layout', 'color-scheme'] },
        { id: 'reflect', name: 'Review', parallel: false, subtasks: ['coherence', 'visual-quality'] },
      ],
    },
    reflectionCriteria: [
      { name: 'Visual Appeal', weight: 0.25 },
      { name: 'Content Clarity', weight: 0.25 },
      { name: 'Structure', weight: 0.20 },
      { name: 'Consistency', weight: 0.15 },
      { name: 'Engagement', weight: 0.10 },
      { name: 'Completeness', weight: 0.05 },
    ],
    modelRouting: [
      { taskType: 'content', models: ['gpt-4o', 'claude-sonnet'], priority: 'quality' },
      { taskType: 'design', models: ['gemini-pro', 'gpt-4o'], priority: 'quality' },
      { taskType: 'refinement', models: ['gpt-4o-mini', 'claude-haiku'], priority: 'speed' },
    ],
    threshold: 0.88,
  },
  {
    type: 'DOC',
    name: 'Doc Agent',
    description: 'Technical documentation generation with auto-formatting, diagram generation, and multi-format export support.',
    icon: 'FileText',
    dagDefinition: {
      stages: [
        { id: 'decompose', name: 'Documentation Planning', parallel: false, subtasks: ['outline', 'audience'] },
        { id: 'generate', name: 'Content Generation', parallel: true, subtasks: ['api-docs', 'guides', 'examples'] },
        { id: 'format', name: 'Formatting', parallel: false, subtasks: ['structure', 'diagrams'] },
        { id: 'reflect', name: 'Review', parallel: false, subtasks: ['accuracy', 'completeness'] },
      ],
    },
    reflectionCriteria: [
      { name: 'Accuracy', weight: 0.30 },
      { name: 'Completeness', weight: 0.25 },
      { name: 'Clarity', weight: 0.20 },
      { name: 'Structure', weight: 0.10 },
      { name: 'Examples', weight: 0.10 },
      { name: 'Formatting', weight: 0.05 },
    ],
    modelRouting: [
      { taskType: 'content', models: ['claude-sonnet', 'gpt-4o'], priority: 'quality' },
      { taskType: 'analysis', models: ['gpt-4o', 'mistral-large'], priority: 'quality' },
      { taskType: 'refinement', models: ['claude-haiku', 'gemini-flash'], priority: 'speed' },
    ],
    threshold: 0.90,
  },
  {
    type: 'DATA',
    name: 'Data Agent',
    description: 'Data analysis, visualization, and pipeline generation. Supports SQL, Python, and statistical modeling workflows.',
    icon: 'BarChart3',
    dagDefinition: {
      stages: [
        { id: 'decompose', name: 'Analysis Planning', parallel: false, subtasks: ['query-understanding', 'data-assessment'] },
        { id: 'generate', name: 'Analysis Execution', parallel: true, subtasks: ['sql-generation', 'visualization', 'statistics'] },
        { id: 'validate', name: 'Result Validation', parallel: false, subtasks: ['data-check', 'significance'] },
        { id: 'reflect', name: 'Review', parallel: false, subtasks: ['insight-quality', 'completeness'] },
      ],
    },
    reflectionCriteria: [
      { name: 'Accuracy', weight: 0.30 },
      { name: 'Insight Depth', weight: 0.25 },
      { name: 'Visualization', weight: 0.15 },
      { name: 'Statistical Rigor', weight: 0.15 },
      { name: 'Clarity', weight: 0.10 },
      { name: 'Actionability', weight: 0.05 },
    ],
    modelRouting: [
      { taskType: 'code', models: ['gpt-4o', 'claude-sonnet'], priority: 'quality' },
      { taskType: 'analysis', models: ['claude-sonnet', 'gemini-pro'], priority: 'quality' },
      { taskType: 'refinement', models: ['gpt-4o-mini', 'gemini-flash'], priority: 'speed' },
    ],
    threshold: 0.93,
  },
  {
    type: 'RESEARCH',
    name: 'Research Agent',
    description: 'Deep research with multi-source synthesis, fact-checking, and comprehensive report generation with citations.',
    icon: 'Search',
    dagDefinition: {
      stages: [
        { id: 'decompose', name: 'Research Planning', parallel: false, subtasks: ['topic-breakdown', 'source-identification'] },
        { id: 'generate', name: 'Information Gathering', parallel: true, subtasks: ['web-search', 'academic-search', 'fact-check'] },
        { id: 'synthesize', name: 'Synthesis', parallel: false, subtasks: ['merge-findings', 'generate-report'] },
        { id: 'reflect', name: 'Review', parallel: false, subtasks: ['accuracy', 'completeness'] },
      ],
    },
    reflectionCriteria: [
      { name: 'Accuracy', weight: 0.30 },
      { name: 'Completeness', weight: 0.25 },
      { name: 'Source Quality', weight: 0.20 },
      { name: 'Objectivity', weight: 0.10 },
      { name: 'Clarity', weight: 0.10 },
      { name: 'Citations', weight: 0.05 },
    ],
    modelRouting: [
      { taskType: 'search', models: ['gpt-4o', 'gemini-pro'], priority: 'quality' },
      { taskType: 'analysis', models: ['claude-sonnet', 'gpt-4o'], priority: 'quality' },
      { taskType: 'content', models: ['gpt-4o', 'claude-sonnet'], priority: 'quality' },
    ],
    threshold: 0.91,
  },
  {
    type: 'EMAIL',
    name: 'Email Agent',
    description: 'Professional email composition with tone optimization, personalization, and multi-variant A/B testing suggestions.',
    icon: 'Mail',
    dagDefinition: {
      stages: [
        { id: 'decompose', name: 'Email Planning', parallel: false, subtasks: ['purpose', 'audience', 'tone'] },
        { id: 'generate', name: 'Draft Generation', parallel: true, subtasks: ['subject-lines', 'body', 'cta'] },
        { id: 'optimize', name: 'Optimization', parallel: false, subtasks: ['tone-adjustment', 'personalization'] },
        { id: 'reflect', name: 'Review', parallel: false, subtasks: ['effectiveness', 'readability'] },
      ],
    },
    reflectionCriteria: [
      { name: 'Effectiveness', weight: 0.25 },
      { name: 'Tone Match', weight: 0.20 },
      { name: 'Clarity', weight: 0.20 },
      { name: 'Personalization', weight: 0.15 },
      { name: 'Conciseness', weight: 0.10 },
      { name: 'CTA Strength', weight: 0.10 },
    ],
    modelRouting: [
      { taskType: 'content', models: ['gpt-4o', 'claude-sonnet'], priority: 'quality' },
      { taskType: 'refinement', models: ['gpt-4o-mini', 'claude-haiku'], priority: 'speed' },
    ],
    threshold: 0.85,
  },
  {
    type: 'MARKETING',
    name: 'Marketing Agent',
    description: 'Marketing copy, campaign strategy, and content calendar generation with brand voice consistency and SEO optimization.',
    icon: 'Megaphone',
    dagDefinition: {
      stages: [
        { id: 'decompose', name: 'Campaign Planning', parallel: false, subtasks: ['strategy', 'audience', 'channels'] },
        { id: 'generate', name: 'Content Generation', parallel: true, subtasks: ['headlines', 'copy', 'hashtags'] },
        { id: 'optimize', name: 'SEO & Brand Optimization', parallel: false, subtasks: ['seo', 'brand-voice'] },
        { id: 'reflect', name: 'Review', parallel: false, subtasks: ['engagement-potential', 'brand-alignment'] },
      ],
    },
    reflectionCriteria: [
      { name: 'Engagement Potential', weight: 0.25 },
      { name: 'Brand Alignment', weight: 0.20 },
      { name: 'SEO Quality', weight: 0.20 },
      { name: 'Creativity', weight: 0.15 },
      { name: 'Clarity', weight: 0.10 },
      { name: 'Call to Action', weight: 0.10 },
    ],
    modelRouting: [
      { taskType: 'content', models: ['gpt-4o', 'claude-sonnet'], priority: 'quality' },
      { taskType: 'analysis', models: ['gemini-pro', 'mistral-large'], priority: 'quality' },
      { taskType: 'refinement', models: ['gpt-4o-mini', 'gemini-flash'], priority: 'speed' },
    ],
    threshold: 0.87,
  },
];

class AgentRegistry {
  private configs: Map<AgentType, AgentConfigType> = new Map();

  constructor() {
    for (const config of AGENT_CONFIGS) {
      this.configs.set(config.type, config);
    }
  }

  getAgent(type: AgentType): AgentConfigType | undefined {
    return this.configs.get(type);
  }

  listAgents(): AgentConfigType[] {
    return AGENT_CONFIGS;
  }

  isValidType(type: string): type is AgentType {
    return this.configs.has(type as AgentType);
  }
}

export const agentRegistry = new AgentRegistry();
