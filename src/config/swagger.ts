import swaggerJsdoc from 'swagger-jsdoc'
import swaggerUi from 'swagger-ui-express'
import { Application } from 'express'

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Real Estate API',
      version: '1.0.0',
      description: 'A comprehensive real estate management API with booking, view tracking, and property management',
      contact: {
        name: 'API Support',
        email: 'support@realestate.com'
      }
    },
    servers: [
      {
        url: process.env.BASE_URL || 'http://localhost:3000',
        description: 'Development server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      },
      schemas: {
        User: {
          type: 'object',
          required: ['email', 'password', 'name'],
          properties: {
            _id: {
              type: 'string',
              description: 'User ID'
            },
            name: {
              type: 'string',
              description: 'User full name'
            },
            email: {
              type: 'string',
              format: 'email',
              description: 'User email address'
            },
            avatar: {
              type: 'string',
              description: 'User avatar URL'
            },
            phone: {
              type: 'string',
              description: 'User phone number'
            },
            role: {
              type: 'string',
              enum: ['user', 'admin'],
              description: 'User role'
            },
            isVerified: {
              type: 'boolean',
              description: 'Email verification status'
            },
            createdAt: {
              type: 'string',
              format: 'date-time'
            },
            updatedAt: {
              type: 'string',
              format: 'date-time'
            }
          }
        },
        Post: {
          type: 'object',
          required: ['title', 'description', 'price', 'propertyType', 'listingType', 'area', 'location', 'media'],
          properties: {
            _id: {
              type: 'string',
              description: 'Post ID'
            },
            title: {
              type: 'string',
              description: 'Property title'
            },
            description: {
              type: 'string',
              description: 'Property description'
            },
            price: {
              type: 'number',
              description: 'Property price'
            },
            pricePerUnit: {
              type: 'number',
              description: 'Price per square meter'
            },
            propertyType: {
              type: 'string',
              enum: ['house', 'land', 'condo', 'apartment', 'villa', 'townhouse'],
              description: 'Type of property'
            },
            listingType: {
              type: 'string',
              enum: ['sell', 'rent', 'lease'],
              description: 'Listing type'
            },
            area: {
              type: 'number',
              description: 'Total area in square meters'
            },
            usableArea: {
              type: 'number',
              description: 'Usable area in square meters'
            },
            location: {
              type: 'object',
              properties: {
                address: {
                  type: 'object',
                  properties: {
                    street: { type: 'string' },
                    district: { type: 'string' },
                    province: { type: 'string' },
                    postalCode: { type: 'string' },
                    country: { type: 'string', default: 'Thailand' }
                  }
                },
                coordinates: {
                  type: 'object',
                  properties: {
                    latitude: { type: 'number', minimum: -90, maximum: 90 },
                    longitude: { type: 'number', minimum: -180, maximum: 180 }
                  }
                }
              }
            },
            media: {
              type: 'object',
              properties: {
                images: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Array of image URLs'
                },
                videos: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Array of video URLs'
                },
                virtualTour: {
                  type: 'string',
                  description: 'Virtual tour URL'
                }
              }
            },
            houseDetails: {
              type: 'object',
              properties: {
                bedrooms: { type: 'number' },
                bathrooms: { type: 'number' },
                floors: { type: 'number' },
                parking: { type: 'number' },
                furnished: { type: 'boolean' }
              }
            },
            condoDetails: {
              type: 'object',
              properties: {
                floor: { type: 'number' },
                totalFloors: { type: 'number' },
                buildingName: { type: 'string' },
                facilities: {
                  type: 'array',
                  items: { type: 'string' }
                }
              }
            },
            landDetails: {
              type: 'object',
              properties: {
                landType: { type: 'string' },
                soilType: { type: 'string' },
                waterAccess: { type: 'boolean' },
                electricityAccess: { type: 'boolean' }
              }
            },
            status: {
              type: 'string',
              enum: ['pending', 'approved', 'rejected', 'sold', 'rented'],
              description: 'Post status'
            },
            featured: {
              type: 'boolean',
              description: 'Whether post is featured'
            },
            urgent: {
              type: 'boolean',
              description: 'Whether post is urgent'
            },
            viewCount: {
              type: 'number',
              description: 'Total view count'
            },
            uniqueViewCount: {
              type: 'number',
              description: 'Unique view count'
            },
            bookmarkCount: {
              type: 'number',
              description: 'Bookmark count'
            },
            authorId: {
              type: 'string',
              description: 'Author user ID'
            },
            createdAt: {
              type: 'string',
              format: 'date-time'
            },
            updatedAt: {
              type: 'string',
              format: 'date-time'
            }
          }
        },
        Bookmark: {
          type: 'object',
          properties: {
            _id: {
              type: 'string',
              description: 'Bookmark ID'
            },
            userId: {
              type: 'string',
              description: 'User ID'
            },
            postId: {
              type: 'string',
              description: 'Post ID'
            },
            createdAt: {
              type: 'string',
              format: 'date-time'
            }
          }
        },
        ViewHistory: {
          type: 'object',
          properties: {
            _id: {
              type: 'string',
              description: 'View history ID'
            },
            postId: {
              type: 'string',
              description: 'Post ID'
            },
            userId: {
              type: 'string',
              description: 'User ID (optional for guests)'
            },
            ipAddress: {
              type: 'string',
              description: 'IP address'
            },
            sessionId: {
              type: 'string',
              description: 'Session ID for guests'
            },
            userAgent: {
              type: 'string',
              description: 'Browser user agent'
            },
            createdAt: {
              type: 'string',
              format: 'date-time'
            }
          }
        },
        ApiResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              description: 'Request success status'
            },
            message: {
              type: 'string',
              description: 'Response message'
            },
            data: {
              description: 'Response data'
            },
            errors: {
              type: 'array',
              items: { type: 'string' },
              description: 'Error messages'
            },
            pagination: {
              type: 'object',
              properties: {
                page: { type: 'number' },
                limit: { type: 'number' },
                total: { type: 'number' },
                totalPages: { type: 'number' }
              }
            }
          }
        },
        Error: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: false
            },
            message: {
              type: 'string',
              description: 'Error message'
            },
            errors: {
              type: 'array',
              items: { type: 'string' }
            }
          }
        }
      }
    },
    security: [
      {
        bearerAuth: []
      }
    ]
  },
  apis: [
    './src/routes/*.ts',
    './src/controllers/*.ts',
    './src/models/*.ts'
  ]
}

const specs = swaggerJsdoc(options)

export const setupSwagger = (app: Application): void => {
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs, {
    explorer: true,
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'Real Estate API Documentation'
  }))
  
  // JSON endpoint for raw swagger spec
  app.get('/api-docs.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json')
    res.send(specs)
  })
}

export default specs