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
                username: { label: 'Username', type: 'text' },
                password: { label: 'Password', type: 'password' },
            },
            async authorize(credentials) {
                if (!credentials?.username || !credentials?.password) {
                    return null
                }
                try {
                    const result = await loginRequest({
                        username: credentials.username,
                        password: credentials.password,
                    })
                    return {
                        id: String(result.data.user.id),
                        name: result.data.user.username,
                        role: result.data.user.role,
                        accessToken: result.data.token,
                    }
                } catch (err: any) {
                    throw new Error(err.data.message ?? "Login failed")
                }
            }
        }),
    ],

    callbacks: {
        async jwt({ token, user }) {
            if (user) {
                token.id = user.id
                token.role = (user as any).role
                token.accessToken = (user as any).accessToken
            }

            return token
        },
        async session({ session, token }) {
            if (session.user) {
                session.user.id = token.id as string
                ;(session.user as any).role = token.role
            }
        
            ;(session as any).accessToken = token.accessToken
        
            return session
        }
    },
}
