import { NextRequest } from 'next/server'
import { handleRoute } from '@/lib/api/route-handler'
import { serverApiFetch } from '@/lib/api/server'
import type { Meter } from '@/types/meter'
import { METER_ENDPOINT } from '@/constances/url'

export async function GET(req: NextRequest, { params }: { params: Promise<{ macID: string }> }){
    return handleRoute(async () => {
        const { macID } = await params
        return serverApiFetch<Meter>(`${METER_ENDPOINT.base}/${encodeURIComponent(macID)}`)
    })
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ macID: string }> }) {
    return handleRoute(async () => {
        const { macID } = await params
        const body = await req.json()
        return serverApiFetch<Meter>(`${METER_ENDPOINT.base}/${encodeURIComponent(macID)}`, {
            method: 'PUT',
            body: JSON.stringify(body),
        })
    })
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ macID: string }> }) {
    return handleRoute(async () => {
        const { macID } = await params
        return serverApiFetch<void>(`${METER_ENDPOINT.base}/${encodeURIComponent(macID)}`, {
            method: 'DELETE',
        })
    })
}
