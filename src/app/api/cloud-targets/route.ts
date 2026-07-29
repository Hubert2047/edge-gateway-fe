import { NextRequest } from 'next/server'
import { serverApiFetch } from '@/lib/api/server'
import { handleRoute } from '@/lib/api/route-handler'

export async function GET() {
    return handleRoute(async () => {
        return serverApiFetch<any[]>('/api/cloud-targets')
    })
}

export async function POST(req: NextRequest) {
    return handleRoute(async () => {
        const form = await req.json()
        const raw = await serverApiFetch<any>('/api/cloud-targets', {
            method: 'POST',
            body: JSON.stringify(form),
        })
        return raw
    }, 201)
}
