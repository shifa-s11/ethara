import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import bcrypt from 'bcryptjs'

const connectionString = process.env.DATABASE_URL

if (!connectionString) {
  throw new Error('DATABASE_URL is not set')
}

const adapter = new PrismaPg({ connectionString })
const prisma = new PrismaClient({ adapter })

async function main() {
  console.log('🌱 Seeding database...')

  // Clear existing data
  await prisma.activityLog.deleteMany()
  await prisma.comment.deleteMany()
  await prisma.operation.deleteMany()
  await prisma.missionMember.deleteMany()
  await prisma.mission.deleteMany()
  await prisma.session.deleteMany()
  await prisma.user.deleteMany()

  const password = await bcrypt.hash('password123', 12)

  // Create users
  const [alice, bob, carol] = await Promise.all([
    prisma.user.create({ data: { name: 'Alice Chen', email: 'alice@axiom.io', password } }),
    prisma.user.create({ data: { name: 'Bob Martinez', email: 'bob@axiom.io', password } }),
    prisma.user.create({ data: { name: 'Carol Osei', email: 'carol@axiom.io', password } }),
  ])

  // Create missions
  const m1 = await prisma.mission.create({
    data: {
      name: 'Deep Space Relay Alpha',
      codename: 'DSR-ALPHA',
      description: 'Establish long-range communication relays beyond the heliopause.',
      status: 'ACTIVE',
      priority: 'HIGH',
      coverColor: '#6366f1',
      launchDate: new Date('2026-01-15'),
      endDate: new Date('2026-12-31'),
      ownerId: alice.id,
      members: {
        create: [
          { userId: alice.id, role: 'DIRECTOR' },
          { userId: bob.id,   role: 'OPERATOR' },
          { userId: carol.id, role: 'OBSERVER' },
        ],
      },
    },
  })

  const m2 = await prisma.mission.create({
    data: {
      name: 'Europa Subsurface Survey',
      codename: 'EUROPA-SS',
      description: 'Subsurface ocean mapping mission to detect biosignatures.',
      status: 'PLANNING',
      priority: 'CRITICAL',
      coverColor: '#22d3ee',
      ownerId: bob.id,
      members: {
        create: [
          { userId: bob.id,   role: 'DIRECTOR' },
          { userId: alice.id, role: 'OPERATOR' },
        ],
      },
    },
  })

  const m3 = await prisma.mission.create({
    data: {
      name: 'Titan Atmospheric Probe',
      codename: 'TITAN-AP1',
      description: 'Deploy atmospheric sampling drones into Titan\'s hydrocarbon lakes.',
      status: 'ON_HOLD',
      priority: 'MEDIUM',
      coverColor: '#f59e0b',
      ownerId: carol.id,
      members: {
        create: [{ userId: carol.id, role: 'DIRECTOR' }],
      },
    },
  })

  // Create operations
  const ops = [
    { title:'Deploy relay satellite array',   status:'COMPLETED', priority:'HIGH',     type:'ENGINEERING', missionId: m1.id, creatorId: alice.id, assigneeId: bob.id,   dueDate: new Date('2026-03-01') },
    { title:'Calibrate quantum comms array',   status:'IN_PROGRESS',priority:'HIGH',    type:'ENGINEERING', missionId: m1.id, creatorId: alice.id, assigneeId: bob.id,   dueDate: new Date('2026-06-01') },
    { title:'Transmit signal test to Earth',   status:'QUEUED',    priority:'MEDIUM',   type:'COMMS',       missionId: m1.id, creatorId: bob.id,   assigneeId: bob.id,   dueDate: new Date('2026-07-15') },
    { title:'Review mission telemetry logs',   status:'QUEUED',    priority:'LOW',      type:'RESEARCH',    missionId: m1.id, creatorId: alice.id, assigneeId: carol.id, dueDate: new Date('2026-05-01') },
    { title:'Ice penetrating radar deployment',status:'QUEUED',    priority:'CRITICAL', type:'ENGINEERING', missionId: m2.id, creatorId: bob.id,   assigneeId: alice.id, dueDate: new Date('2027-01-01') },
    { title:'Biosignature sample analysis',    status:'QUEUED',    priority:'HIGH',     type:'RESEARCH',    missionId: m2.id, creatorId: bob.id,   assigneeId: bob.id,   dueDate: new Date('2027-06-01') },
    { title:'Hydrocarbon lake surface scan',   status:'BLOCKED',   priority:'HIGH',     type:'RESEARCH',    missionId: m3.id, creatorId: carol.id, assigneeId: carol.id, dueDate: new Date('2026-04-01') },
  ]

  await prisma.operation.createMany({ data: ops })

  // Activity logs
  await prisma.activityLog.createMany({
    data: [
      { action:'CREATED', entity:'MISSION', entityId: m1.id, details:'Mission "Deep Space Relay Alpha" created', userId: alice.id, missionId: m1.id },
      { action:'MEMBER_ADDED', entity:'MISSION', entityId: m1.id, details:'Bob Martinez added as OPERATOR', userId: alice.id, missionId: m1.id },
      { action:'UPDATED', entity:'MISSION', entityId: m1.id, details:'Mission status changed to ACTIVE', userId: alice.id, missionId: m1.id },
      { action:'CREATED', entity:'MISSION', entityId: m2.id, details:'Mission "Europa Subsurface Survey" created', userId: bob.id, missionId: m2.id },
      { action:'CREATED', entity:'MISSION', entityId: m3.id, details:'Mission "Titan Atmospheric Probe" created', userId: carol.id, missionId: m3.id },
    ],
  })

  console.log('✅ Seed complete!')
  console.log('📧 Login: alice@axiom.io / bob@axiom.io / carol@axiom.io')
  console.log('🔑 Password: password123')
}

main().catch(e => { console.error(e); process.exit(1) }).finally(() => prisma.$disconnect())
