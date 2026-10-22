import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi'
import type { AppEnv, AuthPayload } from '../env'
import { db } from '../db'
import { users, userInsertSchema, userUpdateSchema } from '../db/schema'
import { eq, or, ilike, count } from 'drizzle-orm'
import { sign } from 'hono/jwt'
import bcrypt from 'bcryptjs'
import { success, fail } from '../utils/response'

const userRouter = new OpenAPIHono<AppEnv>()

// 公共返回包装 schema（给文档看）
const respSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.object({
    code: z.number(),
    msg: z.string(),
    data: dataSchema
  })

const errorSchema = z.object({
  code: z.number(),
  msg: z.string(),
  data: z.unknown().optional()
})

// --------------------------
// 分页列表接口
// --------------------------
const listRoute = createRoute({
  method: 'get',
  path: '/',
  summary: '用户列表（分页+搜索）',
  security: [{ JwtAuth: [] }],
  request: {
    query: z.object({
      page: z.coerce.number().int().min(1).default(1).openapi({ description: '页码' }),
      size: z.coerce.number().int().min(1).max(100).default(10).openapi({ description: '每页条数' }),
      keyword: z.string().optional().openapi({ description: '搜索关键词，匹配name/email' })
    })
  },
  responses: {
    200: {
      description: '成功',
      content: {
        'application/json': {
          schema: respSchema(z.object({
            list: z.array(z.object({
              id: z.number(),
              name: z.string(),
              email: z.string(),
              createdAt: z.date().nullable()
            })),
            page: z.number(),
            size: z.number(),
            total: z.number(),
            totalPage: z.number()
          }))
        }
      }
    },
    401: { description: '未登录或 token 无效' }
  }
})
userRouter.openapi(listRoute, async (c) => {
  const { page, size, keyword } = c.req.valid('query')
  const whereCond = keyword
    ? or(ilike(users.name, `%${keyword}%`), ilike(users.email, `%${keyword}%`))
    : undefined
  const [totalRow] = await db.select({ total: count() }).from(users).where(whereCond)
  const total = Number(totalRow.total)
  const list = await db
    .select({ id: users.id, name: users.name, email: users.email, createdAt: users.createdAt })
    .from(users)
    .where(whereCond)
    .limit(size)
    .offset((page - 1) * size)
  return success(c, { list, page, size, total, totalPage: Math.ceil(total / size) })
})

// --------------------------
// 获取单个用户
// --------------------------
const getOneRoute = createRoute({
  method: 'get',
  path: '/:id',
  summary: '获取单个用户',
  security: [{ JwtAuth: [] }],
  request: {
    params: z.object({
      id: z.coerce.number().openapi({ description: '用户ID' })
    })
  },
  responses: {
    200: {
      description: '成功',
      content: {
        'application/json': {
          schema: respSchema(z.object({
            id: z.number(),
            name: z.string(),
            email: z.string(),
            createdAt: z.date().nullable()
          }))
        }
      }
    },
    401: { description: '未登录或 token 无效' },
    404: { description: '用户不存在' }
  }
})
userRouter.openapi(getOneRoute, async (c) => {
  const id = c.req.valid('param').id
  const [user] = await db.select({ id: users.id, name: users.name, email: users.email, createdAt: users.createdAt }).from(users).where(eq(users.id, id))
  if (!user) return fail(c, '用户不存在', 404)
  return success(c, user)
})

// --------------------------
// 注册
// --------------------------
const registerRoute = createRoute({
  method: 'post',
  path: '/',
  summary: '用户注册',
  security: [],
  request: {
    body: {
      content: {
        'application/json': { schema: userInsertSchema }
      }
    }
  },
  responses: {
    201: {
      description: '注册成功',
      content: {
        'application/json': {
          schema: respSchema(z.object({
            id: z.number(),
            name: z.string(),
            email: z.string(),
            createdAt: z.date().nullable()
          }))
        }
      }
    }
  }
})
userRouter.openapi(registerRoute, async (c) => {
  const body = c.req.valid('json')
  const hashPwd = await bcrypt.hash(body.password, 10)
  const [newUser] = await db.insert(users).values({ ...body, password: hashPwd })
    .returning({ id: users.id, name: users.name, email: users.email, createdAt: users.createdAt })
  return success(c, newUser, '注册成功', 201)
})

// --------------------------
// 登录
// --------------------------
const loginRoute = createRoute({
  method: 'post',
  path: '/login',
  summary: '用户登录',
  security: [],
  request: {
    body: {
      content: {
        'application/json': {
          schema: z.object({
            email: z.string().email(),
            password: z.string().min(6)
          })
        }
      }
    }
  },
  responses: {
    200: {
      description: '登录成功',
      content: {
        'application/json': {
          schema: respSchema(z.object({ token: z.string() }))
        }
      }
    },
    401: {
      description: '账号不存在或密码错误',
      content: {
        'application/json': { schema: errorSchema }
      }
    }
  }
})
userRouter.openapi(loginRoute, async (c) => {
  const { email, password } = c.req.valid('json')
  const [user] = await db.select().from(users).where(eq(users.email, email))
  if (!user) return fail(c, '账号不存在', 401)
  const ok = await bcrypt.compare(password, user.password)
  if (!ok) return fail(c, '密码错误', 401)
  const payload: AuthPayload = { sub: user.id, email: user.email, name: user.name, role: user.role, exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7 }
  const token = await sign(payload, c.env.JWT_SECRET!)
  return success(c, { token }, '登录成功')
})

// --------------------------
// 修改用户
// --------------------------
const updateRoute = createRoute({
  method: 'put',
  path: '/:id',
  summary: '修改用户信息',
  security: [{ JwtAuth: [] }],
  request: {
    params: z.object({ id: z.coerce.number() }),
    body: {
      content: { 'application/json': { schema: userUpdateSchema } }
    }
  },
  responses: {
    200: { description: '修改成功' },
    401: { description: '未登录或 token 无效' },
    404: { description: '用户不存在' }
  }
})
userRouter.openapi(updateRoute, async (c) => {
  const id = c.req.valid('param').id
  const body = c.req.valid('json')
  if (body.password) body.password = await bcrypt.hash(body.password, 10)
  const [updated] = await db.update(users).set(body).where(eq(users.id, id))
    .returning({ id: users.id, name: users.name, email: users.email, createdAt: users.createdAt })
  if (!updated) return fail(c, '用户不存在', 404)
  return success(c, updated, '修改成功')
})

// --------------------------
// 删除用户
// --------------------------
const deleteRoute = createRoute({
  method: 'delete',
  path: '/:id',
  summary: '删除用户',
  security: [{ JwtAuth: [] }],
  request: { params: z.object({ id: z.coerce.number() }) },
  responses: {
    200: { description: '删除成功' },
    401: { description: '未登录或 token 无效' },
    404: { description: '用户不存在' }
  }
})
userRouter.openapi(deleteRoute, async (c) => {
  const id = c.req.valid('param').id
  const [del] = await db.delete(users).where(eq(users.id, id))
    .returning({ id: users.id, name: users.name, email: users.email, createdAt: users.createdAt })
  if (!del) return fail(c, '用户不存在', 404)
  return success(c, null, '删除成功')
})

export default userRouter
