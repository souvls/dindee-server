import axios from 'axios'

export interface FacebookUserData {
  id: string
  name: string
  email?: string
  picture?: {
    data: {
      url: string
    }
  }
}

export class FacebookAuthService {
  /**
   * Verify Facebook access token and get user data
   * @param accessToken Facebook access token
   * @returns Promise<FacebookUserData | null>
   */
  static async verifyFacebookToken(accessToken: string): Promise<FacebookUserData | null> {
    try {
      // Verify token with Facebook Graph API
      const response = await axios.get(
        `https://graph.facebook.com/me`,
        {
          params: {
            access_token: accessToken,
            fields: 'id,name,email,picture.width(200).height(200)'
          }
        }
      )

      return response.data as FacebookUserData
    } catch (error) {
      console.error('Facebook token verification failed:', error)
      return null
    }
  }

  /**
   * Verify Facebook access token validity
   * @param accessToken Facebook access token
   * @returns Promise<boolean>
   */
  static async isValidToken(accessToken: string): Promise<boolean> {
    try {
      const response = await axios.get(
        `https://graph.facebook.com/me`,
        {
          params: {
            access_token: accessToken
          }
        }
      )

      return response.status === 200 && response.data.id
    } catch (error) {
      return false
    }
  }

  /**
   * Get Facebook user profile picture URL
   * @param facebookId Facebook user ID
   * @param width Picture width (default: 200)
   * @param height Picture height (default: 200)
   * @returns String URL
   */
  static getFacebookProfilePicture(
    facebookId: string, 
    width: number = 200, 
    height: number = 200
  ): string {
    return `https://graph.facebook.com/${facebookId}/picture?width=${width}&height=${height}`
  }
}