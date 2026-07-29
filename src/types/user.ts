export type UserRole = 'admin' | 'viewer'

export interface AppUser {
    id: string
    username: string
    role: UserRole
    enabled: boolean
    createdAt?: string
}

export interface CreateUserValues {
    username: string
    password: string
    role: UserRole
}
