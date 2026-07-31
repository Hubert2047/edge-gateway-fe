import { NextRequest } from 'next/server'
import { serverApiFetch } from '@/lib/api/server'
import { handleRoute } from '@/lib/api/route-handler'
import type { TestConnectionResult } from '@/types/cloud-target'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    return handleRoute(() =>
        serverApiFetch<TestConnectionResult>(
            CLOUD_TARGET_ENPOINT.test(id),
            { method: 'POST' },
            { skipAuthRedirect: true },
        ),
    )
}
