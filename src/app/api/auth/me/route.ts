import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const user = await getSession()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json({ user })
  } catch (error) {
    console.error('[ME]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE() {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('axiom_session')?.value

    if (token) {
      await prisma.session.deleteMany({ where: { token } })
      cookieStore.delete('axiom_session')
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[LOGOUT]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
