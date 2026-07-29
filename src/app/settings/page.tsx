'use client'

import { Card } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useI18n } from '@/lib/i18n'

export default function Settings() {
    const { locale, setLocale, t } = useI18n()

    return (
        <div className='flex h-full flex-col gap-6 max-md:h-auto'>
            <h1 className='text-2xl font-bold'>{t('settings.title')}</h1>

            <Card className='max-w-2xl border border-border/60 p-4'>
                <div className='flex flex-wrap items-end gap-4'>
                    <div className='w-full max-w-sm space-y-2'>
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
