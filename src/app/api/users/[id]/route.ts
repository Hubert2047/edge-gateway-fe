import { USER_ENDPOINT } from '@/constances/url'
import { handleRoute } from '@/lib/api/route-handler'
import { serverApiFetch } from '@/lib/api/server'
import { requireAdminApi } from '@/lib/auth-guard'

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
