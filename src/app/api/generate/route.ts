import { NextRequest, NextResponse } from 'next/server';
import { generateSchema } from '@/lib/validations';
import { orchestrator } from '@/lib/services/orchestrator';
import { agentRegistry, type AgentType } from '@/lib/services/agent-registry';
import { db } from '@/lib/db';

async function ensureDefaultUser() {
  let user = await db.user.findUnique({ where: { id: 'default-user' } });
  if (!user) {
    user = await db.user.create({
      data: {
        id: 'default-user',
        email: 'default@agentforge.io',
        name: 'Default User',
        plan: 'pro',
      },
    });
  }
  return user;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = generateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { prompt, agentType, projectId, threshold } = parsed.data;

    // Validate agent type
    if (!agentRegistry.isValidType(agentType)) {
      return NextResponse.json(
        { error: 'Invalid agent type' },
        { status: 400 }
      );
    }

    // Ensure default user exists
    await ensureDefaultUser();

    // Run orchestration
    const result = await orchestrator.orchestrate(prompt, agentType as AgentType, {
      threshold,
    });

    // Save to database
    let sessionProjectId = projectId;

    // Create a default project if none specified
    if (!sessionProjectId) {
      const existingProject = await db.project.findFirst({
        where: { agentType, userId: 'default-user', status: 'active' },
        orderBy: { createdAt: 'desc' },
      });

      if (existingProject) {
        sessionProjectId = existingProject.id;
      } else {
        const agent = agentRegistry.getAgent(agentType as AgentType);
        const project = await db.project.create({
          data: {
            name: `${agent?.name || agentType} Project`,
            agentType,
            status: 'active',
            config: JSON.stringify({ threshold }),
            userId: 'default-user',
          },
        });
        sessionProjectId = project.id;
      }
    }

    await db.generationSession.create({
      data: {
        prompt,
        result: result.synthesis,
        qualityScore: result.confidence,
        modelUsed: result.modelUsed,
        costCents: result.costCents,
        durationMs: result.durationMs,
        projectId: sessionProjectId,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        taskId: result.taskId,
        synthesis: result.synthesis,
        confidence: result.confidence,
        costCents: result.costCents,
        durationMs: result.durationMs,
        modelUsed: result.modelUsed,
        reflectionScores: result.reflectionScores,
        autoFixLevel: result.autoFixLevel,
        autoFixesApplied: result.autoFixesApplied,
        subtasks: result.subtasks.map(st => ({
          id: st.id,
          type: st.type,
          model: st.model,
        })),
      },
    });
  } catch (error) {
    console.error('Generation error:', error);
    return NextResponse.json(
      { error: 'Generation failed', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
