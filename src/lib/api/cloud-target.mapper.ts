import type { CloudTarget, CloudTargetFormValues } from '@/types/cloud-target'

// backend response -> FE shape
export function fromBackend(raw: any): CloudTarget {
    return {
        id: String(raw.id),
        name: raw.name,
        apiBaseUrl: raw.api_base_url,
        cloudServerId: raw.api_key,
        cloudServerSecret: raw.api_secret_masked,
        uploadIntervalSeconds: raw.upload_interval_sec,
        enabled: raw.enabled,
        lastUploadAt: raw.last_upload_at ?? null,
        pendingCount: raw.pending_count,
    }
}

// FE form -> backend request shape
export function toBackend(form: CloudTargetFormValues) {
    return {
        name: form.name,
        api_base_url: form.apiBaseUrl,
        api_key: form.cloudServerId,
        api_secret: form.cloudServerSecret,
        upload_interval_sec: form.uploadIntervalSeconds,
        enabled: form.enabled,
    }
}