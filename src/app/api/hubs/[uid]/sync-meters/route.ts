import { NextRequest } from 'next/server'
import { handleRoute } from '@/lib/api/route-handler'
import { serverApiFetch } from '@/lib/api/server'

export async function PUT(
    _req: NextRequest,
    { params }: { params: Promise<{ uid: string }> }
) {
    return handleRoute(async () => {
        const { uid } = await params
        return serverApiFetch(`/api/hubs/${uid}/sync-meters`, { method: 'PUT' })
    })
}