import fs from 'fs'
import path from 'path'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import { config } from './config.js'

function resolveUsersPath() {
  const candidates = []
  if (process.env.AUTH_USERS_PATH) {
    candidates.push(path.resolve(process.cwd(), process.env.AUTH_USERS_PATH))
  }
  candidates.push(path.resolve(process.cwd(), 'config', 'users.json'))
  candidates.push(path.resolve(process.cwd(), 'backend-node', 'config', 'users.json'))
  return candidates.find((p) => fs.existsSync(p)) || candidates[0]
}

function loadUsers() {
  try {
    const usersPath = resolveUsersPath()
    const raw = fs.readFileSync(usersPath, 'utf-8')
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch (err) {
    return []
  }
}

export function isAuthEnabled() {
  const users = loadUsers()
  return config.auth.enabled && users.length > 0
}

export async function authenticate(username, password) {
  const users = loadUsers()
  const user = users.find((u) => u.username === username)
  if (!user || !user.password_hash) return null
  try {
    const ok = await bcrypt.compare(password, user.password_hash)
    if (!ok) return null
  } catch (err) {
    return null
  }
  return { username: user.username, roles: user.roles || [] }
}

export function signToken(payload) {
  return jwt.sign(payload, config.auth.jwtSecret, { expiresIn: '8h' })
}

export function verifyToken(token) {
  return jwt.verify(token, config.auth.jwtSecret)
}

export function listUsersSafe() {
  const users = loadUsers()
  return users.map((u) => ({
    username: u.username,
    roles: u.roles || []
  }))
}

export function authMiddleware(req, res, next) {
  if (!isAuthEnabled()) return next()
  const header = req.headers.authorization || ''
  const [, token] = header.split(' ')
  if (!token) {
    return res.status(401).json({ status: 'error', detail: 'Unauthorized' })
  }
  try {
    const decoded = verifyToken(token)
    req.user = decoded
    return next()
  } catch (err) {
    return res.status(401).json({ status: 'error', detail: 'Invalid token' })
  }
}
