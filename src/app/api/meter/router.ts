import { NextRequest } from 'next/server'
import { handleRoute } from '@/lib/api/route-handler'
import { serverApiFetch } from '@/lib/api/server'
import type { Meter } from '@/types/meter'

export async function GET(req: NextRequest) {
    return handleRoute(async () => {
        const hubUid = req.nextUrl.searchParams.get('hubUid')
        const query = hubUid ? `?hubID=${encodeURIComponent(hubUid)}` : ''
        return serverApiFetch<Meter[]>(`/api/meters${query}`)
    })
}

export async function POST(req: NextRequest) {
    return handleRoute(async () => {
        const body = await req.json()
        return serverApiFetch<Meter>('/api/meters', {
            method: 'POST',
            body: JSON.stringify(body),
        })
    })
}
