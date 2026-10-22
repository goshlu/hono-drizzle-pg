import { sign } from 'hono/jwt'
import type { AuthPayload } from '../env'
import { hashPassword, verifyPassword } from '../lib/password'
import { userRepository } from '../repositories/user.repository'
import { ApiError } from '../utils/errors'

export interface ListUsersQuery {
  page: number
  size: number
  keyword?: string
}

export interface RegisterUserInput {
  name: string
  email: string
  password: string
  role?: string
}

export interface LoginUserInput {
  email: string
  password: string
}

export interface UpdateUserInput {
  name?: string
  email?: string
  password?: string
  role?: string
}

const TOKEN_TTL_SECONDS = 60 * 60 * 24 * 7

export const userService = {
  async listUsers({ page, size, keyword }: ListUsersQuery) {
    const { list, total } = await userRepository.findPage({
      keyword,
      limit: size,
      offset: (page - 1) * size
    })
    return { list, page, size, total, totalPage: Math.ceil(total / size) }
  },

  async getUser(id: number) {
    const user = await userRepository.findById(id)
    if (!user) throw new ApiError(404, '用户不存在')
    return user
  },

  async register(input: RegisterUserInput) {
    const password = await hashPassword(input.password)
    const user = await userRepository.create({ ...input, password })
    if (!user) throw new ApiError(500, '注册失败')
    return user
  },

  async login({ email, password }: LoginUserInput, secret: string) {
    const user = await userRepository.findByEmail(email)
    if (!user) throw new ApiError(401, '账号不存在')

    const valid = await verifyPassword(password, user.password)
    if (!valid) throw new ApiError(401, '密码错误')

    const payload: AuthPayload = {
      sub: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      exp: Math.floor(Date.now() / 1000) + TOKEN_TTL_SECONDS
    }
    return { token: await sign(payload, secret) }
  },

  async updateUser(id: number, input: UpdateUserInput) {
    const values = { ...input }
    if (values.password) values.password = await hashPassword(values.password)

    const user = await userRepository.update(id, values)
    if (!user) throw new ApiError(404, '用户不存在')
    return user
  },

  async removeUser(id: number) {
    const user = await userRepository.remove(id)
    if (!user) throw new ApiError(404, '用户不存在')
  }
}
