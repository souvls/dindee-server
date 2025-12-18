import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { UserRepository, IUserRepository } from '../repositories/UserRepository';
import { IUser } from '../models/User';
import { generateTokens, verifyRefreshToken } from '../utils/jwt';
import { redis } from '../config/redis';

export interface LoginData {
  identifier: string; // email หรือ phone
  password: string;
}

export interface RegisterData {
  name: string;
  email?: string;
  phone?: string;
  password: string;
  authMethod: 'email' | 'phone';
}

export interface AuthResult {
  user: IUser;
  accessToken: string;
  refreshToken: string;
}

export class AuthService {
  private userRepository: IUserRepository;

  constructor() {
    this.userRepository = new UserRepository();
  }

  // Register ด้วย Email หรือ Phone
  async register(data: RegisterData): Promise<{ user: IUser }> {
    try {
      // ตรวจสอบว่า user มีอยู่แล้วหรือไม่
      if (data.email) {
        const existingUser = await this.userRepository.findByEmail(data.email);
        if (existingUser) {
          throw new Error('อีเมลนี้ถูกใช้งานแล้ว');
        }
      }

      if (data.phone) {
        const existingUser = await this.userRepository.findByPhone(data.phone);
        if (existingUser) {
          throw new Error('หมายเลขโทรศัพท์นี้ถูกใช้งานแล้ว');
        }
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(data.password, 10);

      // สร้าง user ใหม่
      const userData: Partial<IUser> = {
        name: data.name,
        password: hashedPassword,
        role: 'user',
        authMethods: [data.authMethod],
        isVerified: false,
        phoneVerified: data.authMethod === 'phone' ? false : true,
        emailVerified: data.authMethod === 'email' ? false : true,
      };

      if (data.email) userData.email = data.email;
      if (data.phone) userData.phone = data.phone;

      const user = await this.userRepository.create(userData);

      return { user };
    } catch (error) {
      throw new Error(`Error in register: ${error}`);
    }
  }

  // Login ด้วย Email หรือ Phone
  async login(data: LoginData): Promise<AuthResult> {
    try {
      let user: IUser | null = null;

      // หาผู้ใช้ด้วย email หรือ phone
      if (data.identifier.includes('@')) {
        user = await this.userRepository.findByEmail(data.identifier);
      } else {
        user = await this.userRepository.findByPhone(data.identifier);
      }

      if (!user || !user.password) {
        throw new Error('ข้อมูลผู้ใช้หรือรหัสผ่านไม่ถูกต้อง');
      }

      // ตรวจสอบรหัสผ่าน
      // const isPasswordValid = await user.comparePassword(data.password);
      // if (!isPasswordValid) {
      //   throw new Error('ข้อมูลผู้ใช้หรือรหัสผ่านไม่ถูกต้อง');
      // }

      // สร้าง tokens
      const { accessToken, refreshToken } = generateTokens(
        (user as any)._id.toString(), 
        user.email || '', 
        user.role
      );

      // เก็บ refresh token ใน Redis
      // await redis.set(`refresh_token:${(user as any)._id}`, refreshToken);

      return { user, accessToken, refreshToken };
    } catch (error) {
      throw new Error(`Error in login: ${error}`);
    }
  }

  // Facebook Login
  async facebookLogin(facebookData: { id: string; name: string; email?: string }): Promise<AuthResult> {
    try {
      let user = await this.userRepository.findByFacebookId(facebookData.id);

      if (!user) {
        // สร้าง user ใหม่จาก Facebook
        const userData: Partial<IUser> = {
          name: facebookData.name,
          facebookId: facebookData.id,
          email: facebookData.email,
          role: 'user',
          authMethods: ['facebook'],
          isVerified: true,
          phoneVerified: true,
          emailVerified: !!facebookData.email,
        };

        user = await this.userRepository.create(userData);
      }

      // สร้าง tokens
      const { accessToken, refreshToken } = generateTokens(
        (user as any)._id.toString(), 
        user.email || '', 
        user.role
      );

      // เก็บ refresh token ใน Redis
      await redis.setex(`refresh_token:${(user as any)._id}`, 7 * 24 * 60 * 60, refreshToken);

      return { user, accessToken, refreshToken };
    } catch (error) {
      throw new Error(`Error in Facebook login: ${error}`);
    }
  }

  // Refresh Token
  async refreshToken(refreshToken: string): Promise<{ accessToken: string; refreshToken: string }> {
    try {
      const decoded = verifyRefreshToken(refreshToken) as { userId: string };
      
      // ตรวจสอบใน Redis
      const storedToken = await redis.get(`refresh_token:${decoded.userId}`);
      if (!storedToken || storedToken !== refreshToken) {
        throw new Error('Refresh token ไม่ถูกต้องหรือหมดอายุ');
      }

      // หาผู้ใช้
      const user = await this.userRepository.findById(decoded.userId);
      if (!user) {
        throw new Error('ไม่พบผู้ใช้');
      }

      // สร้าง tokens ใหม่
      const tokens = generateTokens(
        (user as any)._id.toString(), 
        user.email || '', 
        user.role
      );

      // อัปเดต refresh token ใน Redis
      await redis.setex(`refresh_token:${(user as any)._id}`, 7 * 24 * 60 * 60, tokens.refreshToken);

      return tokens;
    } catch (error) {
      throw new Error(`Error refreshing token: ${error}`);
    }
  }

  // Logout
  async logout(userId: string): Promise<void> {
    try {
      await redis.del(`refresh_token:${userId}`);
    } catch (error) {
      throw new Error(`Error in logout: ${error}`);
    }
  }

  // Change Password
  async changePassword(userId: string, oldPassword: string, newPassword: string): Promise<void> {
    try {
      const user = await this.userRepository.findById(userId);
      if (!user || !user.password) {
        throw new Error('ไม่พบผู้ใช้');
      }

      const isOldPasswordValid = await user.comparePassword(oldPassword);
      if (!isOldPasswordValid) {
        throw new Error('รหัสผ่านเดิมไม่ถูกต้อง');
      }

      const hashedNewPassword = await bcrypt.hash(newPassword, 10);
      await this.userRepository.update(userId, { password: hashedNewPassword });
    } catch (error) {
      throw new Error(`Error changing password: ${error}`);
    }
  }

  // Get User Profile
  async getProfile(userId: string): Promise<IUser> {
    try {
      const user = await this.userRepository.findById(userId);
      if (!user) {
        throw new Error('ไม่พบผู้ใช้');
      }
      return user;
    } catch (error) {
      throw new Error(`Error getting profile: ${error}`);
    }
  }

  // Update User Profile
  async updateProfile(userId: string, updateData: Partial<IUser>): Promise<IUser> {
    try {
      // ลบข้อมูลที่ไม่ควรอัปเดตโดยตรง
      const { password, role, authMethods, isVerified, phoneVerified, emailVerified, ...allowedData } = updateData;

      const updatedUser = await this.userRepository.update(userId, allowedData);
      if (!updatedUser) {
        throw new Error('ไม่สามารถอัปเดตข้อมูลผู้ใช้ได้');
      }

      return updatedUser;
    } catch (error) {
      throw new Error(`Error updating profile: ${error}`);
    }
  }
}