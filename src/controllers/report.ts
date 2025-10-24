import { Request, Response } from 'express'
import { Types } from 'mongoose'
import { Report, IReport } from '@/models/Report'
import { Post } from '@/models/Post'
import { User } from '@/models/User'
import { Chat } from '@/models/Chat'
import { ResponseHelper } from '@/utils/ResponseHelper'

interface AuthRequest extends Request {
  user?: {
    userId: string
    role: string
  }
}

/**
 * @swagger
 * components:
 *   schemas:
 *     Report:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *         reportedBy:
 *           type: string
 *         reportedPost:
 *           type: string
 *         reportedUser:
 *           type: string
 *         reportedChat:
 *           type: string
 *         reportType:
 *           type: string
 *           enum: [spam, inappropriate, fake, harassment, scam, other]
 *         category:
 *           type: string
 *           enum: [post, user, chat]
 *         title:
 *           type: string
 *         description:
 *           type: string
 *         evidence:
 *           type: object
 *           properties:
 *             screenshots:
 *               type: array
 *               items:
 *                 type: string
 *             attachments:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   url:
 *                     type: string
 *                   fileName:
 *                     type: string
 *                   fileSize:
 *                     type: number
 *                   mimeType:
 *                     type: string
 *         status:
 *           type: string
 *           enum: [pending, reviewing, resolved, rejected]
 *         priority:
 *           type: string
 *           enum: [low, medium, high, critical]
 *         adminNotes:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               note:
 *                 type: string
 *               admin:
 *                 type: string
 *               timestamp:
 *                 type: string
 *                 format: date-time
 *         resolution:
 *           type: object
 *           properties:
 *             action:
 *               type: string
 *               enum: [no_action, warning, content_removal, account_suspension, account_ban]
 *             reason:
 *               type: string
 *             resolvedBy:
 *               type: string
 *             resolvedAt:
 *               type: string
 *               format: date-time
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 */

/**
 * @swagger
 * /api/reports:
 *   post:
 *     summary: Create a new report
 *     tags: [Report]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reportedPost:
 *                 type: string
 *                 description: ID of the post being reported (for post reports)
 *               reportedUser:
 *                 type: string
 *                 description: ID of the user being reported (for user reports)
 *               reportedChat:
 *                 type: string
 *                 description: ID of the chat being reported (for chat reports)
 *               reportType:
 *                 type: string
 *                 enum: [spam, inappropriate, fake, harassment, scam, other]
 *               category:
 *                 type: string
 *                 enum: [post, user, chat]
 *               title:
 *                 type: string
 *                 maxLength: 200
 *               description:
 *                 type: string
 *                 maxLength: 1000
 *               evidence:
 *                 type: object
 *                 properties:
 *                   screenshots:
 *                     type: array
 *                     items:
 *                       type: string
 *                   attachments:
 *                     type: array
 *                     items:
 *                       type: object
 *                       properties:
 *                         url:
 *                           type: string
 *                         fileName:
 *                           type: string
 *                         fileSize:
 *                           type: number
 *                         mimeType:
 *                           type: string
 *             required:
 *               - reportType
 *               - category
 *               - title
 *               - description
 *     responses:
 *       201:
 *         description: Report created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Report'
 */
export const createReport = async (req: AuthRequest, res: Response) => {
  try {
    const {
      reportedPost,
      reportedUser,
      reportedChat,
      reportType,
      category,
      title,
      description,
      evidence
    } = req.body

    const userId = req.user?.userId

    if (!userId) {
      return ResponseHelper.unauthorized(res, 'User not authenticated')
    }

    // Validate required fields
    if (!reportType || !category || !title || !description) {
      return ResponseHelper.badRequest(res, 'Missing required fields')
    }

    // Validate category-specific requirements
    if (category === 'post' && (!reportedPost || !Types.ObjectId.isValid(reportedPost))) {
      return ResponseHelper.badRequest(res, 'Valid post ID is required for post reports')
    }

    if (category === 'user' && (!reportedUser || !Types.ObjectId.isValid(reportedUser))) {
      return ResponseHelper.badRequest(res, 'Valid user ID is required for user reports')
    }

    if (category === 'chat' && (!reportedChat || !Types.ObjectId.isValid(reportedChat))) {
      return ResponseHelper.badRequest(res, 'Valid chat ID is required for chat reports')
    }

    // Validate that the reported entity exists
    if (category === 'post') {
      const post = await Post.findById(reportedPost)
      if (!post) {
        return ResponseHelper.notFound(res, 'Post not found')
      }
    }

    if (category === 'user') {
      const user = await User.findById(reportedUser)
      if (!user) {
        return ResponseHelper.notFound(res, 'User not found')
      }

      // Prevent self-reporting
      if (reportedUser === userId) {
        return ResponseHelper.badRequest(res, 'You cannot report yourself')
      }
    }

    if (category === 'chat') {
      const chat = await Chat.findById(reportedChat)
      if (!chat) {
        return ResponseHelper.notFound(res, 'Chat not found')
      }

      // Check if user is participant in the chat
      const isParticipant = chat.participants.some(
        (p: any) => p.user.toString() === userId
      )

      if (!isParticipant) {
        return ResponseHelper.forbidden(res, 'You can only report chats you are part of')
      }
    }

    // Check for duplicate reports
    const existingReport = await Report.findOne({
      reportedBy: userId,
      ...(reportedPost && { reportedPost }),
      ...(reportedUser && { reportedUser }),
      ...(reportedChat && { reportedChat }),
      status: { $in: ['pending', 'reviewing'] }
    })

    if (existingReport) {
      return ResponseHelper.badRequest(res, 'You have already reported this item')
    }

    // Determine priority based on report type
    let priority = 'medium'
    if (['harassment', 'scam'].includes(reportType)) {
      priority = 'high'
    } else if (reportType === 'spam') {
      priority = 'low'
    }

    const report = new Report({
      reportedBy: userId,
      ...(reportedPost && { reportedPost }),
      ...(reportedUser && { reportedUser }),
      ...(reportedChat && { reportedChat }),
      reportType,
      category,
      title: title.trim(),
      description: description.trim(),
      evidence,
      priority,
      status: 'pending'
    })

    await report.save()

    // Populate related data for response
    await report.populate('reportedBy', 'username email')
    if (reportedPost) await report.populate('reportedPost', 'title')
    if (reportedUser) await report.populate('reportedUser', 'username email')

    ResponseHelper.created(res, report, 'Report created successfully')
  } catch (error) {
    console.error('Create Report Error:', error)
    ResponseHelper.error(res, 'Failed to create report')
  }
}

/**
 * @swagger
 * /api/reports:
 *   get:
 *     summary: Get user's reports
 *     tags: [Report]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, reviewing, resolved, rejected]
 *         description: Filter reports by status
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *           enum: [post, user, chat]
 *         description: Filter reports by category
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
 *           default: 20
 *         description: Items per page
 *     responses:
 *       200:
 *         description: Reports retrieved successfully
 */
export const getUserReports = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId
    const { status, category, page = 1, limit = 20 } = req.query

    if (!userId) {
      return ResponseHelper.unauthorized(res, 'User not authenticated')
    }

    const skip = (Number(page) - 1) * Number(limit)

    const filter: any = {
      reportedBy: userId
    }

    if (status) filter.status = status
    if (category) filter.category = category

    const reports = await Report.find(filter)
      .populate('reportedPost', 'title images')
      .populate('reportedUser', 'username email avatar')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))

    const total = await Report.countDocuments(filter)

    ResponseHelper.success(res, {
      reports,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit))
      }
    }, 'Reports retrieved successfully')
  } catch (error) {
    console.error('Get User Reports Error:', error)
    ResponseHelper.error(res, 'Failed to retrieve reports')
  }
}

/**
 * @swagger
 * /api/reports/{reportId}:
 *   get:
 *     summary: Get report details
 *     tags: [Report]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: reportId
 *         required: true
 *         schema:
 *           type: string
 *         description: Report ID
 *     responses:
 *       200:
 *         description: Report details retrieved successfully
 */
export const getReportById = async (req: AuthRequest, res: Response) => {
  try {
    const { reportId } = req.params
    const userId = req.user?.userId

    if (!userId) {
      return ResponseHelper.unauthorized(res, 'User not authenticated')
    }

    if (!Types.ObjectId.isValid(reportId)) {
      return ResponseHelper.badRequest(res, 'Invalid report ID')
    }

    const report = await Report.findById(reportId)
      .populate('reportedBy', 'username email avatar')
      .populate('reportedPost', 'title description images location price')
      .populate('reportedUser', 'username email avatar')
      .populate('adminNotes.admin', 'username email')
      .populate('resolution.resolvedBy', 'username email')

    if (!report) {
      return ResponseHelper.notFound(res, 'Report not found')
    }

    // Check if user owns this report or is admin
    const isOwner = report.reportedBy._id.toString() === userId
    const isAdmin = req.user?.role === 'admin'

    if (!isOwner && !isAdmin) {
      return ResponseHelper.forbidden(res, 'You are not authorized to view this report')
    }

    ResponseHelper.success(res, report, 'Report details retrieved successfully')
  } catch (error) {
    console.error('Get Report By ID Error:', error)
    ResponseHelper.error(res, 'Failed to retrieve report details')
  }
}

// Admin-only endpoints

/**
 * @swagger
 * /api/reports/admin:
 *   get:
 *     summary: Get all reports (Admin only)
 *     tags: [Report]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, reviewing, resolved, rejected]
 *         description: Filter reports by status
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *           enum: [post, user, chat]
 *         description: Filter reports by category
 *       - in: query
 *         name: priority
 *         schema:
 *           type: string
 *           enum: [low, medium, high, critical]
 *         description: Filter reports by priority
 *       - in: query
 *         name: reportType
 *         schema:
 *           type: string
 *           enum: [spam, inappropriate, fake, harassment, scam, other]
 *         description: Filter reports by type
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
 *           default: 20
 *         description: Items per page
 *     responses:
 *       200:
 *         description: All reports retrieved successfully
 */
export const getAllReports = async (req: AuthRequest, res: Response) => {
  try {
    if (req.user?.role !== 'admin') {
      return ResponseHelper.forbidden(res, 'Admin access required')
    }

    const { status, category, priority, reportType, page = 1, limit = 20 } = req.query
    const skip = (Number(page) - 1) * Number(limit)

    const filter: any = {}
    if (status) filter.status = status
    if (category) filter.category = category
    if (priority) filter.priority = priority
    if (reportType) filter.reportType = reportType

    const reports = await Report.find(filter)
      .populate('reportedBy', 'username email avatar')
      .populate('reportedPost', 'title images')
      .populate('reportedUser', 'username email avatar')
      .sort({ priority: -1, createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))

    const total = await Report.countDocuments(filter)

    // Get stats
    const stats = await (Report as any).getReportsStats()

    ResponseHelper.success(res, {
      reports,
      stats,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit))
      }
    }, 'All reports retrieved successfully')
  } catch (error) {
    console.error('Get All Reports Error:', error)
    ResponseHelper.error(res, 'Failed to retrieve reports')
  }
}

/**
 * @swagger
 * /api/reports/{reportId}/note:
 *   post:
 *     summary: Add admin note to report (Admin only)
 *     tags: [Report]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: reportId
 *         required: true
 *         schema:
 *           type: string
 *         description: Report ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               note:
 *                 type: string
 *                 maxLength: 500
 *             required:
 *               - note
 *     responses:
 *       200:
 *         description: Admin note added successfully
 */
export const addAdminNote = async (req: AuthRequest, res: Response) => {
  try {
    if (req.user?.role !== 'admin') {
      return ResponseHelper.forbidden(res, 'Admin access required')
    }

    const { reportId } = req.params
    const { note } = req.body
    const adminId = req.user?.userId

    if (!Types.ObjectId.isValid(reportId)) {
      return ResponseHelper.badRequest(res, 'Invalid report ID')
    }

    if (!note || note.trim().length === 0) {
      return ResponseHelper.badRequest(res, 'Note is required')
    }

    if (note.length > 500) {
      return ResponseHelper.badRequest(res, 'Note is too long (max 500 characters)')
    }

    const report = await Report.findById(reportId)
    if (!report) {
      return ResponseHelper.notFound(res, 'Report not found')
    }

    report.adminNotes.push({
      note: note.trim(),
      admin: new Types.ObjectId(adminId),
      timestamp: new Date()
    })

    if (report.status === 'pending') {
      report.status = 'reviewing'
    }

    await report.save()
    await report.populate('adminNotes.admin', 'username email')

    ResponseHelper.success(res, report, 'Admin note added successfully')
  } catch (error) {
    console.error('Add Admin Note Error:', error)
    ResponseHelper.error(res, 'Failed to add admin note')
  }
}

/**
 * @swagger
 * /api/reports/{reportId}/resolve:
 *   put:
 *     summary: Resolve a report (Admin only)
 *     tags: [Report]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: reportId
 *         required: true
 *         schema:
 *           type: string
 *         description: Report ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               action:
 *                 type: string
 *                 enum: [no_action, warning, content_removal, account_suspension, account_ban]
 *               reason:
 *                 type: string
 *             required:
 *               - action
 *               - reason
 *     responses:
 *       200:
 *         description: Report resolved successfully
 */
export const resolveReport = async (req: AuthRequest, res: Response) => {
  try {
    if (req.user?.role !== 'admin') {
      return ResponseHelper.forbidden(res, 'Admin access required')
    }

    const { reportId } = req.params
    const { action, reason } = req.body
    const adminId = req.user?.userId

    if (!Types.ObjectId.isValid(reportId)) {
      return ResponseHelper.badRequest(res, 'Invalid report ID')
    }

    if (!action || !reason) {
      return ResponseHelper.badRequest(res, 'Action and reason are required')
    }

    const report = await Report.findById(reportId)
    if (!report) {
      return ResponseHelper.notFound(res, 'Report not found')
    }

    if (report.status === 'resolved' || report.status === 'rejected') {
      return ResponseHelper.badRequest(res, 'Report is already resolved')
    }

    report.status = 'resolved'
    report.resolution = {
      action,
      reason: reason.trim(),
      resolvedBy: new Types.ObjectId(adminId),
      resolvedAt: new Date()
    }

    await report.save()
    await report.populate('resolution.resolvedBy', 'username email')

    ResponseHelper.success(res, report, 'Report resolved successfully')
  } catch (error) {
    console.error('Resolve Report Error:', error)
    ResponseHelper.error(res, 'Failed to resolve report')
  }
}

/**
 * @swagger
 * /api/reports/{reportId}/reject:
 *   put:
 *     summary: Reject a report (Admin only)
 *     tags: [Report]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: reportId
 *         required: true
 *         schema:
 *           type: string
 *         description: Report ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason:
 *                 type: string
 *             required:
 *               - reason
 *     responses:
 *       200:
 *         description: Report rejected successfully
 */
export const rejectReport = async (req: AuthRequest, res: Response) => {
  try {
    if (req.user?.role !== 'admin') {
      return ResponseHelper.forbidden(res, 'Admin access required')
    }

    const { reportId } = req.params
    const { reason } = req.body
    const adminId = req.user?.userId

    if (!Types.ObjectId.isValid(reportId)) {
      return ResponseHelper.badRequest(res, 'Invalid report ID')
    }

    if (!reason || reason.trim().length === 0) {
      return ResponseHelper.badRequest(res, 'Reason is required')
    }

    const report = await Report.findById(reportId)
    if (!report) {
      return ResponseHelper.notFound(res, 'Report not found')
    }

    if (report.status === 'resolved' || report.status === 'rejected') {
      return ResponseHelper.badRequest(res, 'Report is already resolved')
    }

    report.status = 'rejected'
    report.resolution = {
      action: 'no_action',
      reason: reason.trim(),
      resolvedBy: new Types.ObjectId(adminId),
      resolvedAt: new Date()
    }

    await report.save()
    await report.populate('resolution.resolvedBy', 'username email')

    ResponseHelper.success(res, report, 'Report rejected successfully')
  } catch (error) {
    console.error('Reject Report Error:', error)
    ResponseHelper.error(res, 'Failed to reject report')
  }
}