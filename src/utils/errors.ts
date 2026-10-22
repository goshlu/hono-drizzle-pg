import type { ContentfulStatusCode } from 'hono/utils/http-status'

export class ApiError extends Error {
  constructor(
    public readonly status: ContentfulStatusCode,
    message: string,
    public readonly data?: unknown
  ) {
    super(message)
    this.name = 'ApiError'
  }
}
