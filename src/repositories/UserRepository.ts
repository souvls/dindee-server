import { Model, Document } from 'mongoose';
import { User, IUser } from '../models/User';

export interface IUserRepository {
  create(userData: Partial<IUser>): Promise<IUser>;
  findById(id: string): Promise<IUser | null>;
  findByEmail(email: string): Promise<IUser | null>;
  findByPhone(phone: string): Promise<IUser | null>;
  findByFacebookId(facebookId: string): Promise<IUser | null>;
  update(id: string, data: Partial<IUser>): Promise<IUser | null>;
  delete(id: string): Promise<boolean>;
  count(): Promise<number>;
  findWithPagination(page: number, limit: number, filter?: any): Promise<{ users: IUser[], total: number }>;
}

export class UserRepository implements IUserRepository {
  private model: Model<IUser>;

  constructor() {
    this.model = User;
  }

  async create(userData: Partial<IUser>): Promise<IUser> {
    try {
      const user = new this.model(userData);
      return await user.save();
    } catch (error) {
      throw new Error(`Error creating user: ${error}`);
    }
  }

  async findById(id: string): Promise<IUser | null> {
    try {
      return await this.model.findById(id);
    } catch (error) {
      throw new Error(`Error finding user by ID: ${error}`);
    }
  }

  async findByEmail(email: string): Promise<IUser | null> {
    try {
      return await this.model.findOne({ email });
    } catch (error) {
      throw new Error(`Error finding user by email: ${error}`);
    }
  }

  async findByPhone(phone: string): Promise<IUser | null> {
    try {
      return await this.model.findOne({ phone });
    } catch (error) {
      throw new Error(`Error finding user by phone: ${error}`);
    }
  }

  async findByFacebookId(facebookId: string): Promise<IUser | null> {
    try {
      return await this.model.findOne({ 'facebook.id': facebookId });
    } catch (error) {
      throw new Error(`Error finding user by Facebook ID: ${error}`);
    }
  }

  async update(id: string, data: Partial<IUser>): Promise<IUser | null> {
    try {
      return await this.model.findByIdAndUpdate(id, data, { new: true });
    } catch (error) {
      throw new Error(`Error updating user: ${error}`);
    }
  }

  async delete(id: string): Promise<boolean> {
    try {
      const result = await this.model.findByIdAndDelete(id);
      return !!result;
    } catch (error) {
      throw new Error(`Error deleting user: ${error}`);
    }
  }

  async count(): Promise<number> {
    try {
      return await this.model.countDocuments();
    } catch (error) {
      throw new Error(`Error counting users: ${error}`);
    }
  }

  async findWithPagination(page: number, limit: number, filter?: any): Promise<{ users: IUser[], total: number }> {
    try {
      const skip = (page - 1) * limit;
      const query = filter || {};
      
      const [users, total] = await Promise.all([
        this.model.find(query).skip(skip).limit(limit).sort({ createdAt: -1 }),
        this.model.countDocuments(query)
      ]);

      return { users, total };
    } catch (error) {
      throw new Error(`Error finding users with pagination: ${error}`);
    }
  }
}