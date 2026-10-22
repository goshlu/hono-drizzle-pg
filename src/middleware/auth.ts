import { verify } from 'hono/jwt'
import { Context, Next } from 'hono'
import { fail } from '../utils/response'

export const authMiddleware = async (c: Context, next: Next) => {
  const path = c.req.path
  if (c.req.method === 'POST' && path === '/users') {
    await next()
    return
  }
  if (path === '/users/login') {
    await next()
    return
  }

  const authHeader = c.req.header('Authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return fail(c, '未携带token', 401)
  }
  const token = authHeader.split(' ')[1]
  try {
    const payload = await verify(token, c.env.JWT_SECRET!, 'HS256')
    c.set('user', payload)
    await next()
  } catch (err) {
    return fail(c, 'token无效或已过期', 401)
  }
}
