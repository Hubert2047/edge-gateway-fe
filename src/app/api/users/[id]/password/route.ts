import { NextRequest } from 'next/server'
import { handleRoute } from '@/lib/api/route-handler'
import { serverApiFetch } from '@/lib/api/server'
import { requireAdminApi } from '@/lib/auth-guard'
import { USER_ENDPOINT } from '@/constances/url'

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const denied = await requireAdminApi()
    if (denied) return denied
    const { id } = await params
    const body = await request.json()
    return handleRoute(() =>
        serverApiFetch<void>(
            USER_ENDPOINT.resetPass(id),
            { method: 'PUT', body: JSON.stringify(body) },
            { skipAuthRedirect: true },
        ),
    )
}
