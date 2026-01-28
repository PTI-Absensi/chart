import fs from 'fs'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import { config } from './config.js'

function loadUsers() {
  try {
    const raw = fs.readFileSync(config.auth.usersPath, 'utf-8')
    return JSON.parse(raw)
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
  if (!user) return null
  const ok = await bcrypt.compare(password, user.password_hash)
  if (!ok) return null
  return { username: user.username, roles: user.roles || [] }
}

export function signToken(payload) {
  return jwt.sign(payload, config.auth.jwtSecret, { expiresIn: '8h' })
}

export function verifyToken(token) {
  return jwt.verify(token, config.auth.jwtSecret)
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
