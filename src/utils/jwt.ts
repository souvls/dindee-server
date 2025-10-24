import jwt, { SignOptions } from 'jsonwebtoken'
import { config } from '@/config'
import { JWTPayload, AuthTokens } from '@/types'
import redis from '@/config/redis'

export const generateTokens = (userId: string, email: string, role: string): AuthTokens => {
  const payload: JWTPayload = { userId, email, role }
  
  const accessSecret: string = config.jwt.accessSecret
  const refreshSecret: string = config.jwt.refreshSecret
  
  const accessToken = jwt.sign(payload, accessSecret, {
    expiresIn: config.jwt.accessExpiresIn as string,
  } as SignOptions)
  
  const refreshToken = jwt.sign(payload, refreshSecret, {
    expiresIn: config.jwt.refreshExpiresIn as string,
  } as SignOptions)
  
  return { accessToken, refreshToken }
}

export const verifyAccessToken = (token: string): JWTPayload => {
  const accessSecret = config.jwt.accessSecret
  return jwt.verify(token, accessSecret) as JWTPayload
}

export const verifyRefreshToken = (token: string): JWTPayload => {
  const refreshSecret = config.jwt.refreshSecret
  return jwt.verify(token, refreshSecret) as JWTPayload
}

export const storeRefreshToken = async (userId: string, token: string): Promise<void> => {
  const key = `refresh_token:${userId}`
  // Store refresh token with expiry time (7 days)
  await redis.setex(key, 7 * 24 * 60 * 60, token)
}

export const getStoredRefreshToken = async (userId: string): Promise<string | null> => {
  const key = `refresh_token:${userId}`
  return await redis.get(key)
}

export const deleteRefreshToken = async (userId: string): Promise<void> => {
  const key = `refresh_token:${userId}`
  await redis.del(key)
}

export const blacklistAccessToken = async (token: string): Promise<void> => {
  const decoded = jwt.decode(token) as any
  if (decoded?.exp) {
    const ttl = decoded.exp - Math.floor(Date.now() / 1000)
    if (ttl > 0) {
      await redis.setex(`blacklist:${token}`, ttl, '1')
    }
  }
}

export const isTokenBlacklisted = async (token: string): Promise<boolean> => {
  const result = await redis.get(`blacklist:${token}`)
  return result !== null
}