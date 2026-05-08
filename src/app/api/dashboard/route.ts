import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(_req: NextRequest) {
  try {
    const user = await getSession()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const now = new Date()

    // Missions the user is part of
    const userMissions = await prisma.mission.findMany({
      where: {
        OR: [
          { ownerId: user.id },
          { members: { some: { userId: user.id } } },
        ],
      },
      select: { id: true },
    })
    const missionIds = userMissions.map(m => m.id)

    const [
      totalMissions,
      activeMissions,
      totalOperations,
      completedOperations,
      overdueOperations,
      criticalOperations,
      missionsByStatus,
      operationsByStatus,
      recentActivity,
      myAssignedOps,
    ] = await Promise.all([
      prisma.mission.count({ where: { id: { in: missionIds } } }),
      prisma.mission.count({ where: { id: { in: missionIds }, status: 'ACTIVE' } }),
      prisma.operation.count({ where: { missionId: { in: missionIds } } }),
      prisma.operation.count({ where: { missionId: { in: missionIds }, status: 'COMPLETED' } }),
      prisma.operation.count({
        where: {
          missionId: { in: missionIds },
          dueDate: { lt: now },
          status: { notIn: ['COMPLETED'] },
        },
      }),
      prisma.operation.count({
        where: {
          missionId: { in: missionIds },
          priority: 'CRITICAL',
          status: { notIn: ['COMPLETED'] },
        },
      }),
      prisma.mission.groupBy({
        by: ['status'],
        where: { id: { in: missionIds } },
        _count: { _all: true },
      }),
      prisma.operation.groupBy({
        by: ['status'],
        where: { missionId: { in: missionIds } },
        _count: { _all: true },
      }),
      prisma.activityLog.findMany({
        where: { missionId: { in: missionIds } },
        include: { user: { select: { name: true } } },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
      prisma.operation.findMany({
        where: { assigneeId: user.id, status: { notIn: ['COMPLETED'] } },
        include: {
          mission: { select: { name: true, codename: true, coverColor: true } },
        },
        orderBy: [{ priority: 'desc' }, { dueDate: 'asc' }],
        take: 5,
      }),
    ])

    const completionRate = totalOperations > 0
      ? Math.round((completedOperations / totalOperations) * 100)
      : 0

    return NextResponse.json({
      metrics: {
        totalMissions,
        activeMissions,
        totalOperations,
        completedOperations,
        overdueOperations,
        criticalOperations,
        completionRate,
      },
      charts: {
        missionsByStatus: missionsByStatus.map(s => ({ status: s.status, count: s._count._all })),
        operationsByStatus: operationsByStatus.map(s => ({ status: s.status, count: s._count._all })),
      },
      recentActivity,
      myAssignedOps,
    })
  } catch (error) {
    console.error('[DASHBOARD]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
