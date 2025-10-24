import redis from '@/config/redis'

export interface OTPData {
  phone: string
  otp: string
  expiresAt: number
  attempts: number
}

export class OTPService {
  private static readonly OTP_LENGTH = 6
  private static readonly OTP_EXPIRY = 5 * 60 * 1000 // 5 minutes
  private static readonly MAX_ATTEMPTS = 3
  private static readonly RATE_LIMIT = 60 * 1000 // 1 minute between requests

  /**
   * Generate and send OTP to phone number
   * @param phone Phone number in international format
   * @returns Promise<boolean> Success status
   */
  static async generateOTP(phone: string): Promise<{ success: boolean; message: string }> {
    try {
      // Check rate limiting
      const rateLimitKey = `otp_rate_limit:${phone}`
      const lastRequest = await redis.get(rateLimitKey)
      
      if (lastRequest) {
        return {
          success: false,
          message: 'Please wait before requesting another OTP'
        }
      }

      // Generate 6-digit OTP
      const otp = Math.floor(100000 + Math.random() * 900000).toString()
      
      // Store OTP data
      const otpData: OTPData = {
        phone,
        otp,
        expiresAt: Date.now() + this.OTP_EXPIRY,
        attempts: 0
      }

      const otpKey = `otp:${phone}`
      await redis.setex(otpKey, Math.ceil(this.OTP_EXPIRY / 1000), JSON.stringify(otpData))
      
      // Set rate limit
      await redis.setex(rateLimitKey, Math.ceil(this.RATE_LIMIT / 1000), '1')

      // TODO: Integrate with SMS service (Twilio, AWS SNS, etc.)
      // For now, we'll log the OTP (remove in production)
      console.log(`📱 OTP for ${phone}: ${otp}`)

      // In development, you might want to send OTP via different methods
      await this.sendOTPviaSMS(phone, otp)

      return {
        success: true,
        message: 'OTP sent successfully'
      }
    } catch (error) {
      console.error('Error generating OTP:', error)
      return {
        success: false,
        message: 'Failed to send OTP'
      }
    }
  }

  /**
   * Verify OTP
   * @param phone Phone number
   * @param otp OTP to verify
   * @returns Promise<boolean> Verification status
   */
  static async verifyOTP(phone: string, otp: string): Promise<{ success: boolean; message: string }> {
    try {
      const otpKey = `otp:${phone}`
      const otpDataStr = await redis.get(otpKey)

      if (!otpDataStr) {
        return {
          success: false,
          message: 'OTP has expired or does not exist'
        }
      }

      const otpData: OTPData = JSON.parse(otpDataStr)

      // Check if OTP has expired
      if (Date.now() > otpData.expiresAt) {
        await redis.del(otpKey)
        return {
          success: false,
          message: 'OTP has expired'
        }
      }

      // Check attempts
      if (otpData.attempts >= this.MAX_ATTEMPTS) {
        await redis.del(otpKey)
        return {
          success: false,
          message: 'Too many failed attempts. Please request a new OTP'
        }
      }

      // Verify OTP
      if (otpData.otp !== otp) {
        // Increment attempts
        otpData.attempts++
        await redis.setex(otpKey, Math.ceil((otpData.expiresAt - Date.now()) / 1000), JSON.stringify(otpData))
        
        return {
          success: false,
          message: `Invalid OTP. ${this.MAX_ATTEMPTS - otpData.attempts} attempts remaining`
        }
      }

      // OTP is valid, remove from cache
      await redis.del(otpKey)
      
      return {
        success: true,
        message: 'OTP verified successfully'
      }
    } catch (error) {
      console.error('Error verifying OTP:', error)
      return {
        success: false,
        message: 'Failed to verify OTP'
      }
    }
  }

  /**
   * Send OTP via SMS (integrate with your SMS provider)
   * @param phone Phone number
   * @param otp OTP code
   */
  private static async sendOTPviaSMS(phone: string, otp: string): Promise<void> {
    // TODO: Integrate with SMS service provider
    // Examples:
    // - Twilio
    // - AWS SNS
    // - Lao telecommunications providers
    
    const message = `Your verification code is: ${otp}. Valid for 5 minutes. Do not share this code.`
    
    console.log(`🚀 Sending SMS to ${phone}: ${message}`)
    
    // Placeholder for SMS integration
    // await smsProvider.send(phone, message)
  }

  /**
   * Clean up expired OTPs (call this periodically)
   */
  static async cleanupExpiredOTPs(): Promise<void> {
    try {
      const pattern = 'otp:*'
      const keys = await redis.keys(pattern)
      
      for (const key of keys) {
        const otpDataStr = await redis.get(key)
        if (otpDataStr) {
          const otpData: OTPData = JSON.parse(otpDataStr)
          if (Date.now() > otpData.expiresAt) {
            await redis.del(key)
          }
        }
      }
    } catch (error) {
      console.error('Error cleaning up expired OTPs:', error)
    }
  }
}