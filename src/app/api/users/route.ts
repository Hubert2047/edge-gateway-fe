import { NextRequest } from 'next/server'
import { handleRoute } from '@/lib/api/route-handler'
import { serverApiFetch } from '@/lib/api/server'
import { requireAdminApi } from '@/lib/auth-guard'
import type { AppUser, CreateUserValues } from '@/types/user'

export async function GET() {
    const denied = await requireAdminApi()
    if (denied) return denied
    return handleRoute(async () => {
        const users = await serverApiFetch<unknown[]>('/api/users', undefined, { skipAuthRedirect: true })
        return users.map(normalizeUser)
    })
}

export async function POST(request: NextRequest) {
    const denied = await requireAdminApi()
    if (denied) return denied
    const body = await request.json() as CreateUserValues
    return handleRoute(async () => {
        const user = await serverApiFetch<unknown>('/api/users', { method: 'POST', body: JSON.stringify(body) }, { skipAuthRedirect: true })
        return normalizeUser(user)
    }, 201)
}

function normalizeUser(value: unknown): AppUser {
    const user = value && typeof value === 'object' ? value as Record<string, unknown> : {}
    const id = user.id ?? user.ID ?? ''
    const username = user.username ?? user.Username ?? user.name ?? user.Name ?? ''
    const role = user.role ?? user.Role ?? 'user'
    const enabled = user.enabled ?? user.Enabled ?? false
    const createdAt = user.createdAt ?? user.created_at ?? user.CreatedAt

    return {
        id: String(id),
        username: String(username),
        role: role === 'admin' ? 'admin' : 'viewer',
        enabled: enabled === true || enabled === 1 || enabled === '1',
        ...(createdAt ? { createdAt: String(createdAt) } : {}),
    }
}
