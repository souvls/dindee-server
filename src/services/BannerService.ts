import { Banner, IBanner } from '@/models/Banner'
import mongoose from 'mongoose'

export class BannerService {
  // Get active banners for home page
  static async getActiveBanners(): Promise<IBanner[]> {
    const now = new Date()
    
    return await Banner.find({
      isActive: true,
      dateStart: { $lte: now },
      dateEnd: { $gte: now },
    })
      .sort({ priority: -1, createdAt: -1 })
      .lean()
  }

  // Get all banners (admin)
  static async getAllBanners(
    page: number = 1,
    limit: number = 10,
    isActive?: boolean
  ): Promise<{ banners: IBanner[]; total: number }> {
    const query: any = {}
    if (isActive !== undefined) {
      query.isActive = isActive
    }

    const skip = (page - 1) * limit

    const [banners, total] = await Promise.all([
      Banner.find(query)
        .sort({ priority: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('createdBy', 'name email')
        .lean(),
      Banner.countDocuments(query),
    ])

    return { banners, total }
  }

  // Get single banner
  static async getBannerById(id: string): Promise<IBanner | null> {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return null
    }

    return await Banner.findById(id)
      .populate('createdBy', 'name email')
      .lean()
  }

  // Create banner
  static async createBanner(
    data: Partial<IBanner>,
    userId: string
  ): Promise<IBanner> {
    const banner = new Banner({
      ...data,
      createdBy: userId,
    })

    await banner.save()
    return banner
  }

  // Update banner
  static async updateBanner(
    id: string,
    data: Partial<IBanner>
  ): Promise<IBanner | null> {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return null
    }

    // Don't allow updating createdBy
    delete (data as any).createdBy

    return await Banner.findByIdAndUpdate(
      id,
      { $set: data },
      { new: true, runValidators: true }
    )
      .populate('createdBy', 'name email')
      .lean()
  }

  // Delete banner
  static async deleteBanner(id: string): Promise<boolean> {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return false
    }

    const result = await Banner.findByIdAndDelete(id)
    return !!result
  }

  // Increment view count
  static async incrementViewCount(id: string): Promise<void> {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return
    }

    await Banner.findByIdAndUpdate(id, { $inc: { viewCount: 1 } })
  }

  // Increment click count
  static async incrementClickCount(id: string): Promise<void> {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return
    }

    await Banner.findByIdAndUpdate(id, { $inc: { clickCount: 1 } })
  }

  // Get banner statistics
  static async getBannerStats(id: string): Promise<{
    views: number
    clicks: number
    ctr: number // Click-through rate
  } | null> {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return null
    }

    const banner = await Banner.findById(id).lean()
    if (!banner) return null

    const ctr = banner.viewCount > 0 
      ? (banner.clickCount / banner.viewCount) * 100 
      : 0

    return {
      views: banner.viewCount,
      clicks: banner.clickCount,
      ctr: Math.round(ctr * 100) / 100, // Round to 2 decimal places
    }
  }

  // Toggle banner active status
  static async toggleActiveStatus(id: string): Promise<IBanner | null> {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return null
    }

    const banner = await Banner.findById(id)
    if (!banner) return null

    banner.isActive = !banner.isActive
    await banner.save()

    return banner.toObject()
  }
}
