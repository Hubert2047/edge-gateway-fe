import { getServerSession } from 'next-auth'
import { NextResponse } from 'next/server'
import { authOptions } from '@/lib/auth'

export async function POST() {
    const session = await getServerSession(authOptions)
    const accessToken = session?.accessToken

    if (typeof accessToken !== 'string' || !accessToken) {
        return NextResponse.json({ message: 'not authenticated' }, { status: 401 })
    }

    const response = await fetch(`${process.env.BACKEND_URL}/api/v1/logout`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}` },
        cache: 'no-store',
    })

    if (!response.ok) {
        return NextResponse.json({ message: 'backend logout failed' }, { status: response.status })
    }

    return NextResponse.json({ ok: true })
}
