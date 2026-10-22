import { Context, Next } from 'hono'

export const logger = async (c: Context, next: Next) => {
    const start = Date.now()
    await next()
    const ms = Date.now() - start
    console.log(`[${new Date().toLocaleString()}] ${c.req.method} ${c.req.path} ${c.res.status} ${ms}ms`)
}
