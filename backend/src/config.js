import 'dotenv/config'

function required(name, minLength = 1) {
  const v = process.env[name]
  if (!v || v.length < minLength) {
    throw new Error(`Missing ${name} in backend/.env${minLength > 1 ? ` (at least ${minLength} characters)` : ''}. Run "npm run setup:env" to generate secrets.`)
  }
  return v
}

export const config = {
  port: Number(process.env.PORT || 4000),
  databaseUrl: required('DATABASE_URL'),
  // Pepper: a secret kept OUT of the database, mixed into every password before bcrypt.
  pepper: required('PEPPER', 32),
  jwtSecret: required('JWT_SECRET', 32),
  // Fixed at 12 as requested; do not read this from the environment.
  bcryptRounds: 12,
  production: process.env.NODE_ENV === 'production',
  // Optional: use a separate schema (the tests do this so they never touch real data).
  dbSchema: /^[a-z0-9_]+$/.test(process.env.DB_SCHEMA || '') ? process.env.DB_SCHEMA : '',
}
