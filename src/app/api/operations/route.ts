import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const operationSchema = z.object({
  title: z.string().min(2, 'Title must be at least 2 characters'),
  description: z.string().optional().nullable(),
  status: z.enum(['QUEUED', 'IN_PROGRESS', 'REVIEW', 'COMPLETED', 'BLOCKED']).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
  type: z.enum(['GENERAL', 'RESEARCH', 'ENGINEERING', 'COMMS', 'MEDICAL']).optional(),
  dueDate: z.string().optional().nullable(),
  assigneeId: z.string().optional().nullable(),
  missionId: z.string().min(1, 'Mission ID required'),
})

export async function GET(req: NextRequest) {
  try {
    const user = await getSession()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const missionId = searchParams.get('missionId')
    const status = searchParams.get('status')
    const assigneeId = searchParams.get('assigneeId')
    const overdue = searchParams.get('overdue')

    const where: any = {
      mission: {
        OR: [
          { ownerId: user.id },
          { members: { some: { userId: user.id } } },
        ],
      },
      ...(missionId ? { missionId } : {}),
      ...(status ? { status } : {}),
      ...(assigneeId ? { assigneeId } : {}),
      ...(overdue === 'true' ? {
        dueDate: { lt: new Date() },
        status: { notIn: ['COMPLETED'] },
      } : {}),
    }

    const operations = await prisma.operation.findMany({
      where,
      include: {
        mission: { select: { id: true, name: true, codename: true, coverColor: true } },
        assignee: { select: { id: true, name: true, email: true, avatar: true } },
        creator: { select: { id: true, name: true, email: true } },
        _count: { select: { comments: true } },
      },
      orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
    })

    return NextResponse.json({ operations })
  } catch (error) {
    console.error('[OPERATIONS GET]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getSession()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const parsed = operationSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const { dueDate, ...rest } = parsed.data

    // Check user is member of mission
    const member = await prisma.missionMember.findFirst({
      where: { missionId: parsed.data.missionId, userId: user.id },
    })
    const mission = await prisma.mission.findFirst({
      where: { id: parsed.data.missionId, ownerId: user.id },
    })
    if (!member && !mission) {
      return NextResponse.json({ error: 'Not a mission member' }, { status: 403 })
    }

    const role = mission ? 'DIRECTOR' : member!.role
    if (role === 'OBSERVER') {
      return NextResponse.json({ error: 'Observers cannot create operations' }, { status: 403 })
    }

    const operation = await prisma.operation.create({
      data: {
        ...rest,
        dueDate: dueDate ? new Date(dueDate) : null,
        creatorId: user.id,
      },
      include: {
        mission: { select: { id: true, name: true, codename: true, coverColor: true } },
        assignee: { select: { id: true, name: true, email: true, avatar: true } },
        creator: { select: { id: true, name: true, email: true } },
        _count: { select: { comments: true } },
      },
    })

    await prisma.activityLog.create({
      data: {
        action: 'CREATED',
        entity: 'OPERATION',
        entityId: operation.id,
        details: `Operation "${operation.title}" created`,
        userId: user.id,
        missionId: parsed.data.missionId,
      },
    })

    return NextResponse.json({ operation }, { status: 201 })
  } catch (error) {
    console.error('[OPERATIONS POST]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
