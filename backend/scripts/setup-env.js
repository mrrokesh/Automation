// Creates backend/.env with freshly generated PEPPER and JWT_SECRET. Never overwrites an existing file.
// DATABASE_URL is left blank on purpose: paste it into the file yourself.
import { existsSync, writeFileSync } from 'node:fs'
import { randomBytes } from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { join } from 'node:path'

const file = join(fileURLToPath(new URL('.', import.meta.url)), '..', '.env')
if (existsSync(file)) {
  console.log('backend/.env already exists, leaving it alone.')
} else {
  const secret = () => randomBytes(48).toString('base64url')
  writeFileSync(
    file,
    `# Fill in DATABASE_URL, e.g. postgresql://user:password@host:5432/dbname
DATABASE_URL=
# Generated secrets. Keep them private. Changing PEPPER invalidates every stored password.
PEPPER=${secret()}
JWT_SECRET=${secret()}
PORT=4000
`,
    { mode: 0o600 },
  )
  console.log('Created backend/.env. Now open it and set DATABASE_URL.')
}
