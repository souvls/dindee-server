# Server README

## Express.js TypeScript Backend

This is the backend server for the Real Estate application built with Express.js, TypeScript, MongoDB, and Redis.

## Features

- **Authentication:** JWT-based auth with access and refresh tokens
- **Authorization:** Role-based access control (user/admin)
- **Database:** MongoDB with Mongoose ODM
- **Caching:** Redis for session management
- **Validation:** Input validation with express-validator
- **Security:** Rate limiting, CORS, helmet security headers
- **Error Handling:** Comprehensive error handling and logging

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Copy environment file:
   ```bash
   cp .env.example .env
   ```

3. Update `.env` with your configuration

4. Start development server:
   ```bash
   npm run dev
   ```

## API Routes

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/token/refresh` - Refresh access token
- `POST /api/auth/logout` - User logout

### Posts
- `GET /api/posts/approved` - Get approved posts (public)
- `POST /api/posts` - Create post (auth required)
- `GET /api/posts/my-posts` - Get user's posts (auth required)

### Admin
- `GET /api/admin/posts/pending` - Get pending posts (admin only)
- `PUT /api/admin/posts/:id/approve` - Approve post (admin only)
- `PUT /api/admin/posts/:id/reject` - Reject post (admin only)

## Scripts

- `npm run dev` - Start development server with nodemon
- `npm run build` - Build TypeScript to JavaScript
- `npm start` - Start production server
- `npm run lint` - Run ESLint