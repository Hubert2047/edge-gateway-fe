import { apiFetch } from './client'
import type { Meter, MeterFormValues, MeterUpdateValues } from '@/types/meter'

export async function getMeters(hubUid?: string): Promise<Meter[]> {
  const query = hubUid ? `?hubUid=${encodeURIComponent(hubUid)}` : ''
  return apiFetch<Meter[]>(`/api/meters${query}`)
}

export async function createMeter(hubUid: string, values: MeterFormValues): Promise<Meter> {
  return apiFetch<Meter>('/api/meters', {
    method: 'POST',
    body: JSON.stringify({ hubUid, ...values }),
  })
}

export async function updateMeter(values: MeterUpdateValues): Promise<Meter> {
  const { macId, ...rest } = values
  return apiFetch<Meter>(`/api/meters/${encodeURIComponent(macId)}`, {
    method: 'PUT',
    body: JSON.stringify(rest),
  })
}

export async function deleteMeter(macId: string): Promise<void> {
  return apiFetch<void>(`/api/meters/${encodeURIComponent(macId)}`, {
    method: 'DELETE',
  })
}