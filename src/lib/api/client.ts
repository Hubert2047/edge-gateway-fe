import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function serverApiFetch<T>(path: string): Promise<T> {
    const session = await getServerSession(authOptions)
    const res = await fetch(`${process.env.BACKEND_URL}${path}`, {
        headers: {
            Authorization: `Bearer ${(session as any)?.accessToken}`,
        },
    })
    return res.json()
}
