import { Post, IPost } from '@/models/Post'
import mongoose from 'mongoose'

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
      status: 'approved',
      'location.coordinates': {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [longitude, latitude] // GeoJSON format: [lng, lat]
          },
          $maxDistance: radiusInMeters
        }
      },
      ...filter
    }

    return await Post.find(query)
      .skip(skip)
      .limit(limit)
      .populate('authorId', 'name email avatar')
      .lean()
  }

  // นับจำนวนโพสต์ในบริเวณใกล้เคียง
  static async countNearbyPosts(
    latitude: number,
    longitude: number,
    radiusInMeters: number,
    filter: any = {}
  ): Promise<number> {
    const query = {
      status: 'approved',
      'location.coordinates': {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [longitude, latitude]
          },
          $maxDistance: radiusInMeters
        }
      },
      ...filter
    }

    return await Post.countDocuments(query)
  }

  // ค้นหาโพสต์ด้วย advanced filter และ sorting
  static async findWithAdvancedFilter(
    filter: any = {},
    sortQuery: any = { createdAt: -1 },
    skip: number = 0,
    limit: number = 10
  ): Promise<{ posts: IPost[]; total: number }> {
    const query = { status: 'approved', ...filter }

    const [posts, total] = await Promise.all([
      Post.find(query)
        .sort(sortQuery)
        .skip(skip)
        .limit(limit)
        .populate('authorId', 'name email avatar')
        .lean(),
      Post.countDocuments(query)
    ])

    return { posts, total }
  }

  // ค้นหาตัวเลข (ช่วงราคา, พื้นที่)
  static buildRangeQuery(field: string, min?: number, max?: number): any {
    if (!min && !max) return {}
    
    const rangeQuery: any = {}
    if (min) rangeQuery.$gte = min
    if (max) rangeQuery.$lte = max
    
    return { [field]: rangeQuery }
  }

  // สร้าง text search query
  static buildTextSearchQuery(searchText: string): any {
    if (!searchText) return {}
    
    return {
      $or: [
        { title: { $regex: searchText, $options: 'i' } },
        { description: { $regex: searchText, $options: 'i' } },
        { 'location.address.street': { $regex: searchText, $options: 'i' } },
        { 'location.address.district': { $regex: searchText, $options: 'i' } },
        { 'location.address.province': { $regex: searchText, $options: 'i' } },
        { tags: { $in: [new RegExp(searchText, 'i')] } }
      ]
    }
  }

  // คำนวณระยะทางระหว่าง 2 จุด (Haversine formula)
  static calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371 // รัศมีโลกในหน่วยกิโลเมตร
    const dLat = this.deg2rad(lat2 - lat1)
    const dLon = this.deg2rad(lon2 - lon1)
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) * 
      Math.sin(dLon / 2) * Math.sin(dLon / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    const distance = R * c * 1000 // แปลงเป็นเมตร
    return Math.round(distance)
  }

  private static deg2rad(deg: number): number {
    return deg * (Math.PI / 180)
  }

  // Aggregation pipeline สำหรับสถิติ
  static async getPostStats() {
    const stats = await Post.aggregate([
      { $match: { status: 'approved' } },
      {
        $facet: {
          totalCount: [{ $count: 'total' }],
          byPropertyType: [
            { $group: { _id: '$propertyType', count: { $sum: 1 } } },
            { $sort: { count: -1 } }
          ],
          byProvince: [
            { $group: { _id: '$location.address.province', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 10 }
          ],
          priceRanges: [
            {
              $bucket: {
                groupBy: '$price',
                boundaries: [0, 1000000, 5000000, 10000000, 50000000, Infinity],
                default: 'Other',
                output: { count: { $sum: 1 } }
              }
            }
          ],
          avgPrice: [
            { $group: { _id: null, avgPrice: { $avg: '$price' } } }
          ],
          avgArea: [
            { $group: { _id: null, avgArea: { $avg: '$area' } } }
          ]
        }
      }
    ])

    return stats[0]
  }

  // Advanced search with text, geospatial, และ filters รวมกัน
  static async advancedSearch(params: {
    searchText?: string
    latitude?: number
    longitude?: number
    radius?: number
    propertyType?: string
    listingType?: string
    minPrice?: number
    maxPrice?: number
    minArea?: number
    maxArea?: number
    province?: string
    district?: string
    bedrooms?: number
    bathrooms?: number
    condition?: string
    featured?: boolean
    urgent?: boolean
    sortBy?: string
    page?: number
    limit?: number
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
      sortBy = 'newest',
      page = 1,
      limit = 10
    } = params

    let query: any = { status: 'approved' }

    // Text search
    if (searchText) {
      Object.assign(query, this.buildTextSearchQuery(searchText))
    }

    // Geospatial search
    if (latitude && longitude) {
      query['location.coordinates'] = {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [longitude, latitude]
          },
          $maxDistance: radius
        }
      }
    }

    // Property filters
    if (propertyType) query.propertyType = propertyType
    if (listingType) query.listingType = listingType
    if (condition) query.condition = condition
    if (featured !== undefined) query.featured = featured
    if (urgent !== undefined) query.urgent = urgent

    // Location filters
    if (province) query['location.address.province'] = { $regex: province, $options: 'i' }
    if (district) query['location.address.district'] = { $regex: district, $options: 'i' }

    // Range filters
    Object.assign(query, this.buildRangeQuery('price', minPrice, maxPrice))
    Object.assign(query, this.buildRangeQuery('area', minArea, maxArea))

    // House details filters
    if (bedrooms) query['houseDetails.bedrooms'] = bedrooms
    if (bathrooms) query['houseDetails.bathrooms'] = bathrooms

    // Sorting
    let sortQuery: any = { createdAt: -1 }
    switch (sortBy) {
      case 'newest':
        sortQuery = { createdAt: -1 }
        break
      case 'oldest':
        sortQuery = { createdAt: 1 }
        break
      case 'price_asc':
        sortQuery = { price: 1 }
        break
      case 'price_desc':
        sortQuery = { price: -1 }
        break
      case 'area_asc':
        sortQuery = { area: 1 }
        break
      case 'area_desc':
        sortQuery = { area: -1 }
        break
      case 'distance':
        // Distance sort is handled by $near automatically
        sortQuery = {}
        break
    }

    const skip = (page - 1) * limit

    const [posts, total] = await Promise.all([
      Post.find(query)
        .sort(sortQuery)
        .skip(skip)
        .limit(limit)
        .populate('authorId', 'name email avatar')
        .lean(),
      Post.countDocuments(query)
    ])

    // Add distance calculation if geospatial search
    const postsWithDistance = latitude && longitude 
      ? posts.map(post => ({
          ...post,
          distance: this.calculateDistance(
            latitude,
            longitude,
            post.location.coordinates.coordinates[1], // lat
            post.location.coordinates.coordinates[0]  // lng
          )
        }))
      : posts

    return {
      posts: postsWithDistance,
      pagination: {
        current: page,
        total: Math.ceil(total / limit),
        count: posts.length,
        totalCount: total,
        limit
      },
      searchInfo: {
        hasGeospatialFilter: !!(latitude && longitude),
        searchCenter: latitude && longitude ? { latitude, longitude, radius } : null,
        appliedFilters: {
          searchText,
          propertyType,
          listingType,
          priceRange: minPrice || maxPrice ? { min: minPrice, max: maxPrice } : null,
          areaRange: minArea || maxArea ? { min: minArea, max: maxArea } : null,
          location: { province, district },
          houseDetails: bedrooms || bathrooms ? { bedrooms, bathrooms } : null,
          condition,
          featured,
          urgent
        }
      }
    }
  }
}