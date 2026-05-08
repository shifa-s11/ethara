import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const updateSchema = z.object({
  name: z.string().min(2).optional(),
  description: z.string().optional().nullable(),
  status: z.enum(['PLANNING', 'ACTIVE', 'ON_HOLD', 'COMPLETED', 'ABORTED']).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
  launchDate: z.string().optional().nullable(),
  endDate: z.string().optional().nullable(),
  coverColor: z.string().optional(),
})

async function getMissionAndCheckAccess(missionId: string, userId: string) {
  const mission = await prisma.mission.findUnique({
    where: { id: missionId },
    include: {
      members: true,
      owner: { select: { id: true, name: true, email: true, avatar: true } },
    },
  })
  if (!mission) return { mission: null, role: null }

  const isOwner = mission.ownerId === userId
  const member = mission.members.find(m => m.userId === userId)
  const role = isOwner ? 'DIRECTOR' : member?.role || null

  if (!role) return { mission: null, role: null }

  return { mission, role }
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getSession()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    const { mission, role } = await getMissionAndCheckAccess(id, user.id)
    if (!mission) return NextResponse.json({ error: 'Mission not found' }, { status: 404 })

    const fullMission = await prisma.mission.findUnique({
      where: { id },
      include: {
        owner: { select: { id: true, name: true, email: true, avatar: true } },
        members: {
          include: {
            user: { select: { id: true, name: true, email: true, avatar: true } },
          },
        },
        operations: {
          include: {
            assignee: { select: { id: true, name: true, email: true, avatar: true } },
            creator: { select: { id: true, name: true, email: true } },
            _count: { select: { comments: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
        activityLogs: {
          include: {
            user: { select: { id: true, name: true } },
          },
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
      },
    })

    return NextResponse.json({ mission: fullMission, userRole: role })
  } catch (error) {
    console.error('[MISSION GET]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getSession()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    const { mission, role } = await getMissionAndCheckAccess(id, user.id)
    if (!mission) return NextResponse.json({ error: 'Mission not found' }, { status: 404 })

    if (role === 'OBSERVER') {
      return NextResponse.json({ error: 'Observers cannot modify missions' }, { status: 403 })
    }

    const body = await req.json()
    const parsed = updateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const { launchDate, endDate, ...rest } = parsed.data

    const updated = await prisma.mission.update({
      where: { id },
      data: {
        ...rest,
        ...(launchDate !== undefined ? { launchDate: launchDate ? new Date(launchDate) : null } : {}),
        ...(endDate !== undefined ? { endDate: endDate ? new Date(endDate) : null } : {}),
      },
      include: {
        owner: { select: { id: true, name: true, email: true, avatar: true } },
        members: {
          include: {
            user: { select: { id: true, name: true, email: true, avatar: true } },
          },
        },
        _count: { select: { operations: true } },
      },
    })

    await prisma.activityLog.create({
      data: {
        action: 'UPDATED',
        entity: 'MISSION',
        entityId: id,
        details: `Mission updated by ${user.name}`,
        userId: user.id,
        missionId: id,
      },
    })

    return NextResponse.json({ mission: updated })
  } catch (error) {
    console.error('[MISSION PATCH]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getSession()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    const mission = await prisma.mission.findUnique({ where: { id } })
    if (!mission) return NextResponse.json({ error: 'Mission not found' }, { status: 404 })

    if (mission.ownerId !== user.id) {
      return NextResponse.json({ error: 'Only the Mission Director can delete' }, { status: 403 })
    }

    await prisma.mission.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[MISSION DELETE]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
