import { Model } from 'mongoose';
import { Post, IPost } from '../models/Post';

export interface IPostRepository {
  create(postData: Partial<IPost>): Promise<IPost>;
  findById(id: string): Promise<IPost | null>;
  findByUserId(userId: string): Promise<IPost[]>;
  update(id: string, data: Partial<IPost>): Promise<IPost | null>;
  delete(id: string): Promise<boolean>;
  count(): Promise<number>;
  findWithPagination(page: number, limit: number, filter?: any): Promise<{ posts: IPost[], total: number }>;
  findByCategory(category: string): Promise<IPost[]>;
  search(query: string): Promise<IPost[]>;
  findByQuery(query: any, options?: { skip?: number; limit?: number }): Promise<IPost[]>;
  countDocuments(query: any): Promise<number>;
}

export class PostRepository implements IPostRepository {
  private model: Model<IPost>;

  constructor() {
    this.model = Post;
  }

  async create(postData: Partial<IPost>): Promise<IPost> {
    try {
      const post = new this.model(postData);
      return await post.save();
    } catch (error) {
      throw new Error(`Error creating post: ${error}`);
    }
  }

  async findById(id: string): Promise<IPost | null> {
    try {
      return await this.model.findById(id).populate('author', 'name email avatar');
    } catch (error) {
      throw new Error(`Error finding post by ID: ${error}`);
    }
  }

  async findByUserId(userId: string): Promise<IPost[]> {
    try {
      return await this.model.find({ author: userId }).populate('author', 'name email avatar');
    } catch (error) {
      throw new Error(`Error finding posts by user ID: ${error}`);
    }
  }

  async update(id: string, data: Partial<IPost>): Promise<IPost | null> {
    try {
      return await this.model.findByIdAndUpdate(id, data, { new: true }).populate('author', 'name email avatar');
    } catch (error) {
      throw new Error(`Error updating post: ${error}`);
    }
  }

  async delete(id: string): Promise<boolean> {
    try {
      const result = await this.model.findByIdAndDelete(id);
      return !!result;
    } catch (error) {
      throw new Error(`Error deleting post: ${error}`);
    }
  }

  async count(): Promise<number> {
    try {
      return await this.model.countDocuments();
    } catch (error) {
      throw new Error(`Error counting posts: ${error}`);
    }
  }

  async findWithPagination(page: number, limit: number, filter?: any): Promise<{ posts: IPost[], total: number }> {
    try {
      const skip = (page - 1) * limit;
      const query = filter || {};
      
      const [posts, total] = await Promise.all([
        this.model.find(query).skip(skip).limit(limit).populate('author', 'name email avatar').sort({ createdAt: -1 }),
        this.model.countDocuments(query)
      ]);

      return { posts, total };
    } catch (error) {
      throw new Error(`Error finding posts with pagination: ${error}`);
    }
  }

  async findByCategory(category: string): Promise<IPost[]> {
    try {
      return await this.model.find({ category }).populate('author', 'name email avatar').sort({ createdAt: -1 });
    } catch (error) {
      throw new Error(`Error finding posts by category: ${error}`);
    }
  }

  async search(query: string): Promise<IPost[]> {
    try {
      return await this.model.find({
        $or: [
          { title: { $regex: query, $options: 'i' } },
          { description: { $regex: query, $options: 'i' } },
          { location: { $regex: query, $options: 'i' } }
        ]
      }).populate('author', 'name email avatar').sort({ createdAt: -1 });
    } catch (error) {
      throw new Error(`Error searching posts: ${error}`);
    }
  }

  async findByQuery(query: any, options?: { skip?: number; limit?: number }): Promise<IPost[]> {
    try {
      let queryBuilder = this.model.find(query).populate('authorId', 'name email avatar').sort({ createdAt: -1 });
      
      if (options?.skip) {
        queryBuilder = queryBuilder.skip(options.skip);
      }
      
      if (options?.limit) {
        queryBuilder = queryBuilder.limit(options.limit);
      }
      
      return await queryBuilder;
    } catch (error) {
      throw new Error(`Error finding posts by query: ${error}`);
    }
  }

  async countDocuments(query: any): Promise<number> {
    try {
      return await this.model.countDocuments(query);
    } catch (error) {
      throw new Error(`Error counting documents: ${error}`);
    }
  }
}