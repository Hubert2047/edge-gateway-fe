import { NextRequest } from 'next/server'
import { handleRoute } from '@/lib/api/route-handler'
import { serverApiFetch } from '@/lib/api/server'
import { requireAdminApi } from '@/lib/auth-guard'

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const denied = await requireAdminApi()
    if (denied) return denied
    const { id } = await params
    const body = await request.json()
    return handleRoute(() => serverApiFetch<void>(`/api/users/${encodeURIComponent(id)}/password`, { method: 'PUT', body: JSON.stringify(body) }, { skipAuthRedirect: true }))
}
