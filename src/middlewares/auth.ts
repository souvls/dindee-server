import { Request, Response, NextFunction } from 'express'
import { verifyAccessToken, isTokenBlacklisted } from '@/utils/jwt'
import { User } from '@/models/User'

export interface AuthRequest extends Request {
  user?: any
}

export const auth = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authHeader = req.headers.authorization
    
    if (!authHeader?.startsWith('Bearer ')) {
      res.status(401).json({ error: 'No token provided' })
      return
    }
    
    const token = authHeader.substring(7) // Remove 'Bearer ' prefix
    
    // Check if token is blacklisted
    if (await isTokenBlacklisted(token)) {
      res.status(401).json({ error: 'Token has been revoked' })
      return
    }
    
    // Verify token
    const decoded = verifyAccessToken(token)
    
    // Get user from database
    const user = await User.findById(decoded.userId).select('-password')
    if (!user) {
      res.status(401).json({ error: 'User not found' })
      return
    }
    
    // Attach user to request
    req.user = user
    next()
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === 'TokenExpiredError') {
        res.status(401).json({ error: 'Token expired' })
        return
      }
      if (error.name === 'JsonWebTokenError') {
        res.status(401).json({ error: 'Invalid token' })
        return
      }
    }
    res.status(500).json({ error: 'Internal server error' })
  }
}

export const admin = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' })
      return
    }
    
    if (req.user.role !== 'admin') {
      res.status(403).json({ error: 'Admin access required' })
      return
    }
    
    next()
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' })
  }
}