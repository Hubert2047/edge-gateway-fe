'use client'

import { Card } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useI18n } from '@/lib/i18n'
import { useSession } from 'next-auth/react'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function Settings() {
    const { locale, setLocale, t } = useI18n()
    const { data: session, status } = useSession()
    const router = useRouter()

    useEffect(() => {
        if (status === 'authenticated' && session?.user?.role.toLowerCase() !== 'admin') {
            router.replace('/overview')
        }
    }, [router, session, status])

    if (status !== 'authenticated' || session.user.role.toLowerCase() !== 'admin') return null

    return (
        <div className='flex h-full flex-col gap-6 max-md:h-auto'>
            <h1 className='text-3xl font-bold'>{t('settings.title')}</h1>
            <Card className='p-4'>
                <div className='flex flex-wrap items-end gap-4'>
                    <div className='w-full max-w-42 space-y-4'>
                        <Label htmlFor='language'>{t('settings.languageLabel')}</Label>
                        <Select
                            value={locale}
                            onValueChange={(value) => {
                                if (value === 'en' || value === 'zh-TW') {
                                    setLocale(value)
                                }
                            }}
                        >
                            <SelectTrigger id='language' className='w-full'>
                                <SelectValue>{locale === 'en' ? t('settings.en') : t('settings.zhTW')}</SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value='zh-TW'>{t('settings.zhTW')}</SelectItem>
                                <SelectItem value='en'>{t('settings.en')}</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            </Card>
        </div>
    )
}
