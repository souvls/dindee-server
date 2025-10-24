import { Response } from 'express'
import { validationResult } from 'express-validator'
import BookmarkService from '@/services/BookmarkService'
import { ResponseHelper } from '@/utils/response'
import { AuthRequest } from '@/middlewares/auth'

// เพิ่ม bookmark
export const addBookmark = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      ResponseHelper.validationError(res, errors.array())
      return
    }

    const { postId } = req.params
    const userId = req.user._id.toString()

    const bookmark = await BookmarkService.addBookmark(userId, postId)

    ResponseHelper.success(res, bookmark, 'Bookmark added successfully')
  } catch (error) {
    console.error('Add bookmark error:', error)
    if (error instanceof Error) {
      if (error.message === 'Post not found') {
        ResponseHelper.notFound(res, 'Post not found')
      } else if (error.message === 'Post already bookmarked') {
        ResponseHelper.conflict(res, 'Post already bookmarked')
      } else {
        ResponseHelper.error(res, error.message, undefined, 400)
      }
    } else {
      ResponseHelper.internalError(res)
    }
  }
}

// ลบ bookmark
export const removeBookmark = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { postId } = req.params
    const userId = req.user._id.toString()

    await BookmarkService.removeBookmark(userId, postId)

    ResponseHelper.success(res, null, 'Bookmark removed successfully')
  } catch (error) {
    console.error('Remove bookmark error:', error)
    if (error instanceof Error) {
      if (error.message === 'Bookmark not found') {
        ResponseHelper.notFound(res, 'Bookmark not found')
      } else {
        ResponseHelper.error(res, error.message, undefined, 400)
      }
    } else {
      ResponseHelper.internalError(res)
    }
  }
}

// Toggle bookmark
export const toggleBookmark = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { postId } = req.params
    const userId = req.user._id.toString()

    const result = await BookmarkService.toggleBookmark(userId, postId)

    ResponseHelper.success(res, result, `Bookmark ${result.action} successfully`)
  } catch (error) {
    console.error('Toggle bookmark error:', error)
    if (error instanceof Error) {
      if (error.message === 'Post not found') {
        ResponseHelper.notFound(res, 'Post not found')
      } else {
        ResponseHelper.error(res, error.message, undefined, 400)
      }
    } else {
      ResponseHelper.internalError(res)
    }
  }
}

// ตรวจสอบสถานะ bookmark
export const checkBookmarkStatus = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { postId } = req.params
    const userId = req.user._id.toString()

    const isBookmarked = await BookmarkService.isBookmarked(userId, postId)

    ResponseHelper.success(res, { isBookmarked }, 'Bookmark status retrieved')
  } catch (error) {
    console.error('Check bookmark status error:', error)
    ResponseHelper.internalError(res)
  }
}

// ดึง bookmarks ของ user
export const getUserBookmarks = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user._id.toString()
    const { page = 1, limit = 20, propertyType, listingType, minPrice, maxPrice, province, district } = req.query

    const filter: any = {}
    if (propertyType) filter.propertyType = propertyType
    if (listingType) filter.listingType = listingType
    if (minPrice) filter.minPrice = parseFloat(minPrice as string)
    if (maxPrice) filter.maxPrice = parseFloat(maxPrice as string)
    if (province) filter.province = province
    if (district) filter.district = district

    const result = await BookmarkService.getUserBookmarks(
      userId,
      parseInt(page as string),
      parseInt(limit as string),
      Object.keys(filter).length > 0 ? filter : undefined
    )

    ResponseHelper.successWithPagination(
      res,
      result.bookmarks,
      result.pagination,
      'User bookmarks retrieved successfully'
    )
  } catch (error) {
    console.error('Get user bookmarks error:', error)
    ResponseHelper.internalError(res)
  }
}

// ดึงจำนวน bookmark ของ user
export const getUserBookmarkCount = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user._id.toString()
    const count = await BookmarkService.getUserBookmarkCount(userId)

    ResponseHelper.success(res, { count }, 'Bookmark count retrieved successfully')
  } catch (error) {
    console.error('Get bookmark count error:', error)
    ResponseHelper.internalError(res)
  }
}

// ดึงโพสต์ที่ถูก bookmark มากที่สุด
export const getMostBookmarkedPosts = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { limit = 10 } = req.query
    const posts = await BookmarkService.getMostBookmarkedPosts(parseInt(limit as string))

    ResponseHelper.success(res, posts, 'Most bookmarked posts retrieved successfully')
  } catch (error) {
    console.error('Get most bookmarked posts error:', error)
    ResponseHelper.internalError(res)
  }
}