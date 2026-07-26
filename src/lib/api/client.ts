'use client'

import { signIn } from 'next-auth/react'
import { isAuthError } from '../utils'

export class ApiError extends Error {
    status: number
    constructor(message: string, status: number) {
        super(message)
        this.status = status
    }
}

export async function apiFetch<T = unknown>(
    path: string,
    init?: RequestInit,
    options?: { skipAuthRedirect?: boolean; headers?: HeadersInit }
): Promise<T> {
    const hasBody = init?.body !== undefined

    const res = await fetch(path, {
        ...init,
        headers: {
            ...(hasBody ? { 'Content-Type': 'application/json' } : {}),
            ...(init?.headers ?? {}),
            ...(options?.headers ?? {}),
        },
    })

    const clone = res.clone()
    let body: any = null
    try { body = await clone.json() } catch {}

    if (isAuthError(res.status, body)) {
        if (!options?.skipAuthRedirect) {
            await signIn(undefined, { callbackUrl: window.location.pathname })
        }
        throw new ApiError('not authenticated or session expired', res.status)
    }

    if (!res.ok) throw new ApiError(body?.message ?? `request failed (${res.status})`, res.status)
    if (res.status === 204) return undefined as T
    return body as T
}