import { NextRequest } from 'next/server'
import { serverApiFetch } from '@/lib/api/server'
import { handleRoute } from '@/lib/api/route-handler'
import type { Hub } from '@/types/hub'

export async function GET(req: NextRequest, { params }: { params: Promise<{ uid: string }> }) {
    const { uid } = await params
    return handleRoute(() =>
        serverApiFetch<Hub>(`/api/hubs/${uid}`, undefined, { skipAuthRedirect: true })
    )
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ uid: string }> }) {
    const { uid } = await params
    const body = await req.json()
    return handleRoute(() =>
        serverApiFetch<Hub>(`/api/hubs/${uid}`, { method: 'PUT', body: JSON.stringify(body) }, { skipAuthRedirect: true })
    )
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ uid: string }> }) {
    const { uid } = await params
    return handleRoute(
        () => serverApiFetch<void>(`/api/hubs/${uid}`, { method: 'DELETE' }, { skipAuthRedirect: true }),
        204
    )
}