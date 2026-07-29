export type AppRole = 'admin' | 'viewer'

export function normalizeRole(role: unknown): AppRole | null {
    if (typeof role !== 'string') return null
    const normalized = role.toLowerCase()
    if (normalized === 'admin') return 'admin'
    if (normalized === 'viewer' || normalized === 'user' || normalized === 'readonly') return 'viewer'
    return null
}
