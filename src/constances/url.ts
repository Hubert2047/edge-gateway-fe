export const GATEWAY_ENDPOINT = {
    base: '/api/v1/gateways',
    syncMeter: (gatewayId: number | string) => `${GATEWAY_ENDPOINT.base}/${gatewayId}/sync-meters`,
    getMeters: (gatewayId: number | string) => `${GATEWAY_ENDPOINT.base}/${gatewayId}/meters`,
}
export const METER_ENDPOINT = {
    base: '/api/v1/meters',
    batch: (gatewayId: number | string) => `${METER_ENDPOINT.base}/batch/${encodeURIComponent(gatewayId)}`,
    update: (meterId: string, gatewayId: number | string) =>
        `${METER_ENDPOINT.base}/${encodeURIComponent(meterId)}/gateway/${encodeURIComponent(gatewayId)}`,
    delete: (meterId: string, gatewayId: number | string) =>
        `${METER_ENDPOINT.base}/${encodeURIComponent(meterId)}/gateway/${encodeURIComponent(gatewayId)}`,
}
export const CLOUD_TARGET_ENDPOINT = {
    base: '/api/v1/cloud-targets',
    test: (id: string) => `${CLOUD_TARGET_ENDPOINT.base}/${id}/test`,
    flushAll: '/api/v1/cloud-targets/flush',
    flush: (id: string) => `${CLOUD_TARGET_ENDPOINT.base}/${id}/flush`,
}
export const USER_ENDPOINT = {
    base: '/api/v1/users',
    resetPass: (id: string) => `${USER_ENDPOINT.base}/${encodeURIComponent(id)}/password`,
    changeName: (id: string) => `${USER_ENDPOINT.base}/${encodeURIComponent(id)}/username`,
    changeRole: (id: string) => `${USER_ENDPOINT.base}/${encodeURIComponent(id)}/role`,
    enable: (id: string) => `${USER_ENDPOINT.base}/${encodeURIComponent(id)}/enabled`,
}
export const AUTH_ENDPOINT = {
    login: '/api/v1/login',
}
export const SETTINGS_ENDPOINT = {
    base: '/api/v1/settings',
}
export const TIMESERIES_ENDPOINT = {
    base: '/api/v1/readings/timeseries',
}
export const OVERVIEW_ENDPOINT = {
    metersActivePower: '/api/v1/overview/meters-active-power',
}
