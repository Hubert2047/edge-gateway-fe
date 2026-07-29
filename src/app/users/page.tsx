import { UserManagement } from '@/components/users/user-management'
import { serverApiFetch } from '@/lib/api/server'
import { requireAdmin } from '@/lib/auth-guard'
import type { AppUser } from '@/types/user'

export default async function UsersPage() {
    await requireAdmin()
    const users = await serverApiFetch<AppUser[]>('/api/users')

    return <UserManagement initialUsers={users} />
}
