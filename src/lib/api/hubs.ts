import { serverApiFetch } from './client'
import type { Hub } from '@/types/hub'

export async function getHubs(): Promise<Hub[]> {
    return serverApiFetch< Hub[] >('/api/hubs')
}