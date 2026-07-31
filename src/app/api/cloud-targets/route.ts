import { NextRequest } from 'next/server'
import { serverApiFetch } from '@/lib/api/server'
import { handleRoute } from '@/lib/api/route-handler'

export async function GET() {
    return handleRoute(async () => {
        return serverApiFetch<any[]>(CLOUD_TARGET_ENPOINT.base)
    })
}

export async function POST(req: NextRequest) {
    return handleRoute(async () => {
        const form = await req.json()
        const raw = await serverApiFetch<any>(CLOUD_TARGET_ENPOINT.base, {
            method: 'POST',
            body: JSON.stringify(form),
        })
        return raw
    }, 201)
}
