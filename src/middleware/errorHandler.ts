import type { Hook } from '@hono/zod-openapi'
import type { Context } from 'hono'
import { HTTPException } from 'hono/http-exception'
import type { ContentfulStatusCode } from 'hono/utils/http-status'
import { ZodError } from 'zod'
import type { AppEnv } from '../env'
import { ApiError } from '../utils/errors'
import { fail } from '../utils/response'

function formatZodIssues(error: ZodError) {
  return error.issues.map(issue => ({
    path: issue.path.map(String).join('.') || '(root)',
    message: issue.message
  }))
}

function zodFailMessage(error: ZodError) {
  return error.issues[0]?.message ?? '请求参数校验失败'
}

interface PostgresErrorLike {
  code: string
  detail?: string
}

function isPostgresError(err: unknown): err is PostgresErrorLike {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    typeof (err as PostgresErrorLike).code === 'string' &&
    /^\d{5}$/.test((err as PostgresErrorLike).code)
  )
}

function mapPostgresError(err: PostgresErrorLike): ApiError | null {
  switch (err.code) {
    case '23505':
      return new ApiError(409, '数据已存在', { detail: err.detail })
    case '23503':
      return new ApiError(400, '关联数据不存在或无法删除')
    case '22P02':
      return new ApiError(400, '参数格式无效')
    default:
      return null
  }
}

export function resolveAppError(err: unknown): {
  status: ContentfulStatusCode
  message: string
  data?: unknown
} {
  if (err instanceof ApiError) {
    return { status: err.status, message: err.message, data: err.data }
  }
  if (err instanceof HTTPException) {
    return { status: err.status as ContentfulStatusCode, message: err.message }
  }
  if (err instanceof ZodError) {
    return {
      status: 400,
      message: zodFailMessage(err),
      data: formatZodIssues(err)
    }
  }
  if (isPostgresError(err)) {
    const mapped = mapPostgresError(err)
    if (mapped) {
      return { status: mapped.status, message: mapped.message, data: mapped.data }
    }
  }

  const detail = err instanceof Error ? err.message : String(err)
  return { status: 500, message: '服务器内部错误', data: detail }
}

export function errorHandler(err: unknown, c: Context<AppEnv>) {
  const resolved = resolveAppError(err)
  if (resolved.status === 500 && !(err instanceof ApiError)) {
    console.error('❌ 服务异常：', err)
  }
  return fail(c, resolved.message, resolved.status, resolved.data)
}

export const openApiDefaultHook: Hook<any, AppEnv, any, any> = (result, c) => {
  if (!result.success) {
    return fail(c, zodFailMessage(result.error), 400, formatZodIssues(result.error))
  }
}

export const openApiHonoOptions = {
  defaultHook: openApiDefaultHook
} as const
