import { USER_ENDPOINT } from '@/constances/url'
import { handleRoute } from '@/lib/api/route-handler'
import { serverApiFetch } from '@/lib/api/server'
import { requireAdminApi } from '@/lib/auth-guard'
import { AppUser } from '@/types/user'
import { NextRequest } from 'next/server'


export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    return handleRoute(async () => {
        const { id } = await params
        const body = await request.json()
        return serverApiFetch<AppUser>(`${USER_ENDPOINT.base}/${id}`, {
            method: 'PUT',
            body: JSON.stringify(body),
        })
    })
}
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
    const denied = await requireAdminApi()
    if (denied) return denied
    const { id } = await params
    return handleRoute(() =>
        serverApiFetch<void>(
            `${USER_ENDPOINT.base}/${encodeURIComponent(id)}`,
            { method: 'DELETE' },
            { skipAuthRedirect: true },
        ),
    )
}
