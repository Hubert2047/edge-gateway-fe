export type UserRole = 'admin' | 'user' | 'guest'

export interface AppUser {
    id: string
    username: string
    role: UserRole
    enabled: boolean
    createdAt?: string
    updatedAt?: string
}

export interface CreateUserValues {
    username: string
    password: string
    role: UserRole
}
