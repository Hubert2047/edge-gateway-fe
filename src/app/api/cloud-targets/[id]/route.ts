import { NextRequest } from 'next/server'
import { handleRoute } from '@/lib/api/route-handler'
import { serverApiFetch } from '@/lib/api/server'

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    return handleRoute(async () => {
        const form = await req.json()
        const raw = await serverApiFetch<any>(`/api/cloud-targets/${id}`, {
            method: 'PUT',
            body: JSON.stringify(form),
        })
        return raw
    })
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    return handleRoute(async () => {
        await serverApiFetch<void>(`/api/cloud-targets/${id}`, { method: 'DELETE' })
        return undefined
    }, 204)
}
