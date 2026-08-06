export type AppConfig = {
    timeZone: string
}

export type UserSettings = {
    locale: string
    appConfig: AppConfig
}

export type UpdateSettingsInput = {
    locale: string
    timeZone?: string
}
