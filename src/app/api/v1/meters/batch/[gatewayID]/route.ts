import { NextRequest } from 'next/server'
import { handleRoute } from '@/lib/api/route-handler'
import { serverApiFetch } from '@/lib/api/server'
import { METER_ENDPOINT } from '@/constances/url'

export async function PUT(req: NextRequest, { params }: { params: Promise<{ gatewayID: string }> }) {
    return handleRoute(async () => {
        const { gatewayID } = await params
        const body = await req.json()
        return serverApiFetch(METER_ENDPOINT.batch(gatewayID), {
            method: 'PUT',
            body: JSON.stringify(body),
        })
    })
}
