'use client'

import { useState, type ReactNode } from 'react'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { useCreateUser, useDeleteUser, useResetUserPassword, useSetUserEnabled, useUpdateUserRole, useUpdateUserUsername, useUsers } from '@/lib/api/user'
import { useI18n } from '@/lib/i18n'
import { getErrorMessage } from '@/lib/utils'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import type { AppUser, CreateUserValues, UserRole } from '@/types/user'

export function UserManagement({ initialUsers }: { initialUsers: AppUser[] }) {
    const { t } = useI18n()
    const { data: users = initialUsers } = useUsers(initialUsers)
    const createMutation = useCreateUser()
    const enabledMutation = useSetUserEnabled()
    const roleMutation = useUpdateUserRole()
    const deleteMutation = useDeleteUser()
    const resetPasswordMutation = useResetUserPassword()
    const usernameMutation = useUpdateUserUsername()
    const [form, setForm] = useState<CreateUserValues>({ username: '', password: '', role: 'viewer' })
    const [resetUser, setResetUser] = useState<AppUser | null>(null)
    const [resetPassword, setResetPassword] = useState('')
    const [usernameDrafts, setUsernameDrafts] = useState<Record<string, string>>({})

    function createUser() {
        if (!form.username.trim() || !form.password) {
            toast.error(t('users.required'))
            return
        }
        createMutation.mutate(form, {
            onSuccess: () => {
                setForm({ username: '', password: '', role: 'viewer' })
                toast.success(t('users.created'))
            },
            onError: (error) => toast.error(getErrorMessage(error, t('users.createFailed'))),
        })
    }

    function setEnabled(user: AppUser, enabled: boolean) {
        enabledMutation.mutate({ id: user.id, enabled }, {
            onError: (error) => toast.error(getErrorMessage(error, t('users.updateFailed'))),
        })
    }

    function setRole(user: AppUser, role: UserRole) {
        roleMutation.mutate({ id: user.id, role }, {
            onError: (error) => toast.error(getErrorMessage(error, t('users.updateFailed'))),
        })
    }

    function deleteUser(user: AppUser) {
        if (!window.confirm(t('users.confirmDelete', { username: user.username }))) return
        deleteMutation.mutate(user.id, {
            onSuccess: () => toast.success(t('users.deleted')),
            onError: (error) => toast.error(getErrorMessage(error, t('users.deleteFailed'))),
        })
    }

    function submitResetPassword() {
        if (!resetUser || !resetPassword) {
            toast.error(t('users.passwordRequired'))
            return
        }
        resetPasswordMutation.mutate({ id: resetUser.id, password: resetPassword }, {
            onSuccess: () => {
                setResetUser(null)
                setResetPassword('')
                toast.success(t('users.passwordReset'))
            },
            onError: (error) => toast.error(getErrorMessage(error, t('users.passwordResetFailed'))),
        })
    }

    function saveUsername(user: AppUser, userId: string) {
        const username = usernameDrafts[userId]?.trim()
        if (!username || username === user.username) return
        usernameMutation.mutate({ id: userId, username }, {
            onSuccess: () => {
                setUsernameDrafts((current) => {
                    const next = { ...current }
                    delete next[userId]
                    return next
                })
                toast.success(t('users.usernameUpdated'))
            },
            onError: (error) => toast.error(getErrorMessage(error, t('users.updateFailed'))),
        })
    }

    return (
        <div className='flex min-h-full flex-col gap-7 pb-8'>
            <div className='flex items-center justify-between border-b border-[#D8DDD9] pb-5'>
                <h1 className='text-3xl font-bold tracking-tight'>{t('users.title')}</h1>
                <span className='border border-[#BFC8C2] px-4 py-2 text-sm text-[#357A59]'>{users.length} {t('users.count')}</span>
            </div>

            <section className='overflow-x-auto border border-[#D8DDD9] bg-white'>
                <table className='w-full min-w-[700px] text-sm'>
                    <thead className='bg-[#F1F2EF] text-left text-[#4F5A54]'><tr><th className='px-4 py-3 font-medium'>{t('users.username')}</th><th className='px-4 py-3 font-medium'>{t('users.role')}</th><th className='px-4 py-3 font-medium'>{t('users.status')}</th><th className='px-4 py-3 font-medium'>{t('common.actions')}</th></tr></thead>
                    <tbody>
                        {users.length === 0 ? <tr><td colSpan={4} className='px-4 py-10 text-center text-muted-foreground'>{t('users.empty')}</td></tr> : users.map((user, index) => {
                            const userId = user.id || user.username || `user-${index}`
                            const busy = enabledMutation.isPending || roleMutation.isPending || deleteMutation.isPending || resetPasswordMutation.isPending || usernameMutation.isPending
                            const protectedAdmin = user.username === 'admin'
                            const username = usernameDrafts[userId] ?? user.username
                            const usernameChanged = !protectedAdmin && username !== user.username
                            return <tr key={`${userId}-${index}`} className='border-t border-[#E1E5E2]'><td className='px-4 py-3'><input value={username} disabled={protectedAdmin || busy} onChange={(event) => setUsernameDrafts((current) => ({ ...current, [userId]: event.target.value }))} className='control-input font-medium' /></td><td className='px-4 py-3'><select value={user.role} disabled={busy || protectedAdmin} onChange={(event) => setRole({ ...user, id: userId }, event.target.value as UserRole)} className='control-input w-32'><option value='admin'>{t('users.admin')}</option><option value='viewer'>{t('users.viewer')}</option></select></td><td className='px-4 py-3'>{protectedAdmin ? <span className='text-sm text-muted-foreground'>{t('users.protected')}</span> : <label className='flex items-center gap-2'><input type='checkbox' checked={user.enabled} disabled={busy} onChange={(event) => setEnabled({ ...user, id: userId }, event.target.checked)} className='h-4 w-4 accent-[#153F31]' /><span>{user.enabled ? t('common.enabled') : t('common.disabled')}</span></label>}</td><td className='px-4 py-3'><div className='flex flex-row items-center gap-2 whitespace-nowrap'>{usernameChanged && <button type='button' disabled={busy} onClick={() => saveUsername({ ...user, id: userId }, userId)} className='h-8 border border-[#BFC8C2] bg-white px-3 text-sm text-[#357A59] disabled:opacity-50'>{usernameMutation.isPending && usernameMutation.variables?.id === userId ? <Loader2 className='h-4 w-4 animate-spin' /> : t('common.save')}</button>}<button type='button' disabled={busy} onClick={() => { setResetUser({ ...user, id: userId }); setResetPassword('') }} className='h-8 border border-[#BFC8C2] bg-white px-3 text-sm text-[#357A59] disabled:opacity-50'>{t('users.resetPassword')}</button><button type='button' disabled={busy} onClick={() => deleteUser({ ...user, id: userId })} className='h-8 border border-[#E6B7B0] bg-[#FAE1DD] px-3 text-sm text-[#B54E45] disabled:opacity-50'>{deleteMutation.isPending && deleteMutation.variables === userId ? <Loader2 className='h-4 w-4 animate-spin' /> : t('common.delete')}</button></div></td></tr>
                        })}
                    </tbody>
                </table>
            </section>

            <section className='border border-[#D8DDD9] bg-white p-7'>
                <h2 className='mb-6 text-2xl font-bold'>{t('users.addTitle')}</h2>
                <div className='grid gap-3 bg-[#F7F8F5] p-3 md:grid-cols-4'>
                    <Field label={t('users.username')}><input value={form.username} onChange={(event) => setForm({ ...form, username: event.target.value })} className='control-input' autoComplete='off' /></Field>
                    <Field label={t('users.password')}><input type='password' value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} className='control-input' autoComplete='new-password' /></Field>
                    <Field label={t('users.role')}><select value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value as UserRole })} className='control-input'><option value='admin'>{t('users.admin')}</option><option value='viewer'>{t('users.viewer')}</option></select></Field>
                    <button type='button' onClick={createUser} disabled={createMutation.isPending} className='h-8 self-end bg-[#153F31] text-sm font-medium text-white hover:bg-[#1B503D] disabled:opacity-50'>{createMutation.isPending ? <Loader2 className='mx-auto h-4 w-4 animate-spin' /> : t('common.add')}</button>
                </div>
                <p className='mt-4 text-sm text-muted-foreground'>{t('users.passwordApiNote')}</p>
            </section>

            <Dialog open={resetUser !== null} onOpenChange={(open) => !open && setResetUser(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t('users.resetPassword')}</DialogTitle>
                        <DialogDescription>{t('users.resetPasswordDescription', { username: resetUser?.username ?? '' })}</DialogDescription>
                    </DialogHeader>
                    <Field label={t('users.newPassword')}><input type='password' value={resetPassword} onChange={(event) => setResetPassword(event.target.value)} className='control-input' autoComplete='new-password' /></Field>
                    <DialogFooter>
                        <button type='button' onClick={() => setResetUser(null)} className='h-8 border border-border bg-white px-3 text-sm'>{t('common.cancel')}</button>
                        <button type='button' onClick={submitResetPassword} disabled={resetPasswordMutation.isPending} className='h-8 bg-[#153F31] px-3 text-sm text-white disabled:opacity-50'>{resetPasswordMutation.isPending ? <Loader2 className='h-4 w-4 animate-spin' /> : t('common.confirm')}</button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
    return <label className='flex min-w-0 flex-col gap-1.5 text-sm text-[#5F6964]'><span>{label}</span>{children}</label>
}
