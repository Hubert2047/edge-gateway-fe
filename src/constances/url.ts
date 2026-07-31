const GATEWAY_ENPOINT = {
    base: '/api/v1/gateways',
    syncMeter: (uid: string) => `${GATEWAY_ENPOINT.base}/${uid}/meters`,
    getMeters: (uid: string) => `${GATEWAY_ENPOINT.base}/${uid}/sync-meters`,
}
const METER_ENPOINT = {
    base: '/api/v1/meters',
}
const CLOUD_TARGET_ENPOINT = {
    base: '/api/v1/cloud-targets',
    test: (id: string) => `/api/v1/cloud-targets/${id}/test`,
}
const USER_ENPOINT = {
    base: '/api/v1/users',
}
