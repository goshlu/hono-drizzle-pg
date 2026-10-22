import { pgTable, serial, text, timestamp, varchar } from 'drizzle-orm/pg-core'
import { createInsertSchema, createUpdateSchema } from 'drizzle-zod'

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 50 }).notNull(),
  email: varchar('email', { length: 100 }).notNull().unique(),
  password: text('password').notNull(),
  role: varchar('role', { length: 20 }).notNull().default('user'), // user / admin
  createdAt: timestamp('created_at').defaultNow()
})

export const userInsertSchema = createInsertSchema(users).omit({ id: true, createdAt: true })
export const userUpdateSchema = createUpdateSchema(users).omit({ id: true, createdAt: true })
