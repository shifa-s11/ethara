import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const memberSchema = z.object({
  email: z.string().email('Invalid email'),
  role: z.enum(['DIRECTOR', 'OPERATOR', 'OBSERVER']),
})

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getSession()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    const mission = await prisma.mission.findUnique({
      where: { id },
      include: { members: true },
    })
    if (!mission) return NextResponse.json({ error: 'Mission not found' }, { status: 404 })

    const isDirector =
      mission.ownerId === user.id ||
      mission.members.some(m => m.userId === user.id && m.role === 'DIRECTOR')

    if (!isDirector) {
      return NextResponse.json({ error: 'Only Directors can add members' }, { status: 403 })
    }

    const body = await req.json()
    const parsed = memberSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const targetUser = await prisma.user.findUnique({ where: { email: parsed.data.email } })
    if (!targetUser) return NextResponse.json({ error: 'User not found' }, { status: 404 })

    const existing = mission.members.find(m => m.userId === targetUser.id)
    if (existing) {
      return NextResponse.json({ error: 'User already a member' }, { status: 409 })
    }

    const member = await prisma.missionMember.create({
      data: { missionId: id, userId: targetUser.id, role: parsed.data.role },
      include: { user: { select: { id: true, name: true, email: true, avatar: true } } },
    })

    await prisma.activityLog.create({
      data: {
        action: 'MEMBER_ADDED',
        entity: 'MISSION',
        entityId: id,
        details: `${targetUser.name} added as ${parsed.data.role}`,
        userId: user.id,
        missionId: id,
      },
    })

    return NextResponse.json({ member }, { status: 201 })
  } catch (error) {
    console.error('[MEMBERS POST]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getSession()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    const { searchParams } = new URL(req.url)
    const memberId = searchParams.get('userId')
    if (!memberId) return NextResponse.json({ error: 'userId required' }, { status: 400 })

    const mission = await prisma.mission.findUnique({
      where: { id },
      include: { members: true },
    })
    if (!mission) return NextResponse.json({ error: 'Mission not found' }, { status: 404 })

    const isDirector =
      mission.ownerId === user.id ||
      mission.members.some(m => m.userId === user.id && m.role === 'DIRECTOR')

    if (!isDirector && user.id !== memberId) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    if (memberId === mission.ownerId) {
      return NextResponse.json({ error: 'Cannot remove mission owner' }, { status: 400 })
    }

    await prisma.missionMember.deleteMany({
      where: { missionId: id, userId: memberId },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[MEMBERS DELETE]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
