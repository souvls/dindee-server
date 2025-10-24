// Service layer exports for clean import
export { AuthService } from './AuthService'
export { PostService } from './PostService'
export { FacebookAuthService } from './FacebookService'
export { OTPService } from './otpService'

// Service interfaces for dependency injection
export type { LoginData, RegisterData, AuthResult } from './AuthService'
export type { 
  CreatePostData, 
  UpdatePostData, 
  PostFilter 
} from './PostService'
export type { FacebookUserData } from './FacebookService'
export type { OTPData } from './otpService'