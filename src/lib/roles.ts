export type AppRole = 'admin' | 'user' | 'guest'

export function normalizeRole(role: unknown): AppRole | null {
    if (typeof role !== 'string') return null
    const normalized = role.toLowerCase()
    if (normalized === 'admin') return 'admin'
    if (normalized === 'user') return 'user'
    if (normalized === 'guest') return 'guest'
    return null
}
