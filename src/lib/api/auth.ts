import { AUTH_ENDPOINT } from '@/constances/url'
import type { LoginRequest, LoginResponse } from '@/types/auth'

export async function loginRequest(credentials: LoginRequest): Promise<LoginResponse> {
    const res = await fetch(`${process.env.BACKEND_URL}/${AUTH_ENDPOINT.login}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials),
    })

    if (!res.ok) {
        const errBody = await res.json().catch(() => null)
        throw new Error(errBody?.message ?? 'Error')
    }

    return res.json()
}
