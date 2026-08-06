'use client'

import { useState, type ReactNode } from 'react'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { useCreateUser, useDeleteUser, useResetUserPassword, useUpdateUser, useUsers } from '@/lib/api/user'
import { useI18n } from '@/lib/i18n'
import { getErrorMessage } from '@/lib/utils'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import type { AppUser, CreateUserValues, UserRole } from '@/types/user'
import { Field } from '../ui/field'

type UserDraft = { username: string; role: UserRole; enabled: boolean }
type PendingAction = { type: 'delete'; user: AppUser; displayName: string }

export function UserManagement({ initialUsers }: { initialUsers: AppUser[] }) {
    const { t } = useI18n()
    const { data: users = initialUsers } = useUsers(initialUsers)
    const createMutation = useCreateUser()
    const updateMutation = useUpdateUser()
    const deleteMutation = useDeleteUser()
    const resetPasswordMutation = useResetUserPassword()
    const [form, setForm] = useState<CreateUserValues>({ username: '', password: '', role: 'viewer' })
    const [resetUser, setResetUser] = useState<AppUser | null>(null)
    const [resetPassword, setResetPassword] = useState('')
    const [drafts, setDrafts] = useState<Record<string, UserDraft>>({})
    const [pendingAction, setPendingAction] = useState<PendingAction | null>(null)

    const dialogText = {
        delete: {
            title: t('users.confirmDeleteTitle'),
            desc: (name: string) => t('users.confirmDelete', { username: name }),
        },
    }

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

    function updateDraft(user: AppUser, userId: string, patch: Partial<UserDraft>) {
        setDrafts((current) => {
            const existing = current[userId] ?? { username: user.username, role: user.role, enabled: user.enabled }
            return { ...current, [userId]: { ...existing, ...patch } }
        })
    }

    function saveUser(userId: string) {
        const draft = drafts[userId]
        if (!draft) return
        const username = draft.username.trim()
        if (!username) {
            toast.error(t('users.required'))
            return
        }
        updateMutation.mutate(
            { id: userId, username, role: draft.role, enabled: draft.enabled },
            {
                onSuccess: () => {
                    setDrafts((current) => {
                        const next = { ...current }
                        delete next[userId]
                        return next
                    })
                    toast.success(t('users.updated'))
                },
                onError: (error) => {
                    toast.error(getErrorMessage(error, t('users.updateFailed')))
                },
            },
        )
    }

    function requestDeleteUser(user: AppUser) {
        setPendingAction({ type: 'delete', user, displayName: user.username })
    }

    function confirmPendingAction() {
        if (!pendingAction) return
        if (pendingAction.type === 'delete') {
            deleteMutation.mutate(pendingAction.user.id, {
                onSuccess: () => {
                    toast.success(t('users.deleted'))
                    setPendingAction(null)
                },
                onError: (error) => {
                    toast.error(getErrorMessage(error, t('users.deleteFailed')))
                    setPendingAction(null)
                },
            })
        }
    }

    function submitResetPassword() {
        if (!resetUser || !resetPassword) {
            toast.error(t('users.passwordRequired'))
            return
        }
        resetPasswordMutation.mutate(
            { id: resetUser.id, password: resetPassword },
            {
                onSuccess: () => {
                    setResetUser(null)
                    setResetPassword('')
                    toast.success(t('users.passwordReset'))
                },
                onError: (error) => toast.error(getErrorMessage(error, t('users.passwordResetFailed'))),
            },
        )
    }

    return (
        <div className='flex h-full min-h-0 flex-col gap-7 overflow-y-auto pb-8'>
            <div className='sticky top-0 z-10 flex items-center justify-between border-b border-[#D8DDD9] bg-[#F7F5F0] pt-1 pb-5'>
                <h1 className='text-3xl font-bold tracking-tight'>{t('users.title')}</h1>
                <span className='border border-[#BFC8C2] px-4 py-2 text-sm text-[#357A59]'>
                    {users.length} {t('users.count')}
                </span>
            </div>
            <section className='border border-[#D8DDD9] bg-white p-2'>
                <h2 className='mb-2 text-lg font-bold'>{t('users.addTitle')}</h2>
                <div className='flex flex-wrap items-end gap-3 bg-[#F7F8F5] p-3'>
                    <Field label={t('users.username')}>
                        <input
                            value={form.username}
                            onChange={(event) => setForm({ ...form, username: event.target.value })}
                            className='w-52 control-input'
                            autoComplete='off'
                        />
                    </Field>
                    <Field label={t('users.password')}>
                        <input
                            type='password'
                            value={form.password}
                            onChange={(event) => setForm({ ...form, password: event.target.value })}
                            className='w-52 control-input'
                            autoComplete='new-password'
                        />
                    </Field>
                    <Field label={t('users.role')}>
                        <select
                            value={form.role}
                            onChange={(event) => setForm({ ...form, role: event.target.value as UserRole })}
                            className='w-42 control-input'>
                            <option value='admin'>{t('users.admin')}</option>
                            <option value='viewer'>{t('users.viewer')}</option>
                        </select>
                    </Field>
                    <button
                        type='button'
                        onClick={createUser}
                        disabled={createMutation.isPending}
                        className='h-8 bg-[#153F31] px-4 text-sm font-medium text-white hover:bg-[#1B503D] disabled:opacity-50'>
                        {createMutation.isPending ? (
                            <Loader2 className='mx-auto h-4 w-4 animate-spin' />
                        ) : (
                            t('common.add')
                        )}
                    </button>
                </div>
            </section>
            <section className='max-h-[600px] overflow-x-auto overflow-y-auto border border-[#D8DDD9] bg-white'>
                <table className='w-full min-w-[700px] text-sm'>
                    <thead className='sticky top-0 z-10 bg-[#F1F2EF] text-left text-[#4F5A54]'>
                        <tr>
                            <th className='px-4 py-3 font-medium'>{t('users.username')}</th>
                            <th className='px-4 py-3 font-medium'>{t('users.role')}</th>
                            <th className='px-4 py-3 font-medium'>{t('users.status')}</th>
                            <th className='px-4 py-3 font-medium'>{t('common.actions')}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {users.length === 0 ? (
                            <tr>
                                <td colSpan={4} className='px-4 py-10 text-center text-muted-foreground'>
                                    {t('users.empty')}
                                </td>
                            </tr>
                        ) : (
                            users.map((user, index) => {
                                const userId = user.id || user.username || `user-${index}`
                                const busy =
                                    updateMutation.isPending ||
                                    deleteMutation.isPending ||
                                    resetPasswordMutation.isPending
                                const protectedAdmin = user.username === 'admin'
                                const draft = drafts[userId] ?? {
                                    username: user.username,
                                    role: user.role,
                                    enabled: user.enabled,
                                }
                                const changed =
                                    !protectedAdmin &&
                                    (draft.username !== user.username ||
                                        draft.role !== user.role ||
                                        draft.enabled !== user.enabled)
                                const rowSaving = updateMutation.isPending && updateMutation.variables?.id === userId
                                const rowDeleting = deleteMutation.isPending && deleteMutation.variables === userId
                                return (
                                    <tr key={`${userId}-${index}`} className='border-t border-[#E1E5E2]'>
                                        <td className='px-4 py-3'>
                                            <input
                                                value={draft.username}
                                                disabled={protectedAdmin || busy}
                                                onChange={(event) =>
                                                    updateDraft(user, userId, { username: event.target.value })
                                                }
                                                className='control-input font-medium'
                                            />
                                        </td>
                                        <td className='px-4 py-3'>
                                            <select
                                                value={draft.role}
                                                disabled={protectedAdmin || busy}
                                                onChange={(event) =>
                                                    updateDraft(user, userId, { role: event.target.value as UserRole })
                                                }
                                                className='control-input w-32'>
                                                <option value='admin'>{t('users.admin')}</option>
                                                <option value='viewer'>{t('users.viewer')}</option>
                                            </select>
                                        </td>
                                        <td className='px-4 py-3'>
                                            {protectedAdmin ? (
                                                <span className='text-sm text-muted-foreground'>
                                                    {t('users.protected')}
                                                </span>
                                            ) : (
                                                <label className='flex items-center gap-2'>
                                                    <input
                                                        type='checkbox'
                                                        checked={draft.enabled}
                                                        disabled={busy}
                                                        onChange={(event) =>
                                                            updateDraft(user, userId, { enabled: event.target.checked })
                                                        }
                                                        className='h-4 w-4 accent-[#153F31]'
                                                    />
                                                    <span>
                                                        {draft.enabled ? t('common.enabled') : t('common.disabled')}
                                                    </span>
                                                </label>
                                            )}
                                        </td>
                                        <td className='px-4 py-3'>
                                            <div className='flex flex-row items-center gap-2 whitespace-nowrap'>
                                                {!protectedAdmin && (
                                                    <button
                                                        type='button'
                                                        disabled={busy || !changed}
                                                        onClick={() => saveUser(userId)}
                                                        className='min-w-14 h-8 border border-[#BFC8C2] bg-white px-3 text-sm text-[#357A59] disabled:opacity-50'>
                                                        {rowSaving ? (
                                                            <Loader2 className='h-4 w-4 animate-spin' />
                                                        ) : (
                                                            t('common.save')
                                                        )}
                                                    </button>
                                                )}
                                                <button
                                                    type='button'
                                                    disabled={busy}
                                                    onClick={() => {
                                                        setResetUser({ ...user, id: userId })
                                                        setResetPassword('')
                                                    }}
                                                    className='h-8 border border-[#BFC8C2] bg-white px-3 text-sm text-[#357A59] disabled:opacity-50'>
                                                    {t('users.resetPassword')}
                                                </button>
                                                <button
                                                    type='button'
                                                    disabled={busy}
                                                    onClick={() => requestDeleteUser({ ...user, id: userId })}
                                                    className='h-8 border border-[#E6B7B0] bg-[#FAE1DD] px-3 text-sm text-[#B54E45] disabled:opacity-50'>
                                                    {rowDeleting ? (
                                                        <Loader2 className='h-4 w-4 animate-spin' />
                                                    ) : (
                                                        t('common.delete')
                                                    )}
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                )
                            })
                        )}
                    </tbody>
                </table>
            </section>

            <Dialog open={resetUser !== null} onOpenChange={(open) => !open && setResetUser(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t('users.resetPassword')}</DialogTitle>
                        <DialogDescription>
                            {t('users.resetPasswordDescription', { username: resetUser?.username ?? '' })}
                        </DialogDescription>
                    </DialogHeader>
                    <Field label={t('users.newPassword')}>
                        <input
                            type='password'
                            value={resetPassword}
                            onChange={(event) => setResetPassword(event.target.value)}
                            className='control-input'
                            autoComplete='new-password'
                        />
                    </Field>
                    <DialogFooter>
                        <button
                            type='button'
                            onClick={() => setResetUser(null)}
                            className='h-8 border border-border bg-white px-3 text-sm'>
                            {t('common.cancel')}
                        </button>
                        <button
                            type='button'
                            onClick={submitResetPassword}
                            disabled={resetPasswordMutation.isPending}
                            className='h-8 bg-[#153F31] px-3 text-sm text-white disabled:opacity-50'>
                            {resetPasswordMutation.isPending ? (
                                <Loader2 className='h-4 w-4 animate-spin' />
                            ) : (
                                t('common.confirm')
                            )}
                        </button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <AlertDialog open={pendingAction !== null} onOpenChange={(open) => !open && setPendingAction(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{pendingAction ? dialogText[pendingAction.type].title : ''}</AlertDialogTitle>
                        <AlertDialogDescription>
                            {pendingAction ? dialogText[pendingAction.type].desc(pendingAction.displayName) : ''}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={deleteMutation.isPending}>{t('common.cancel')}</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={confirmPendingAction}
                            disabled={deleteMutation.isPending}
                            className='bg-rose-600 text-white hover:bg-rose-700'>
                            {deleteMutation.isPending ? (
                                <Loader2 className='h-4 w-4 animate-spin' />
                            ) : (
                                t('common.confirm')
                            )}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}
