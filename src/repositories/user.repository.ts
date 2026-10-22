import { count, eq, ilike, or } from 'drizzle-orm'
import { db } from '../db'
import { users } from '../db/schema'

const publicColumns = {
  id: users.id,
  name: users.name,
  email: users.email,
  createdAt: users.createdAt
}

export type UserView = {
  id: number
  name: string
  email: string
  createdAt: Date | null
}

export interface FindUsersOptions {
  keyword?: string
  limit: number
  offset: number
}

export const userRepository = {
  async findPage({ keyword, limit, offset }: FindUsersOptions) {
    const where = keyword
      ? or(ilike(users.name, `%${keyword}%`), ilike(users.email, `%${keyword}%`))
      : undefined

    const [[{ total }], list] = await Promise.all([
      db.select({ total: count() }).from(users).where(where),
      db.select(publicColumns).from(users).where(where).limit(limit).offset(offset)
    ])

    return { list, total: Number(total) }
  },

  async findById(id: number): Promise<UserView | undefined> {
    const [user] = await db.select(publicColumns).from(users).where(eq(users.id, id))
    return user
  },

  async findByEmail(email: string) {
    const [user] = await db.select().from(users).where(eq(users.email, email))
    return user
  },

  async create(values: typeof users.$inferInsert): Promise<UserView | undefined> {
    const [user] = await db.insert(users).values(values).returning(publicColumns)
    return user
  },

  async update(id: number, values: Partial<typeof users.$inferInsert>): Promise<UserView | undefined> {
    const [user] = await db
      .update(users)
      .set(values)
      .where(eq(users.id, id))
      .returning(publicColumns)
    return user
  },

  async remove(id: number): Promise<UserView | undefined> {
    const [user] = await db.delete(users).where(eq(users.id, id)).returning(publicColumns)
    return user
  }
}
