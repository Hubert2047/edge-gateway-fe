import { NextRequest } from 'next/server'
import { handleRoute } from '@/lib/api/route-handler'
import { serverApiFetch } from '@/lib/api/server'
import { SETTINGS_ENDPOINT } from '@/constances/url'
import type { UserSettings } from '@/types/settings'

export async function GET() {
    return handleRoute(() => serverApiFetch<UserSettings>(SETTINGS_ENDPOINT.base, undefined, { skipAuthRedirect: true }))
}

export async function PUT(req: NextRequest) {
    const body = await req.json()
    return handleRoute(
        () => serverApiFetch<UserSettings>(SETTINGS_ENDPOINT.base, { method: 'PUT', body: JSON.stringify(body) }, { skipAuthRedirect: true }),
    )
}
