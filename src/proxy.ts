export { default as proxy } from 'next-auth/middleware'

export const config = {
    matcher: ['/((?!login|api/auth|_next|favicon.ico).*)'],
}
