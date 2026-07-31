import { NextRequest } from 'next/server'
import { handleRoute } from '@/lib/api/route-handler'
import { serverApiFetch } from '@/lib/api/server'
import type { Meter } from '@/types/meter'

export async function POST(req: NextRequest) {
    return handleRoute(async () => {
        const body = await req.json()
        return serverApiFetch<Meter>(METER_ENPOINT.base, {
            method: 'POST',
            body: JSON.stringify(body),
        })
    })
}
