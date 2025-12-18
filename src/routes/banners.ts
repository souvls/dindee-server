import { Router } from "express";
import { param, body } from "express-validator";
import multer from "multer";
import {
  getActiveBanners,
  trackBannerView,
  trackBannerClick,
  getAllBanners,
  getBannerById,
  createBanner,
  updateBanner,
  deleteBanner,
  toggleBannerStatus,
  getBannerStats,
} from "@/controllers/banners";

const router: Router = Router();
const upload = multer({ storage: multer.memoryStorage() });

/**
 * @swagger
 * tags:
 *   name: Banners
 *   description: Banner management for home page advertising
 */

// Validation rules
const bannerIdValidation = [
  param("id").isMongoId().withMessage("Invalid banner ID"),
];

const createBannerValidation = [
  body("name").trim().notEmpty().withMessage("Name is required"),
  body("description").trim().notEmpty().withMessage("Description is required"),
  // body('image').trim().notEmpty().withMessage('Image URL is required'), // Removed as it's handled by file upload
  body("dateStart").isISO8601().withMessage("Valid start date is required"),
  body("dateEnd").isISO8601().withMessage("Valid end date is required"),
  body("displayDuration")
    .optional()
    .isInt({ min: 1, max: 60 })
    .withMessage("Display duration must be between 1-60 seconds"),
  body("priority")
    .optional()
    .isInt({ min: 0, max: 100 })
    .withMessage("Priority must be between 0-100"),
  body("dateEnd").custom((value, { req }) => {
    if (value && req.body.dateStart) {
      const start = new Date(req.body.dateStart);
      const end = new Date(value);
      if (end <= start) {
        throw new Error("End date must be after start date");
      }
    }
    return true;
  }),
];

// Public routes

/**
 * @swagger
 * /api/banners/active:
 *   get:
 *     summary: Get all active banners for home page
 *     tags: [Banners]
 *     responses:
 *       200:
 *         description: List of active banners
 */
router.get("/active", getActiveBanners);

/**
 * @swagger
 * /api/banners/{id}/view:
 *   post:
 *     summary: Track banner view
 *     tags: [Banners]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: View tracked successfully
 */
router.post("/:id/view", bannerIdValidation, trackBannerView);

/**
 * @swagger
 * /api/banners/{id}/click:
 *   post:
 *     summary: Track banner click
 *     tags: [Banners]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Click tracked successfully
 */
router.post("/:id/click", bannerIdValidation, trackBannerClick);

// Admin routes (require authentication)

/**
 * @swagger
 * /api/banners:
 *   get:
 *     summary: Get all banners (Admin only)
 *     tags: [Banners]
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
 *         name: isActive
 *         schema:
 *           type: boolean
 *     responses:
 *       200:
 *         description: List of banners with pagination
 */
router.get("/", getAllBanners);

/**
 * @swagger
 * /api/banners/{id}:
 *   get:
 *     summary: Get single banner by ID (Admin only)
 *     tags: [Banners]
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
 *         description: Banner details
 *       404:
 *         description: Banner not found
 */
router.get("/:id", bannerIdValidation, getBannerById);

/**
 * @swagger
 * /api/banners:
 *   post:
 *     summary: Create new banner (Admin only)
 *     tags: [Banners]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - description
 *               - image
 *               - dateStart
 *               - dateEnd
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               image:
 *                 type: string
 *                 format: binary
 *               linkToAdsPage:
 *                 type: string
 *               dateStart:
 *                 type: string
 *                 format: date-time
 *               dateEnd:
 *                 type: string
 *                 format: date-time
 *               displayDuration:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 60
 *                 default: 5
 *               priority:
 *                 type: integer
 *                 minimum: 0
 *                 maximum: 100
 *               isActive:
 *                 type: boolean
 *     responses:
 *       201:
 *         description: Banner created successfully
 */
router.post("/", upload.single("image"), createBannerValidation, createBanner);

/**
 * @swagger
 * /api/banners/{id}:
 *   put:
 *     summary: Update banner (Admin only)
 *     tags: [Banners]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               image:
 *                 type: string
 *                 format: binary
 *               linkToAdsPage:
 *                 type: string
 *               dateStart:
 *                 type: string
 *                 format: date-time
 *               dateEnd:
 *                 type: string
 *                 format: date-time
 *               displayDuration:
 *                 type: integer
 *               priority:
 *                 type: integer
 *               isActive:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Banner updated successfully
 *       404:
 *         description: Banner not found
 */
router.put("/:id", upload.single("image"), bannerIdValidation, updateBanner);

/**
 * @swagger
 * /api/banners/{id}:
 *   delete:
 *     summary: Delete banner (Admin only)
 *     tags: [Banners]
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
 *         description: Banner deleted successfully
 *       404:
 *         description: Banner not found
 */
router.delete("/:id", bannerIdValidation, deleteBanner);

/**
 * @swagger
 * /api/banners/{id}/toggle:
 *   patch:
 *     summary: Toggle banner active status (Admin only)
 *     tags: [Banners]
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
 *         description: Banner status toggled successfully
 *       404:
 *         description: Banner not found
 */
router.patch("/:id/toggle", bannerIdValidation, toggleBannerStatus);

/**
 * @swagger
 * /api/banners/{id}/stats:
 *   get:
 *     summary: Get banner statistics (Admin only)
 *     tags: [Banners]
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
 *         description: Banner statistics
 *       404:
 *         description: Banner not found
 */
router.get("/:id/stats", bannerIdValidation, getBannerStats);

export default router;
