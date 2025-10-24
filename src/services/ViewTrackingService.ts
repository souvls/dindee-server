import mongoose from 'mongoose'
import { ViewHistory, IViewHistory } from '@/models/ViewHistory'
import { Post } from '@/models/Post'

export interface ViewTrackingResult {
  isNewView: boolean
  isUniqueView: boolean
  totalViews: number
  uniqueViews: number
}

export class ViewTrackingService {
  // บันทึกการเข้าชม
  async trackView(
    postId: string,
    ipAddress: string,
    userId?: string,
    userAgent?: string,
    sessionId?: string
  ): Promise<ViewTrackingResult> {
    try {
      const postObjectId = new mongoose.Types.ObjectId(postId)
      const userObjectId = userId ? new mongoose.Types.ObjectId(userId) : null

      // ตรวจสอบว่าโพสต์มีอยู่จริง
      const post = await Post.findById(postObjectId)
      if (!post) {
        throw new Error('Post not found')
      }

      // ตรวจสอบว่าเคยดูแล้วหรือไม่ (ใน 24 ชั่วโมงที่ผ่านมา)
      const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000)
      
      const existingViewQuery: any = {
        postId: postObjectId,
        viewedAt: { $gte: last24Hours }
      }

      // ตรวจสอบตาม userId หรือ IP + sessionId
      if (userObjectId) {
        existingViewQuery.userId = userObjectId
      } else {
        existingViewQuery.$and = [
          { ipAddress },
          { $or: [
            { sessionId },
            { userId: { $exists: false } }
          ]}
        ]
      }

      const existingView = await ViewHistory.findOne(existingViewQuery)
      
      let isNewView = false
      let isUniqueView = false

      // ถ้าไม่เคยดูหรือดูเมื่อนานแล้ว
      if (!existingView) {
        isNewView = true

        // ตรวจสอบว่าเป็น unique view หรือไม่ (เคยดูเลยหรือไม่)
        const everViewedQuery: any = { postId: postObjectId }
        
        if (userObjectId) {
          everViewedQuery.userId = userObjectId
        } else {
          everViewedQuery.ipAddress = ipAddress
        }

        const everViewed = await ViewHistory.findOne(everViewedQuery)
        isUniqueView = !everViewed

        // บันทึกการเข้าชม
        const viewRecord = new ViewHistory({
          postId: postObjectId,
          userId: userObjectId,
          ipAddress,
          userAgent,
          sessionId,
          viewedAt: new Date()
        })

        await viewRecord.save()

        // อัปเดตจำนวนการดูในโพสต์
        const updateData: any = { $inc: { viewCount: 1 } }
        if (isUniqueView) {
          updateData.$inc.uniqueViewCount = 1
        }

        await Post.findByIdAndUpdate(postObjectId, updateData)
      }

      // ดึงข้อมูลล่าสุดของโพสต์
      const updatedPost = await Post.findById(postObjectId, 'viewCount uniqueViewCount')

      return {
        isNewView,
        isUniqueView,
        totalViews: updatedPost?.viewCount || 0,
        uniqueViews: updatedPost?.uniqueViewCount || 0
      }
    } catch (error) {
      throw new Error(`Error tracking view: ${error}`)
    }
  }

  // ดึงประวัติการเข้าชมของ user
  async getUserViewHistory(
    userId: string,
    page: number = 1,
    limit: number = 20
  ): Promise<{ views: any[], total: number, pagination: any }> {
    try {
      const skip = (page - 1) * limit

      const pipeline: any[] = [
        {
          $match: {
            userId: new mongoose.Types.ObjectId(userId)
          }
        },
        { $sort: { viewedAt: -1 } },
        {
          $lookup: {
            from: 'posts',
            localField: 'postId',
            foreignField: '_id',
            as: 'post'
          }
        },
        { $unwind: '$post' },
        {
          $match: {
            'post.status': 'approved'
          }
        },
        { $skip: skip },
        { $limit: limit },
        {
          $project: {
            _id: 1,
            viewedAt: 1,
            post: {
              _id: 1,
              title: 1,
              price: 1,
              propertyType: 1,
              listingType: 1,
              area: 1,
              location: 1,
              media: 1,
              viewCount: 1,
              bookmarkCount: 1,
              featured: 1,
              status: 1
            }
          }
        }
      ]

      const [views, total] = await Promise.all([
        ViewHistory.aggregate(pipeline),
        ViewHistory.countDocuments({ userId: new mongoose.Types.ObjectId(userId) })
      ])

      return {
        views,
        total,
        pagination: {
          current: page,
          pages: Math.ceil(total / limit),
          limit,
          total
        }
      }
    } catch (error) {
      throw new Error(`Error getting user view history: ${error}`)
    }
  }

  // ดึงโพสต์ที่ถูกดูมากที่สุด
  async getMostViewedPosts(
    timeFrame: 'day' | 'week' | 'month' | 'all' = 'all',
    limit: number = 10
  ): Promise<any[]> {
    try {
      let matchCondition: any = { status: 'approved' }

      // เพิ่มเงื่อนไขเวลาถ้าต้องการ
      if (timeFrame !== 'all') {
        let startDate: Date
        const now = new Date()

        switch (timeFrame) {
          case 'day':
            startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000)
            break
          case 'week':
            startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
            break
          case 'month':
            startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
            break
          default:
            startDate = new Date(0)
        }

        matchCondition.createdAt = { $gte: startDate }
      }

      return await Post.find(matchCondition)
        .sort({ viewCount: -1, createdAt: -1 })
        .limit(limit)
        .populate('authorId', 'name email avatar')
        .select('title description price propertyType listingType area location media viewCount uniqueViewCount bookmarkCount featured urgent createdAt')
    } catch (error) {
      throw new Error(`Error getting most viewed posts: ${error}`)
    }
  }

  // ดึงส统统ิการดูของโพสต์เฉพาะ
  async getPostViewStats(postId: string): Promise<{
    totalViews: number
    uniqueViews: number
    todayViews: number
    weekViews: number
    monthViews: number
  }> {
    try {
      const postObjectId = new mongoose.Types.ObjectId(postId)
      const now = new Date()
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

      const [post, todayViews, weekViews, monthViews] = await Promise.all([
        Post.findById(postObjectId, 'viewCount uniqueViewCount'),
        ViewHistory.countDocuments({
          postId: postObjectId,
          viewedAt: { $gte: today }
        }),
        ViewHistory.countDocuments({
          postId: postObjectId,
          viewedAt: { $gte: weekAgo }
        }),
        ViewHistory.countDocuments({
          postId: postObjectId,
          viewedAt: { $gte: monthAgo }
        })
      ])

      if (!post) {
        throw new Error('Post not found')
      }

      return {
        totalViews: post.viewCount,
        uniqueViews: post.uniqueViewCount,
        todayViews,
        weekViews,
        monthViews
      }
    } catch (error) {
      throw new Error(`Error getting post view stats: ${error}`)
    }
  }

  // ล้างข้อมูลการดูเก่า (เรียกใช้ใน cron job)
  async cleanupOldViews(daysToKeep: number = 365): Promise<number> {
    try {
      const cutoffDate = new Date(Date.now() - daysToKeep * 24 * 60 * 60 * 1000)
      const result = await ViewHistory.deleteMany({
        viewedAt: { $lt: cutoffDate }
      })
      return result.deletedCount || 0
    } catch (error) {
      throw new Error(`Error cleaning up old views: ${error}`)
    }
  }
}

export default new ViewTrackingService()