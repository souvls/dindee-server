import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import compression from 'compression'
import rateLimit from 'express-rate-limit'
import morgan from 'morgan'
import { createServer } from 'http'
import { config } from '@/config'
import { connectDatabase } from '@/config/database'
import { setupSwagger } from '@/config/swagger'
import { initializeSocket } from '@/config/socket'


const app = express()
const server = createServer(app)

// Initialize Socket.IO
const io = initializeSocket(server)

// Logging middleware
app.use(morgan(config.nodeEnv === 'development' ? 'dev' : 'combined'))

// Security middleware
app.use(helmet())
app.use(cors({
  origin: config.cors.origin,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}))

// Rate limiting
const limiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.maxRequests,
  message: {
    error: 'Too many requests from this IP, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
})
app.use(limiter)

// Body parsing middleware
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

// Compression middleware
app.use(compression())

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  })
})

// Import versioned routes
import apiRoutes from '@/routes'
import { versionMiddleware } from '@/middlewares/version'

// Apply version middleware
app.use('/api', versionMiddleware)

// Setup Swagger documentation
setupSwagger(app)

// API routes
app.use('/api', apiRoutes)

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Route not found',
    path: req.originalUrl,
  })
})

// Global error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled error:', err)
  
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      error: 'Validation error',
      details: err.message,
    })
  }
  
  if (err.name === 'MongoError' && err.code === 11000) {
    return res.status(409).json({
      error: 'Duplicate entry',
      details: 'A record with this information already exists',
    })
  }
  
  res.status(500).json({
    error: 'Internal server error',
    ...(config.nodeEnv === 'development' && { details: err.message }),
  })
})

// Start server
const startServer = async () => {
  try {
    // Connect to database
    await connectDatabase()
    
    // Start listening
    server.listen(config.port, () => {
      console.log(`🚀 Server running on port ${config.port}`)
      console.log(`📡 Environment: ${config.nodeEnv}`)
      console.log(`🔗 Health check: http://localhost:${config.port}/health`)
      console.log(`📚 API docs: http://localhost:${config.port}/api-docs`)
      console.log(`🔌 Socket.IO ready for connections`)
    })
  } catch (error) {
    console.error('❌ Failed to start server:', error)
    process.exit(1)
  }
}

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM received, shutting down gracefully')
  process.exit(0)
})

process.on('SIGINT', () => {
  console.log('🛑 SIGINT received, shutting down gracefully')
  process.exit(0)
})

startServer()