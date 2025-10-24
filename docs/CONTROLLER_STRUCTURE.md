# Controller Structure

This project follows a modular controller structure where each controller domain has its own directory with standardized files.

## Structure

```
src/
  controllers/
    auth/
      index.ts    # Main controller functions
      helper.ts   # Helper functions and validations
    posts/
      index.ts    # Main controller functions 
      helper.ts   # Helper functions and validations
    index.ts      # Main export file
  utils/
    response.ts   # Standardized response helper
```

## Response Format

All API responses follow a standardized format using the `ResponseHelper` utility:

### Success Response
```json
{
  "success": true,
  "message": "Success message",
  "data": {
    // Response data
  }
}
```

### Success with Pagination
```json
{
  "success": true,
  "message": "Success message", 
  "data": [
    // Array of items
  ],
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
  "errors": [
    // Array of validation errors (optional)
  ]
}
```

## Controller Files

### index.ts
Contains the main controller functions that handle HTTP requests and responses:
- Input validation using express-validator
- Business logic coordination
- Response formatting using ResponseHelper
- Error handling

### helper.ts
Contains:
- Validation rules (using express-validator)
- Business logic functions
- Data access functions
- Utility functions specific to the controller domain

## Usage Examples

### Auth Controller
```typescript
import { register, login, authValidation } from '@/controllers/auth/index'

// Use in routes
router.post('/register', authValidation.register, register)
router.post('/login', authValidation.login, login)
```

### Posts Controller
```typescript
import { createPost, getUserPosts, postValidation } from '@/controllers/posts/index'

// Use in routes
router.post('/posts', postValidation.create, createPost)
router.get('/posts/my', getUserPosts)
```

## Benefits

1. **Separation of Concerns**: Business logic separated from HTTP handling
2. **Reusability**: Helper functions can be reused across different controllers
3. **Testability**: Easier to unit test individual functions
4. **Maintainability**: Clear structure makes code easier to navigate and maintain
5. **Consistency**: Standardized response format across all endpoints