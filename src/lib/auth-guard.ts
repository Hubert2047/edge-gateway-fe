import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { NextResponse } from 'next/server'
import { authOptions } from '@/lib/auth'
import { normalizeRole } from '@/lib/roles'

export async function requireAdmin() {
    const session = await getServerSession(authOptions)
    if (!session) redirect('/login')

    if (normalizeRole(session.user?.role) !== 'admin') {
        redirect('/overview')
    }

    return session
}

export async function requireAdminApi() {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ message: 'not authenticated' }, { status: 401 })
    if (normalizeRole(session.user?.role) !== 'admin') {
        return NextResponse.json({ message: 'admin access required' }, { status: 403 })
    }
    return null
}
