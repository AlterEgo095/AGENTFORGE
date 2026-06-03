export interface ModelDefinition {
  id: string;
  name: string;
  costPer1kTokens: number; // in cents
  qualityScore: number; // 0-1
  speedScore: number; // 0-1
  specializations: string[];
}

const MODELS: ModelDefinition[] = [
  {
    id: 'gpt-4o',
    name: 'GPT-4o',
    costPer1kTokens: 2.5,
    qualityScore: 0.92,
    speedScore: 0.75,
    specializations: ['code', 'content', 'analysis', 'design'],
  },
  {
    id: 'gpt-4o-mini',
    name: 'GPT-4o Mini',
    costPer1kTokens: 0.15,
    qualityScore: 0.78,
    speedScore: 0.95,
    specializations: ['content', 'search', 'refinement'],
  },
  {
    id: 'claude-sonnet',
    name: 'Claude Sonnet',
    costPer1kTokens: 3.0,
    qualityScore: 0.94,
    speedScore: 0.70,
    specializations: ['code', 'content', 'analysis'],
  },
  {
    id: 'claude-haiku',
    name: 'Claude Haiku',
    costPer1kTokens: 0.25,
    qualityScore: 0.80,
    speedScore: 0.93,
    specializations: ['content', 'search', 'refinement'],
  },
  {
    id: 'gemini-pro',
    name: 'Gemini Pro',
    costPer1kTokens: 1.25,
    qualityScore: 0.88,
    speedScore: 0.82,
    specializations: ['code', 'analysis', 'design'],
  },
  {
    id: 'gemini-flash',
    name: 'Gemini Flash',
    costPer1kTokens: 0.075,
    qualityScore: 0.76,
    speedScore: 0.97,
    specializations: ['search', 'refinement', 'content'],
  },
  {
    id: 'llama-70b',
    name: 'Llama 3 70B',
    costPer1kTokens: 0.60,
    qualityScore: 0.84,
    speedScore: 0.85,
    specializations: ['code', 'content'],
  },
  {
    id: 'mistral-large',
    name: 'Mistral Large',
    costPer1kTokens: 2.0,
    qualityScore: 0.89,
    speedScore: 0.78,
    specializations: ['code', 'content', 'analysis'],
  },
  {
    id: 'qwen-max',
    name: 'Qwen Max',
    costPer1kTokens: 1.5,
    qualityScore: 0.87,
    speedScore: 0.80,
    specializations: ['content', 'analysis', 'search'],
  },
];

class CostOptimizer {
  private models: ModelDefinition[];

  constructor() {
    this.models = MODELS;
  }

  getAllModels(): ModelDefinition[] {
    return [...this.models];
  }

  score(model: ModelDefinition): number {
    const maxCost = Math.max(...this.models.map(m => m.costPer1kTokens));
    const maxTime = 1; // speed is already normalized
    return (
      model.qualityScore * 0.5 +
      (1 - model.costPer1kTokens / maxCost) * 0.3 +
      (1 - model.speedScore / maxTime) * 0.2
    );
  }

  selectModel(taskType: string, priority: 'quality' | 'cost' | 'speed' = 'quality'): ModelDefinition {
    const candidates = this.models.filter(m =>
      m.specializations.includes(taskType)
    );

    if (candidates.length === 0) {
      return this.models[0];
    }

    switch (priority) {
      case 'quality':
        return candidates.sort((a, b) => b.qualityScore - a.qualityScore)[0];
      case 'cost':
        return candidates.sort((a, b) => a.costPer1kTokens - b.costPer1kTokens)[0];
      case 'speed':
        return candidates.sort((a, b) => b.speedScore - a.speedScore)[0];
      default: {
        // Use weighted score
        return candidates.sort((a, b) => this.score(b) - this.score(a))[0];
      }
    }
  }

  selectModelsForTask(taskType: string, count: number = 3): ModelDefinition[] {
    const candidates = this.models.filter(m =>
      m.specializations.includes(taskType)
    );

    return candidates
      .sort((a, b) => this.score(b) - this.score(a))
      .slice(0, count);
  }

  estimateCost(modelId: string, inputTokens: number, outputTokens: number): number {
    const model = this.models.find(m => m.id === modelId);
    if (!model) return 0;
    return ((inputTokens + outputTokens) / 1000) * model.costPer1kTokens;
  }
}

export const costOptimizer = new CostOptimizer();
