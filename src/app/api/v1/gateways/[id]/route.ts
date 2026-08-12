import { NextRequest } from 'next/server'
import { serverApiFetch } from '@/lib/api/server'
import { handleRoute } from '@/lib/api/route-handler'
import type { Gateway } from '@/types/gateway'
import { GATEWAY_ENDPOINT } from '@/constances/url'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    return handleRoute(() =>
        serverApiFetch<Gateway>(`${GATEWAY_ENDPOINT.base}/${id}`, undefined, { skipAuthRedirect: true }),
    )
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    const body = await req.json()
    return handleRoute(() =>
        serverApiFetch<Gateway>(
            `${GATEWAY_ENDPOINT.base}/${id}`,
            { method: 'PUT', body: JSON.stringify(body) },
            { skipAuthRedirect: true },
        ),
    )
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    return handleRoute(
        () => serverApiFetch<void>(`${GATEWAY_ENDPOINT.base}/${id}`, { method: 'DELETE' }, { skipAuthRedirect: true }),
        204,
    )
}
