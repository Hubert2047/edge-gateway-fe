import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
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
