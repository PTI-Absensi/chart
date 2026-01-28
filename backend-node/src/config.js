import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

dotenv.config()

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export const config = {
  port: Number(process.env.PORT || 8000),
  db: {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 5432),
    database: process.env.DB_NAME || 'olahproc',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || ''
  },
  auth: {
    enabled: process.env.AUTH_ENABLED ? process.env.AUTH_ENABLED === 'true' : true,
    jwtSecret: process.env.JWT_SECRET || 'change-this-secret',
    usersPath: process.env.AUTH_USERS_PATH || path.resolve(__dirname, '../config/users.json')
  }
}
