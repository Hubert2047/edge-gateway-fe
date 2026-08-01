export const GATEWAY_ENDPOINT = {
    base: '/api/v1/gateways',
    syncMeter: (uid: string) => `${GATEWAY_ENDPOINT.base}/${uid}/sync-meters`,
    getMeters: (uid: string) => `${GATEWAY_ENDPOINT.base}/${uid}/meters`,
}
export const METER_ENDPOINT = {
    base: '/api/v1/meters',
}
export const CLOUD_TARGET_ENDPOINT = {
    base: '/api/v1/cloud-targets',
    test: (id: string) => `${CLOUD_TARGET_ENDPOINT.base}/${id}/test`,
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
