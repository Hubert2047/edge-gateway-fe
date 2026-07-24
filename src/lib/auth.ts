import type { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { loginRequest } from '@/lib/api/auth'

export const authOptions: NextAuthOptions = {
    session: { strategy: 'jwt' },
    pages: { signIn: '/login' },
    providers: [
        CredentialsProvider({
            name: 'Credentials',
            credentials: {
                username: { label: '帳號', type: 'text' },
                password: { label: '密碼', type: 'password' },
            },
            async authorize(credentials) {
                if (!credentials?.username || !credentials?.password) return null

                try {
                    const result = await loginRequest({
                        username: credentials.username,
                        password: credentials.password,
                    })

                    return {
                        name: result.user.name,
                        role: result.user.role,
                        accessToken: result.token,
                    }
                } catch (err) {
                    throw new Error(err instanceof Error ? err.message : '帳號或密碼錯誤')
                }
            },
        }),
    ],
    callbacks: {
        async jwt({ token, user }) {
            if (user) {
                token.accessToken = (user as any).accessToken
                token.role = (user as any).role
            }
            return token
        },
        async session({ session, token }) {
            ;(session as any).accessToken = token.accessToken
            ;(session as any).user.role = token.role
            return session
        },
    },
}
