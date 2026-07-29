export type AppRole = 'admin' | 'viewer'

export function normalizeRole(role: unknown): AppRole | null {
    if (typeof role !== 'string') return null
    const normalized = role.toLowerCase()
    return normalized === 'admin' || normalized === 'viewer' ? normalized : null
}
