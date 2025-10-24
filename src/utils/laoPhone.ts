/**
 * Lao Phone Number Utility
 * Supports Lao phone number validation and formatting
 */

export class LaoPhoneUtil {
  // Lao country code
  static readonly COUNTRY_CODE = '+856'
  
  // Lao mobile operators
  static readonly OPERATORS = {
    LAO_TELECOM: ['20', '30'], // Lao Telecom
    UNITEL: ['21'], // Unitel
    BEELINE: ['23'], // Beeline
    TPLUS: ['24'], // Tplus
    ETL: ['22'] // Enterprise of Telecommunications Lao
  }

  /**
   * Validate Lao phone number
   * @param phone Phone number to validate
   * @returns Boolean indicating if phone is valid
   */
  static isValidLaoPhone(phone: string): boolean {
    // Remove all non-digit characters
    const cleanPhone = phone.replace(/\D/g, '')
    
    // Check if starts with country code
    if (cleanPhone.startsWith('856')) {
      return this.validateLaoMobile(cleanPhone.substring(3))
    }
    
    // Check if starts with 0 (local format)
    if (cleanPhone.startsWith('0')) {
      return this.validateLaoMobile(cleanPhone.substring(1))
    }
    
    // Check if it's already in mobile format
    return this.validateLaoMobile(cleanPhone)
  }

  /**
   * Validate Lao mobile number (without country code)
   * @param mobile Mobile number without country code
   * @returns Boolean
   */
  private static validateLaoMobile(mobile: string): boolean {
    // Lao mobile numbers are 8 digits starting with 2
    if (mobile.length !== 8) return false
    if (!mobile.startsWith('2')) return false
    
    // Check if the first two digits match any operator
    const prefix = mobile.substring(0, 2)
    return Object.values(this.OPERATORS).some(prefixes => 
      prefixes.includes(prefix)
    )
  }

  /**
   * Format phone number to international format
   * @param phone Phone number to format
   * @returns Formatted phone number with country code
   */
  static formatToInternational(phone: string): string | null {
    if (!this.isValidLaoPhone(phone)) return null
    
    const cleanPhone = phone.replace(/\D/g, '')
    
    // If already has country code
    if (cleanPhone.startsWith('856')) {
      return `+${cleanPhone}`
    }
    
    // If starts with 0 (local format)
    if (cleanPhone.startsWith('0')) {
      return `+856${cleanPhone.substring(1)}`
    }
    
    // If it's mobile format (8 digits)
    if (cleanPhone.length === 8) {
      return `+856${cleanPhone}`
    }
    
    return null
  }

  /**
   * Format phone number for display
   * @param phone Phone number to format
   * @returns Formatted phone number for display
   */
  static formatForDisplay(phone: string): string | null {
    const international = this.formatToInternational(phone)
    if (!international) return null
    
    // Format: +856 XX XXX XXX
    const digits = international.replace(/\D/g, '')
    return `+${digits.substring(0, 3)} ${digits.substring(3, 5)} ${digits.substring(5, 8)} ${digits.substring(8)}`
  }

  /**
   * Get operator name from phone number
   * @param phone Phone number
   * @returns Operator name or null
   */
  static getOperator(phone: string): string | null {
    if (!this.isValidLaoPhone(phone)) return null
    
    const cleanPhone = phone.replace(/\D/g, '')
    let mobile = ''
    
    if (cleanPhone.startsWith('856')) {
      mobile = cleanPhone.substring(3)
    } else if (cleanPhone.startsWith('0')) {
      mobile = cleanPhone.substring(1)
    } else {
      mobile = cleanPhone
    }
    
    const prefix = mobile.substring(0, 2)
    
    for (const [operator, prefixes] of Object.entries(this.OPERATORS)) {
      if (prefixes.includes(prefix)) {
        return operator.replace('_', ' ')
      }
    }
    
    return null
  }
}