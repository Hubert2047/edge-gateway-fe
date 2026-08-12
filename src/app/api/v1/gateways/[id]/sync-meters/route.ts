import { NextRequest } from 'next/server'
import { handleRoute } from '@/lib/api/route-handler'
import { serverApiFetch } from '@/lib/api/server'
import { GATEWAY_ENDPOINT } from '@/constances/url'

export async function PUT(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    return handleRoute(async () => {
        const { id } = await params
        return serverApiFetch(GATEWAY_ENDPOINT.syncMeter(id), { method: 'PUT' })
    })
}
