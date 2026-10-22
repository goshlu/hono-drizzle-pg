import type { Context } from 'hono'
import type { ContentfulStatusCode } from 'hono/utils/http-status'

export function success<T, S extends ContentfulStatusCode = 200>(
    c: Context,
    data: T,
    msg = '操作成功',
    status: S = 200 as S
) {
    return c.json({
        code: 200,
        msg,
        data
    }, status)
}

export function fail<D = unknown, S extends ContentfulStatusCode = 400>(
    c: Context,
    msg = '操作失败',
    code: S = 400 as S,
    data?: D
) {
    return c.json({
        code,
        msg,
        data
    }, code)
}
