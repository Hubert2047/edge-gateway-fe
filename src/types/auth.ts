export interface LoginRequest {
    username: string
    password: string
}

export interface LoginResponse {
    token: string
    user: {
        name: string
        role: string
    }
}
w
