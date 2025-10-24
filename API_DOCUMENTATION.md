# Real Estate API Documentation

## Overview
Comprehensive REST API for real estate platform with booking system, view tracking, and analytics.

## 🚀 Features
- **Authentication & Authorization**: JWT-based auth with roles
- **Property Management**: CRUD operations for real estate posts  
- **Bookmark System**: Save and manage favorite properties
- **View Tracking**: Smart analytics with IP deduplication
- **Admin Panel**: Moderation and approval system
- **Search & Filters**: Advanced property search
- **Analytics**: Detailed statistics and reports

## 📚 API Documentation

### Base URL
```
http://localhost:3000
```

### Swagger UI
Access the interactive API documentation at:
```
http://localhost:3000/api-docs
```

### JSON Specification
Raw OpenAPI specification:
```
http://localhost:3000/api-docs.json
```

## 🔐 Authentication

Most endpoints require authentication using Bearer tokens:

```bash
Authorization: Bearer <your-jwt-token>
```

### Getting Started
1. **Register**: `POST /api/auth/register`
2. **Login**: `POST /api/auth/login`  
3. **Use Token**: Include in Authorization header

## 📋 Main Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/logout` - Logout user
- `POST /api/auth/token/refresh` - Refresh token
- `POST /api/auth/phone/send-otp` - Send OTP to phone
- `POST /api/auth/phone/verify-otp` - Verify OTP
- `POST /api/auth/facebook/login` - Facebook login

### Posts/Properties  
- `GET /api/posts/approved` - Get approved posts
- `GET /api/posts/trending` - Get trending posts
- `GET /api/posts/most-viewed` - Get most viewed posts
- `GET /api/posts/{id}` - Get single post (auto-tracks view)
- `POST /api/posts` - Create new post (auth required)
- `GET /api/posts/my-posts` - Get user's posts (auth required)
- `GET /api/posts/{id}/stats` - Get post view statistics

### Bookmarks
- `POST /api/bookmarks/{postId}` - Add bookmark (auth required)
- `GET /api/bookmarks` - Get user bookmarks (auth required)
- `DELETE /api/bookmarks/{postId}` - Remove bookmark (auth required)
- `POST /api/bookmarks/{postId}/toggle` - Toggle bookmark (auth required)
- `GET /api/bookmarks/stats` - Get bookmark statistics (auth required)

### Admin (Admin role required)
- `GET /api/admin/posts/pending` - Get pending posts
- `POST /api/admin/posts/{id}/approve` - Approve post  
- `POST /api/admin/posts/{id}/reject` - Reject post
- `GET /api/admin/properties` - Get all properties
- `POST /api/admin/properties` - Create property

## 🏗️ Data Models

### User
```json
{
  "_id": "string",
  "name": "string", 
  "email": "string",
  "avatar": "string",
  "phone": "string",
  "role": "user|admin",
  "isVerified": boolean,
  "createdAt": "2023-01-01T00:00:00.000Z",
  "updatedAt": "2023-01-01T00:00:00.000Z"
}
```

### Post/Property
```json
{
  "_id": "string",
  "title": "string",
  "description": "string", 
  "price": number,
  "propertyType": "house|land|condo|apartment|villa|townhouse",
  "listingType": "sell|rent|lease",
  "area": number,
  "location": {
    "address": {
      "street": "string",
      "district": "string", 
      "province": "string"
    },
    "coordinates": {
      "latitude": number,
      "longitude": number
    }
  },
  "media": {
    "images": ["string"],
    "videos": ["string"]
  },
  "status": "pending|approved|rejected|sold|rented",
  "viewCount": number,
  "uniqueViewCount": number, 
  "bookmarkCount": number,
  "authorId": "string",
  "createdAt": "2023-01-01T00:00:00.000Z"
}
```

### Bookmark
```json
{
  "_id": "string",
  "userId": "string",
  "postId": "string", 
  "createdAt": "2023-01-01T00:00:00.000Z"
}
```

## 📊 Analytics & Tracking

### View Tracking
- Automatically tracks unique views per post
- IP-based deduplication (24-hour window)
- User and guest session tracking
- View statistics and analytics

### Bookmark Analytics
- Total bookmark counts
- Popular properties
- User engagement metrics
- Filtering and search capabilities

## 🔍 Search & Filtering

### Property Search Parameters
- `propertyType`: Filter by property type
- `listingType`: sell, rent, or lease
- `minPrice` / `maxPrice`: Price range
- `location`: Location-based search
- `area`: Property size
- `sortBy`: Sort results (newest, oldest, price_asc, price_desc)

### Bookmark Filters
- `propertyType`: Filter bookmarks by property type
- `priceRange`: Predefined price ranges
- `sortBy`: Sort bookmarks

## 📱 Response Format

### Success Response
```json
{
  "success": true,
  "message": "Success message",
  "data": { ... },
  "pagination": {
    "page": 1,
    "limit": 10, 
    "total": 100,
    "totalPages": 10
  }
}
```

### Error Response  
```json
{
  "success": false,
  "message": "Error message",
  "errors": ["Validation error details"]
}
```

## 🚦 Rate Limiting
- 100 requests per 15 minutes per IP
- Higher limits for authenticated users
- Custom limits for specific endpoints

## 📋 Status Codes
- `200` - Success
- `201` - Created
- `400` - Bad Request (validation errors)
- `401` - Unauthorized (authentication required)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `409` - Conflict (duplicate resource)  
- `429` - Too Many Requests (rate limit)
- `500` - Internal Server Error

## 🛠️ Development

### Running the API
```bash
npm install
npm run dev
```

### Building for Production  
```bash
npm run build
npm start
```

### Environment Variables
```env
NODE_ENV=development
PORT=3000
MONGODB_URI=mongodb://localhost:27017/realestate
JWT_SECRET=your-jwt-secret
JWT_REFRESH_SECRET=your-refresh-secret
```

---

For detailed API usage examples and testing, visit the Swagger UI at `/api-docs` when running the server.