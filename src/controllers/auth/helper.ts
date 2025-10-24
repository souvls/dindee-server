import { body } from 'express-validator'
import { User } from '@/models/User'
import { generateTokens, storeRefreshToken, verifyRefreshToken, getStoredRefreshToken, deleteRefreshToken } from '@/utils/jwt'
import { LaoPhoneUtil } from '@/utils/laoPhone'
import { OTPService } from '@/services/otpService'
import { FacebookAuthService } from '@/services/facebookAuth'

export const authValidation = {
  register: [
    body('name').trim().isLength({ min: 2 }).withMessage('Name must be at least 2 characters'),
    body('identifier').notEmpty().withMessage('Email or phone number is required'),
    body('registerType').isIn(['email', 'phone']).withMessage('Register type must be email or phone'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  ],

  login: [
    body('identifier').notEmpty().withMessage('Email or phone number is required'),
    body('loginType').isIn(['email', 'phone']).withMessage('Login type must be email or phone'),
    body('password').notEmpty().withMessage('Password is required'),
  ],

  phoneVerification: [
    body('phone').custom((value) => {
      if (!LaoPhoneUtil.isValidLaoPhone(value)) {
        throw new Error('Invalid Lao phone number')
      }
      return true
    }),
  ],

  verifyOTP: [
    body('phone').custom((value) => {
      if (!LaoPhoneUtil.isValidLaoPhone(value)) {
        throw new Error('Invalid Lao phone number')
      }
      return true
    }),
    body('otp').isLength({ min: 6, max: 6 }).isNumeric().withMessage('OTP must be 6 digits'),
  ],

  facebookLogin: [
    body('accessToken').notEmpty().withMessage('Facebook access token is required'),
    body('facebookId').notEmpty().withMessage('Facebook ID is required'),
    body('name').trim().isLength({ min: 2 }).withMessage('Name must be at least 2 characters'),
  ],
}

export const authHelper = {
  // User existence checks
  async checkUserExistsByEmail(email: string): Promise<boolean> {
    const existingUser = await User.findOne({ email })
    return !!existingUser
  },

  async checkUserExistsByPhone(phone: string): Promise<boolean> {
    const formattedPhone = LaoPhoneUtil.formatToInternational(phone)
    if (!formattedPhone) return false
    
    const existingUser = await User.findOne({ phone: formattedPhone })
    return !!existingUser
  },

  async checkUserExistsByFacebookId(facebookId: string): Promise<boolean> {
    const existingUser = await User.findOne({ facebookId })
    return !!existingUser
  },

  // User creation methods
  async createUserWithEmail(userData: { name: string; email: string; password: string }) {
    const user = new User({
      ...userData,
      authMethods: ['email'],
      emailVerified: false,
      isVerified: false
    })
    await user.save()
    return user
  },

  async createUserWithPhone(userData: { name: string; phone: string; password: string }) {
    const formattedPhone = LaoPhoneUtil.formatToInternational(userData.phone)
    if (!formattedPhone) {
      throw new Error('Invalid phone number format')
    }

    const user = new User({
      name: userData.name,
      phone: formattedPhone,
      password: userData.password,
      authMethods: ['phone'],
      phoneVerified: true, // Phone is verified via OTP during registration
      isVerified: true
    })
    await user.save()
    return user
  },

  async createUserWithFacebook(userData: { facebookId: string; name: string; email?: string; avatar?: string }) {
    const user = new User({
      ...userData,
      authMethods: ['facebook'],
      emailVerified: !!userData.email,
      isVerified: true // Facebook users are considered verified
    })
    await user.save()
    return user
  },

  // User finder methods
  async findUserByEmail(email: string) {
    return await User.findOne({ email })
  },

  async findUserByPhone(phone: string) {
    const formattedPhone = LaoPhoneUtil.formatToInternational(phone)
    if (!formattedPhone) return null
    
    return await User.findOne({ phone: formattedPhone })
  },

  async findUserByFacebookId(facebookId: string) {
    return await User.findOne({ facebookId })
  },

  async findUserById(id: string) {
    return await User.findById(id)
  },

  // Authentication methods
  async validatePassword(user: any, password: string): Promise<boolean> {
    return await user.comparePassword(password)
  },

  async validateIdentifier(identifier: string, type: 'email' | 'phone'): Promise<boolean> {
    if (type === 'email') {
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifier)
    } else if (type === 'phone') {
      return LaoPhoneUtil.isValidLaoPhone(identifier)
    }
    return false
  },

  // Token management
  async generateAndStoreTokens(userId: string, identifier: string, role: string) {
    const tokens = generateTokens(userId, identifier, role)
    await storeRefreshToken(userId, tokens.refreshToken)
    return tokens
  },

  async refreshUserTokens(refreshToken: string) {
    // Verify refresh token
    const decoded = verifyRefreshToken(refreshToken)
    
    // Check if refresh token exists in Redis
    const storedToken = await getStoredRefreshToken(decoded.userId)
    if (storedToken !== refreshToken) {
      throw new Error('Invalid refresh token')
    }

    // Get user
    const user = await User.findById(decoded.userId)
    if (!user) {
      throw new Error('User not found')
    }

    const identifier = (user as any).email || (user as any).phone || (user as any).facebookId
    // Generate new tokens
    const tokens = generateTokens((user as any)._id.toString(), identifier, (user as any).role)
    
    // Store new refresh token
    await storeRefreshToken((user as any)._id.toString(), tokens.refreshToken)

    return tokens
  },

  async logoutUser(userId: string) {
    await deleteRefreshToken(userId)
  },

  // OTP methods
  async sendOTPToPhone(phone: string) {
    const formattedPhone = LaoPhoneUtil.formatToInternational(phone)
    if (!formattedPhone) {
      throw new Error('Invalid phone number format')
    }

    return await OTPService.generateOTP(formattedPhone)
  },

  async verifyPhoneOTP(phone: string, otp: string) {
    const formattedPhone = LaoPhoneUtil.formatToInternational(phone)
    if (!formattedPhone) {
      throw new Error('Invalid phone number format')
    }

    return await OTPService.verifyOTP(formattedPhone, otp)
  },

  // Facebook authentication
  async verifyFacebookToken(accessToken: string) {
    return await FacebookAuthService.verifyFacebookToken(accessToken)
  },

  // Response formatters
  formatUserResponse(user: any) {
    return {
      id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      authMethods: user.authMethods,
      isVerified: user.isVerified,
      phoneVerified: user.phoneVerified,
      emailVerified: user.emailVerified,
      avatar: user.avatar,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    }
  },
}