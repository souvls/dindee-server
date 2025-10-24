import { Router } from 'express'
import authRoutes from '../auth'
import postRoutes from '../posts'
import chatRoutes from '../chat'
import reportRoutes from '../report'

const router: Router = Router()

// V1 API Routes
router.use('/auth', authRoutes)
router.use('/posts', postRoutes) // Legacy posts routes
router.use('/chats', chatRoutes)
router.use('/reports', reportRoutes)


// V1 API Info
router.get('/', (req, res) => {
  res.json({
    version: '1.0.0',
    name: 'Real Estate API v1',
    description: 'REST API for Real Estate Application',
    endpoints: {
      auth: '/api/v1/auth',
      posts: '/api/v1/posts', // Legacy
      chats: '/api/v1/chats',
      reports: '/api/v1/reports',
      properties: '/api/v1/properties', // New properties system
      admin: '/api/v1/admin'
    },
    documentation: '/api/v1/docs'
  })
})

export default router