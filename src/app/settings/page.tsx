'use client'

import { useEffect, useMemo, useState } from 'react'
import { useSession } from 'next-auth/react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useUpdateSettings } from '@/lib/api/settings.queries'
import { isLocale, useI18n, type Locale } from '@/lib/i18n'
import { saveSettings } from '@/lib/settings'

const DEFAULT_TIME_ZONE = 'Asia/Taipei'

const timeZoneOptions = [
    { value: 'Asia/Taipei', label: '台灣', city: 'Taipei' },
    { value: 'Asia/Shanghai', label: '中國', city: 'Shanghai' },
    { value: 'Asia/Tokyo', label: '日本', city: 'Tokyo' },
    { value: 'Asia/Seoul', label: '韓國', city: 'Seoul' },
    { value: 'Asia/Singapore', label: '新加坡', city: 'Singapore' },
    { value: 'Asia/Bangkok', label: '泰國', city: 'Bangkok' },
    { value: 'Asia/Ho_Chi_Minh', label: '越南', city: 'Ho Chi Minh City' },
    { value: 'Asia/Kolkata', label: '印度', city: 'Kolkata' },
    { value: 'Australia/Sydney', label: '澳洲', city: 'Sydney' },
    { value: 'Europe/London', label: '英國', city: 'London' },
    { value: 'Europe/Berlin', label: '德國', city: 'Berlin' },
    { value: 'America/New_York', label: '美國（東部）', city: 'New York' },
    { value: 'America/Los_Angeles', label: '美國（西部）', city: 'Los Angeles' },
] as const

function isTimeZone(value: unknown): value is string {
    return timeZoneOptions.some((option) => option.value === value)
}

export default function Settings() {
    const { locale, setLocale, t } = useI18n()
    const { data: session, status, update } = useSession()
    const updateSettings = useUpdateSettings()
    const isAdmin = session?.user?.role.toLowerCase() === 'admin'
    const [selectedLocale, setSelectedLocale] = useState<Locale>('zh-TW')
    const [selectedTimeZone, setSelectedTimeZone] = useState(DEFAULT_TIME_ZONE)
    const [now, setNow] = useState(() => Date.now())

    useEffect(() => {
        const timer = window.setInterval(() => setNow(Date.now()), 1_000)
        return () => window.clearInterval(timer)
    }, [])

    useEffect(() => {
        const accountLocale = session?.user?.locale
        // The session value wins when supported. Otherwise retain the active
        // frontend language, which already falls back to Traditional Chinese.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setSelectedLocale(isLocale(accountLocale) ? accountLocale : locale)

        if (isAdmin) {
            const remoteTimeZone = session?.appConfig?.timeZone
            setSelectedTimeZone(isTimeZone(remoteTimeZone) ? remoteTimeZone : DEFAULT_TIME_ZONE)
        }
    }, [isAdmin, locale, session?.appConfig?.timeZone, session?.user?.locale])

    const currentTime = useMemo(
        () =>
            new Intl.DateTimeFormat(selectedLocale === 'en' ? 'en-US' : 'zh-TW', {
                timeZone: selectedTimeZone,
                dateStyle: 'medium',
                timeStyle: 'medium',
                hour12: false,
            }).format(now),
        [now, selectedLocale, selectedTimeZone],
    )

    // `useSession().update()` briefly moves the status to loading. Keep the
    // current Settings UI mounted during that refresh so saving never blanks
    // the page and causes a visible flash.
    if (status === 'unauthenticated') return null

    async function save() {
        try {
            const saved = await updateSettings.mutateAsync({
                locale: selectedLocale,
                ...(isAdmin ? { timeZone: selectedTimeZone } : {}),
            })
            const appliedLocale = isLocale(saved.locale) ? saved.locale : locale
            setLocale(appliedLocale)
            if (isAdmin && isTimeZone(saved.appConfig?.timeZone)) {
                saveSettings({ timeZone: saved.appConfig.timeZone })
            }
            await update({
                user: { locale: appliedLocale },
                ...(isAdmin && saved.appConfig ? { appConfig: saved.appConfig } : {}),
            })
            toast.success(t('settings.saved'))
        } catch (error) {
            toast.error(error instanceof Error ? error.message : t('toast.saveFailed'))
        }
    }

    return (
        <div className='flex h-full flex-col gap-6 max-md:h-auto'>
            <h1 className='text-3xl font-bold'>{t('settings.title')}</h1>
            <Card className='p-4'>
                <div className='flex max-w-2xl flex-col gap-4'>
                    <div className='w-full max-w-42 space-y-4'>
                        <Label htmlFor='language'>{t('settings.languageLabel')}</Label>
                        <Select value={selectedLocale} onValueChange={(value) => isLocale(value) && setSelectedLocale(value)}>
                            <SelectTrigger id='language' className='w-full'>
                                <SelectValue>{selectedLocale === 'en' ? t('settings.en') : t('settings.zhTW')}</SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value='zh-TW'>{t('settings.zhTW')}</SelectItem>
                                <SelectItem value='en'>{t('settings.en')}</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {isAdmin && (
                        <div className='w-full max-w-2xl space-y-4'>
                            <Label htmlFor='time-zone'>{t('settings.timeZoneLabel')}</Label>
                            <div className='flex flex-col gap-2 sm:flex-row sm:items-stretch'>
                                <Select value={selectedTimeZone} onValueChange={(value) => isTimeZone(value) && setSelectedTimeZone(value)}>
                                    <SelectTrigger id='time-zone' className='h-8 w-full sm:min-w-80 sm:flex-1'>
                                        <SelectValue>
                                            {timeZoneOptions.find((option) => option.value === selectedTimeZone)?.label}
                                        </SelectValue>
                                    </SelectTrigger>
                                    <SelectContent>
                                        {timeZoneOptions.map((option) => (
                                            <SelectItem key={option.value} value={option.value}>
                                                {option.label} · {option.city} ({option.value})
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <div className='flex h-8 shrink-0 items-center justify-between gap-3 rounded-lg border bg-muted/40 px-3 sm:min-w-52'>
                                    <p className='text-xs text-muted-foreground'>{t('settings.currentTime')}</p>
                                    <p className='font-medium tabular-nums'>{currentTime || '—'}</p>
                                </div>
                            </div>
                        </div>
                    )}

                    <Button className='w-fit' onClick={save} disabled={updateSettings.isPending}>
                        {updateSettings.isPending ? t('common.saving') : t('settings.save')}
                    </Button>
                </div>
            </Card>
        </div>
    )
}
