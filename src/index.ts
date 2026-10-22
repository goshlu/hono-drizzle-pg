import 'dotenv/config'
import { serve } from '@hono/node-server'
import { OpenAPIHono } from '@hono/zod-openapi'
import { apiReference } from '@scalar/hono-api-reference'
import userRouter from './routes/user'
import { authMiddleware } from './middleware/auth'
import { errorHandler, openApiHonoOptions } from './middleware/errorHandler'
import { logger } from './middleware/logger'
import type { AppEnv } from './env'

// 替换 Hono → OpenAPIHono
const app = new OpenAPIHono<AppEnv>(openApiHonoOptions)

// Node 环境注入 JWT 密钥（与 .env 中 JWT_SECRET 一致）
app.use('*', async (c, next) => {
  c.env = { JWT_SECRET: process.env.JWT_SECRET! }
  await next()
})

// 全局日志
app.use('*', logger)

app.onError(errorHandler)

// JWT Bearer 鉴权（Scalar / OpenAPI「Authorize」）
app.openAPIRegistry.registerComponent('securitySchemes', 'JwtAuth', {
  type: 'http',
  scheme: 'bearer',
  bearerFormat: 'JWT',
  description:
    '先调用 POST /users/login 获取 token，再在请求头携带：Authorization: Bearer {token}'
})

// OpenAPI 基础信息
app.doc('/openapi.json', {
  openapi: '3.1.0',
  info: {
    title: 'Hono-Drizzle-PG API',
    version: '1.0.0',
    description: '用户管理后端接口文档。除注册、登录外，其余 /users 接口需 JWT 鉴权。'
  }
})

// Scalar 文档页面，访问 http://localhost:3000/doc
app.get(
  '/doc',
  apiReference({
    spec: { url: '/openapi.json' },
    theme: 'default',
    layout: 'modern'
  })
)

app.get('/', c => c.text('Hono + Drizzle PG OK | /doc 查看接口文档'))

app.use('/users/*', authMiddleware)
app.route('/users', userRouter)

serve({
  fetch: app.fetch,
  port: 3000
})
console.log('✅ 服务启动 :3000')
console.log('📖 文档地址：http://localhost:3000/doc')
