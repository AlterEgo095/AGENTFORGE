import ZAI from 'z-ai-web-dev-sdk';

export interface ReflectionResult {
  scores: { criterion: string; weight: number; score: number }[];
  overallScore: number;
  passed: boolean;
  feedback: string;
}

class ReflectionAgent {
  async evaluate(
    output: string,
    prompt: string,
    criteria: { name: string; weight: number }[],
    threshold: number = 0.95
  ): Promise<ReflectionResult> {
    const criteriaDescription = criteria
      .map(c => `${c.name} (weight: ${c.weight})`)
      .join(', ');

    const evaluationPrompt = `You are an expert quality evaluator for AI-generated content. Evaluate the following output based on these criteria: ${criteriaDescription}

ORIGINAL PROMPT:
${prompt}

GENERATED OUTPUT:
${output}

For each criterion, provide a score from 0.0 to 1.0. Then provide an overall assessment.

Respond in this EXACT JSON format:
{
  "scores": [${criteria.map(c => `{ "criterion": "${c.name}", "weight": ${c.weight}, "score": 0.0 }`).join(', ')}],
  "overallScore": 0.0,
  "feedback": "Brief feedback on strengths and areas for improvement"
}`;

    try {
      const zai = await ZAI.create();
      const completion = await zai.chat.completions.create({
        messages: [
          { role: 'system', content: 'You are an expert quality evaluator. Always respond with valid JSON only.' },
          { role: 'user', content: evaluationPrompt },
        ],
      });

      const content = completion.choices[0]?.message?.content || '';
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        return this.createDefaultResult(criteria, threshold);
      }

      const parsed = JSON.parse(jsonMatch[0]);
      const overallScore = parsed.overallScore ?? this.calculateWeightedScore(parsed.scores);

      return {
        scores: parsed.scores || criteria.map(c => ({ criterion: c.name, weight: c.weight, score: 0.7 })),
        overallScore,
        passed: overallScore >= threshold,
        feedback: parsed.feedback || 'Evaluation complete.',
      };
    } catch {
      return this.createDefaultResult(criteria, threshold);
    }
  }

  async synthesize(outputs: string[], prompt: string): Promise<string> {
    if (outputs.length === 0) return '';
    if (outputs.length === 1) return outputs[0];

    const synthesizePrompt = `You are an expert content synthesizer. Given the following multiple AI-generated outputs for the same prompt, create a single superior output that combines the best elements from each.

ORIGINAL PROMPT:
${prompt}

OUTPUTS TO SYNTHESIZE:
${outputs.map((o, i) => `--- Output ${i + 1} ---\n${o}`).join('\n\n')}

Create a single, polished output that takes the best from all versions:`;

    try {
      const zai = await ZAI.create();
      const completion = await zai.chat.completions.create({
        messages: [
          { role: 'system', content: 'You are an expert content synthesizer. Combine the best elements from multiple outputs.' },
          { role: 'user', content: synthesizePrompt },
        ],
      });

      return completion.choices[0]?.message?.content || outputs[0];
    } catch {
      return outputs[0];
    }
  }

  private calculateWeightedScore(scores: { criterion: string; weight: number; score: number }[]): number {
    const totalWeight = scores.reduce((sum, s) => sum + s.weight, 0);
    if (totalWeight === 0) return 0;
    return scores.reduce((sum, s) => sum + s.weight * s.score, 0) / totalWeight;
  }

  private createDefaultResult(
    criteria: { name: string; weight: number }[],
    threshold: number
  ): ReflectionResult {
    const scores = criteria.map(c => ({ criterion: c.name, weight: c.weight, score: 0.7 }));
    const overallScore = this.calculateWeightedScore(scores);
    return {
      scores,
      overallScore,
      passed: overallScore >= threshold,
      feedback: 'Evaluation completed with default scoring due to processing issue.',
    };
  }
}

export const reflectionAgent = new ReflectionAgent();
