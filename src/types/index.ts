export interface User {
  id: string
  email?: string
  phone?: string
  name: string
  password?: string
  role: 'user' | 'admin'
  authMethods: ('email' | 'phone' | 'facebook')[]
  facebookId?: string
  isVerified: boolean
  phoneVerified: boolean
  emailVerified: boolean
  avatar?: string
  createdAt: Date
  updatedAt: Date
}

export interface Post {
  id: string
  title: string
  description: string
  price: number
  location: string
  propertyType: string
  bedrooms?: number
  bathrooms?: number
  area?: number
  images?: string[]
  status: 'pending' | 'approved' | 'rejected'
  authorId: string
  author?: User
  createdAt: Date
  updatedAt: Date
}

export interface AuthTokens {
  accessToken: string
  refreshToken: string
}

export interface JWTPayload {
  userId: string
  email: string
  role: string
}

export interface LoginRequest {
  identifier: string // email hoặc phone
  password: string
  loginType: 'email' | 'phone'
}

export interface RegisterRequest {
  name: string
  identifier: string // email hoặc phone  
  password: string
  registerType: 'email' | 'phone'
}

export interface FacebookLoginRequest {
  accessToken: string
  facebookId: string
  name: string
  email?: string
  avatar?: string
}

export interface PhoneVerificationRequest {
  phone: string
  countryCode: string
}

export interface VerifyOTPRequest {
  phone: string
  otp: string
}

export interface CreatePostRequest {
  title: string
  description: string
  price: number
  location: string
  propertyType: string
  bedrooms?: number
  bathrooms?: number
  area?: number
  images?: string[]
}