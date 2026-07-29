import { NextRequest } from 'next/server'
import { handleRoute } from '@/lib/api/route-handler'
import { serverApiFetch } from '@/lib/api/server'
import { requireAdminApi } from '@/lib/auth-guard'
import type { AppUser } from '@/types/user'

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const denied = await requireAdminApi()
    if (denied) return denied
    const { id } = await params
    const body = await request.json()
    return handleRoute(() => serverApiFetch<AppUser>(`/api/users/${encodeURIComponent(id)}/username`, { method: 'PUT', body: JSON.stringify(body) }, { skipAuthRedirect: true }))
}
