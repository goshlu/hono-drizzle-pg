import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi'
import type { AppEnv } from '../env'
import { userInsertSchema, userUpdateSchema } from '../db/schema'
import { userController } from '../controllers/user.controller'
import { openApiHonoOptions } from '../middleware/errorHandler'

const userRouter = new OpenAPIHono<AppEnv>(openApiHonoOptions)

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

const userViewSchema = z.object({
  id: z.number(),
  name: z.string(),
  email: z.string(),
  createdAt: z.date().nullable()
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
            list: z.array(userViewSchema),
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
userRouter.openapi(listRoute, (c) => userController.list(c, c.req.valid('query')))

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
          schema: respSchema(userViewSchema)
        }
      }
    },
    401: { description: '未登录或 token 无效' },
    404: { description: '用户不存在' }
  }
})
userRouter.openapi(getOneRoute, (c) => userController.getOne(c, c.req.valid('param').id))

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
          schema: respSchema(userViewSchema)
        }
      }
    }
  }
})
userRouter.openapi(registerRoute, (c) => userController.register(c, c.req.valid('json')))

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
userRouter.openapi(loginRoute, (c) => userController.login(c, c.req.valid('json')))

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
userRouter.openapi(updateRoute, (c) =>
  userController.update(c, c.req.valid('param').id, c.req.valid('json'))
)

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
userRouter.openapi(deleteRoute, (c) => userController.remove(c, c.req.valid('param').id))

export default userRouter
