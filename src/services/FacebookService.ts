import axios from 'axios';
import { config } from '../config';

export interface FacebookUserData {
  id: string;
  name: string;
  email?: string;
  picture?: {
    data: {
      url: string;
    };
  };
}

export class FacebookAuthService {
  private readonly baseUrl = 'https://graph.facebook.com/v18.0';

  // ยืนยัน Facebook Access Token และดึงข้อมูลผู้ใช้
  async verifyToken(accessToken: string): Promise<FacebookUserData> {
    try {
      // ตรวจสอบ token กับ Facebook
      const response = await axios.get(`${this.baseUrl}/me`, {
        params: {
          access_token: accessToken,
          fields: 'id,name,email,picture'
        }
      });

      if (!response.data || !response.data.id) {
        throw new Error('Invalid Facebook token');
      }

      return response.data as FacebookUserData;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(`Facebook API error: ${error.response?.data?.error?.message || error.message}`);
      }
      throw new Error(`Error verifying Facebook token: ${error}`);
    }
  }

  // ตรวจสอบ App Access Token (สำหรับตรวจสอบ User Token)
  async verifyUserToken(userAccessToken: string, appAccessToken: string): Promise<boolean> {
    try {
      const response = await axios.get(`${this.baseUrl}/debug_token`, {
        params: {
          input_token: userAccessToken,
          access_token: appAccessToken
        }
      });

      const data = response.data?.data;
      return data?.is_valid === true && data?.app_id === config.facebook.appId;
    } catch (error) {
      return false;
    }
  }

  // สร้าง App Access Token
  async getAppAccessToken(): Promise<string> {
    try {
      const response = await axios.get(`${this.baseUrl}/oauth/access_token`, {
        params: {
          client_id: config.facebook.appId,
          client_secret: config.facebook.appSecret,
          grant_type: 'client_credentials'
        }
      });

      if (!response.data.access_token) {
        throw new Error('Failed to get app access token');
      }

      return response.data.access_token;
    } catch (error) {
      throw new Error(`Error getting app access token: ${error}`);
    }
  }

  // ตรวจสอบ permissions ของ token
  async getTokenPermissions(accessToken: string): Promise<string[]> {
    try {
      const response = await axios.get(`${this.baseUrl}/me/permissions`, {
        params: {
          access_token: accessToken
        }
      });

      return response.data?.data
        ?.filter((perm: any) => perm.status === 'granted')
        ?.map((perm: any) => perm.permission) || [];
    } catch (error) {
      return [];
    }
  }

  // ตรวจสอบว่า token มี permission ที่ต้องการหรือไม่
  async hasRequiredPermissions(accessToken: string, requiredPermissions: string[] = ['email']): Promise<boolean> {
    try {
      const permissions = await this.getTokenPermissions(accessToken);
      return requiredPermissions.every(perm => permissions.includes(perm));
    } catch (error) {
      return false;
    }
  }

  // ดึงข้อมูลเพิ่มเติมของผู้ใช้
  async getUserData(accessToken: string, fields: string[] = ['id', 'name', 'email']): Promise<any> {
    try {
      const response = await axios.get(`${this.baseUrl}/me`, {
        params: {
          access_token: accessToken,
          fields: fields.join(',')
        }
      });

      return response.data;
    } catch (error) {
      throw new Error(`Error getting user data: ${error}`);
    }
  }

  // ยกเลิกการเชื่อมต่อแอป (logout from Facebook)
  async revokeToken(accessToken: string): Promise<boolean> {
    try {
      const response = await axios.delete(`${this.baseUrl}/me/permissions`, {
        params: {
          access_token: accessToken
        }
      });

      return response.data?.success === true;
    } catch (error) {
      return false;
    }
  }
}