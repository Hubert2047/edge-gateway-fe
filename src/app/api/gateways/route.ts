import { handleRoute } from '@/lib/api/route-handler'
import { serverApiFetch } from '@/lib/api/server'
import { Gateway } from '@/types/gateway'
import { NextRequest } from 'next/server'

export async function GET() {
    return handleRoute(() => serverApiFetch<Gateway[]>(GATEWAY_ENPOINT.base, undefined, { skipAuthRedirect: true }))
}

export async function POST(req: NextRequest) {
    const body = await req.json()
    return handleRoute(
        () =>
            serverApiFetch<Gateway>(
                GATEWAY_ENPOINT.base,
                { method: 'POST', body: JSON.stringify(body) },
                { skipAuthRedirect: true },
            ),
        201,
    )
}
