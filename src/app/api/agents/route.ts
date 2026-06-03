import { NextResponse } from 'next/server';
import { agentRegistry } from '@/lib/services/agent-registry';
import { costOptimizer } from '@/lib/services/cost-optimizer';

export async function GET() {
  try {
    const agents = agentRegistry.listAgents();
    const models = costOptimizer.getAllModels();

    return NextResponse.json({
      success: true,
      data: agents.map(agent => ({
        ...agent,
        availableModels: models,
      })),
    });
  } catch (error) {
    console.error('Agents fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch agents' },
      { status: 500 }
    );
  }
}
