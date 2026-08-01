import { NextRequest } from 'next/server'
import { handleRoute } from '@/lib/api/route-handler'
import { serverApiFetch } from '@/lib/api/server'
import { CLOUD_TARGET_ENDPOINT } from '@/constances/url'

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    return handleRoute(async () => {
        const form = await req.json()
        const raw = await serverApiFetch<any>(`${CLOUD_TARGET_ENDPOINT.base}/${id}`, {
            method: 'PUT',
            body: JSON.stringify(form),
        })
        return raw
    })
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    return handleRoute(async () => {
        await serverApiFetch<void>(`${CLOUD_TARGET_ENDPOINT.base}/${id}`, { method: 'DELETE' })
        return undefined
    }, 204)
}
