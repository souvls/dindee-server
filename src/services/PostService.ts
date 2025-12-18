import mongoose from "mongoose";
import {
  PostRepository,
  IPostRepository,
} from "../repositories/PostRepository";
import {
  UserRepository,
  IUserRepository,
} from "../repositories/UserRepository";
import { IPost } from "../models/Post";
import { IUser } from "../models/User";
import { PostQueryHelper } from "./PostQueryHelper";

export interface CreatePostData {
  title: string;
  description: string;
  price: number;
  location: any; // Allow object or string for backward compatibility
  propertyType:
    | "house"
    | "land"
    | "condo"
    | "apartment"
    | "villa"
    | "townhouse";
  listingType?: "sell" | "rent" | "lease";
  bedrooms?: number;
  bathrooms?: number;
  area?: number;
  images?: string[];
  media?: any;
  authorId: string;
  landDetails?: any;
  houseDetails?: any;
  condition?: "new" | "excellent" | "good" | "fair" | "poor";
  featured?: boolean;
  urgent?: boolean;
}

export interface UpdatePostData {
  title?: string;
  description?: string;
  price?: number;
  location?: string;
  propertyType?:
    | "house"
    | "land"
    | "condo"
    | "apartment"
    | "villa"
    | "townhouse";
  bedrooms?: number;
  bathrooms?: number;
  area?: number;
  images?: string[];
}

export interface PostFilter {
  status?: "pending" | "approved" | "rejected";
  propertyType?:
    | "house"
    | "land"
    | "condo"
    | "apartment"
    | "villa"
    | "townhouse";
  listingType?: "sell" | "rent" | "lease";
  minPrice?: number;
  maxPrice?: number;
  location?: string;
  province?: string;
  district?: string;
  bedrooms?: number;
  bathrooms?: number;
  minArea?: number;
  maxArea?: number;
  condition?: "new" | "excellent" | "good" | "fair" | "poor";
  featured?: boolean;
  urgent?: boolean;
  // Land specific filters
  roadAccess?: boolean;
  waterSource?: boolean;
  electricity?: boolean;
  // Geospatial filters
  latitude?: number;
  longitude?: number;
  radius?: number; // ในหน่วย เมตร
  sortBy?:
    | "newest"
    | "oldest"
    | "price_asc"
    | "price_desc"
    | "area_asc"
    | "area_desc"
    | "distance";
}

export class PostService {
  private postRepository: IPostRepository;
  private userRepository: IUserRepository;

  constructor() {
    this.postRepository = new PostRepository();
    this.userRepository = new UserRepository();
  }

  // สร้างโพสต์ใหม่
  async createPost(data: CreatePostData): Promise<IPost> {
    try {
      // ตรวจสอบว่าผู้ใช้มีอยู่จริง
      const user = await this.userRepository.findById(data.authorId);
      if (!user) {
        throw new Error("ไม่พบผู้ใช้");
      }

      // Prepare location data
      let locationData = data.location;

      // If location is provided as string (legacy), convert it
      if (typeof data.location === "string") {
        locationData = {
          address: {
            street: data.location,
            district: "Unknown",
            province: "Unknown",
          },
          coordinates: {
            type: "Point",
            coordinates: [0, 0],
          },
        };
      }

      // สร้างโพสต์
      const postData: any = {
        title: data.title,
        description: data.description,
        price: data.price,
        propertyType: data.propertyType,
        area: data.area,
        authorId: new mongoose.Types.ObjectId(data.authorId),
        status: "pending" as const,
        listingType: data.listingType || "sell",
        location: locationData,
        // Optional media format (if provided in new structure)
        media: data.media || {
          images: data.images || [],
        },
        // Property specific details
        houseDetails:
          data.houseDetails ||
          (data.bedrooms || data.bathrooms
            ? {
                bedrooms: data.bedrooms,
                bathrooms: data.bathrooms,
              }
            : undefined),
        landDetails: data.landDetails,
        condition: data.condition || "good",
        featured: data.featured || false,
        urgent: data.urgent || false,
      };

      return await this.postRepository.create(postData);
    } catch (error) {
      throw new Error(`Error creating post: ${error}`);
    }
  }

  // ดึงโพสต์ทั้งหมดพร้อม pagination และ advanced filter
  async getAllPosts(page: number = 1, limit: number = 10, filter?: PostFilter) {
    try {
      const query: any = {};

      // สร้าง query จาก filter
      if (filter) {
        if (filter.status) query.status = filter.status;
        if (filter.propertyType) query.propertyType = filter.propertyType;
        if (filter.listingType) query.listingType = filter.listingType;
        if (filter.condition) query.condition = filter.condition;
        if (filter.featured !== undefined) query.featured = filter.featured;
        if (filter.urgent !== undefined) query.urgent = filter.urgent;

        // Location filters
        if (filter.province)
          query["location.address.province"] = {
            $regex: filter.province,
            $options: "i",
          };
        if (filter.district)
          query["location.address.district"] = {
            $regex: filter.district,
            $options: "i",
          };
        if (filter.location) {
          query.$or = [
            {
              "location.address.street": {
                $regex: filter.location,
                $options: "i",
              },
            },
            {
              "location.address.district": {
                $regex: filter.location,
                $options: "i",
              },
            },
            {
              "location.address.province": {
                $regex: filter.location,
                $options: "i",
              },
            },
          ];
        }

        // House details filters
        if (filter.bedrooms) query["houseDetails.bedrooms"] = filter.bedrooms;
        if (filter.bathrooms)
          query["houseDetails.bathrooms"] = filter.bathrooms;

        // ช่วงราคา
        if (filter.minPrice || filter.maxPrice) {
          query.price = {};
          if (filter.minPrice) query.price.$gte = filter.minPrice;
          if (filter.maxPrice) query.price.$lte = filter.maxPrice;
        }

        // ช่วงพื้นที่
        if (filter.minArea || filter.maxArea) {
          query.area = {};
          if (filter.minArea) query.area.$gte = filter.minArea;
          if (filter.maxArea) query.area.$lte = filter.maxArea;
        }
      }

      const { posts, total } = await this.postRepository.findWithPagination(
        page,
        limit,
        query
      );

      return {
        posts,
        pagination: {
          current: page,
          total: Math.ceil(total / limit),
          count: posts.length,
          totalCount: total,
          limit,
        },
      };
    } catch (error) {
      throw new Error(`Error getting posts: ${error}`);
    }
  }

  // ค้นหาโพสต์ในบริเวณใกล้เคียง (Geospatial Search)
  async getNearbyPosts(
    latitude: number,
    longitude: number,
    radiusInMeters: number = 5000,
    page: number = 1,
    limit: number = 10,
    filter?: Omit<PostFilter, "latitude" | "longitude" | "radius">
  ) {
    try {
      const query: any = {
        status: "approved", // เฉพาะโพสต์ที่อนุมัติแล้ว
        "location.coordinates": {
          $near: {
            $geometry: {
              type: "Point",
              coordinates: [longitude, latitude], // GeoJSON format: [lng, lat]
            },
            $maxDistance: radiusInMeters,
          },
        },
      };

      // เพิ่ม filter อื่นๆ
      if (filter) {
        if (filter.propertyType) query.propertyType = filter.propertyType;
        if (filter.listingType) query.listingType = filter.listingType;
        if (filter.condition) query.condition = filter.condition;
        if (filter.featured !== undefined) query.featured = filter.featured;
        if (filter.urgent !== undefined) query.urgent = filter.urgent;

        // ช่วงราคา
        if (filter.minPrice || filter.maxPrice) {
          query.price = {};
          if (filter.minPrice) query.price.$gte = filter.minPrice;
          if (filter.maxPrice) query.price.$lte = filter.maxPrice;
        }

        // ช่วงพื้นที่
        if (filter.minArea || filter.maxArea) {
          query.area = {};
          if (filter.minArea) query.area.$gte = filter.minArea;
          if (filter.maxArea) query.area.$lte = filter.maxArea;
        }

        // House details
        if (filter.bedrooms) query["houseDetails.bedrooms"] = filter.bedrooms;
        if (filter.bathrooms)
          query["houseDetails.bathrooms"] = filter.bathrooms;
      }

      // คำนวณ skip และ limit
      const skip = (page - 1) * limit;

      // ดึงข้อมูล
      const posts = await PostQueryHelper.findNearbyPosts(
        latitude,
        longitude,
        radiusInMeters,
        filter,
        skip,
        limit
      );
      const total = await PostQueryHelper.countNearbyPosts(
        latitude,
        longitude,
        radiusInMeters,
        filter
      );

      return {
        posts: posts.map((post: any) => ({
          ...post,
          // คำนวณระยะทาง (โดยประมาณ)
          distance: PostQueryHelper.calculateDistance(
            latitude,
            longitude,
            post.location.coordinates.coordinates[1], // lat
            post.location.coordinates.coordinates[0] // lng
          ),
        })),
        pagination: {
          current: page,
          total: Math.ceil(total / limit),
          count: posts.length,
          totalCount: total,
          limit,
        },
        searchCenter: {
          latitude,
          longitude,
          radius: radiusInMeters,
        },
      };
    } catch (error) {
      throw new Error(`Error getting nearby posts: ${error}`);
    }
  }

  // Filter โพสต์ด้วย advanced criteria
  async filterPosts(filter: PostFilter, page: number = 1, limit: number = 10) {
    try {
      let query: any = { status: "approved" }; // เฉพาะโพสต์ที่อนุมัติแล้ว

      // ถ้ามีการกำหนดพิกัดและรัศมี ให้ใช้ geospatial search
      if (filter.latitude && filter.longitude && filter.radius) {
        return await this.getNearbyPosts(
          filter.latitude,
          filter.longitude,
          filter.radius,
          page,
          limit,
          filter
        );
      }

      // สร้าง query ปกติ
      if (filter.propertyType) query.propertyType = filter.propertyType;
      if (filter.listingType) query.listingType = filter.listingType;
      if (filter.condition) query.condition = filter.condition;
      if (filter.featured !== undefined) query.featured = filter.featured;
      if (filter.urgent !== undefined) query.urgent = filter.urgent;

      // Location filters
      if (filter.province)
        query["location.address.province"] = {
          $regex: filter.province,
          $options: "i",
        };
      if (filter.district)
        query["location.address.district"] = {
          $regex: filter.district,
          $options: "i",
        };
      if (filter.location) {
        query.$or = [
          {
            "location.address.street": {
              $regex: filter.location,
              $options: "i",
            },
          },
          {
            "location.address.district": {
              $regex: filter.location,
              $options: "i",
            },
          },
          {
            "location.address.province": {
              $regex: filter.location,
              $options: "i",
            },
          },
        ];
      }

      // Price range
      if (filter.minPrice || filter.maxPrice) {
        query.price = {};
        if (filter.minPrice) query.price.$gte = filter.minPrice;
        if (filter.maxPrice) query.price.$lte = filter.maxPrice;
      }

      // Area range
      if (filter.minArea || filter.maxArea) {
        query.area = {};
        if (filter.minArea) query.area.$gte = filter.minArea;
        if (filter.maxArea) query.area.$lte = filter.maxArea;
      }

      // House details
      if (filter.bedrooms) query["houseDetails.bedrooms"] = filter.bedrooms;
      if (filter.bathrooms) query["houseDetails.bathrooms"] = filter.bathrooms;

      // Sorting
      let sortQuery: any = { createdAt: -1 }; // default sort
      if (filter.sortBy) {
        switch (filter.sortBy) {
          case "newest":
            sortQuery = { createdAt: -1 };
            break;
          case "oldest":
            sortQuery = { createdAt: 1 };
            break;
          case "price_asc":
            sortQuery = { price: 1 };
            break;
          case "price_desc":
            sortQuery = { price: -1 };
            break;
          case "area_asc":
            sortQuery = { area: 1 };
            break;
          case "area_desc":
            sortQuery = { area: -1 };
            break;
        }
      }

      const { posts, total } = await PostQueryHelper.findWithAdvancedFilter(
        query,
        sortQuery,
        (page - 1) * limit,
        limit
      );

      return {
        posts,
        pagination: {
          current: page,
          total: Math.ceil(total / limit),
          count: posts.length,
          totalCount: total,
          limit,
        },
      };
    } catch (error) {
      throw new Error(`Error filtering posts: ${error}`);
    }
  }

  // Advanced search รวมทุกอย่าง (text, geospatial, filters)
  async advancedSearch(params: {
    searchText?: string;
    latitude?: number;
    longitude?: number;
    radius?: number;
    propertyType?: string;
    listingType?: string;
    minPrice?: number;
    maxPrice?: number;
    minArea?: number;
    maxArea?: number;
    province?: string;
    district?: string;
    bedrooms?: number;
    bathrooms?: number;
    condition?: string;
    featured?: boolean;
    urgent?: boolean;
    sortBy?: string;
    page?: number;
    limit?: number;
    // Land specific
    roadAccess?: boolean;
    waterSource?: boolean;
    electricity?: boolean;
  }) {
    try {
      const result = await PostQueryHelper.advancedSearch(params);
      return {
        posts: result.posts,
        pagination: {
          current: result.pagination.current,
          total: result.pagination.total,
          count: result.pagination.count,
          totalCount: result.pagination.totalCount,
          limit: result.pagination.limit,
        },
        searchInfo: result.searchInfo,
      };
    } catch (error) {
      throw new Error(`Error in advanced search: ${error}`);
    }
  }

  // ดึงโพสต์ตาม ID
  async getPostById(id: string): Promise<IPost> {
    try {
      const post = await this.postRepository.findById(id);
      if (!post) {
        throw new Error("ไม่พบโพสต์");
      }
      return post;
    } catch (error) {
      throw new Error(`Error getting post by ID: ${error}`);
    }
  }

  // ดึงโพสต์ของผู้ใช้
  async getUserPosts(userId: string, page: number = 1, limit: number = 10) {
    try {
      const user = await this.userRepository.findById(userId);
      if (!user) {
        throw new Error("ไม่พบผู้ใช้");
      }

      const posts = await this.postRepository.findByUserId(userId);
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const paginatedPosts = posts.slice(startIndex, endIndex);

      return {
        posts: paginatedPosts,
        pagination: {
          current: page,
          total: Math.ceil(posts.length / limit),
          count: paginatedPosts.length,
          totalCount: posts.length,
          limit,
        },
      };
    } catch (error) {
      throw new Error(`Error getting user posts: ${error}`);
    }
  }

  // อัปเดตโพสต์
  async updatePost(
    id: string,
    userId: string,
    data: UpdatePostData,
    userRole?: string
  ): Promise<IPost> {
    try {
      const post = await this.postRepository.findById(id);
      if (!post) {
        throw new Error("ไม่พบโพสต์");
      }

      // ตรวจสอบสิทธิ์ (เฉพาะเจ้าของโพสต์หรือ admin)
      // ตรวจสอบสิทธิ์ (เฉพาะเจ้าของโพสต์หรือ admin)
      const authorId = (post.authorId as any)._id
        ? (post.authorId as any)._id.toString()
        : post.authorId.toString();

      if (authorId !== userId && userRole !== "admin") {
        throw new Error("คุณไม่มีสิทธิ์แก้ไขโพสต์นี้");
      }

      // Convert legacy data format for update
      const updateData: any = { ...data };

      // Convert location if it's a string
      if (typeof data.location === "string") {
        updateData.location = {
          address: {
            street: data.location,
            district: "Unknown",
            province: "Unknown",
          },
          coordinates: {
            latitude: 0,
            longitude: 0,
          },
        };
      }

      const updatedPost = await this.postRepository.update(id, updateData);
      if (!updatedPost) {
        throw new Error("ไม่สามารถอัปเดตโพสต์ได้");
      }

      return updatedPost;
    } catch (error) {
      throw new Error(`Error updating post: ${error}`);
    }
  }

  // ลบโพสต์
  async deletePost(
    id: string,
    userId: string,
    userRole?: string
  ): Promise<void> {
    try {
      const post = await this.postRepository.findById(id);
      if (!post) {
        throw new Error("ไม่พบโพสต์");
      }

      // ตรวจสอบสิทธิ์ (เฉพาะเจ้าของโพสต์หรือ admin)
      // ตรวจสอบสิทธิ์ (เฉพาะเจ้าของโพสต์หรือ admin)
      const authorId = (post.authorId as any)._id
        ? (post.authorId as any)._id.toString()
        : post.authorId.toString();

      if (authorId !== userId && userRole !== "admin") {
        throw new Error("คุณไม่มีสิทธิ์ลบโพสต์นี้");
      }

      const deleted = await this.postRepository.delete(id);
      if (!deleted) {
        throw new Error("ไม่สามารถลบโพสต์ได้");
      }
    } catch (error) {
      throw new Error(`Error deleting post: ${error}`);
    }
  }

  // อนุมัติโพสต์ (สำหรับ admin)
  async approvePost(id: string): Promise<IPost> {
    try {
      const updatedPost = await this.postRepository.update(id, {
        status: "approved",
      });
      if (!updatedPost) {
        throw new Error("ไม่พบโพสต์หรือไม่สามารถอนุมัติได้");
      }
      return updatedPost;
    } catch (error) {
      throw new Error(`Error approving post: ${error}`);
    }
  }

  // ปฏิเสธโพสต์ (สำหรับ admin)
  async rejectPost(id: string): Promise<IPost> {
    try {
      const updatedPost = await this.postRepository.update(id, {
        status: "rejected",
      });
      if (!updatedPost) {
        throw new Error("ไม่พบโพสต์หรือไม่สามารถปฏิเสธได้");
      }
      return updatedPost;
    } catch (error) {
      throw new Error(`Error rejecting post: ${error}`);
    }
  }

  // ค้นหาโพสต์
  async searchPosts(query: string, page: number = 1, limit: number = 10) {
    try {
      const posts = await this.postRepository.search(query);
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const paginatedPosts = posts.slice(startIndex, endIndex);

      return {
        posts: paginatedPosts,
        pagination: {
          current: page,
          total: Math.ceil(posts.length / limit),
          count: paginatedPosts.length,
          totalCount: posts.length,
          limit,
        },
      };
    } catch (error) {
      throw new Error(`Error searching posts: ${error}`);
    }
  }

  // ดึงโพสต์ตามหมวดหมู่
  async getPostsByCategory(
    category: string,
    page: number = 1,
    limit: number = 10
  ) {
    try {
      const posts = await this.postRepository.findByCategory(category);
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const paginatedPosts = posts.slice(startIndex, endIndex);

      return {
        posts: paginatedPosts,
        pagination: {
          current: page,
          total: Math.ceil(posts.length / limit),
          count: paginatedPosts.length,
          totalCount: posts.length,
          limit,
        },
      };
    } catch (error) {
      throw new Error(`Error getting posts by category: ${error}`);
    }
  }

  // สถิติโพสต์
  async getPostStats() {
    try {
      const [total, pending, approved, rejected] = await Promise.all([
        this.postRepository.count(),
        this.postRepository
          .findWithPagination(1, 1, { status: "pending" })
          .then((r) => r.total),
        this.postRepository
          .findWithPagination(1, 1, { status: "approved" })
          .then((r) => r.total),
        this.postRepository
          .findWithPagination(1, 1, { status: "rejected" })
          .then((r) => r.total),
      ]);

      return {
        total,
        pending,
        approved,
        rejected,
      };
    } catch (error) {
      throw new Error(`Error getting post stats: ${error}`);
    }
  }
}
