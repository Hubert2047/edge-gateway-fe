import { NextRequest } from 'next/server'
import { serverApiFetch } from '@/lib/api/server'
import { handleRoute } from '@/lib/api/route-handler'
import { CLOUD_TARGET_ENDPOINT } from '@/constances/url'
import type { CloudTargetListResponse } from '@/types/cloud-target'

export async function GET() {
    return handleRoute(async () => {
        return serverApiFetch<CloudTargetListResponse>(CLOUD_TARGET_ENDPOINT.base)
    })
}

export async function POST(req: NextRequest) {
    return handleRoute(async () => {
        const form = await req.json()
        const raw = await serverApiFetch<any>(CLOUD_TARGET_ENDPOINT.base, {
            method: 'POST',
            body: JSON.stringify(form),
        })
        return raw
    }, 201)
}
