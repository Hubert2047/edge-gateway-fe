'use client'

import { useI18n } from '@/lib/i18n'

export function LocalizedText({ messageKey }: { messageKey: string }) {
    const { t } = useI18n()
    return <>{t(messageKey)}</>
}
