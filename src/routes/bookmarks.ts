import { Router } from 'express'
import { param } from 'express-validator'
import { auth } from '@/middlewares/auth'
import {
  addBookmark,
  removeBookmark,
  toggleBookmark,
  checkBookmarkStatus,
  getUserBookmarks,
  getUserBookmarkCount,
  getMostBookmarkedPosts
} from '@/controllers/bookmarks'

const router: Router = Router()

/**
 * @swagger
 * tags:
 *   name: Bookmarks
 *   description: User bookmark management for posts
 */

// Validation rules
const postIdValidation = [
  param('postId').isMongoId().withMessage('Invalid post ID')
]

/**
 * @swagger
 * /api/bookmarks/{postId}:
 *   post:
 *     summary: Add bookmark
 *     tags: [Bookmarks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: postId
 *         required: true
 *         schema:
 *           type: string
 *         description: Post ID to bookmark
 *     responses:
 *       201:
 *         description: Bookmark added successfully
 *       409:
 *         description: Post already bookmarked
 *       404:
 *         description: Post not found
 */
router.post('/:postId', auth, postIdValidation, addBookmark)

/**
 * @swagger
 * /api/bookmarks/{postId}:
 *   delete:
 *     summary: Remove bookmark
 *     tags: [Bookmarks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: postId
 *         required: true
 *         schema:
 *           type: string
 *         description: Post ID to remove from bookmarks
 *     responses:
 *       200:
 *         description: Bookmark removed successfully
 *       404:
 *         description: Bookmark not found
 */
router.delete('/:postId', auth, postIdValidation, removeBookmark)

/**
 * @swagger
 * /api/bookmarks/{postId}/toggle:
 *   put:
 *     summary: Toggle bookmark (add if not exists, remove if exists)
 *     tags: [Bookmarks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: postId
 *         required: true
 *         schema:
 *           type: string
 *         description: Post ID to toggle bookmark
 *     responses:
 *       200:
 *         description: Bookmark toggled successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         action:
 *                           type: string
 *                           enum: [added, removed]
 *                         isBookmarked:
 *                           type: boolean
 */
router.put('/:postId/toggle', auth, postIdValidation, toggleBookmark)

/**
 * @swagger
 * /api/bookmarks/{postId}/status:
 *   get:
 *     summary: Check bookmark status
 *     tags: [Bookmarks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: postId
 *         required: true
 *         schema:
 *           type: string
 *         description: Post ID to check bookmark status
 *     responses:
 *       200:
 *         description: Bookmark status
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         isBookmarked:
 *                           type: boolean
 */
router.get('/:postId/status', auth, postIdValidation, checkBookmarkStatus)

/**
 * @swagger
 * /api/bookmarks:
 *   get:
 *     summary: Get user's bookmarks
 *     tags: [Bookmarks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/PageParam'
 *       - $ref: '#/components/parameters/LimitParam'
 *       - in: query
 *         name: propertyType
 *         schema:
 *           type: string
 *           enum: [house, land, condo, apartment, villa, townhouse]
 *         description: Filter by property type
 *       - in: query
 *         name: listingType
 *         schema:
 *           type: string
 *           enum: [sell, rent, lease]
 *         description: Filter by listing type
 *       - in: query
 *         name: minPrice
 *         schema:
 *           type: number
 *         description: Minimum price filter
 *       - in: query
 *         name: maxPrice
 *         schema:
 *           type: number
 *         description: Maximum price filter
 *     responses:
 *       200:
 *         description: User's bookmarks with pagination
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           _id:
 *                             type: string
 *                           postId:
 *                             $ref: '#/components/schemas/Post'
 *                           createdAt:
 *                             type: string
 *                             format: date-time
 */
router.get('/', auth, getUserBookmarks)

/**
 * @swagger
 * /api/bookmarks/count:
 *   get:
 *     summary: Get user's total bookmark count
 *     tags: [Bookmarks]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Total bookmark count
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         count:
 *                           type: number
 */
router.get('/count', auth, getUserBookmarkCount)

/**
 * @swagger
 * /api/bookmarks/most-bookmarked:
 *   get:
 *     summary: Get most bookmarked posts (public)
 *     tags: [Bookmarks]
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of posts to return
 *     responses:
 *       200:
 *         description: Most bookmarked posts
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           post:
 *                             $ref: '#/components/schemas/Post'
 *                           bookmarkCount:
 *                             type: number
 */
router.get('/most-bookmarked', getMostBookmarkedPosts)

export default router