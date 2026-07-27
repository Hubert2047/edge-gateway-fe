import { apiFetch } from './client'
import type { Hub, HubFormValues } from '@/types/hub'

export function getHubs() {
    return apiFetch<Hub[]>('/api/hubs')
}

export function createHub(form: HubFormValues) {
    return apiFetch<Hub>('/api/hubs', { method: 'POST', body: JSON.stringify(form) })
}

export function updateHub(uid: string, form: HubFormValues) {
    return apiFetch<Hub>(`/api/hubs/${uid}`, { method: 'PUT', body: JSON.stringify(form) })
}

export function deleteHub(uid: string) {
    return apiFetch<void>(`/api/hubs/${uid}`, { method: 'DELETE' })
}
export async function syncHubMeters(uid: string): Promise<void> {
    return apiFetch(`/api/hubs/${uid}/sync-meters`, { method: 'PUT' })
}