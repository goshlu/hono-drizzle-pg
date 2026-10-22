import type { Context } from 'hono'
import type { AppEnv } from '../env'
import {
  userService,
  type ListUsersQuery,
  type LoginUserInput,
  type RegisterUserInput,
  type UpdateUserInput
} from '../services/user.service'
import { success } from '../utils/response'

export const userController = {
  async list(c: Context<AppEnv>, query: ListUsersQuery) {
    return success(c, await userService.listUsers(query))
  },

  async getOne(c: Context<AppEnv>, id: number) {
    return success(c, await userService.getUser(id))
  },

  async register(c: Context<AppEnv>, input: RegisterUserInput) {
    return success(c, await userService.register(input), '注册成功', 201)
  },

  async login(c: Context<AppEnv>, input: LoginUserInput) {
    const { token } = await userService.login(input, c.env.JWT_SECRET)
    return success(c, { token }, '登录成功')
  },

  async update(c: Context<AppEnv>, id: number, input: UpdateUserInput) {
    return success(c, await userService.updateUser(id, input), '修改成功')
  },

  async remove(c: Context<AppEnv>, id: number) {
    await userService.removeUser(id)
    return success(c, null, '删除成功')
  }
}
