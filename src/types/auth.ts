export interface LoginRequest {
    username: string
    password: string
}

export interface LoginResponse {
    ok:boolean
    data:{
        token: string
        user: {
            id: number
            username: string
            role: string
            locale: string
        }
        appConfig?: {
            timeZone: string
        }
    }
}
