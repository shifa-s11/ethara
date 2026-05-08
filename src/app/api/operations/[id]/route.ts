import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const updateSchema = z.object({
  title: z.string().min(2).optional(),
  description: z.string().optional().nullable(),
  status: z.enum(['QUEUED', 'IN_PROGRESS', 'REVIEW', 'COMPLETED', 'BLOCKED']).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
  type: z.enum(['GENERAL', 'RESEARCH', 'ENGINEERING', 'COMMS', 'MEDICAL']).optional(),
  dueDate: z.string().optional().nullable(),
  assigneeId: z.string().optional().nullable(),
})

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getSession()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    const operation = await prisma.operation.findUnique({
      where: { id },
      include: {
        mission: { select: { id: true, name: true, codename: true, coverColor: true } },
        assignee: { select: { id: true, name: true, email: true, avatar: true } },
        creator: { select: { id: true, name: true, email: true } },
        comments: {
          include: { author: { select: { id: true, name: true, avatar: true } } },
          orderBy: { createdAt: 'asc' },
        },
      },
    })

    if (!operation) return NextResponse.json({ error: 'Operation not found' }, { status: 404 })

    return NextResponse.json({ operation })
  } catch (error) {
    console.error('[OPERATION GET]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getSession()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    const operation = await prisma.operation.findUnique({
      where: { id },
      include: { mission: { include: { members: true } } },
    })
    if (!operation) return NextResponse.json({ error: 'Operation not found' }, { status: 404 })

    const member = operation.mission.members.find(m => m.userId === user.id)
    const isOwner = operation.mission.ownerId === user.id
    if (!member && !isOwner) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const role = isOwner ? 'DIRECTOR' : member!.role
    if (role === 'OBSERVER') {
      return NextResponse.json({ error: 'Observers cannot modify operations' }, { status: 403 })
    }

    const body = await req.json()
    const parsed = updateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const { dueDate, ...rest } = parsed.data
    const updated = await prisma.operation.update({
      where: { id },
      data: {
        ...rest,
        ...(dueDate !== undefined ? { dueDate: dueDate ? new Date(dueDate) : null } : {}),
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
        action: 'UPDATED',
        entity: 'OPERATION',
        entityId: id,
        details: `Operation "${updated.title}" updated`,
        userId: user.id,
        missionId: operation.missionId,
      },
    })

    return NextResponse.json({ operation: updated })
  } catch (error) {
    console.error('[OPERATION PATCH]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getSession()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    const operation = await prisma.operation.findUnique({
      where: { id },
      include: { mission: true },
    })
    if (!operation) return NextResponse.json({ error: 'Operation not found' }, { status: 404 })

    const isDirector =
      operation.mission.ownerId === user.id || operation.creatorId === user.id

    if (!isDirector) {
      return NextResponse.json({ error: 'Only Directors or creators can delete' }, { status: 403 })
    }

    await prisma.operation.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[OPERATION DELETE]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
