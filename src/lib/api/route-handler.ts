import { NextResponse } from 'next/server'
import { ServerApiError } from '@/lib/api/server'

export async function handleRoute<T>(fn: () => Promise<T>, successStatus = 200) {
    try {
        const data = await fn()
        if (successStatus === 204) return new NextResponse(null, { status: 204 })
        return NextResponse.json(data, { status: successStatus })
    } catch (err) {
        if (err instanceof ServerApiError) {
            return NextResponse.json({ message: err.message }, { status: err.status })
        }
        return NextResponse.json({ message: 'internal error' }, { status: 500 })
    }
}