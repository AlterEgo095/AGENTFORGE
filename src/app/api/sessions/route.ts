import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const limit = parseInt(searchParams.get('limit') || '50');

    if (projectId) {
      const sessions = await db.generationSession.findMany({
        where: { projectId },
        orderBy: { createdAt: 'desc' },
        take: limit,
      });

      return NextResponse.json({
        success: true,
        data: sessions,
      });
    }

    // Get all recent sessions
    const sessions = await db.generationSession.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        project: {
          select: { name: true, agentType: true },
        },
      },
    });

    // Get analytics
    const totalGenerations = await db.generationSession.count();
    const avgQuality = await db.generationSession.aggregate({
      _avg: { qualityScore: true },
    });
    const totalCost = await db.generationSession.aggregate({
      _sum: { costCents: true },
    });
    const avgDuration = await db.generationSession.aggregate({
      _avg: { durationMs: true },
    });

    return NextResponse.json({
      success: true,
      data: sessions,
      analytics: {
        totalGenerations,
        avgQualityScore: avgQuality._avg.qualityScore || 0,
        totalCostCents: totalCost._sum.costCents || 0,
        avgDurationMs: avgDuration._avg.durationMs || 0,
      },
    });
  } catch (error) {
    console.error('Sessions fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch sessions' },
      { status: 500 }
    );
  }
}
