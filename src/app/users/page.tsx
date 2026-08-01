import { UserManagement } from '@/components/users/user-management'
import { USER_ENDPOINT } from '@/constances/url'
import { serverApiFetch } from '@/lib/api/server'
import { requireAdmin } from '@/lib/auth-guard'
import type { AppUser } from '@/types/user'

export default async function UsersPage() {
    await requireAdmin()
    const users = await serverApiFetch<AppUser[]>(USER_ENDPOINT.base)
    return <UserManagement initialUsers={users} />
}
