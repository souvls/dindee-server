import { Router } from "express";
import { param } from "express-validator";
import multer from "multer";
import {
  createPost,
  getUserPosts,
  getApprovedPosts,
  getPendingPosts,
  approvePost,
  rejectPost,
  postValidation,
  getPost,
  trackPostView,
  getUserViewHistory,
  getMostViewedPosts,
  getPostViewStats,
  getTrendingPosts,
  getRecommendedPosts,
  searchPosts,
  getNearbyPosts,
  getPostsByProvince,
  getSearchStats,
  getAdminPosts,
  deletePost,
  updatePost,
} from "@/controllers/posts";
import { auth } from "@/middlewares/auth";

const router: Router = Router();
const upload = multer({ storage: multer.memoryStorage() });

// Middleware to parse JSON fields from FormData
const parseJsonFields = (req: any, res: any, next: any) => {
  const jsonFields = [
    "location",
    "landDetails",
    "houseDetails",
    "condoDetails",
    "media",
    "amenities",
  ];

  jsonFields.forEach((field) => {
    if (req.body[field] && typeof req.body[field] === "string") {
      try {
        req.body[field] = JSON.parse(req.body[field]);
      } catch (e) {
        // Keep as string or ignore if invalid JSON
        console.error(`Failed to parse ${field}:`, e);
      }
    }
  });
  next();
};

/**
 * @swagger
 * tags:
 *   name: Posts
 *   description: Property posts management and view tracking
 */

// Validation rules
const postIdValidation = [
  param("id").isMongoId().withMessage("Invalid post ID"),
];
/**
 * @swagger
 * /api/posts/approved:
 *   get:
 *     summary: Get all approved posts
 *     tags: [Posts]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of posts per page
 *     responses:
 *       200:
 *         description: List of approved posts
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
 *                         $ref: '#/components/schemas/Post'
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         page:
 *                           type: number
 *                         limit:
 *                           type: number
 *                         total:
 *                           type: number
 *                         totalPages:
 *                           type: number
 */
router.get("/approved", getApprovedPosts);

/**
 * @swagger
 * /api/posts/admin/all:
 *   get:
 *     summary: Get all posts (Admin)
 *     tags: [Posts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of all posts
 *       403:
 *         description: Forbidden
 */
router.get("/admin/all", auth, getAdminPosts);

/**
 * @swagger
 * /api/posts/{id}:
 *   delete:
 *     summary: Delete a post
 *     tags: [Posts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Post deleted successfully
 *       403:
 *         description: Forbidden
 */
router.delete("/:id", auth, postIdValidation, deletePost);

/**
 * @swagger
 * /api/posts/trending:
 *   get:
 *     summary: Get trending posts
 *     tags: [Posts]
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of posts to return
 *     responses:
 *       200:
 *         description: List of trending posts
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
 *                         $ref: '#/components/schemas/Post'
 */
router.get("/trending", getTrendingPosts);

/**
 * @swagger
 * /api/posts/most-viewed:
 *   get:
 *     summary: Get most viewed posts
 *     tags: [Posts]
 *     parameters:
 *       - in: query
 *         name: timeFrame
 *         schema:
 *           type: string
 *           enum: [day, week, month, all]
 *           default: week
 *         description: Time frame for view counting
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of posts to return
 *     responses:
 *       200:
 *         description: List of most viewed posts
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
 *                         $ref: '#/components/schemas/Post'
 */
router.get("/most-viewed", getMostViewedPosts);

/**
 * @swagger
 * /api/posts/{id}/view:
 *   post:
 *     summary: Manually track post view
 *     tags: [Posts]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Post ID
 *     responses:
 *       200:
 *         description: View tracked successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       404:
 *         description: Post not found
 */
router.post("/:id/view", postIdValidation, trackPostView);

/**
 * @swagger
 * /api/posts/{id}/stats:
 *   get:
 *     summary: Get post view statistics
 *     tags: [Posts]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Post ID
 *     responses:
 *       200:
 *         description: Post view statistics
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
 *                         totalViews:
 *                           type: number
 *                         uniqueViews:
 *                           type: number
 *                         dailyViews:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               date:
 *                                 type: string
 *                                 format: date
 *                               views:
 *                                 type: number
 */
router.get("/:id/stats", postIdValidation, getPostViewStats);

/**
 * @swagger
 * /api/posts:
 *   post:
 *     summary: Create a new post
 *     tags: [Posts]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - description
 *               - price
 *               - propertyType
 *               - listingType
 *               - area
 *               - location
 *               - media
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               price:
 *                 type: number
 *               propertyType:
 *                 type: string
 *                 enum: [house, land, condo, apartment, villa, townhouse]
 *               listingType:
 *                 type: string
 *                 enum: [sell, rent, lease]
 *               area:
 *                 type: number
 *               location:
 *                 $ref: '#/components/schemas/Post/properties/location'
 *               media:
 *                 $ref: '#/components/schemas/Post/properties/media'
 *     responses:
 *       201:
 *         description: Post created successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/Post'
 *       401:
 *         description: Unauthorized
 */
router.post(
  "/",
  auth,
  upload.fields([
    { name: "images", maxCount: 20 },
    { name: "videos", maxCount: 5 },
  ]),
  parseJsonFields,
  postValidation.create,
  createPost
);

/**
 * @swagger
 * /api/posts/my-posts:
 *   get:
 *     summary: Get current user's posts
 *     tags: [Posts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *     responses:
 *       200:
 *         description: User's posts
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
 *                         $ref: '#/components/schemas/Post'
 *       401:
 *         description: Unauthorized
 */
router.get("/my-posts", auth, getUserPosts);

/**
 * @route GET /api/posts/pending
 * @desc Get pending posts (Admin)
 * @access Private/Admin
 */
router.get("/pending", getPendingPosts);

/**
 * @route PUT /api/posts/:id/approve
 * @desc Approve post (Admin)
 * @access Private/Admin
 */
router.put("/:id/approve", postIdValidation, approvePost);

/**
 * @route PUT /api/posts/:id/reject
 * @desc Reject post (Admin)
 * @access Private/Admin
 */
router.put("/:id/reject", postIdValidation, rejectPost);

/**
 * @route GET /api/posts/user/view-history
 * @desc Get user's view history
 * @access Private
 */
router.get("/user/view-history", auth, getUserViewHistory);

/**
 * @swagger
 * /api/posts/user/recommended:
 *   get:
 *     summary: Get recommended posts for user
 *     tags: [Posts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *     responses:
 *       200:
 *         description: Recommended posts
 *       401:
 *         description: Unauthorized
 */
router.get("/user/recommended", auth, getRecommendedPosts);

/**
 * @swagger
 * /api/posts/search:
 *   get:
 *     summary: Search posts with advanced filters and relevance scoring
 *     description: |
 *       Comprehensive search across multiple fields with intelligent relevance ranking.
 *
 *       **Text Search (search parameter):**
 *       - Searches across: title, description, tags, keywords, province, district, street
 *       - Results ranked by relevance score (most relevant first)
 *       - Scoring weights: Title (10-15 pts), Tags (8 pts), Keywords (7 pts), Province (6 pts), District (5 pts), Street (4 pts), Description (3 pts)
 *       - Boosts: Featured (+2 pts), Urgent (+1 pt), Popular posts (up to +3 pts)
 *
 *       **Exact Filters:**
 *       - Use province, district, propertyType for exact field matching
 *       - Can be combined with text search for precise results
 *
 *       **Example Usage:**
 *       - `?search=ດິນທີ່ສາລະວັນ` - Search all fields, ranked by relevance
 *       - `?search=ດິນທີ່ສາລະວັນ&province=ສາລະວັນ` - Text search + exact province filter
 *       - `?province=ວຽງຈັນ&propertyType=land&minPrice=1000000` - Exact filters only
 *     tags: [Posts]
 *     parameters:
 *       - $ref: '#/components/parameters/PageParam'
 *       - $ref: '#/components/parameters/LimitParam'
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: |
 *           Multi-field text search with relevance ranking.
 *           Searches: title, description, tags, keywords, province, district, street.
 *           Example: "ດິນທີ່ສາລະວັນ" or "house near market"
 *       - in: query
 *         name: propertyType
 *         schema:
 *           type: string
 *           enum: [house, land, condo, apartment, villa, townhouse]
 *         description: Exact match filter for property type
 *       - in: query
 *         name: listingType
 *         schema:
 *           type: string
 *           enum: [sell, rent, lease]
 *         description: Exact match filter for listing type
 *       - in: query
 *         name: province
 *         schema:
 *           type: string
 *         description: Exact match filter for province (case-insensitive)
 *       - in: query
 *         name: district
 *         schema:
 *           type: string
 *         description: Exact match filter for district (case-insensitive)
 *       - in: query
 *         name: minPrice
 *         schema:
 *           type: number
 *         description: Minimum price
 *       - in: query
 *         name: maxPrice
 *         schema:
 *           type: number
 *         description: Maximum price
 *       - in: query
 *         name: minArea
 *         schema:
 *           type: number
 *         description: Minimum area in square meters
 *       - in: query
 *         name: maxArea
 *         schema:
 *           type: number
 *         description: Maximum area in square meters
 *       - in: query
 *         name: bedrooms
 *         schema:
 *           type: integer
 *         description: Number of bedrooms
 *       - in: query
 *         name: bathrooms
 *         schema:
 *           type: integer
 *         description: Number of bathrooms
 *       - in: query
 *         name: condition
 *         schema:
 *           type: string
 *           enum: [new, excellent, good, fair, poor]
 *         description: Property condition
 *       - in: query
 *         name: featured
 *         schema:
 *           type: boolean
 *         description: Filter featured posts
 *       - in: query
 *         name: urgent
 *         schema:
 *           type: boolean
 *         description: Filter urgent posts
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [newest, oldest, price_asc, price_desc, area_asc, area_desc, distance]
 *         description: |
 *           Sort results. When 'search' parameter is provided, results are automatically sorted by relevance unless 'distance' sort is used.
 *       - in: query
 *         name: latitude
 *         schema:
 *           type: number
 *         description: Latitude for geospatial search
 *       - in: query
 *         name: longitude
 *         schema:
 *           type: number
 *         description: Longitude for geospatial search
 *       - in: query
 *         name: radius
 *         schema:
 *           type: number
 *           default: 5000
 *         description: Search radius in meters (only with lat/lng)
 *     responses:
 *       200:
 *         description: Search results with optional distance and relevance data
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
 *                         allOf:
 *                           - $ref: '#/components/schemas/Post'
 *                           - type: object
 *                             properties:
 *                               distance:
 *                                 type: number
 *                                 description: Distance in meters (only for geospatial search)
 *                               relevanceScore:
 *                                 type: number
 *                                 description: Relevance score (only when search text is provided)
 */
router.get("/search", searchPosts);

/**
 * @swagger
 * /api/posts/nearby:
 *   get:
 *     summary: Find posts near a specific location
 *     tags: [Posts]
 *     parameters:
 *       - in: query
 *         name: latitude
 *         required: true
 *         schema:
 *           type: number
 *         description: Latitude coordinate
 *       - in: query
 *         name: longitude
 *         required: true
 *         schema:
 *           type: number
 *         description: Longitude coordinate
 *       - in: query
 *         name: radius
 *         schema:
 *           type: number
 *           default: 5000
 *         description: Search radius in meters
 *       - $ref: '#/components/parameters/PageParam'
 *       - $ref: '#/components/parameters/LimitParam'
 *       - in: query
 *         name: propertyType
 *         schema:
 *           type: string
 *           enum: [house, land, condo, apartment, villa, townhouse]
 *       - in: query
 *         name: listingType
 *         schema:
 *           type: string
 *           enum: [sell, rent, lease]
 *       - in: query
 *         name: minPrice
 *         schema:
 *           type: number
 *       - in: query
 *         name: maxPrice
 *         schema:
 *           type: number
 *     responses:
 *       200:
 *         description: Nearby posts with distance information
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
 *                         allOf:
 *                           - $ref: '#/components/schemas/Post'
 *                           - type: object
 *                             properties:
 *                               distance:
 *                                 type: number
 *                                 description: Distance in meters
 *       400:
 *         description: Invalid coordinates
 */
router.get("/nearby", getNearbyPosts);

/**
 * @swagger
 * /api/posts/province/{province}:
 *   get:
 *     summary: Get posts by province
 *     tags: [Posts]
 *     parameters:
 *       - in: path
 *         name: province
 *         required: true
 *         schema:
 *           type: string
 *         description: Province name
 *       - $ref: '#/components/parameters/PageParam'
 *       - $ref: '#/components/parameters/LimitParam'
 *       - in: query
 *         name: propertyType
 *         schema:
 *           type: string
 *           enum: [house, land, condo, apartment, villa, townhouse]
 *       - in: query
 *         name: listingType
 *         schema:
 *           type: string
 *           enum: [sell, rent, lease]
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [newest, oldest, price_asc, price_desc]
 *     responses:
 *       200:
 *         description: Posts in the specified province
 */
router.get("/province/:province", getPostsByProvince);

/**
 * @swagger
 * /api/posts/stats/search:
 *   get:
 *     summary: Get search and listing statistics
 *     tags: [Posts]
 *     responses:
 *       200:
 *         description: Search statistics
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
 *                         totalPosts:
 *                           type: number
 *                         byPropertyType:
 *                           type: object
 *                           additionalProperties:
 *                             type: number
 *                         topProvinces:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               province:
 *                                 type: string
 *                               count:
 *                                 type: number
 *                         priceDistribution:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               range:
 *                                 type: string
 *                               count:
 *                                 type: number
 */
router.get("/stats/search", getSearchStats);

/**
 * @swagger
 * /api/posts/{id}:
 *   get:
 *     summary: Get single post (automatically tracks view)
 *     tags: [Posts]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Post ID
 *     responses:
 *       200:
 *         description: Post details
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/Post'
 *       404:
 *         description: Post not found
 */
router.get("/:id", postIdValidation, getPost);

/**
 * @swagger
 * /api/posts/{id}:
 *   put:
 *     summary: Update post
 *     tags: [Posts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Post ID
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               price:
 *                 type: number
 *               images:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *               videos:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *     responses:
 *       200:
 *         description: Post updated successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Post not found
 */
router.put(
  "/:id",
  auth,
  upload.fields([
    { name: "images", maxCount: 20 },
    { name: "videos", maxCount: 5 },
  ]),
  parseJsonFields,
  // validation middleware if needed, e.g. postValidation.update
  updatePost
);

/**
 * @swagger
 * /api/posts/{id}:
 *   delete:
 *     summary: Delete post
 *     tags: [Posts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Post ID
 *     responses:
 *       200:
 *         description: Post deleted successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Post not found
 */
router.delete("/:id", auth, deletePost);

export default router;
