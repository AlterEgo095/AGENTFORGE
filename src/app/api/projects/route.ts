import { NextRequest, NextResponse } from 'next/server';
import { createProjectSchema } from '@/lib/validations';
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

export async function GET() {
  try {
    await ensureDefaultUser();

    const projects = await db.project.findMany({
      where: { userId: 'default-user' },
      include: {
        sessions: {
          orderBy: { createdAt: 'desc' },
          take: 3,
        },
        _count: {
          select: { sessions: true },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    return NextResponse.json({
      success: true,
      data: projects,
    });
  } catch (error) {
    console.error('Projects fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch projects' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await ensureDefaultUser();

    const body = await request.json();
    const parsed = createProjectSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { name, agentType, config } = parsed.data;

    const project = await db.project.create({
      data: {
        name,
        agentType,
        status: 'active',
        config: JSON.stringify(config || {}),
        userId: 'default-user',
      },
    });

    return NextResponse.json({
      success: true,
      data: project,
    });
  } catch (error) {
    console.error('Project creation error:', error);
    return NextResponse.json(
      { error: 'Failed to create project' },
      { status: 500 }
    );
  }
}
