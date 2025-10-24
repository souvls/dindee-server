import { Router } from 'express'
import v1Routes from './v1'
import v2Routes from './v2'

const router: Router = Router()

// API Version Routes
router.use('/v1', v1Routes)
router.use('/v2', v2Routes)

// Default version (redirect to latest stable)
router.use('/', v1Routes)

// API Root Info
router.get('/', (req, res) => {
  res.json({
    name: 'Real Estate API',
    description: 'RESTful API for Real Estate Application',
    versions: {
      v1: {
        version: '1.0.0',
        status: 'stable',
        endpoint: '/api/v1'
      },
      v2: {
        version: '2.0.0',
        status: 'development',
        endpoint: '/api/v2'
      }
    },
    currentVersion: 'v1',
    latestVersion: 'v1',
    deprecationPolicy: 'Versions are supported for 12 months after release of newer version'
  })
})

export default router