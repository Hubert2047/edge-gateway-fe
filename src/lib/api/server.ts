import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { isAuthError } from '../utils'

export class ServerApiError extends Error {
    status: number
    constructor(message: string, status: number) {
        super(message)
        this.status = status
    }
}

type Envelope<T> = { ok: boolean; data?: T; message?: string }

function isEnvelope(body: any): body is Envelope<unknown> {
    return body !== null && typeof body === 'object' && typeof body.ok === 'boolean'
}

export async function serverApiFetch<T>(
    path: string,
    init?: RequestInit,
    options?: { skipAuthRedirect?: boolean }
): Promise<T> {
    const session = await getServerSession(authOptions)
    const hasBody = init?.body !== undefined

    const res = await fetch(`${process.env.BACKEND_URL}${path}`, {
        ...init,
        cache: 'no-store',
        headers: {
            ...(hasBody ? { 'Content-Type': 'application/json' } : {}),
            ...(init?.headers ?? {}),
            Authorization: `Bearer ${(session as any)?.accessToken ?? ''}`,
        },
    })

    let body: any = null
    try { body = await res.json() } catch {}

    if (isAuthError(res.status, body)) {
        if (!options?.skipAuthRedirect) redirect('/login')
        throw new ServerApiError('not authenticated or session expired', res.status)
    }

    // Envelope format: { ok, data } / { ok: false, message }
    // Legacy format (not yet migrated, e.g. Hub): raw array/object, or { message } on error
    const envelope = isEnvelope(body) ? body : null

    if (!res.ok || (envelope && envelope.ok === false)) {
        const message = envelope?.message ?? body?.message ?? `backend request failed (${res.status})`
        console.error('[serverApiFetch] failed', {
            url: `${process.env.BACKEND_URL}${path}`,
            status: res.status,
            body,
        })
        throw new ServerApiError(message, res.status)
    }

    return (envelope ? envelope.data : body) as T
}