import { NextRequest } from 'next/server'
import { serverApiFetch } from '@/lib/api/server'
import { handleRoute } from '@/lib/api/route-handler'
import type { TestConnectionResult } from '@/types/cloud-target'
import { CLOUD_TARGET_ENDPOINT } from '@/constances/url'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    return handleRoute(() =>
        serverApiFetch<TestConnectionResult>(
            CLOUD_TARGET_ENDPOINT.test(id),
            { method: 'POST' },
            { skipAuthRedirect: true },
        ),
    )
}
