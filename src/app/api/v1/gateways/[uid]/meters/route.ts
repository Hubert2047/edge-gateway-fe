import { GATEWAY_ENDPOINT } from '@/constances/url'
import { handleRoute } from '@/lib/api/route-handler'
import { serverApiFetch } from '@/lib/api/server'
import { Meter } from '@/types/meter'
import { NextRequest } from 'next/server'

export async function GET(req: NextRequest, { params }: { params: Promise<{ uid: string }> }) {
    const { uid } = await params
    return handleRoute(() =>
        serverApiFetch<Meter[]>(GATEWAY_ENDPOINT.getMeters(uid), undefined, { skipAuthRedirect: true }),
    )
}
