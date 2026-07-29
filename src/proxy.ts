import { getToken } from 'next-auth/jwt'
import { NextResponse, type NextRequest } from 'next/server'

const adminOnlyRoutes = ['/cloud-sync', '/gateways', '/meters', '/process-rules', '/settings']

export async function proxy(request: NextRequest) {
    if (request.nextUrl.pathname.startsWith('/api/')) {
        return NextResponse.next()
    }

    const token = await getToken({ req: request })
    if (!token) {
        return NextResponse.redirect(new URL('/login', request.url))
    }

    const role = typeof token.role === 'string' ? token.role.toLowerCase() : ''
    const isAdminOnlyRoute = adminOnlyRoutes.some((route) =>
        request.nextUrl.pathname === route || request.nextUrl.pathname.startsWith(`${route}/`),
    )

    if (isAdminOnlyRoute && role !== 'admin') {
        return NextResponse.redirect(new URL('/overview', request.url))
    }

    return NextResponse.next()
}

export const config = {
    matcher: ['/((?!login|api/auth|_next|favicon.ico).*)'],
}
