import ZAI from 'z-ai-web-dev-sdk';
import { agentRegistry, type AgentType } from './agent-registry';
import { costOptimizer } from './cost-optimizer';
import { cacheManager } from './cache';
import { reflectionAgent } from './reflection';
import { autoFixEngine } from './autofix';

export interface SubTask {
  id: string;
  type: 'code' | 'content' | 'design' | 'analysis' | 'search' | 'refinement';
  prompt: string;
  model: string;
  context?: string;
}

export interface OrchestrationResult {
  taskId: string;
  subtasks: SubTask[];
  results: Record<string, string>;
  synthesis: string;
  confidence: number;
  costCents: number;
  durationMs: number;
  modelUsed: string;
  reflectionScores?: { criterion: string; weight: number; score: number }[];
  autoFixLevel?: number;
  autoFixesApplied?: string[];
}

async function callLLM(systemPrompt: string, userPrompt: string): Promise<string> {
  const zai = await ZAI.create();
  const completion = await zai.chat.completions.create({
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
  });
  return completion.choices[0]?.message?.content || '';
}

class SuperAgentOrchestrator {
  /**
   * Decompose a task into subtasks using LLM
   */
  private async decomposeTask(prompt: string, agentType: AgentType): Promise<SubTask[]> {
    const agent = agentRegistry.getAgent(agentType);
    if (!agent) {
      return [{
        id: 'main',
        type: 'content',
        prompt,
        model: 'default',
      }];
    }

    const taskTypes = agent.modelRouting.map(r => r.taskType);

    const decompositionPrompt = `You are an AI task decomposition expert. Given the following user request for a ${agent.name}, break it down into 2-4 subtasks.

AGENT TYPE: ${agentType}
AVAILABLE TASK TYPES: ${taskTypes.join(', ')}

USER REQUEST:
${prompt}

Respond in this EXACT JSON format only:
{
  "subtasks": [
    { "id": "subtask-1", "type": "one of: ${taskTypes.join(', ')}", "prompt": "specific instruction for this subtask" },
    { "id": "subtask-2", "type": "one of: ${taskTypes.join(', ')}", "prompt": "specific instruction for this subtask" }
  ]
}`;

    try {
      const response = await callLLM(
        'You are a task decomposition expert. Always respond with valid JSON only.',
        decompositionPrompt
      );

      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        return this.createDefaultSubtasks(prompt, agentType);
      }

      const parsed = JSON.parse(jsonMatch[0]);
      if (parsed.subtasks && Array.isArray(parsed.subtasks)) {
        return parsed.subtasks.map((st: { id?: string; type?: string; prompt?: string }, i: number) => ({
          id: st.id || `subtask-${i + 1}`,
          type: (taskTypes.includes(st.type || '') ? st.type : taskTypes[0]) as SubTask['type'],
          prompt: st.prompt || prompt,
          model: this.selectModelForTask(agentType, st.type || taskTypes[0]),
        }));
      }
    } catch {
      // Fall through to default
    }

    return this.createDefaultSubtasks(prompt, agentType);
  }

  private createDefaultSubtasks(prompt: string, agentType: AgentType): SubTask[] {
    const agent = agentRegistry.getAgent(agentType);
    const taskType = agent?.modelRouting[0]?.taskType || 'content';
    return [
      {
        id: 'subtask-1',
        type: taskType as SubTask['type'],
        prompt,
        model: this.selectModelForTask(agentType, taskType),
      },
    ];
  }

  private selectModelForTask(agentType: AgentType, taskType: string): string {
    const agent = agentRegistry.getAgent(agentType);
    if (!agent) return 'default';

    const routing = agent.modelRouting.find(r => r.taskType === taskType);
    if (routing && routing.models.length > 0) {
      const model = costOptimizer.selectModel(taskType, routing.priority);
      return model.id;
    }

    const model = costOptimizer.selectModel(taskType, 'quality');
    return model.id;
  }

  /**
   * Execute the full MoA orchestration pipeline
   */
  async orchestrate(
    prompt: string,
    agentType: AgentType,
    options?: { threshold?: number }
  ): Promise<OrchestrationResult> {
    const startTime = Date.now();
    const agent = agentRegistry.getAgent(agentType);
    const threshold = options?.threshold ?? agent?.threshold ?? 0.90;

    // Check cache first
    const cacheKey = `${agentType}:${threshold}`;
    const cached = cacheManager.get<string>(prompt, cacheKey);
    if (cached) {
      return {
        taskId: `cached-${Date.now()}`,
        subtasks: [],
        results: {},
        synthesis: cached,
        confidence: 1.0,
        costCents: 0,
        durationMs: Date.now() - startTime,
        modelUsed: 'cache',
      };
    }

    // Step 1: Decompose task
    const subtasks = await this.decomposeTask(prompt, agentType);

    // Step 2: Execute main generation (simplified MoA — we make one high-quality call)
    const agentConfig = agentRegistry.getAgent(agentType);
    const systemPrompt = this.buildSystemPrompt(agentType, agentConfig);

    let result = await callLLM(systemPrompt, prompt);
    let totalCostCents = 5; // Base cost estimation in cents

    // Store all subtask results
    const results: Record<string, string> = {};
    for (const subtask of subtasks) {
      results[subtask.id] = result;
    }

    // Step 3: Run reflection
    const criteria = agent?.reflectionCriteria || [
      { name: 'Quality', weight: 0.5 },
      { name: 'Relevance', weight: 0.3 },
      { name: 'Completeness', weight: 0.2 },
    ];

    const reflection = await reflectionAgent.evaluate(result, prompt, criteria, threshold);
    totalCostCents += 3; // Reflection cost estimation

    // Step 4: Auto-fix if below threshold
    let autoFixLevel = 0;
    let autoFixesApplied: string[] = [];

    if (!reflection.passed) {
      const fixResult = await autoFixEngine.autoFix(result, prompt);
      if (fixResult.fixed) {
        result = fixResult.output;
        autoFixLevel = fixResult.level;
        autoFixesApplied = fixResult.fixesApplied;
        totalCostCents += autoFixLevel === 3 ? 4 : 1;
      }
    }

    // Cache the result
    cacheManager.set(prompt, cacheKey, result);

    const durationMs = Date.now() - startTime;

    return {
      taskId: `task-${Date.now()}`,
      subtasks,
      results,
      synthesis: result,
      confidence: reflection.overallScore,
      costCents: totalCostCents,
      durationMs,
      modelUsed: subtasks[0]?.model || 'default',
      reflectionScores: reflection.scores,
      autoFixLevel,
      autoFixesApplied,
    };
  }

  private buildSystemPrompt(agentType: AgentType, agentConfig?: ReturnType<typeof agentRegistry.getAgent>): string {
    const basePrompt = 'You are AgentForge, an expert AI assistant.';
    const agentDescriptions: Record<string, string> = {
      DEV: 'You are an expert full-stack developer. Generate production-ready, clean, well-documented code. Follow best practices for the requested language/framework.',
      SLIDES: 'You are an expert presentation designer. Create compelling slide content with clear structure, visual descriptions, and engaging narratives.',
      DOC: 'You are an expert technical writer. Generate clear, comprehensive, and well-structured documentation with proper formatting and examples.',
      DATA: 'You are an expert data analyst. Provide thorough analysis with statistical rigor, clear visualizations descriptions, and actionable insights.',
      RESEARCH: 'You are an expert research analyst. Conduct comprehensive research with factual accuracy, multiple perspectives, and well-cited sources.',
      EMAIL: 'You are an expert email copywriter. Create compelling, professional emails with appropriate tone, clear calls-to-action, and personalization.',
      MARKETING: 'You are an expert marketing strategist. Create engaging marketing content with brand alignment, SEO optimization, and conversion focus.',
    };

    return agentDescriptions[agentType] || basePrompt;
  }
}

export const orchestrator = new SuperAgentOrchestrator();
