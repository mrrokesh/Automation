import bcrypt from 'bcrypt'
import { createHmac } from 'node:crypto'
import { config } from './config.js'

// Salt: bcrypt generates a fresh random salt per hash and stores it inside the hash string.
// Pepper: HMAC-SHA256(password, PEPPER) first, so a stolen database alone cannot be cracked offline,
//         and the base64 digest (44 chars) stays under bcrypt's 72-byte input limit.
// Rounds: 12 (cost factor), so each hash does 2^12 iterations.
const peppered = (password) => createHmac('sha256', config.pepper).update(password).digest('base64')

export const hashPassword = (password) => bcrypt.hash(peppered(password), config.bcryptRounds)

export const verifyPassword = (password, hash) => bcrypt.compare(peppered(password), hash)

// Used to equalise timing when the email does not exist (so login time does not reveal valid emails).
export const DUMMY_HASH = bcrypt.hashSync('dummy-password-for-timing', config.bcryptRounds)
