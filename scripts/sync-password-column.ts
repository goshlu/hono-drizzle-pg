import 'dotenv/config'
import postgres from 'postgres'

async function main() {
  const sql = postgres(process.env.DATABASE_URL!)

  await sql.unsafe('ALTER TABLE users DROP COLUMN IF EXISTS age')
  await sql.unsafe('ALTER TABLE users ADD COLUMN IF NOT EXISTS password text')
  await sql.unsafe("UPDATE users SET password = '123456' WHERE password IS NULL")
  await sql.unsafe('ALTER TABLE users ALTER COLUMN password SET NOT NULL')

  console.log('users table synced (password column ready)')
  await sql.end()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
