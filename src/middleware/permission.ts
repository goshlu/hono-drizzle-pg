import { Context, Next } from 'hono'
import type { AppEnv } from '../env'
import { fail } from '../utils/response'

// 必须是管理员
export const mustAdmin = async (c: Context<AppEnv>, next: Next) => {
    const user = c.get('user')
    if (user.role !== 'admin') {
        return fail(c, '无管理员权限', 403)
    }
    await next()
}

// 可选：只能操作自己资源（普通用户校验）
export const selfOnly = async (c: Context<AppEnv>, next: Next) => {
    const user = c.get('user')
    const targetId = Number(c.req.param('id'))
    // admin 放行，普通用户只能访问自己
    if (user.role !== 'admin' && user.sub !== targetId) {
        return fail(c, '只能操作自己的资源', 403)
    }
    await next()
}
