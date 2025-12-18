import { Post, IPost } from "@/models/Post";
import { User } from "@/models/User";
import mongoose from "mongoose";

export class PostQueryHelper {
  // ค้นหาโพสต์ในบริเวณใกล้เคียงด้วย MongoDB geospatial query
  static async findNearbyPosts(
    latitude: number,
    longitude: number,
    radiusInMeters: number,
    filter: any = {},
    skip: number = 0,
    limit: number = 10
  ): Promise<IPost[]> {
    const query = {
      status: "approved",
      "location.coordinates": {
        $near: {
          $geometry: {
            type: "Point",
            coordinates: [longitude, latitude], // GeoJSON format: [lng, lat]
          },
          $maxDistance: radiusInMeters,
        },
      },
      ...filter,
    };

    return await Post.find(query)
      .skip(skip)
      .limit(limit)
      .populate("authorId", "name email avatar")
      .lean();
  }

  // นับจำนวนโพสต์ในบริเวณใกล้เคียง
  static async countNearbyPosts(
    latitude: number,
    longitude: number,
    radiusInMeters: number,
    filter: any = {}
  ): Promise<number> {
    const query = {
      status: "approved",
      "location.coordinates": {
        $near: {
          $geometry: {
            type: "Point",
            coordinates: [longitude, latitude],
          },
          $maxDistance: radiusInMeters,
        },
      },
      ...filter,
    };

    return await Post.countDocuments(query);
  }

  // ค้นหาโพสต์ด้วย advanced filter และ sorting
  static async findWithAdvancedFilter(
    filter: any = {},
    sortQuery: any = { createdAt: -1 },
    skip: number = 0,
    limit: number = 10
  ): Promise<{ posts: IPost[]; total: number }> {
    const query = { status: "approved", ...filter };

    const [posts, total] = await Promise.all([
      Post.find(query)
        .sort(sortQuery)
        .skip(skip)
        .limit(limit)
        .populate("authorId", "name email avatar")
        .lean(),
      Post.countDocuments(query),
    ]);

    return { posts, total };
  }

  // ค้นหาตัวเลข (ช่วงราคา, พื้นที่)
  static buildRangeQuery(field: string, min?: number, max?: number): any {
    if (!min && !max) return {};

    const rangeQuery: any = {};
    if (min) rangeQuery.$gte = min;
    if (max) rangeQuery.$lte = max;

    return { [field]: rangeQuery };
  }

  // สร้าง text search query - ค้นหาหลายฟิลด์พร้อมกัน
  static buildTextSearchQuery(searchText: string): any {
    if (!searchText) return {};

    const searchRegex = new RegExp(searchText, "i");

    return {
      $or: [
        { title: { $regex: searchRegex } },
        { description: { $regex: searchRegex } },
        { "location.address.street": { $regex: searchRegex } },
        { "location.address.district": { $regex: searchRegex } },
        { "location.address.province": { $regex: searchRegex } },
        { tags: { $in: [searchRegex] } },
        { keywords: { $in: [searchRegex] } },
      ],
    };
  }

  // คำนวณ relevance score สำหรับการจัดเรียง
  static calculateRelevanceScore(post: any, searchText: string): number {
    if (!searchText) return 0;

    const searchLower = searchText.toLowerCase();
    let score = 0;

    // Title match (highest priority) - 10 points
    if (post.title && post.title.toLowerCase().includes(searchLower)) {
      score += 10;
      // Exact match bonus
      if (post.title.toLowerCase() === searchLower) score += 5;
    }

    // Tags match - 8 points per tag
    if (post.tags && Array.isArray(post.tags)) {
      post.tags.forEach((tag: string) => {
        if (tag.toLowerCase().includes(searchLower)) score += 8;
      });
    }

    // Keywords match - 7 points per keyword
    if (post.keywords && Array.isArray(post.keywords)) {
      post.keywords.forEach((keyword: string) => {
        if (keyword.toLowerCase().includes(searchLower)) score += 7;
      });
    }

    // Province match - 6 points
    if (post.location?.address?.province?.toLowerCase().includes(searchLower)) {
      score += 6;
    }

    // District match - 5 points
    if (post.location?.address?.district?.toLowerCase().includes(searchLower)) {
      score += 5;
    }

    // Street match - 4 points
    if (post.location?.address?.street?.toLowerCase().includes(searchLower)) {
      score += 4;
    }

    // Description match - 3 points
    if (
      post.description &&
      post.description.toLowerCase().includes(searchLower)
    ) {
      score += 3;
    }

    // Boost for featured and urgent posts
    if (post.featured) score += 2;
    if (post.urgent) score += 1;

    // Boost based on view count (popularity)
    if (post.viewCount) {
      score += Math.min(post.viewCount / 100, 3); // Max 3 points from views
    }

    return score;
  }

  // คำนวณระยะทางระหว่าง 2 จุด (Haversine formula)
  static calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const R = 6371; // รัศมีโลกในหน่วยกิโลเมตร
    const dLat = this.deg2rad(lat2 - lat1);
    const dLon = this.deg2rad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.deg2rad(lat1)) *
        Math.cos(this.deg2rad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c * 1000; // แปลงเป็นเมตร
    return Math.round(distance);
  }

  private static deg2rad(deg: number): number {
    return deg * (Math.PI / 180);
  }

  // คำนวณจุดกึ่งกลางของ Polygon
  private static getPolygonCenter(
    coordinates: [number, number][]
  ): [number, number] {
    let totalLng = 0;
    let totalLat = 0;
    const numPoints = coordinates.length;

    for (const coord of coordinates) {
      totalLng += coord[0];
      totalLat += coord[1];
    }

    return [totalLng / numPoints, totalLat / numPoints];
  }

  // Aggregation pipeline สำหรับสถิติ
  static async getPostStats() {
    const stats = await Post.aggregate([
      { $match: { status: "approved" } },
      {
        $facet: {
          totalCount: [{ $count: "total" }],
          byPropertyType: [
            { $group: { _id: "$propertyType", count: { $sum: 1 } } },
            { $sort: { count: -1 } },
          ],
          byProvince: [
            {
              $group: { _id: "$location.address.province", count: { $sum: 1 } },
            },
            { $sort: { count: -1 } },
            { $limit: 10 },
          ],
          priceRanges: [
            {
              $bucket: {
                groupBy: "$price",
                boundaries: [0, 1000000, 5000000, 10000000, 50000000, Infinity],
                default: "Other",
                output: { count: { $sum: 1 } },
              },
            },
          ],
          avgPrice: [{ $group: { _id: null, avgPrice: { $avg: "$price" } } }],
          avgArea: [{ $group: { _id: null, avgArea: { $avg: "$area" } } }],
        },
      },
    ]);

    return stats[0];
  }

  // Advanced search with text, geospatial, และ filters รวมกัน
  static async advancedSearch(params: {
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
    roadAccess?: boolean;
    waterSource?: boolean;
    electricity?: boolean;
  }) {
    const {
      searchText,
      latitude,
      longitude,
      radius = 5000,
      propertyType,
      listingType,
      minPrice,
      maxPrice,
      minArea,
      maxArea,
      province,
      district,
      bedrooms,
      bathrooms,
      condition,
      featured,
      urgent,
      sortBy = "newest",
      page = 1,
      limit = 10,
      roadAccess,
      waterSource,
      electricity,
    } = params;

    let query: any = { status: "approved" };

    // Text search
    if (searchText) {
      Object.assign(query, this.buildTextSearchQuery(searchText));
    }

    // Geospatial search
    if (latitude && longitude) {
      query["location.coordinates"] = {
        $near: {
          $geometry: {
            type: "Point",
            coordinates: [longitude, latitude],
          },
          $maxDistance: radius,
        },
      };
    }

    // Property filters
    if (propertyType) query.propertyType = propertyType;
    if (listingType) query.listingType = listingType;
    if (condition) query.condition = condition;
    if (featured !== undefined) query.featured = featured;
    if (urgent !== undefined) query.urgent = urgent;

    // Location filters
    if (province)
      query["location.address.province"] = { $regex: province, $options: "i" };
    if (district)
      query["location.address.district"] = { $regex: district, $options: "i" };

    // Range filters
    Object.assign(query, this.buildRangeQuery("price", minPrice, maxPrice));
    Object.assign(query, this.buildRangeQuery("area", minArea, maxArea));

    // House details filters
    if (bedrooms) query["houseDetails.bedrooms"] = bedrooms;
    if (bathrooms) query["houseDetails.bathrooms"] = bathrooms;

    // Land details filters
    // Note: Assuming these fields are stored in landDetails object in the updated schema
    // or as top-level fields depending on your exact schema implementation.
    // Based on typings, let's assume they might be in landDetails or similar.
    // If they are boolean fields:
    if (roadAccess !== undefined) query["landDetails.roadAccess"] = roadAccess;
    if (waterSource !== undefined)
      query["landDetails.waterSource"] = waterSource;

    // Utilities usually an array, check if it contains 'electricity'
    if (electricity === true) {
      query["landDetails.utilities"] = {
        $in: ["electricity", "Electricity", "ไฟฟ้า"],
      };
    }

    // Sorting
    let sortQuery: any = { createdAt: -1 };
    switch (sortBy) {
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
      case "distance":
        // Distance sort is handled by $near automatically
        sortQuery = {};
        break;
    }

    const skip = (page - 1) * limit;

    // When search text is provided and no geospatial sort, we'll sort by relevance after fetching
    const useRelevanceSort = searchText && sortBy !== "distance";

    // For relevance sorting, fetch more results initially to score and sort
    const fetchLimit = useRelevanceSort ? limit * 5 : limit;
    const fetchSkip = useRelevanceSort ? 0 : skip;

    const [posts, total] = await Promise.all([
      Post.find(query).sort(sortQuery).skip(fetchSkip).limit(fetchLimit).lean(),
      Post.countDocuments(query),
    ]);

    // Manual population to handle invalid (empty string) authorId safely
    const authorIds = posts
      .map((post) => post.authorId)
      .filter((id) => id && mongoose.isValidObjectId(id));

    const users = await User.find({ _id: { $in: authorIds } })
      .select("name email avatar")
      .lean();

    const userMap = new Map(users.map((user) => [user._id.toString(), user]));

    posts.forEach((post: any) => {
      if (post.authorId && userMap.has(post.authorId.toString())) {
        post.authorId = userMap.get(post.authorId.toString());
      } else {
        post.authorId = null; // Or keep original ID if you prefer, but null is safer for client
      }
    });

    // Calculate relevance scores if search text is provided
    let processedPosts = posts;
    if (searchText) {
      processedPosts = posts.map((post) => ({
        ...post,
        relevanceScore: this.calculateRelevanceScore(post, searchText),
      }));

      // Sort by relevance if not using geospatial sort
      if (useRelevanceSort) {
        processedPosts.sort(
          (a: any, b: any) => b.relevanceScore - a.relevanceScore
        );
        // Apply pagination after sorting
        processedPosts = processedPosts.slice(skip, skip + limit);
      }
    }

    // Add distance calculation if geospatial search
    const postsWithDistance =
      latitude && longitude
        ? processedPosts.map((post) => {
            // Always use center point (coordinates field)
            const coords = post.location.coordinates.coordinates as [
              number,
              number
            ];
            const postLng = coords[0];
            const postLat = coords[1];

            return {
              ...post,
              distance: this.calculateDistance(
                latitude,
                longitude,
                postLat,
                postLng
              ),
            };
          })
        : processedPosts;

    return {
      posts: postsWithDistance,
      pagination: {
        current: page,
        total: Math.ceil(total / limit),
        count: posts.length,
        totalCount: total,
        limit,
      },
      searchInfo: {
        hasGeospatialFilter: !!(latitude && longitude),
        searchCenter:
          latitude && longitude ? { latitude, longitude, radius } : null,
        appliedFilters: {
          searchText,
          propertyType,
          listingType,
          priceRange:
            minPrice || maxPrice ? { min: minPrice, max: maxPrice } : null,
          areaRange: minArea || maxArea ? { min: minArea, max: maxArea } : null,
          location: { province, district },
          houseDetails: bedrooms || bathrooms ? { bedrooms, bathrooms } : null,
          condition,
          featured,
          urgent,
        },
      },
    };
  }
}
