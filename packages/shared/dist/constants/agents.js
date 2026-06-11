// ============================================================
// 7 Product Agent Configurations
// "1 Kernel, 7 Configurations" Architecture
// ============================================================
export const AGENT_COLORS = {
    DEV: '#3B82F6',
    SLIDES: '#8B5CF6',
    DOC: '#10B981',
    DATA: '#F59E0B',
    RECHERCHE: '#EF4444',
    EMAIL: '#EC4899',
    MARKETING: '#06B6D4',
};
export const AGENT_ICONS = {
    DEV: 'Code2',
    SLIDES: 'Presentation',
    DOC: 'FileText',
    DATA: 'BarChart3',
    RECHERCHE: 'Search',
    EMAIL: 'Mail',
    MARKETING: 'Megaphone',
};
// Default reflection criteria weights (Genspark-inspired)
export const DEFAULT_REFLECTION_CRITERIA = [
    { name: 'Code Quality', weight: 0.30, description: 'Clean, maintainable, well-structured code', scoringGuide: '0-2: Spaghetti code, 3-5: Acceptable, 6-8: Well-structured, 9-10: Exceptional' },
    { name: 'Functionality', weight: 0.25, description: 'All requirements met and working correctly', scoringGuide: '0-2: Missing features, 3-5: Partial, 6-8: Mostly complete, 9-10: All features working' },
    { name: 'Performance', weight: 0.15, description: 'Efficient resource usage and fast response', scoringGuide: '0-2: Very slow, 3-5: Acceptable, 6-8: Optimized, 9-10: Blazing fast' },
    { name: 'Security', weight: 0.15, description: 'No vulnerabilities, proper validation', scoringGuide: '0-2: Critical vulns, 3-5: Minor issues, 6-8: Secure, 9-10: Bulletproof' },
    { name: 'UX', weight: 0.10, description: 'User-friendly and accessible', scoringGuide: '0-2: Confusing, 3-5: Usable, 6-8: Intuitive, 9-10: Delightful' },
    { name: 'Testing', weight: 0.05, description: 'Adequate test coverage', scoringGuide: '0-2: No tests, 3-5: Some tests, 6-8: Good coverage, 9-10: Comprehensive' },
];
// DEV Agent Configuration
export const DEV_AGENT_CONFIG = {
    id: 'DEV',
    name: 'Développeur',
    description: 'Full-stack code generation with DAG-based architecture',
    icon: 'Code2',
    color: '#3B82F6',
    systemPrompt: `You are AgentForge DEV, an elite full-stack developer agent. You generate production-ready code using DAG-based topological generation.

RULES:
1. Generate code level-by-level: Config → Types/Schema → API/Auth → Components → Integration
2. Every file must be self-contained and compilable
3. Use TypeScript strict mode
4. Follow SOLID principles
5. Include error handling in every function
6. All API endpoints must have Zod validation
7. Generate tests alongside production code
8. Use parameterized queries for all database operations
9. Apply XSS sanitization on all user inputs
10. Document all public APIs with JSDoc`,
    llmPool: {
        primary: [
            { id: 'claude-3.7-sonnet', name: 'Claude 3.7 Sonnet', model: 'claude-3-7-sonnet-20250219', maxTokens: 8192, temperature: 0.3, costPer1kTokens: 0.003, latencyMs: 1200, strengths: ['code', 'architecture', 'refactoring'] },
            { id: 'gpt-4o', name: 'GPT-4o', model: 'gpt-4o-2024-11-20', maxTokens: 8192, temperature: 0.3, costPer1kTokens: 0.005, latencyMs: 1000, strengths: ['code', 'api-design', 'debugging'] },
            { id: 'deepseek-r1', name: 'DeepSeek R1', model: 'deepseek-reasoner', maxTokens: 8192, temperature: 0.5, costPer1kTokens: 0.0014, latencyMs: 2500, strengths: ['reasoning', 'algorithm-design', 'optimization'] },
        ],
        secondary: [
            { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro', model: 'gemini-2.5-pro-preview-05-06', maxTokens: 8192, temperature: 0.3, costPer1kTokens: 0.00125, latencyMs: 1500, strengths: ['code', 'multimodal', 'testing'] },
            { id: 'gpt-o1', name: 'GPT-o1', model: 'o1-2024-12-17', maxTokens: 16384, temperature: 0.7, costPer1kTokens: 0.015, latencyMs: 3000, strengths: ['complex-reasoning', 'system-design', 'security'] },
        ],
        fallback: [
            { id: 'qwen-2.5', name: 'Qwen 2.5', model: 'qwen-2.5-72b', maxTokens: 4096, temperature: 0.5, costPer1kTokens: 0.0005, latencyMs: 600, strengths: ['fast-generation', 'templates'] },
            { id: 'mistral-large', name: 'Mistral Large', model: 'mistral-large-2411', maxTokens: 8192, temperature: 0.3, costPer1kTokens: 0.002, latencyMs: 900, strengths: ['code', 'structured-output'] },
            { id: 'llama-3.3', name: 'Llama 3.3', model: 'llama-3.3-70b', maxTokens: 4096, temperature: 0.5, costPer1kTokens: 0.0008, latencyMs: 800, strengths: ['fast-generation', 'templates'] },
            { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash', model: 'gemini-2.0-flash-001', maxTokens: 8192, temperature: 0.5, costPer1kTokens: 0.0001, latencyMs: 400, strengths: ['speed', 'simple-tasks'] },
        ],
    },
    reflectionCriteria: DEFAULT_REFLECTION_CRITERIA,
    maxIterations: 3,
    confidenceThreshold: 0.95,
    sandboxEnabled: true,
    deploymentTarget: 'cloudflare',
    outputFormat: { type: 'code', extensions: ['.ts', '.tsx', '.js', '.jsx', '.json'], mimeType: 'text/typescript' },
    dagTemplate: {
        nodes: [
            { id: 'config', label: 'Project Config', level: 0, type: 'input', agentRole: 'configurator' },
            { id: 'types', label: 'Types & Schema', level: 1, type: 'process', agentRole: 'type-designer' },
            { id: 'api', label: 'API Layer', level: 2, type: 'process', agentRole: 'api-builder' },
            { id: 'auth', label: 'Auth & Security', level: 2, type: 'process', agentRole: 'security-engineer' },
            { id: 'components', label: 'UI Components', level: 3, type: 'process', agentRole: 'ui-developer' },
            { id: 'integration', label: 'Integration Tests', level: 4, type: 'output', agentRole: 'qa-engineer' },
        ],
        edges: [
            { from: 'config', to: 'types' },
            { from: 'types', to: 'api' },
            { from: 'types', to: 'auth' },
            { from: 'api', to: 'components' },
            { from: 'auth', to: 'components' },
            { from: 'components', to: 'integration' },
        ],
    },
    rateLimit: { windowMs: 60000, maxRequests: 10, tier: 'free' },
    moaConfig: {
        voting: {
            criteriaWeights: { quality: 0.4, costEfficiency: 0.3, speed: 0.3 },
            minConsensus: 0.7,
            deduplicationThreshold: 0.7,
        },
        rounds: [
            { round: 'propose', providerCount: 9, temperature: 0.4, strategy: 'all' },
            { round: 'critique', providerCount: 3, temperature: 0.2, strategy: 'top_n' },
            { round: 'refine', providerCount: 3, temperature: 0.3, strategy: 'top_n' },
        ],
        feedbackInjection: true,
    },
};
// SLIDES Agent Configuration
export const SLIDES_AGENT_CONFIG = {
    id: 'SLIDES',
    name: 'Présentateur',
    description: 'AI-powered presentation generation with smart layouts',
    icon: 'Presentation',
    color: '#8B5CF6',
    systemPrompt: `You are AgentForge SLIDES, an elite presentation design agent. You create stunning, professional presentations with AI-driven layouts.

RULES:
1. Every slide must have a clear message and visual hierarchy
2. Use consistent color schemes and typography
3. Include speaker notes for each slide
4. Support PPTX, PDF, and HTML export
5. Generate slide content from research, not assumptions
6. Apply the 10-20-30 rule as a guideline
7. Include data visualizations where appropriate
8. Ensure accessibility (contrast ratios, alt text)`,
    llmPool: {
        primary: [
            { id: 'claude-3.7-sonnet', name: 'Claude 3.7 Sonnet', model: 'claude-3-7-sonnet-20250219', maxTokens: 8192, temperature: 0.4, costPer1kTokens: 0.003, latencyMs: 1200, strengths: ['content', 'structure', 'narrative'] },
            { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro', model: 'gemini-2.5-pro-preview-05-06', maxTokens: 8192, temperature: 0.4, costPer1kTokens: 0.00125, latencyMs: 1500, strengths: ['multimodal', 'design', 'visual'] },
        ],
        secondary: [
            { id: 'gpt-4o', name: 'GPT-4o', model: 'gpt-4o-2024-11-20', maxTokens: 8192, temperature: 0.4, costPer1kTokens: 0.005, latencyMs: 1000, strengths: ['content', 'summarization'] },
        ],
        fallback: [
            { id: 'qwen-2.5', name: 'Qwen 2.5', model: 'qwen-2.5-72b', maxTokens: 4096, temperature: 0.5, costPer1kTokens: 0.0005, latencyMs: 600, strengths: ['fast-generation', 'templates'] },
        ],
    },
    reflectionCriteria: [
        { name: 'Content Quality', weight: 0.30, description: 'Clear, accurate, well-structured content', scoringGuide: '0-2: Vague, 3-5: Adequate, 6-8: Clear and precise, 9-10: Outstanding' },
        { name: 'Visual Design', weight: 0.25, description: 'Professional and visually appealing slides', scoringGuide: '0-2: Cluttered, 3-5: Basic, 6-8: Professional, 9-10: Award-winning' },
        { name: 'Narrative Flow', weight: 0.20, description: 'Logical progression through the presentation', scoringGuide: '0-2: Disconnected, 3-5: Linear, 6-8: Engaging, 9-10: Compelling' },
        { name: 'Data Accuracy', weight: 0.15, description: 'All data and claims are accurate', scoringGuide: '0-2: Errors, 3-5: Mostly right, 6-8: Accurate, 9-10: Verified' },
        { name: 'Accessibility', weight: 0.10, description: 'Accessible to all audiences', scoringGuide: '0-2: Not accessible, 3-5: Partial, 6-8: Good, 9-10: Fully accessible' },
    ],
    maxIterations: 2,
    confidenceThreshold: 0.90,
    sandboxEnabled: false,
    deploymentTarget: 'none',
    outputFormat: { type: 'slides', extensions: ['.pptx', '.pdf', '.html'], mimeType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' },
    dagTemplate: {
        nodes: [
            { id: 'research', label: 'Topic Research', level: 0, type: 'input', agentRole: 'researcher' },
            { id: 'outline', label: 'Slide Outline', level: 1, type: 'process', agentRole: 'structurer' },
            { id: 'content', label: 'Content Generation', level: 2, type: 'process', agentRole: 'writer' },
            { id: 'design', label: 'Visual Design', level: 3, type: 'process', agentRole: 'designer' },
            { id: 'export', label: 'Export & Package', level: 4, type: 'output', agentRole: 'packager' },
        ],
        edges: [
            { from: 'research', to: 'outline' },
            { from: 'outline', to: 'content' },
            { from: 'content', to: 'design' },
            { from: 'design', to: 'export' },
        ],
    },
    rateLimit: { windowMs: 60000, maxRequests: 5, tier: 'free' },
    moaConfig: {
        voting: {
            criteriaWeights: { quality: 0.4, costEfficiency: 0.3, speed: 0.3 },
            minConsensus: 0.65,
            deduplicationThreshold: 0.7,
        },
        rounds: [
            { round: 'propose', providerCount: 4, temperature: 0.4, strategy: 'all' },
            { round: 'critique', providerCount: 2, temperature: 0.2, strategy: 'top_n' },
            { round: 'refine', providerCount: 2, temperature: 0.3, strategy: 'top_n' },
        ],
        feedbackInjection: true,
    },
};
// DOC Agent Configuration
export const DOC_AGENT_CONFIG = {
    id: 'DOC',
    name: 'Documentateur',
    description: 'Professional document generation (PDF, DOCX, reports)',
    icon: 'FileText',
    color: '#10B981',
    systemPrompt: `You are AgentForge DOC, an elite document generation agent. You create professional documents, reports, and manuscripts.

RULES:
1. Follow proper document structure (cover, TOC, sections, appendix)
2. Use professional formatting and typography
3. Include tables, charts, and visual elements where appropriate
4. Cite sources and provide references
5. Ensure content depth (minimum 150-200 words per section)
6. Apply consistent styling throughout
7. Support PDF, DOCX, and Markdown export
8. Include metadata and document properties`,
    llmPool: {
        primary: [
            { id: 'claude-3.7-sonnet', name: 'Claude 3.7 Sonnet', model: 'claude-3-7-sonnet-20250219', maxTokens: 8192, temperature: 0.3, costPer1kTokens: 0.003, latencyMs: 1200, strengths: ['writing', 'structure', 'research'] },
            { id: 'gpt-4o', name: 'GPT-4o', model: 'gpt-4o-2024-11-20', maxTokens: 8192, temperature: 0.3, costPer1kTokens: 0.005, latencyMs: 1000, strengths: ['writing', 'summarization'] },
        ],
        secondary: [
            { id: 'deepseek-r1', name: 'DeepSeek R1', model: 'deepseek-reasoner', maxTokens: 8192, temperature: 0.5, costPer1kTokens: 0.0014, latencyMs: 2500, strengths: ['analysis', 'depth'] },
        ],
        fallback: [
            { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash', model: 'gemini-2.0-flash-001', maxTokens: 8192, temperature: 0.5, costPer1kTokens: 0.0001, latencyMs: 400, strengths: ['speed', 'drafts'] },
        ],
    },
    reflectionCriteria: [
        { name: 'Content Depth', weight: 0.30, description: 'Thorough, well-researched content with substantial information', scoringGuide: '0-2: Shallow, 3-5: Adequate depth, 6-8: Comprehensive, 9-10: Authoritative' },
        { name: 'Structure & Organization', weight: 0.25, description: 'Logical flow, clear headings, proper document hierarchy', scoringGuide: '0-2: Disorganized, 3-5: Basic structure, 6-8: Well-organized, 9-10: Flawless' },
        { name: 'Formatting & Typography', weight: 0.20, description: 'Professional formatting, consistent styling, proper typography', scoringGuide: '0-2: Raw text, 3-5: Basic formatting, 6-8: Professional, 9-10: Publication-ready' },
        { name: 'Accuracy & Citations', weight: 0.15, description: 'Factual correctness with proper source citations', scoringGuide: '0-2: Unverified, 3-5: Some sources, 6-8: Well-cited, 9-10: Rigorously sourced' },
        { name: 'Clarity & Readability', weight: 0.10, description: 'Clear language, appropriate tone, accessible to target audience', scoringGuide: '0-2: Confusing, 3-5: Readable, 6-8: Clear, 9-10: Compelling' },
    ],
    maxIterations: 2,
    confidenceThreshold: 0.90,
    sandboxEnabled: false,
    deploymentTarget: 'none',
    outputFormat: { type: 'document', extensions: ['.pdf', '.docx', '.md'], mimeType: 'application/pdf' },
    dagTemplate: {
        nodes: [
            { id: 'requirements', label: 'Document Requirements', level: 0, type: 'input', agentRole: 'analyst' },
            { id: 'outline', label: 'Document Outline', level: 1, type: 'process', agentRole: 'architect' },
            { id: 'content', label: 'Content Generation', level: 2, type: 'process', agentRole: 'writer' },
            { id: 'format', label: 'Formatting & Layout', level: 3, type: 'process', agentRole: 'designer' },
            { id: 'export', label: 'Export Document', level: 4, type: 'output', agentRole: 'packager' },
        ],
        edges: [
            { from: 'requirements', to: 'outline' },
            { from: 'outline', to: 'content' },
            { from: 'content', to: 'format' },
            { from: 'format', to: 'export' },
        ],
    },
    rateLimit: { windowMs: 60000, maxRequests: 8, tier: 'free' },
    moaConfig: {
        voting: {
            criteriaWeights: { quality: 0.4, costEfficiency: 0.3, speed: 0.3 },
            minConsensus: 0.65,
            deduplicationThreshold: 0.7,
        },
        rounds: [
            { round: 'propose', providerCount: 4, temperature: 0.3, strategy: 'all' },
            { round: 'critique', providerCount: 2, temperature: 0.2, strategy: 'top_n' },
            { round: 'refine', providerCount: 2, temperature: 0.3, strategy: 'top_n' },
        ],
        feedbackInjection: true,
    },
};
// DATA Agent Configuration
export const DATA_AGENT_CONFIG = {
    id: 'DATA',
    name: 'Analyste',
    description: 'Data analysis, visualization, and spreadsheet generation',
    icon: 'BarChart3',
    color: '#F59E0B',
    systemPrompt: `You are AgentForge DATA, an elite data analysis agent. You analyze data, create visualizations, and generate spreadsheets.

RULES:
1. Always validate and clean data before analysis
2. Use appropriate chart types for the data
3. Include statistical summaries and insights
4. Support CSV, XLSX, JSON, and SQL data sources
5. Generate interactive charts with ECharts/Chart.js
6. Apply proper color theory to visualizations
7. Include data quality reports
8. Support pivot tables and aggregations`,
    llmPool: {
        primary: [
            { id: 'gpt-4o', name: 'GPT-4o', model: 'gpt-4o-2024-11-20', maxTokens: 8192, temperature: 0.2, costPer1kTokens: 0.005, latencyMs: 1000, strengths: ['analysis', 'sql', 'python'] },
            { id: 'deepseek-r1', name: 'DeepSeek R1', model: 'deepseek-reasoner', maxTokens: 8192, temperature: 0.4, costPer1kTokens: 0.0014, latencyMs: 2500, strengths: ['reasoning', 'statistics', 'ml'] },
        ],
        secondary: [
            { id: 'claude-3.7-sonnet', name: 'Claude 3.7 Sonnet', model: 'claude-3-7-sonnet-20250219', maxTokens: 8192, temperature: 0.3, costPer1kTokens: 0.003, latencyMs: 1200, strengths: ['python', 'visualization'] },
        ],
        fallback: [
            { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash', model: 'gemini-2.0-flash-001', maxTokens: 8192, temperature: 0.5, costPer1kTokens: 0.0001, latencyMs: 400, strengths: ['speed', 'simple-charts'] },
        ],
    },
    reflectionCriteria: [
        { name: 'Accuracy', weight: 0.35, description: 'Data analysis accuracy', scoringGuide: '0-2: Wrong analysis, 3-5: Minor errors, 6-8: Accurate, 9-10: Perfect' },
        { name: 'Visualization', weight: 0.25, description: 'Chart quality and appropriateness', scoringGuide: '0-2: Misleading, 3-5: Basic, 6-8: Professional, 9-10: Insightful' },
        { name: 'Insight Depth', weight: 0.20, description: 'Quality of insights and recommendations', scoringGuide: '0-2: Obvious, 3-5: Some value, 6-8: Valuable, 9-10: Transformative' },
        { name: 'Code Quality', weight: 0.15, description: 'Clean, efficient analysis code', scoringGuide: '0-2: Spaghetti, 3-5: Works, 6-8: Clean, 9-10: Elegant' },
        { name: 'Documentation', weight: 0.05, description: 'Well-documented analysis steps', scoringGuide: '0-2: None, 3-5: Basic, 6-8: Good, 9-10: Comprehensive' },
    ],
    maxIterations: 2,
    confidenceThreshold: 0.90,
    sandboxEnabled: true,
    deploymentTarget: 'none',
    outputFormat: { type: 'data', extensions: ['.xlsx', '.csv', '.json', '.png'], mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' },
    dagTemplate: {
        nodes: [
            { id: 'ingest', label: 'Data Ingestion', level: 0, type: 'input', agentRole: 'ingestor' },
            { id: 'clean', label: 'Data Cleaning', level: 1, type: 'process', agentRole: 'cleaner' },
            { id: 'analyze', label: 'Statistical Analysis', level: 2, type: 'process', agentRole: 'analyst' },
            { id: 'visualize', label: 'Data Visualization', level: 3, type: 'process', agentRole: 'visualizer' },
            { id: 'report', label: 'Report Generation', level: 4, type: 'output', agentRole: 'reporter' },
        ],
        edges: [
            { from: 'ingest', to: 'clean' },
            { from: 'clean', to: 'analyze' },
            { from: 'analyze', to: 'visualize' },
            { from: 'visualize', to: 'report' },
        ],
    },
    rateLimit: { windowMs: 60000, maxRequests: 8, tier: 'free' },
    moaConfig: {
        voting: {
            criteriaWeights: { quality: 0.4, costEfficiency: 0.25, speed: 0.35 },
            minConsensus: 0.65,
            deduplicationThreshold: 0.7,
        },
        rounds: [
            { round: 'propose', providerCount: 4, temperature: 0.3, strategy: 'all' },
            { round: 'critique', providerCount: 2, temperature: 0.2, strategy: 'top_n' },
            { round: 'refine', providerCount: 2, temperature: 0.3, strategy: 'top_n' },
        ],
        feedbackInjection: true,
    },
};
// RECHERCHE Agent Configuration
export const RECHERCHE_AGENT_CONFIG = {
    id: 'RECHERCHE',
    name: 'Chercheur',
    description: 'Deep research with web search and synthesis',
    icon: 'Search',
    color: '#EF4444',
    systemPrompt: `You are AgentForge RECHERCHE, an elite research agent. You conduct deep research using web search and synthesize comprehensive reports.

RULES:
1. Always cite sources with URLs and dates
2. Cross-reference information from multiple sources
3. Distinguish between facts, opinions, and speculation
4. Provide confidence levels for claims
5. Include methodology section
6. Cover multiple perspectives
7. Update research with latest available data
8. Generate executive summaries and detailed reports`,
    llmPool: {
        primary: [
            { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro', model: 'gemini-2.5-pro-preview-05-06', maxTokens: 8192, temperature: 0.3, costPer1kTokens: 0.00125, latencyMs: 1500, strengths: ['search', 'multimodal', 'comprehensive'] },
            { id: 'gpt-o1', name: 'GPT-o1', model: 'o1-2024-12-17', maxTokens: 16384, temperature: 0.5, costPer1kTokens: 0.015, latencyMs: 3000, strengths: ['deep-reasoning', 'analysis', 'synthesis'] },
        ],
        secondary: [
            { id: 'claude-3.7-sonnet', name: 'Claude 3.7 Sonnet', model: 'claude-3-7-sonnet-20250219', maxTokens: 8192, temperature: 0.3, costPer1kTokens: 0.003, latencyMs: 1200, strengths: ['writing', 'structure'] },
        ],
        fallback: [
            { id: 'mistral-large', name: 'Mistral Large', model: 'mistral-large-2411', maxTokens: 8192, temperature: 0.4, costPer1kTokens: 0.002, latencyMs: 900, strengths: ['speed', 'factual'] },
        ],
    },
    reflectionCriteria: [
        { name: 'Source Quality', weight: 0.30, description: 'Reliability and diversity of sources', scoringGuide: '0-2: Unreliable, 3-5: Some good sources, 6-8: Diverse & reliable, 9-10: Authoritative' },
        { name: 'Comprehensiveness', weight: 0.25, description: 'Coverage of the topic', scoringGuide: '0-2: Shallow, 3-5: Basic coverage, 6-8: Thorough, 9-10: Exhaustive' },
        { name: 'Accuracy', weight: 0.20, description: 'Factual correctness', scoringGuide: '0-2: Errors, 3-5: Minor issues, 6-8: Accurate, 9-10: Verified' },
        { name: 'Synthesis', weight: 0.15, description: 'Quality of connecting insights', scoringGuide: '0-2: Disconnected, 3-5: Basic summary, 6-8: Well-connected, 9-10: Groundbreaking' },
        { name: 'Presentation', weight: 0.10, description: 'Clear and organized output', scoringGuide: '0-2: Chaotic, 3-5: Organized, 6-8: Professional, 9-10: Outstanding' },
    ],
    maxIterations: 3,
    confidenceThreshold: 0.92,
    sandboxEnabled: false,
    deploymentTarget: 'none',
    outputFormat: { type: 'report', extensions: ['.pdf', '.md', '.docx'], mimeType: 'application/pdf' },
    dagTemplate: {
        nodes: [
            { id: 'query', label: 'Query Planning', level: 0, type: 'input', agentRole: 'planner' },
            { id: 'search', label: 'Web Search', level: 1, type: 'process', agentRole: 'searcher' },
            { id: 'extract', label: 'Content Extraction', level: 2, type: 'process', agentRole: 'extractor' },
            { id: 'synthesize', label: 'Synthesis', level: 3, type: 'process', agentRole: 'synthesizer' },
            { id: 'report', label: 'Report Generation', level: 4, type: 'output', agentRole: 'reporter' },
        ],
        edges: [
            { from: 'query', to: 'search' },
            { from: 'search', to: 'extract' },
            { from: 'extract', to: 'synthesize' },
            { from: 'synthesize', to: 'report' },
        ],
    },
    rateLimit: { windowMs: 60000, maxRequests: 5, tier: 'pro' },
    moaConfig: {
        voting: {
            criteriaWeights: { quality: 0.45, costEfficiency: 0.25, speed: 0.3 },
            minConsensus: 0.65,
            deduplicationThreshold: 0.7,
        },
        rounds: [
            { round: 'propose', providerCount: 4, temperature: 0.3, strategy: 'all' },
            { round: 'critique', providerCount: 2, temperature: 0.2, strategy: 'top_n' },
            { round: 'refine', providerCount: 2, temperature: 0.3, strategy: 'top_n' },
        ],
        feedbackInjection: true,
    },
};
// EMAIL Agent Configuration
export const EMAIL_AGENT_CONFIG = {
    id: 'EMAIL',
    name: 'Communicant',
    description: 'Professional email composition and campaign management',
    icon: 'Mail',
    color: '#EC4899',
    systemPrompt: `You are AgentForge EMAIL, an elite email composition agent. You craft professional emails and manage campaigns.

RULES:
1. Match tone to audience and purpose
2. Subject lines must be compelling and clear
3. Keep emails concise and actionable
4. Include clear CTAs
5. Support A/B testing variants
6. Ensure CAN-SPAM compliance
7. Personalize with merge fields
8. Include plain text alternative`,
    llmPool: {
        primary: [
            { id: 'claude-3.7-sonnet', name: 'Claude 3.7 Sonnet', model: 'claude-3-7-sonnet-20250219', maxTokens: 4096, temperature: 0.5, costPer1kTokens: 0.003, latencyMs: 1200, strengths: ['writing', 'persuasion', 'tone'] },
            { id: 'gpt-4o', name: 'GPT-4o', model: 'gpt-4o-2024-11-20', maxTokens: 4096, temperature: 0.5, costPer1kTokens: 0.005, latencyMs: 1000, strengths: ['writing', 'personalization'] },
        ],
        secondary: [
            { id: 'mistral-large', name: 'Mistral Large', model: 'mistral-large-2411', maxTokens: 4096, temperature: 0.5, costPer1kTokens: 0.002, latencyMs: 900, strengths: ['multilingual', 'formal'] },
        ],
        fallback: [
            { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash', model: 'gemini-2.0-flash-001', maxTokens: 4096, temperature: 0.5, costPer1kTokens: 0.0001, latencyMs: 400, strengths: ['speed', 'drafts'] },
        ],
    },
    reflectionCriteria: [
        { name: 'Clarity', weight: 0.30, description: 'Clear and easy to understand', scoringGuide: '0-2: Confusing, 3-5: Understandable, 6-8: Crystal clear, 9-10: Perfect' },
        { name: 'Persuasion', weight: 0.25, description: 'Effectiveness at achieving goal', scoringGuide: '0-2: Weak, 3-5: Decent, 6-8: Convincing, 9-10: Irresistible' },
        { name: 'Tone Match', weight: 0.20, description: 'Appropriate tone for audience', scoringGuide: '0-2: Wrong tone, 3-5: Acceptable, 6-8: Well-matched, 9-10: Perfect' },
        { name: 'Actionability', weight: 0.15, description: 'Clear next steps for recipient', scoringGuide: '0-2: Vague, 3-5: Some direction, 6-8: Clear CTA, 9-10: Impossible to ignore' },
        { name: 'Conciseness', weight: 0.10, description: 'Says more with less', scoringGuide: '0-2: Verbose, 3-5: Adequate, 6-8: Tight, 9-10: Every word counts' },
    ],
    maxIterations: 2,
    confidenceThreshold: 0.88,
    sandboxEnabled: false,
    deploymentTarget: 'none',
    outputFormat: { type: 'email', extensions: ['.html', '.txt', '.json'], mimeType: 'text/html' },
    dagTemplate: {
        nodes: [
            { id: 'context', label: 'Context Analysis', level: 0, type: 'input', agentRole: 'analyzer' },
            { id: 'draft', label: 'Email Draft', level: 1, type: 'process', agentRole: 'writer' },
            { id: 'variants', label: 'A/B Variants', level: 2, type: 'process', agentRole: 'variant-generator' },
            { id: 'refine', label: 'Refinement', level: 3, type: 'output', agentRole: 'editor' },
        ],
        edges: [
            { from: 'context', to: 'draft' },
            { from: 'draft', to: 'variants' },
            { from: 'variants', to: 'refine' },
        ],
    },
    rateLimit: { windowMs: 60000, maxRequests: 15, tier: 'free' },
    moaConfig: {
        voting: {
            criteriaWeights: { quality: 0.4, costEfficiency: 0.3, speed: 0.3 },
            minConsensus: 0.6,
            deduplicationThreshold: 0.7,
        },
        rounds: [
            { round: 'propose', providerCount: 4, temperature: 0.5, strategy: 'all' },
            { round: 'critique', providerCount: 2, temperature: 0.2, strategy: 'top_n' },
            { round: 'refine', providerCount: 2, temperature: 0.3, strategy: 'top_n' },
        ],
        feedbackInjection: true,
    },
};
// MARKETING Agent Configuration
export const MARKETING_AGENT_CONFIG = {
    id: 'MARKETING',
    name: 'Marketeur',
    description: 'Marketing strategy, content, and campaign generation',
    icon: 'Megaphone',
    color: '#06B6D4',
    systemPrompt: `You are AgentForge MARKETING, an elite marketing agent. You create marketing strategies, content, and campaigns.

RULES:
1. Always start with target audience analysis
2. Define clear KPIs and success metrics
3. Create multi-channel strategies
4. Include SEO optimization for content
5. Support brand voice consistency
6. Generate content calendars
7. Include competitive analysis
8. Provide ROI projections`,
    llmPool: {
        primary: [
            { id: 'claude-3.7-sonnet', name: 'Claude 3.7 Sonnet', model: 'claude-3-7-sonnet-20250219', maxTokens: 8192, temperature: 0.5, costPer1kTokens: 0.003, latencyMs: 1200, strengths: ['strategy', 'copywriting', 'branding'] },
            { id: 'gpt-4o', name: 'GPT-4o', model: 'gpt-4o-2024-11-20', maxTokens: 8192, temperature: 0.5, costPer1kTokens: 0.005, latencyMs: 1000, strengths: ['content', 'seo', 'analytics'] },
        ],
        secondary: [
            { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro', model: 'gemini-2.5-pro-preview-05-06', maxTokens: 8192, temperature: 0.4, costPer1kTokens: 0.00125, latencyMs: 1500, strengths: ['research', 'trends', 'visual'] },
        ],
        fallback: [
            { id: 'mistral-large', name: 'Mistral Large', model: 'mistral-large-2411', maxTokens: 8192, temperature: 0.5, costPer1kTokens: 0.002, latencyMs: 900, strengths: ['multilingual', 'speed'] },
        ],
    },
    reflectionCriteria: [
        { name: 'Strategy Quality', weight: 0.30, description: 'Sound strategic thinking', scoringGuide: '0-2: No strategy, 3-5: Basic, 6-8: Well-thought-out, 9-10: Brilliant' },
        { name: 'Content Quality', weight: 0.25, description: 'Engaging and persuasive content', scoringGuide: '0-2: Boring, 3-5: Adequate, 6-8: Engaging, 9-10: Viral-worthy' },
        { name: 'Market Fit', weight: 0.20, description: 'Appropriate for target market', scoringGuide: '0-2: Off-target, 3-5: Decent fit, 6-8: Well-targeted, 9-10: Bullseye' },
        { name: 'Actionability', weight: 0.15, description: 'Clear implementation steps', scoringGuide: '0-2: Vague, 3-5: Some steps, 6-8: Clear plan, 9-10: Ready to execute' },
        { name: 'ROI Potential', weight: 0.10, description: 'Expected return on investment', scoringGuide: '0-2: Negative ROI, 3-5: Break-even, 6-8: Positive ROI, 9-10: Exceptional' },
    ],
    maxIterations: 2,
    confidenceThreshold: 0.88,
    sandboxEnabled: false,
    deploymentTarget: 'none',
    outputFormat: { type: 'campaign', extensions: ['.md', '.pdf', '.json'], mimeType: 'application/json' },
    dagTemplate: {
        nodes: [
            { id: 'analysis', label: 'Market Analysis', level: 0, type: 'input', agentRole: 'analyst' },
            { id: 'strategy', label: 'Strategy Design', level: 1, type: 'process', agentRole: 'strategist' },
            { id: 'content', label: 'Content Creation', level: 2, type: 'process', agentRole: 'creator' },
            { id: 'calendar', label: 'Campaign Calendar', level: 3, type: 'process', agentRole: 'planner' },
            { id: 'package', label: 'Campaign Package', level: 4, type: 'output', agentRole: 'packager' },
        ],
        edges: [
            { from: 'analysis', to: 'strategy' },
            { from: 'strategy', to: 'content' },
            { from: 'content', to: 'calendar' },
            { from: 'calendar', to: 'package' },
        ],
    },
    rateLimit: { windowMs: 60000, maxRequests: 5, tier: 'pro' },
    moaConfig: {
        voting: {
            criteriaWeights: { quality: 0.4, costEfficiency: 0.3, speed: 0.3 },
            minConsensus: 0.6,
            deduplicationThreshold: 0.7,
        },
        rounds: [
            { round: 'propose', providerCount: 4, temperature: 0.5, strategy: 'all' },
            { round: 'critique', providerCount: 2, temperature: 0.2, strategy: 'top_n' },
            { round: 'refine', providerCount: 2, temperature: 0.3, strategy: 'top_n' },
        ],
        feedbackInjection: true,
    },
};
// Complete Agent Registry
export const AGENT_REGISTRY = {
    DEV: DEV_AGENT_CONFIG,
    SLIDES: SLIDES_AGENT_CONFIG,
    DOC: DOC_AGENT_CONFIG,
    DATA: DATA_AGENT_CONFIG,
    RECHERCHE: RECHERCHE_AGENT_CONFIG,
    EMAIL: EMAIL_AGENT_CONFIG,
    MARKETING: MARKETING_AGENT_CONFIG,
};
export const ALL_AGENT_IDS = ['DEV', 'SLIDES', 'DOC', 'DATA', 'RECHERCHE', 'EMAIL', 'MARKETING'];
//# sourceMappingURL=agents.js.map