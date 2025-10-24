# Authentication API Documentation

## Overview
The Real Estate API supports multiple authentication methods:
- **Email + Password**
- **Lao Phone Number + Password** (with OTP verification)
- **Facebook Login**

## Supported Lao Phone Numbers
- **Lao Telecom**: +856 20 XXXX XXXX, +856 30 XXXX XXXX
- **Unitel**: +856 21 XXXX XXXX  
- **Beeline**: +856 23 XXXX XXXX
- **Tplus**: +856 24 XXXX XXXX
- **ETL**: +856 22 XXXX XXXX

## Authentication Endpoints

### 1. Email Registration
**POST** `/api/v1/auth/register`

```json
{
  "name": "John Doe",
  "identifier": "john@example.com",
  "password": "password123",
  "registerType": "email"
}
```

**Response:**
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "user": {
      "id": "user_id",
      "name": "John Doe",
      "email": "john@example.com",
      "role": "user",
      "authMethods": ["email"],
      "isVerified": false,
      "emailVerified": false
    },
    "accessToken": "jwt_token",
    "refreshToken": "refresh_token"
  }
}
```

### 2. Phone Registration (with OTP)
**Step 1: Send OTP**
**POST** `/api/v1/auth/phone/send-otp`

```json
{
  "phone": "+856 20 555 1234"
}
```

**Step 2: Register with OTP**
**POST** `/api/v1/auth/phone/register`

```json
{
  "name": "Somchai Vang",
  "phone": "+856 20 555 1234",
  "password": "password123",
  "otp": "123456"
}
```

### 3. Email Login
**POST** `/api/v1/auth/login`

```json
{
  "identifier": "john@example.com",
  "password": "password123",
  "loginType": "email"
}
```

### 4. Phone Login
**POST** `/api/v1/auth/login`

```json
{
  "identifier": "+856 20 555 1234",
  "password": "password123",
  "loginType": "phone"
}
```

### 5. Facebook Login
**POST** `/api/v1/auth/facebook/login`

```json
{
  "accessToken": "facebook_access_token",
  "facebookId": "facebook_user_id",
  "name": "John Doe",
  "email": "john@example.com",
  "avatar": "https://facebook.com/photo.jpg"
}
```

### 6. OTP Verification
**POST** `/api/v1/auth/phone/verify-otp`

```json
{
  "phone": "+856 20 555 1234",
  "otp": "123456"
}
```

### 7. Refresh Token
**POST** `/api/v1/auth/token/refresh`

```json
{
  "refreshToken": "refresh_jwt_token"
}
```

### 8. Logout
**POST** `/api/v1/auth/logout`
*Requires Authentication Header*

```
Authorization: Bearer <access_token>
```

## Phone Number Formats Supported

### Input Formats:
- `+856 20 555 1234` (International)
- `020 555 1234` (Local with 0)
- `20555234` (Mobile format)

### Stored Format:
All phone numbers are stored in international format: `+856XXXXXXXX`

## Error Responses

### Validation Error (400)
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    {
      "field": "phone",
      "message": "Invalid Lao phone number"
    }
  ]
}
```

### Authentication Error (401)
```json
{
  "success": false,
  "message": "Invalid credentials"
}
```

### Conflict Error (409)
```json
{
  "success": false,
  "message": "User already exists with this email"
}
```

## Rate Limits
- **OTP Generation**: 1 request per minute per phone number
- **OTP Verification**: 3 attempts per OTP, then OTP expires
- **Login Attempts**: 5 failed attempts locks account for 15 minutes

## Security Features
- Password hashing with bcrypt (12 rounds)
- JWT tokens with short expiry (15 minutes for access token)
- Refresh token rotation
- OTP expiry (5 minutes)
- Rate limiting on sensitive endpoints
- Phone number validation for Lao operators

## Integration Examples

### Frontend Integration (React/Vue)

```javascript
// Email Registration
const registerWithEmail = async (userData) => {
  const response = await fetch('/api/v1/auth/register', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      ...userData,
      registerType: 'email'
    })
  })
  
  return response.json()
}

// Phone Registration with OTP
const registerWithPhone = async (name, phone, password) => {
  // Step 1: Send OTP
  await fetch('/api/v1/auth/phone/send-otp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone })
  })
  
  // Step 2: Get OTP from user input, then register
  const otp = prompt('Enter OTP:')
  
  const response = await fetch('/api/v1/auth/phone/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, phone, password, otp })
  })
  
  return response.json()
}

// Facebook Login
const loginWithFacebook = async (facebookResponse) => {
  const response = await fetch('/api/v1/auth/facebook/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      accessToken: facebookResponse.accessToken,
      facebookId: facebookResponse.userID,
      name: facebookResponse.name,
      email: facebookResponse.email
    })
  })
  
  return response.json()
}
```

### Mobile Integration (React Native)

```javascript
// Phone number input with country code
import { PhoneNumberUtil } from 'google-libphonenumber'

const validateLaoPhone = (phone) => {
  // Use the LaoPhoneUtil validation
  return fetch('/api/v1/auth/phone/validate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone })
  })
}
```

## Testing

### Test Phone Numbers (Development)
- `+856 20 999 0001` - Always valid OTP: `123456`
- `+856 21 999 0002` - Always valid OTP: `654321`

### Test Facebook User (Development)
- Facebook ID: `test_facebook_user`
- Access Token: `test_facebook_token`