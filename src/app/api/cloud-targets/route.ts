import { NextRequest } from 'next/server'
import { serverApiFetch } from '@/lib/api/server'
import { handleRoute } from '@/lib/api/route-handler'
import { fromBackend, toBackend } from '@/lib/api/cloud-target.mapper'

export async function GET() {
    return handleRoute(async () => {
        const raw = await serverApiFetch<any[]>('/api/cloud-targets')
        return raw.map(fromBackend)
    })
}

export async function POST(req: NextRequest) {
    return handleRoute(async () => {
        const form = await req.json()
        const raw = await serverApiFetch<any>('/api/cloud-targets', {
            method: 'POST',
            body: JSON.stringify(toBackend(form)),
        })
        return fromBackend(raw)
    }, 201)
}