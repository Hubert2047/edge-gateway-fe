'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useI18n, type Locale } from '@/lib/i18n'

export default function Settings() {
    const { locale, setLocale, t } = useI18n()
    const [draftLocale, setDraftLocale] = useState<Locale>(locale)
    const [saved, setSaved] = useState(false)

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setDraftLocale(locale)
    }, [locale])

    function saveSettings() {
        setLocale(draftLocale)
        setSaved(true)
    }

    return (
        <div className='flex h-full flex-col gap-6 max-md:h-auto'>
            <h1 className='text-2xl font-bold'>{t('settings.title')}</h1>

            <Card className='max-w-2xl border border-border/60 p-4'>
                <div className='flex flex-wrap items-end gap-4'>
                    <div className='w-full max-w-sm space-y-2'>
                        <Label htmlFor='language'>{t('settings.languageLabel')}</Label>
                        <Select
                            value={draftLocale}
                            onValueChange={(value) => {
                                if (value === 'en' || value === 'zh-TW') {
                                    setDraftLocale(value)
                                    setSaved(false)
                                }
                            }}
                        >
                            <SelectTrigger id='language' className='w-full'>
                                <SelectValue>{draftLocale === 'en' ? t('settings.en') : t('settings.zhTW')}</SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value='zh-TW'>{t('settings.zhTW')}</SelectItem>
                                <SelectItem value='en'>{t('settings.en')}</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <Button onClick={saveSettings}>{t('settings.save')}</Button>
                    {saved && <span className='text-sm text-emerald-700'>{t('settings.saved')}</span>}
                </div>
            </Card>
        </div>
    )
}
