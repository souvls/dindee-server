import { Request, Response } from 'express'
import { validationResult } from 'express-validator'
import { ResponseHelper } from '@/utils/response'
import { authHelper } from './helper'
import { AuthService } from '@/services/AuthService'
import { OTPService } from '@/services/otpService'
import { FacebookAuthService } from '@/services/FacebookService'
import { LoginRequest, RegisterRequest, FacebookLoginRequest, PhoneVerificationRequest, VerifyOTPRequest } from '@/types'

const authService = new AuthService()


export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      ResponseHelper.validationError(res, errors.array())
      return
    }

    const { name, identifier, password, registerType }: RegisterRequest = req.body

    // Validate identifier based on type
    const isValidIdentifier = await authHelper.validateIdentifier(identifier, registerType)
    if (!isValidIdentifier) {
      ResponseHelper.error(res, `Invalid ${registerType} format`)
      return
    }

    // เตรียมข้อมูลสำหรับ AuthService
    const registerData = {
      name,
      password,
      authMethod: registerType as 'email' | 'phone',
      ...(registerType === 'email' ? { email: identifier } : { phone: identifier })
    }

    // ใช้ AuthService สำหรับ register
    const { user } = await authService.register(registerData)

    const responseData = {
      user: authHelper.formatUserResponse(user),
    }

    ResponseHelper.success(res, responseData, 'User registered successfully', 201)
  } catch (error) {
    console.error('Registration error:', error)
    ResponseHelper.internalError(res)
  }
}

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      ResponseHelper.validationError(res, errors.array())
      return
    }

    const { identifier, password, loginType }: LoginRequest = req.body

    // Validate identifier based on type
    const isValidIdentifier = await authHelper.validateIdentifier(identifier, loginType)
    if (!isValidIdentifier) {
      ResponseHelper.error(res, `Invalid ${loginType} format`)
      return
    }

    // ใช้ AuthService สำหรับ login
    const { user, accessToken, refreshToken } = await authService.login({
      identifier,
      password
    })

    const responseData = {
      user: authHelper.formatUserResponse(user),
      accessToken,
      refreshToken,
    }

    ResponseHelper.success(res, responseData, 'Login successful')
  } catch (error) {
    console.error('Login error:', error)
    ResponseHelper.internalError(res)
  }
}

export const refreshToken = async (req: Request, res: Response): Promise<void> => {
  try {
    const { refreshToken } = req.body

    if (!refreshToken) {
      ResponseHelper.error(res, 'Refresh token is required')
      return
    }

    const tokens = await authService.refreshToken(refreshToken)
    ResponseHelper.success(res, tokens, 'Token refreshed successfully')
  } catch (error) {
    console.error('Token refresh error:', error)
    ResponseHelper.unauthorized(res, 'Invalid refresh token')
  }
}

export const logout = async (req: Request, res: Response): Promise<void> => {
  try {
    const { user } = req as any
    
    if (user) {
      await authService.logout(user._id.toString())
    }

    ResponseHelper.success(res, null, 'Logout successful')
  } catch (error) {
    console.error('Logout error:', error)
    ResponseHelper.internalError(res)
  }
}

// Phone verification endpoints
export const sendOTP = async (req: Request, res: Response): Promise<void> => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      ResponseHelper.validationError(res, errors.array())
      return
    }

    const { phone }: PhoneVerificationRequest = req.body

    const result = await OTPService.generateOTP(phone)
    
    if (result.success) {
      ResponseHelper.success(res, null, result.message)
    } else {
      ResponseHelper.error(res, result.message)
    }
  } catch (error) {
    console.error('Send OTP error:', error)
    ResponseHelper.internalError(res)
  }
}

export const verifyOTP = async (req: Request, res: Response): Promise<void> => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      ResponseHelper.validationError(res, errors.array())
      return
    }

    const { phone, otp }: VerifyOTPRequest = req.body

    const result = await OTPService.verifyOTP(phone, otp)
    
    if (result.success) {
      ResponseHelper.success(res, { phoneVerified: true }, result.message)
    } else {
      ResponseHelper.error(res, result.message)
    }
  } catch (error) {
    console.error('Verify OTP error:', error)
    ResponseHelper.internalError(res)
  }
}

// Facebook authentication
export const facebookLogin = async (req: Request, res: Response): Promise<void> => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      ResponseHelper.validationError(res, errors.array())
      return
    }

    const { accessToken, facebookId, name, email, avatar }: FacebookLoginRequest = req.body

    // Verify Facebook token
    const facebookUser = await authHelper.verifyFacebookToken(accessToken)
    if (!facebookUser || facebookUser.id !== facebookId) {
      ResponseHelper.unauthorized(res, 'Invalid Facebook token')
      return
    }

    // Check if user exists with Facebook ID
    let user = await authHelper.findUserByFacebookId(facebookId)
    
    if (!user) {
      // Check if user exists with same email
      if (email) {
        const existingUser = await authHelper.findUserByEmail(email)
        if (existingUser) {
          ResponseHelper.conflict(res, 'An account with this email already exists. Please login with email or link your Facebook account.')
          return
        }
      }

      // Create new user with Facebook
      user = await authHelper.createUserWithFacebook({
        facebookId,
        name: name || facebookUser.name,
        email: email || facebookUser.email,
        avatar: avatar || facebookUser.picture?.data?.url
      })
    }

    // Generate tokens
    const tokens = await authHelper.generateAndStoreTokens(
      (user as any)._id.toString(),
      facebookId,
      (user as any).role
    )

    const responseData = {
      user: authHelper.formatUserResponse(user),
      ...tokens,
    }

    ResponseHelper.success(res, responseData, 'Facebook login successful')
  } catch (error) {
    console.error('Facebook login error:', error)
    ResponseHelper.internalError(res)
  }
}

// Phone registration with OTP
export const registerWithPhone = async (req: Request, res: Response): Promise<void> => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      ResponseHelper.validationError(res, errors.array())
      return
    }

    const { name, phone, password, otp } = req.body

    // Verify OTP first
    const otpResult = await authHelper.verifyPhoneOTP(phone, otp)
    if (!otpResult.success) {
      ResponseHelper.error(res, otpResult.message)
      return
    }

    // Check if user already exists
    const userExists = await authHelper.checkUserExistsByPhone(phone)
    if (userExists) {
      ResponseHelper.conflict(res, 'User already exists with this phone number')
      return
    }

    // Create new user
    const user = await authHelper.createUserWithPhone({ name, phone, password })

    // Generate tokens
    const tokens = await authHelper.generateAndStoreTokens(
      (user as any)._id.toString(),
      phone,
      (user as any).role
    )

    const responseData = {
      user: authHelper.formatUserResponse(user),
      ...tokens,
    }

    ResponseHelper.success(res, responseData, 'User registered successfully with phone', 201)
  } catch (error) {
    console.error('Phone registration error:', error)
    ResponseHelper.internalError(res)
  }
}

// Export validation rules
export { authValidation } from './helper'