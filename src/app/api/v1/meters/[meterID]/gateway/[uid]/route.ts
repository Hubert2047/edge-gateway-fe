import { NextRequest } from 'next/server'
import { handleRoute } from '@/lib/api/route-handler'
import { serverApiFetch } from '@/lib/api/server'
import type { Meter } from '@/types/meter'
import { METER_ENDPOINT } from '@/constances/url'

type Params = { meterID: string; uid: string }

export async function PUT(req: NextRequest, { params }: { params: Promise<Params> }) {
    return handleRoute(async () => {
        const { meterID, uid } = await params
        const body = await req.json()
        return serverApiFetch<Meter>(METER_ENDPOINT.update(meterID, uid), {
            method: 'PUT',
            body: JSON.stringify(body),
        })
    })
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<Params> }) {
    return handleRoute(async () => {
        const { meterID, uid } = await params
        return serverApiFetch<void>(METER_ENDPOINT.delete(meterID, uid), {
            method: 'DELETE',
        })
    })
}
