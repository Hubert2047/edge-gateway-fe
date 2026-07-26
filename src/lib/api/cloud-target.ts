import { apiFetch } from './client'
import type { CloudTarget, CloudTargetFormValues, TestConnectionResult } from '@/types/cloud-target'

export function getCloudTargets() {
    return apiFetch<CloudTarget[]>('/api/cloud-targets')
}

export function createCloudTarget(form: CloudTargetFormValues) {
    return apiFetch<CloudTarget>('/api/cloud-targets', { method: 'POST', body: JSON.stringify(form) })
}

export function updateCloudTarget(id: string, form: CloudTargetFormValues) {
    return apiFetch<CloudTarget>(`/api/cloud-targets/${id}`, { method: 'PUT', body: JSON.stringify(form) })
}

export function deleteCloudTarget(id: string) {
    return apiFetch<void>(`/api/cloud-targets/${id}`, { method: 'DELETE' })
}

export function testCloudTargetConnection(id: string) {
    return apiFetch<TestConnectionResult>(`/api/cloud-targets/${id}/test`, { method: 'POST' })
}