import mongoose from 'mongoose'
import { Bookmark, IBookmark } from '@/models/Bookmark'
import { Post } from '@/models/Post'

export interface BookmarkFilter {
  propertyType?: string
  listingType?: string
  minPrice?: number
  maxPrice?: number
  province?: string
  district?: string
}

export class BookmarkService {
  // เพิ่ม bookmark
  async addBookmark(userId: string, postId: string): Promise<IBookmark> {
    try {
      // ตรวจสอบว่าโพสต์มีอยู่จริง
      const post = await Post.findById(postId)
      if (!post) {
        throw new Error('Post not found')
      }

      // ตรวจสอบว่ามี bookmark อยู่แล้วหรือไม่
      const existingBookmark = await Bookmark.findOne({
        userId: new mongoose.Types.ObjectId(userId),
        postId: new mongoose.Types.ObjectId(postId)
      })

      if (existingBookmark) {
        throw new Error('Post already bookmarked')
      }

      // สร้าง bookmark ใหม่
      const bookmark = new Bookmark({
        userId: new mongoose.Types.ObjectId(userId),
        postId: new mongoose.Types.ObjectId(postId)
      })

      await bookmark.save()

      // อัปเดต bookmark count ใน post
      await Post.findByIdAndUpdate(
        postId,
        { $inc: { bookmarkCount: 1 } }
      )

      return bookmark
    } catch (error) {
      throw new Error(`Error adding bookmark: ${error}`)
    }
  }

  // ลบ bookmark
  async removeBookmark(userId: string, postId: string): Promise<boolean> {
    try {
      const result = await Bookmark.findOneAndDelete({
        userId: new mongoose.Types.ObjectId(userId),
        postId: new mongoose.Types.ObjectId(postId)
      })

      if (!result) {
        throw new Error('Bookmark not found')
      }

      // ลด bookmark count ใน post
      await Post.findByIdAndUpdate(
        postId,
        { $inc: { bookmarkCount: -1 } }
      )

      return true
    } catch (error) {
      throw new Error(`Error removing bookmark: ${error}`)
    }
  }

  // ตtoggle bookmark (add/remove)
  async toggleBookmark(userId: string, postId: string): Promise<{ action: 'added' | 'removed', bookmark?: IBookmark }> {
    try {
      const existingBookmark = await Bookmark.findOne({
        userId: new mongoose.Types.ObjectId(userId),
        postId: new mongoose.Types.ObjectId(postId)
      })

      if (existingBookmark) {
        await this.removeBookmark(userId, postId)
        return { action: 'removed' }
      } else {
        const bookmark = await this.addBookmark(userId, postId)
        return { action: 'added', bookmark }
      }
    } catch (error) {
      throw new Error(`Error toggling bookmark: ${error}`)
    }
  }

  // ตรวจสอบสถานะ bookmark
  async isBookmarked(userId: string, postId: string): Promise<boolean> {
    try {
      const bookmark = await Bookmark.findOne({
        userId: new mongoose.Types.ObjectId(userId),
        postId: new mongoose.Types.ObjectId(postId)
      })
      return !!bookmark
    } catch (error) {
      throw new Error(`Error checking bookmark status: ${error}`)
    }
  }

  // ดึง bookmarks ของ user
  async getUserBookmarks(
    userId: string,
    page: number = 1,
    limit: number = 20,
    filter?: BookmarkFilter
  ): Promise<{ bookmarks: any[], total: number, pagination: any }> {
    try {
      const skip = (page - 1) * limit

      // สร้าง match query สำหรับ aggregation
      const matchStage: any = {
        userId: new mongoose.Types.ObjectId(userId)
      }

      // สร้าง aggregation pipeline
      const pipeline: any[] = [
        { $match: matchStage },
        { $sort: { createdAt: -1 } },
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
            'post.status': 'approved' // เฉพาะโพสต์ที่อนุมัติแล้ว
          }
        }
      ]

      // เพิ่ม filter ถ้ามี
      if (filter) {
        const postFilter: any = {}
        
        if (filter.propertyType) postFilter['post.propertyType'] = filter.propertyType
        if (filter.listingType) postFilter['post.listingType'] = filter.listingType
        if (filter.province) postFilter['post.location.address.province'] = filter.province
        if (filter.district) postFilter['post.location.address.district'] = filter.district
        
        if (filter.minPrice || filter.maxPrice) {
          postFilter['post.price'] = {}
          if (filter.minPrice) postFilter['post.price'].$gte = filter.minPrice
          if (filter.maxPrice) postFilter['post.price'].$lte = filter.maxPrice
        }

        if (Object.keys(postFilter).length > 0) {
          pipeline.push({ $match: postFilter })
        }
      }

      // เพิ่ม pagination
      pipeline.push({ $skip: skip })
      pipeline.push({ $limit: limit })

      // Project ข้อมูลที่ต้องการ
      pipeline.push({
        $project: {
          _id: 1,
          createdAt: 1,
          post: {
            _id: 1,
            title: 1,
            description: 1,
            price: 1,
            propertyType: 1,
            listingType: 1,
            area: 1,
            location: 1,
            media: 1,
            viewCount: 1,
            bookmarkCount: 1,
            featured: 1,
            urgent: 1,
            status: 1,
            createdAt: 1
          }
        }
      })

      const [bookmarks, totalCount] = await Promise.all([
        Bookmark.aggregate(pipeline),
        Bookmark.countDocuments(matchStage)
      ])

      return {
        bookmarks,
        total: totalCount,
        pagination: {
          current: page,
          pages: Math.ceil(totalCount / limit),
          limit,
          total: totalCount
        }
      }
    } catch (error) {
      throw new Error(`Error getting user bookmarks: ${error}`)
    }
  }

  // ดึงจำนวน bookmark ของ user
  async getUserBookmarkCount(userId: string): Promise<number> {
    try {
      return await Bookmark.countDocuments({
        userId: new mongoose.Types.ObjectId(userId)
      })
    } catch (error) {
      throw new Error(`Error getting bookmark count: ${error}`)
    }
  }

  // ดึงโพสต์ที่ถูก bookmark มากที่สุด
  async getMostBookmarkedPosts(limit: number = 10): Promise<any[]> {
    try {
      return await Post.find({ status: 'approved' })
        .sort({ bookmarkCount: -1, createdAt: -1 })
        .limit(limit)
        .populate('authorId', 'name email avatar')
        .select('title description price propertyType listingType area location media bookmarkCount viewCount featured urgent createdAt')
    } catch (error) {
      throw new Error(`Error getting most bookmarked posts: ${error}`)
    }
  }
}

export default new BookmarkService()