import { Router } from 'express'
// Import future v2 controllers here
// import authV2Routes from './auth'
// import postV2Routes from './posts'

const router: Router = Router()

// Placeholder for V2 API Routes
// router.use('/auth', authV2Routes)
// router.use('/posts', postV2Routes)

// V2 API Info
router.get('/', (req, res) => {
  res.json({
    version: '2.0.0',
    name: 'Real Estate API v2',
    description: 'Enhanced REST API for Real Estate Application',
    status: 'Coming Soon',
    endpoints: {
      auth: '/api/v2/auth',
      posts: '/api/v2/posts',
      admin: '/api/v2/admin'
    },
    documentation: '/api/v2/docs',
    features: [
      'Enhanced authentication',
      'Advanced post filtering',
      'Real-time notifications',
      'Improved performance'
    ]
  })
})

export default router