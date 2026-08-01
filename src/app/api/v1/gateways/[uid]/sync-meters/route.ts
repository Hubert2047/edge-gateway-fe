import { NextRequest } from 'next/server'
import { handleRoute } from '@/lib/api/route-handler'
import { serverApiFetch } from '@/lib/api/server'
import { GATEWAY_ENDPOINT } from '@/constances/url'

export async function PUT(_req: NextRequest, { params }: { params: Promise<{ uid: string }> }) {
    return handleRoute(async () => {
        const { uid } = await params
        return serverApiFetch(GATEWAY_ENDPOINT.syncMeter(uid), { method: 'PUT' })
    })
}
