import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const missionSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  codename: z.string().min(2).max(20).regex(/^[A-Z0-9_-]+$/, 'Codename: uppercase letters, numbers, hyphens only'),
  description: z.string().optional(),
  status: z.enum(['PLANNING', 'ACTIVE', 'ON_HOLD', 'COMPLETED', 'ABORTED']).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
  launchDate: z.string().optional().nullable(),
  endDate: z.string().optional().nullable(),
  coverColor: z.string().optional(),
})

export async function GET(req: NextRequest) {
  try {
    const user = await getSession()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status')
    const priority = searchParams.get('priority')

    const missions = await prisma.mission.findMany({
      where: {
        AND: [
          {
            OR: [
              { ownerId: user.id },
              { members: { some: { userId: user.id } } },
            ],
          },
          ...(status ? [{ status }] : []),
          ...(priority ? [{ priority }] : []),
        ],
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
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ missions })
  } catch (error) {
    console.error('[MISSIONS GET]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getSession()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const parsed = missionSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const { launchDate, endDate, ...rest } = parsed.data

    const mission = await prisma.mission.create({
      data: {
        ...rest,
        launchDate: launchDate ? new Date(launchDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        ownerId: user.id,
        members: {
          create: { userId: user.id, role: 'DIRECTOR' },
        },
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
        action: 'CREATED',
        entity: 'MISSION',
        entityId: mission.id,
        details: `Mission "${mission.name}" created`,
        userId: user.id,
        missionId: mission.id,
      },
    })

    return NextResponse.json({ mission }, { status: 201 })
  } catch (error: any) {
    if (error?.code === 'P2002') {
      return NextResponse.json({ error: 'Codename already in use' }, { status: 409 })
    }
    console.error('[MISSIONS POST]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
