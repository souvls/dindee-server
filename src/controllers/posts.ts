import { Request, Response } from "express";
import { validationResult } from "express-validator";
import ViewTrackingService from "@/services/ViewTrackingService";
import { ResponseHelper } from "@/utils/response";
import { AuthRequest } from "@/middlewares/auth";
import { Post } from "@/models/Post";
import { postHelper, postValidation } from "./helpers/postHelper";
import { PostService, UpdatePostData } from "@/services/PostService";
import { CreatePostRequest } from "@/types";

const postService = new PostService();

// Admin: Get All Posts
export const getAdminPosts = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    // Basic Admin Check (Better to use middleware, but checking here for safety)
    if (req.user.role !== "admin") {
      ResponseHelper.forbidden(res, "Admin access required");
      return;
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;

    // Construct filter from query
    const filter: any = {};
    if (req.query.status) filter.status = req.query.status;
    if (req.query.propertyType) filter.propertyType = req.query.propertyType;
    if (req.query.listingType) filter.listingType = req.query.listingType;
    if (req.query.search) {
      // Simple search for admin (can use the advanced search logic or just regex on title)
      // For admin list, usually simple filters are enough, but we can repurpose the filter logic
      // We'll pass it to getAllPosts
    }

    const result = await postService.getAllPosts(page, limit, filter);

    const formattedPosts = result.posts.map((post: any) =>
      postHelper.formatPostResponse(post)
    );

    ResponseHelper.successWithPagination(
      res,
      formattedPosts,
      {
        page: result.pagination.current,
        limit: result.pagination.limit,
        total: result.pagination.totalCount,
        totalPages: result.pagination.total,
      },
      "All posts retrieved successfully"
    );
  } catch (error) {
    console.error("Get admin posts error:", error);
    ResponseHelper.internalError(res);
  }
};

// ดึงโพสต์เดี่ยว (พร้อมติดตาม view)
export const getPost = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const ipAddress = req.ip || req.connection.remoteAddress || "unknown";
    const userAgent = req.get("User-Agent");
    const userId = (req as any).user?._id?.toString();
    const sessionId = (req as any).sessionID || req.get("x-session-id");

    // ดึงโพสต์
    const post = await Post.findById(id).populate(
      "authorId",
      "name email avatar"
    );

    if (!post) {
      ResponseHelper.notFound(res, "Post not found");
      return;
    }

    // if (post.status !== "approved") {
    //   ResponseHelper.forbidden(res, "Post not available");
    //   return;
    // }

    // ติดตามการเข้าชม (ทำแบบ async เพื่อไม่ให้ช้า)
    ViewTrackingService.trackView(
      id,
      ipAddress,
      userId,
      userAgent,
      sessionId
    ).catch((error) => console.error("View tracking error:", error));

    ResponseHelper.success(res, post, "Post retrieved successfully");
  } catch (error) {
    console.error("Get post error:", error);
    ResponseHelper.internalError(res);
  }
};

// ติดตาม view โดยตรง (สำหรับ AJAX calls)
export const trackPostView = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const ipAddress = req.ip || req.connection.remoteAddress || "unknown";
    const userAgent = req.get("User-Agent");
    const userId = (req as any).user?._id?.toString();
    const sessionId = (req as any).sessionID || req.get("x-session-id");

    const result = await ViewTrackingService.trackView(
      id,
      ipAddress,
      userId,
      userAgent,
      sessionId
    );

    ResponseHelper.success(res, result, "View tracked successfully");
  } catch (error) {
    console.error("Track view error:", error);
    if (error instanceof Error) {
      if (error.message === "Post not found") {
        ResponseHelper.notFound(res, "Post not found");
      } else {
        ResponseHelper.error(res, error.message, undefined, 400);
      }
    } else {
      ResponseHelper.internalError(res);
    }
  }
};

// ดึงประวัติการดูของ user
export const getUserViewHistory = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user._id.toString();
    const { page = 1, limit = 20 } = req.query;

    const result = await ViewTrackingService.getUserViewHistory(
      userId,
      parseInt(page as string),
      parseInt(limit as string)
    );

    ResponseHelper.successWithPagination(
      res,
      result.views,
      result.pagination,
      "User view history retrieved successfully"
    );
  } catch (error) {
    console.error("Get user view history error:", error);
    ResponseHelper.internalError(res);
  }
};

// ดึงโพสต์ที่ดูมากที่สุด
export const getMostViewedPosts = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { timeFrame = "all", limit = 10 } = req.query;
    const validTimeFrames = ["day", "week", "month", "all"];

    if (!validTimeFrames.includes(timeFrame as string)) {
      ResponseHelper.error(
        res,
        "Invalid time frame. Must be: day, week, month, or all",
        undefined,
        400
      );
      return;
    }

    const posts = await ViewTrackingService.getMostViewedPosts(
      timeFrame as "day" | "week" | "month" | "all",
      parseInt(limit as string)
    );

    ResponseHelper.success(
      res,
      posts,
      "Most viewed posts retrieved successfully"
    );
  } catch (error) {
    console.error("Get most viewed posts error:", error);
    ResponseHelper.internalError(res);
  }
};

// ดึงสถิติการดูของโพสต์
export const getPostViewStats = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const stats = await ViewTrackingService.getPostViewStats(id);

    ResponseHelper.success(
      res,
      stats,
      "Post view stats retrieved successfully"
    );
  } catch (error) {
    console.error("Get post view stats error:", error);
    if (error instanceof Error) {
      if (error.message === "Post not found") {
        ResponseHelper.notFound(res, "Post not found");
      } else {
        ResponseHelper.error(res, error.message, undefined, 400);
      }
    } else {
      ResponseHelper.internalError(res);
    }
  }
};

// ดึงโพสต์แนะนำ (trending)
export const getTrendingPosts = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { limit = 10 } = req.query;

    // ดึงโพสต์ที่มี view และ bookmark สูงในสัปดาห์ที่ผ่านมา
    const posts = await Post.find({
      status: "approved",
      createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }, // 7 days ago
    })
      .sort({
        viewCount: -1,
        bookmarkCount: -1,
        uniqueViewCount: -1,
        createdAt: -1,
      })
      .limit(parseInt(limit as string))
      .populate("authorId", "name email avatar")
      .select(
        "title description price propertyType listingType area location media viewCount uniqueViewCount bookmarkCount featured urgent createdAt"
      );

    ResponseHelper.success(res, posts, "Trending posts retrieved successfully");
  } catch (error) {
    console.error("Get trending posts error:", error);
    ResponseHelper.internalError(res);
  }
};

// ดึงโพสต์แนะนำสำหรับ user (based on view history)
export const getRecommendedPosts = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user._id.toString();
    const { limit = 10 } = req.query;

    // Simple recommendation: โพสต์ที่คล้ายกับที่ user เคยดู
    // TODO: Implement more sophisticated recommendation algorithm

    // ดึงโพสต์ที่ user เคยดูล่าสุด
    const recentViews = await ViewTrackingService.getUserViewHistory(
      userId,
      1,
      5
    );

    let recommendedPosts: any[] = [];

    if (recentViews.views.length > 0) {
      // หา property types และ provinces ที่ user สนใจ
      const interestedTypes = [
        ...new Set(recentViews.views.map((v) => v.post.propertyType)),
      ];
      const interestedProvinces = [
        ...new Set(
          recentViews.views.map((v) => v.post.location.address.province)
        ),
      ];

      recommendedPosts = await Post.find({
        status: "approved",
        $or: [
          { propertyType: { $in: interestedTypes } },
          { "location.address.province": { $in: interestedProvinces } },
        ],
      })
        .sort({ viewCount: -1, bookmarkCount: -1, createdAt: -1 })
        .limit(parseInt(limit as string))
        .populate("authorId", "name email avatar")
        .select(
          "title description price propertyType listingType area location media viewCount uniqueViewCount bookmarkCount featured urgent createdAt"
        );
    } else {
      // ถ้าไม่มี history ให้แนะนำโพสต์ยอดนิยม
      recommendedPosts = await Post.find({ status: "approved" })
        .sort({ featured: -1, viewCount: -1, bookmarkCount: -1, createdAt: -1 })
        .limit(parseInt(limit as string))
        .populate("authorId", "name email avatar")
        .select(
          "title description price propertyType listingType area location media viewCount uniqueViewCount bookmarkCount featured urgent createdAt"
        );
    }

    ResponseHelper.success(
      res,
      recommendedPosts,
      "Recommended posts retrieved successfully"
    );
  } catch (error) {
    console.error("Get recommended posts error:", error);
    ResponseHelper.internalError(res);
  }
};

// ===== CRUD Operations =====

// สร้างโพสต์ใหม่
export const createPost = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      ResponseHelper.validationError(res, errors.array());
      return;
    }

    const postData: CreatePostRequest = req.body;
    let media = postData.media || { images: [], videos: [], documents: [] };

    // Handle file uploads
    if (req.files) {
      try {
        const { uploadFileToS3 } = await import("@/helpers/s3Helper");
        const files = req.files as {
          [fieldname: string]: Express.Multer.File[];
        };

        // Upload images
        if (files["images"]) {
          const imagePromises = files["images"].map((file) =>
            uploadFileToS3(file, "images")
          );
          const imageUrls = await Promise.all(imagePromises);
          media.images = [...(media.images || []), ...imageUrls];
        }

        // Upload videos
        if (files["videos"]) {
          const videoPromises = files["videos"].map((file) =>
            uploadFileToS3(file, "videos")
          );
          const videoUrls = await Promise.all(videoPromises);
          media.videos = [...(media.videos || []), ...videoUrls];
        }
      } catch (uploadError) {
        console.error("File upload error:", uploadError);
        ResponseHelper.error(
          res,
          "Failed to upload media files",
          undefined,
          500
        );
        return;
      }
    }

    // Type casting to ensure compatibility with CreatePostData interface
    const createPostData = {
      ...postData,
      media, // Use the updated media object with S3 URLs
      propertyType: postData.propertyType as
        | "house"
        | "land"
        | "condo"
        | "apartment"
        | "villa"
        | "townhouse",
      authorId: req.user._id.toString(),
    };

    const post = await postService.createPost(createPostData);

    ResponseHelper.success(
      res,
      postHelper.formatPostResponse(post),
      "Post created successfully",
      201
    );
  } catch (error) {
    console.error("Create post error:", error);
    ResponseHelper.internalError(res);
  }
};

// ดึงโพสต์ของ user
export const getUserPosts = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;

    const result = await postService.getUserPosts(
      req.user._id.toString(),
      page,
      limit
    );

    const formattedPosts = result.posts.map((post: any) =>
      postHelper.formatPostResponse(post)
    );

    ResponseHelper.successWithPagination(
      res,
      formattedPosts,
      {
        page: result.pagination.current,
        limit: result.pagination.limit,
        total: result.pagination.totalCount,
        totalPages: result.pagination.total,
      },
      "Posts retrieved successfully"
    );
  } catch (error) {
    console.error("Get user posts error:", error);
    ResponseHelper.internalError(res);
  }
};

// ดึงโพสต์ที่อนุมัติแล้ว
export const getApprovedPosts = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;

    const result = await postHelper.getPostsByStatus("approved", page, limit);

    const formattedPosts = result.posts.map((post: any) =>
      postHelper.formatPostResponse(post)
    );

    ResponseHelper.successWithPagination(
      res,
      formattedPosts,
      result.pagination,
      "Approved posts retrieved successfully"
    );
  } catch (error) {
    console.error("Get approved posts error:", error);
    ResponseHelper.internalError(res);
  }
};

// ดึงโพสต์ที่รออนุมัติ
export const getPendingPosts = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;

    const result = await postHelper.getPostsByStatus("pending", page, limit);

    const formattedPosts = result.posts.map((post: any) =>
      postHelper.formatPostResponse(post)
    );

    ResponseHelper.successWithPagination(
      res,
      formattedPosts,
      result.pagination,
      "Pending posts retrieved successfully"
    );
  } catch (error) {
    console.error("Get pending posts error:", error);
    ResponseHelper.internalError(res);
  }
};

// อนุมัติโพสต์
export const approvePost = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;

    try {
      const updatedPost = await postHelper.updatePostStatus(id, "approved");
      ResponseHelper.success(
        res,
        postHelper.formatPostResponse(updatedPost),
        "Post approved successfully"
      );
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === "Post not found") {
          ResponseHelper.notFound(res, "Post not found");
          return;
        }
        ResponseHelper.error(res, error.message, undefined, 400);
        return;
      }
      throw error;
    }
  } catch (error) {
    console.error("Approve post error:", error);
    ResponseHelper.internalError(res);
  }
};

// ปฏิเสธโพสต์
export const rejectPost = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;

    try {
      const updatedPost = await postHelper.updatePostStatus(id, "rejected");
      ResponseHelper.success(
        res,
        postHelper.formatPostResponse(updatedPost),
        "Post rejected successfully"
      );
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === "Post not found") {
          ResponseHelper.notFound(res, "Post not found");
          return;
        }
        ResponseHelper.error(res, error.message, undefined, 400);
        return;
      }
      throw error;
    }
  } catch (error) {
    console.error("Reject post error:", error);
    ResponseHelper.internalError(res);
  }
};

// ===== Advanced Search & Filter =====

// ค้นหาโพสต์ด้วย advanced filters
export const searchPosts = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const searchText = req.query.search as string;

    // สร้าง filter object จาก query parameters
    const filter: any = {};

    // Exact match filters (ถ้ามีส่งมาให้ใช้ตาม field ที่มี)
    if (req.query.propertyType) filter.propertyType = req.query.propertyType;
    if (req.query.listingType) filter.listingType = req.query.listingType;
    if (req.query.condition) filter.condition = req.query.condition;
    if (req.query.province) filter.province = req.query.province;
    if (req.query.district) filter.district = req.query.district;
    if (req.query.bedrooms)
      filter.bedrooms = parseInt(req.query.bedrooms as string);
    if (req.query.bathrooms)
      filter.bathrooms = parseInt(req.query.bathrooms as string);
    if (req.query.minPrice)
      filter.minPrice = parseFloat(req.query.minPrice as string);
    if (req.query.maxPrice)
      filter.maxPrice = parseFloat(req.query.maxPrice as string);
    if (req.query.minArea)
      filter.minArea = parseFloat(req.query.minArea as string);
    if (req.query.maxArea)
      filter.maxArea = parseFloat(req.query.maxArea as string);
    if (req.query.featured) filter.featured = req.query.featured === "true";
    if (req.query.urgent) filter.urgent = req.query.urgent === "true";
    if (req.query.sortBy) filter.sortBy = req.query.sortBy;

    // Land specific filters
    if (req.query.roadAccess)
      filter.roadAccess = req.query.roadAccess === "true";
    if (req.query.waterSource)
      filter.waterSource = req.query.waterSource === "true";
    if (req.query.electricity)
      filter.electricity = req.query.electricity === "true";

    // Geospatial search parameters
    if (req.query.latitude && req.query.longitude) {
      filter.latitude = parseFloat(req.query.latitude as string);
      filter.longitude = parseFloat(req.query.longitude as string);
      filter.radius = req.query.radius
        ? parseFloat(req.query.radius as string)
        : 5000; // default 5km
    }

    // Text search - ค้นหาหลายฟิลด์พร้อมกัน
    if (searchText) {
      filter.searchText = searchText;
    }

    // ใช้ advanced search
    const searchParams = {
      ...filter,
      page,
      limit,
    };

    const result = await postService.advancedSearch(searchParams);

    const formattedPosts = result.posts.map((post: any) => {
      const formatted = postHelper.formatPostResponse(post);
      // เพิ่มข้อมูลระยะทางถ้ามี
      if (post.distance !== undefined) {
        (formatted as any).distance = post.distance;
      }
      // เพิ่ม relevance score ถ้ามี
      if (post.relevanceScore !== undefined) {
        (formatted as any).relevanceScore = post.relevanceScore;
      }
      return formatted;
    });

    ResponseHelper.successWithPagination(
      res,
      formattedPosts,
      {
        page: result.pagination.current,
        limit: result.pagination.limit,
        total: result.pagination.totalCount,
        totalPages: result.pagination.total,
      },
      "Posts search completed successfully"
    );
  } catch (error) {
    console.error("Search posts error:", error);
    ResponseHelper.internalError(res, "Error searching posts");
  }
};

// ค้นหาโพสต์ในบริเวณใกล้เคียง
export const getNearbyPosts = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { latitude, longitude } = req.query;
    const radius = req.query.radius
      ? parseFloat(req.query.radius as string)
      : 5000; // default 5km
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;

    if (!latitude || !longitude) {
      ResponseHelper.badRequest(res, "Latitude and longitude are required");
      return;
    }

    const lat = parseFloat(latitude as string);
    const lng = parseFloat(longitude as string);

    if (
      isNaN(lat) ||
      isNaN(lng) ||
      lat < -90 ||
      lat > 90 ||
      lng < -180 ||
      lng > 180
    ) {
      ResponseHelper.badRequest(res, "Invalid latitude or longitude values");
      return;
    }

    // สร้าง filter object สำหรับการกรองเพิ่มเติม
    const filter: any = {};
    if (req.query.propertyType) filter.propertyType = req.query.propertyType;
    if (req.query.listingType) filter.listingType = req.query.listingType;
    if (req.query.minPrice)
      filter.minPrice = parseFloat(req.query.minPrice as string);
    if (req.query.maxPrice)
      filter.maxPrice = parseFloat(req.query.maxPrice as string);
    if (req.query.minArea)
      filter.minArea = parseFloat(req.query.minArea as string);
    if (req.query.maxArea)
      filter.maxArea = parseFloat(req.query.maxArea as string);

    const result = await postService.getNearbyPosts(
      lat,
      lng,
      radius,
      page,
      limit,
      filter
    );

    const formattedPosts = result.posts.map((post: any) => ({
      ...postHelper.formatPostResponse(post),
      distance: post.distance, // เพิ่มข้อมูลระยะทาง
    }));

    ResponseHelper.successWithPagination(
      res,
      formattedPosts,
      {
        page: result.pagination.current,
        limit: result.pagination.limit,
        total: result.pagination.totalCount,
        totalPages: result.pagination.total,
      },
      `Found ${result.posts.length} posts within ${radius}m radius`
    );
  } catch (error) {
    console.error("Get nearby posts error:", error);
    ResponseHelper.internalError(res, "Error searching nearby posts");
  }
};

// ดึงโพสต์ตามจังหวัด
export const getPostsByProvince = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { province } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;

    const filter = {
      province: province,
      propertyType: req.query.propertyType as any,
      listingType: req.query.listingType as any,
      minPrice: req.query.minPrice
        ? parseFloat(req.query.minPrice as string)
        : undefined,
      maxPrice: req.query.maxPrice
        ? parseFloat(req.query.maxPrice as string)
        : undefined,
      sortBy: (req.query.sortBy as any) || "newest",
    };

    const result = await postService.filterPosts(filter, page, limit);

    const formattedPosts = result.posts.map((post: any) =>
      postHelper.formatPostResponse(post)
    );

    ResponseHelper.successWithPagination(
      res,
      formattedPosts,
      {
        page: result.pagination.current,
        limit: result.pagination.limit,
        total: result.pagination.totalCount,
        totalPages: result.pagination.total,
      },
      `Posts in ${province} retrieved successfully`
    );
  } catch (error) {
    console.error("Get posts by province error:", error);
    ResponseHelper.internalError(res);
  }
};

// ดึงข้อมูลสถิติการค้นหา
export const getSearchStats = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    // สถิติโดยรวม
    const [totalApproved, byPropertyType, byProvince, priceRanges] =
      await Promise.all([
        Post.countDocuments({ status: "approved" }),
        Post.aggregate([
          { $match: { status: "approved" } },
          { $group: { _id: "$propertyType", count: { $sum: 1 } } },
          { $sort: { count: -1 } },
        ]),
        Post.aggregate([
          { $match: { status: "approved" } },
          { $group: { _id: "$location.address.province", count: { $sum: 1 } } },
          { $sort: { count: -1 } },
          { $limit: 10 },
        ]),
        Post.aggregate([
          { $match: { status: "approved" } },
          {
            $bucket: {
              groupBy: "$price",
              boundaries: [0, 1000000, 5000000, 10000000, 50000000, Infinity],
              default: "Other",
              output: { count: { $sum: 1 } },
            },
          },
        ]),
      ]);

    const stats = {
      totalPosts: totalApproved,
      byPropertyType: byPropertyType.reduce((acc, item) => {
        acc[item._id] = item.count;
        return acc;
      }, {}),
      topProvinces: byProvince.map((item) => ({
        province: item._id,
        count: item.count,
      })),
      priceDistribution: priceRanges.map((item) => ({
        range:
          item._id === "Other"
            ? "50M+"
            : item._id === 0
            ? "0-1M"
            : item._id === 1000000
            ? "1M-5M"
            : item._id === 5000000
            ? "5M-10M"
            : item._id === 10000000
            ? "10M-50M"
            : "Unknown",
        count: item.count,
      })),
    };

    ResponseHelper.success(
      res,
      stats,
      "Search statistics retrieved successfully"
    );
  } catch (error) {
    console.error("Get search stats error:", error);
    ResponseHelper.internalError(res);
  }
};

// Export validation rules
export { postValidation } from "./helpers/postHelper";
// อัปเดตโพสต์
export const updatePost = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const postData: UpdatePostData = req.body;
    let media: { images: string[]; videos: string[]; documents: string[] } = {
      images: [],
      videos: [],
      documents: [],
    };

    // 1. Handle Existing Media (from retained URLs)
    // Parse existingImages/Videos if they are JSON strings (handled by middleware or manually here)
    // If middleware in router parses them, they are arrays/objects.
    const existingImages = req.body.existingImages || [];
    const existingVideos = req.body.existingVideos || [];

    // Ensure they are arrays (if single item)
    media.images = Array.isArray(existingImages)
      ? existingImages
      : [existingImages];
    media.videos = Array.isArray(existingVideos)
      ? existingVideos
      : [existingVideos];

    // Filter out empties just in case
    media.images = media.images.filter(
      (url: any) => typeof url === "string" && url.length > 0
    );
    media.videos = media.videos.filter(
      (url: any) => typeof url === "string" && url.length > 0
    );

    // 2. Handle New File Uploads
    if (req.files) {
      try {
        const { uploadFileToS3 } = await import("@/helpers/s3Helper");
        const files = req.files as {
          [fieldname: string]: Express.Multer.File[];
        };

        // Upload images
        if (files["images"]) {
          const imagePromises = files["images"].map((file) =>
            uploadFileToS3(file, "images")
          );
          const imageUrls = await Promise.all(imagePromises);
          media.images = [...media.images, ...imageUrls];
        }

        // Upload videos
        if (files["videos"]) {
          const videoPromises = files["videos"].map((file) =>
            uploadFileToS3(file, "videos")
          );
          const videoUrls = await Promise.all(videoPromises);
          media.videos = [...media.videos, ...videoUrls];
        }
      } catch (uploadError) {
        console.error("File upload error:", uploadError);
        ResponseHelper.error(
          res,
          "Failed to upload media files",
          undefined,
          500
        );
        return;
      }
    }

    // Prepare update data
    const updatePostData: UpdatePostData = {
      ...postData,
      images: media.images, // Map legacy images if needed by service
    };

    // Pass the full media structure if service supports it,
    // but `UpdatePostData` interface in service (viewed earlier) only has `images?: string[]`.
    // Wait, let's check `UpdatePostData` in service again.
    // It has `images?: string[]`. Service update logic merges `data`.
    // If I want to support videos, I need to update `UpdatePostData` interface in service OR cast it.
    // The service `updatePost` calls `postRepository.update(id, updateData)`.
    // Repository likely updates fields.
    // To support `media` object (images, videos), I should pass `media` property.

    // Let's add `media` to the data passed to service.
    (updatePostData as any).media = media;

    const post = await postService.updatePost(
      id,
      req.user._id.toString(),
      updatePostData,
      req.user.role
    );

    ResponseHelper.success(
      res,
      postHelper.formatPostResponse(post),
      "Post updated successfully"
    );
  } catch (error) {
    console.error("Update post error:", error);
    if (error instanceof Error) {
      if (
        error.message.includes("ไม่พบโพสต์") ||
        error.message.includes("Post not found")
      ) {
        ResponseHelper.notFound(res, "Post not found");
        return;
      }
      if (
        error.message.includes("ไม่มีสิทธิ์") ||
        error.message.includes("permission")
      ) {
        ResponseHelper.forbidden(res, error.message);
        return;
      }
    }
    ResponseHelper.internalError(res);
  }
};

// ลบโพสต์
export const deletePost = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;

    await postService.deletePost(id, req.user._id.toString(), req.user.role);

    ResponseHelper.success(res, null, "Post deleted successfully");
  } catch (error) {
    console.error("Delete post error:", error);
    if (error instanceof Error) {
      if (
        error.message.includes("ไม่พบโพสต์") ||
        error.message.includes("Post not found")
      ) {
        ResponseHelper.notFound(res, "Post not found");
        return;
      }
      if (
        error.message.includes("ไม่มีสิทธิ์") ||
        error.message.includes("permission")
      ) {
        ResponseHelper.forbidden(res, error.message);
        return;
      }
    }
    ResponseHelper.internalError(res);
  }
};
