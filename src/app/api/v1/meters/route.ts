import { NextRequest } from 'next/server'
import { handleRoute } from '@/lib/api/route-handler'
import { serverApiFetch } from '@/lib/api/server'
import type { Meter } from '@/types/meter'
import { METER_ENDPOINT } from '@/constances/url'


export async function GET() {
    return handleRoute(async () => {
        return serverApiFetch<Meter[]>(METER_ENDPOINT.base)
    })
}

export async function POST(req: NextRequest) {
    return handleRoute(async () => {
        const body = await req.json()
        return serverApiFetch<Meter>(METER_ENDPOINT.base, {
            method: 'POST',
            body: JSON.stringify(body),
        })
    })
}
