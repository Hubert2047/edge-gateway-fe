'use client'

import { OVERVIEW_ENDPOINT } from '@/constances/url'
import type { OverviewActivePower } from '@/types/overview'
import { apiFetch } from './client'

export function getOverviewActivePower() {
    return apiFetch<OverviewActivePower>(OVERVIEW_ENDPOINT.metersActivePower)
}
