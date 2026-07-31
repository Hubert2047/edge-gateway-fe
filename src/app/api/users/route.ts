import { NextRequest } from 'next/server'
import { handleRoute } from '@/lib/api/route-handler'
import { serverApiFetch } from '@/lib/api/server'
import { requireAdminApi } from '@/lib/auth-guard'
import type { AppUser, CreateUserValues } from '@/types/user'
import { USER_ENDPOINT } from '@/constances/url'
import { User } from 'next-auth'

export async function GET() {
    const denied = await requireAdminApi()
    if (denied) return denied
    return handleRoute(async () => {
        return serverApiFetch<User[]>(USER_ENDPOINT.base, undefined, { skipAuthRedirect: true })
    })
}

export async function POST(request: NextRequest) {
    const denied = await requireAdminApi()
    if (denied) return denied
    const body = (await request.json()) as CreateUserValues
    return handleRoute(async () => {
        return serverApiFetch<User>(
            USER_ENDPOINT.base,
            { method: 'POST', body: JSON.stringify(body) },
            { skipAuthRedirect: true },
        )
    }, 201)
}
