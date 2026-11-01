import pg from 'pg'
import { config } from './config.js'

export const pool = new pg.Pool({ connectionString: config.databaseUrl, max: 10, connectionTimeoutMillis: 10000 })

pool.on('error', (err) => console.error('Unexpected database error:', err.message))

export const query = (text, params) => pool.query(text, params)
