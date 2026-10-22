export type AuthPayload = {
  sub: number
  email: string
  name: string
  role: string
  exp: number
}

export type AppEnv = {
  Bindings: {
    JWT_SECRET: string
  }
  Variables: {
    user: AuthPayload
  }
}
