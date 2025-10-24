import { Types } from 'mongoose'
import { Report, IReport } from '@/models/Report'
import { Post } from '@/models/Post'
import { User } from '@/models/User'
import { Chat } from '@/models/Chat'

export class ReportService {

  /**
   * Create a new report
   */
  static async createReport(
    reportData: {
      reportedBy: string
      reportedPost?: string
      reportedUser?: string
      reportedChat?: string
      reportType: string
      category: string
      title: string
      description: string
      evidence?: any
    }
  ): Promise<IReport> {
    try {
      const {
        reportedBy,
        reportedPost,
        reportedUser,
        reportedChat,
        reportType,
        category,
        title,
        description,
        evidence
      } = reportData

      // Validate category-specific requirements
      if (category === 'post' && reportedPost) {
        const post = await Post.findById(reportedPost)
        if (!post) {
          throw new Error('Post not found')
        }
      }

      if (category === 'user' && reportedUser) {
        const user = await User.findById(reportedUser)
        if (!user) {
          throw new Error('User not found')
        }

        // Prevent self-reporting
        if (reportedUser === reportedBy) {
          throw new Error('You cannot report yourself')
        }
      }

      if (category === 'chat' && reportedChat) {
        const chat = await Chat.findById(reportedChat)
        if (!chat) {
          throw new Error('Chat not found')
        }

        // Check if user is participant in the chat
        const isParticipant = chat.participants.some(
          (p: any) => p.user.toString() === reportedBy
        )

        if (!isParticipant) {
          throw new Error('You can only report chats you are part of')
        }
      }

      // Check for duplicate reports
      const existingReport = await Report.findOne({
        reportedBy,
        ...(reportedPost && { reportedPost }),
        ...(reportedUser && { reportedUser }),
        ...(reportedChat && { reportedChat }),
        status: { $in: ['pending', 'reviewing'] }
      })

      if (existingReport) {
        throw new Error('You have already reported this item')
      }

      // Determine priority based on report type
      let priority = 'medium'
      if (['harassment', 'scam'].includes(reportType)) {
        priority = 'high'
      } else if (reportType === 'spam') {
        priority = 'low'
      }

      const report = new Report({
        reportedBy,
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

      // Populate related data
      await report.populate('reportedBy', 'username email')
      if (reportedPost) await report.populate('reportedPost', 'title')
      if (reportedUser) await report.populate('reportedUser', 'username email')

      return report
    } catch (error) {
      console.error('ReportService.createReport error:', error)
      throw error
    }
  }

  /**
   * Get user's reports
   */
  static async getUserReports(
    userId: string,
    filters: {
      status?: string
      category?: string
      page?: number
      limit?: number
    } = {}
  ): Promise<{
    reports: IReport[]
    pagination: {
      page: number
      limit: number
      total: number
      pages: number
    }
  }> {
    try {
      const { status, category, page = 1, limit = 20 } = filters
      const skip = (page - 1) * limit

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
        .limit(limit)

      const total = await Report.countDocuments(filter)

      return {
        reports,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    } catch (error) {
      console.error('ReportService.getUserReports error:', error)
      throw error
    }
  }

  /**
   * Get report by ID
   */
  static async getReportById(reportId: string, userId: string, userRole: string): Promise<IReport> {
    try {
      const report = await Report.findById(reportId)
        .populate('reportedBy', 'username email avatar')
        .populate('reportedPost', 'title description images location price')
        .populate('reportedUser', 'username email avatar')
        .populate('adminNotes.admin', 'username email')
        .populate('resolution.resolvedBy', 'username email')

      if (!report) {
        throw new Error('Report not found')
      }

      // Check authorization
      const isOwner = report.reportedBy._id.toString() === userId
      const isAdmin = userRole === 'admin'

      if (!isOwner && !isAdmin) {
        throw new Error('Not authorized to view this report')
      }

      return report
    } catch (error) {
      console.error('ReportService.getReportById error:', error)
      throw error
    }
  }

  /**
   * Get all reports (Admin only)
   */
  static async getAllReports(
    filters: {
      status?: string
      category?: string
      priority?: string
      reportType?: string
      page?: number
      limit?: number
    } = {}
  ): Promise<{
    reports: IReport[]
    stats: any
    pagination: {
      page: number
      limit: number
      total: number
      pages: number
    }
  }> {
    try {
      const { status, category, priority, reportType, page = 1, limit = 20 } = filters
      const skip = (page - 1) * limit

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
        .limit(limit)

      const total = await Report.countDocuments(filter)

      // Get stats
      const stats = await (Report as any).getReportsStats()

      return {
        reports,
        stats,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    } catch (error) {
      console.error('ReportService.getAllReports error:', error)
      throw error
    }
  }

  /**
   * Add admin note to report
   */
  static async addAdminNote(
    reportId: string,
    adminId: string,
    note: string
  ): Promise<IReport> {
    try {
      if (!note || note.trim().length === 0) {
        throw new Error('Note is required')
      }

      if (note.length > 500) {
        throw new Error('Note is too long (max 500 characters)')
      }

      const report = await Report.findById(reportId)
      if (!report) {
        throw new Error('Report not found')
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

      return report
    } catch (error) {
      console.error('ReportService.addAdminNote error:', error)
      throw error
    }
  }

  /**
   * Resolve a report
   */
  static async resolveReport(
    reportId: string,
    adminId: string,
    resolution: {
      action: string
      reason: string
    }
  ): Promise<IReport> {
    try {
      const { action, reason } = resolution

      if (!action || !reason) {
        throw new Error('Action and reason are required')
      }

      const report = await Report.findById(reportId)
      if (!report) {
        throw new Error('Report not found')
      }

      if (report.status === 'resolved' || report.status === 'rejected') {
        throw new Error('Report is already resolved')
      }

      report.status = 'resolved'
      report.resolution = {
        action: action as any,
        reason: reason.trim(),
        resolvedBy: new Types.ObjectId(adminId),
        resolvedAt: new Date()
      }

      await report.save()
      await report.populate('resolution.resolvedBy', 'username email')

      return report
    } catch (error) {
      console.error('ReportService.resolveReport error:', error)
      throw error
    }
  }

  /**
   * Reject a report
   */
  static async rejectReport(
    reportId: string,
    adminId: string,
    reason: string
  ): Promise<IReport> {
    try {
      if (!reason || reason.trim().length === 0) {
        throw new Error('Reason is required')
      }

      const report = await Report.findById(reportId)
      if (!report) {
        throw new Error('Report not found')
      }

      if (report.status === 'resolved' || report.status === 'rejected') {
        throw new Error('Report is already resolved')
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

      return report
    } catch (error) {
      console.error('ReportService.rejectReport error:', error)
      throw error
    }
  }

  /**
   * Get report statistics
   */
  static async getReportStats(filters: any = {}): Promise<any> {
    try {
      // Status distribution
      const statusStats = await Report.aggregate([
        ...(Object.keys(filters).length > 0 ? [{ $match: filters }] : []),
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 }
          }
        }
      ])

      // Priority distribution
      const priorityStats = await Report.aggregate([
        ...(Object.keys(filters).length > 0 ? [{ $match: filters }] : []),
        {
          $group: {
            _id: '$priority',
            count: { $sum: 1 }
          }
        }
      ])

      // Category distribution
      const categoryStats = await Report.aggregate([
        ...(Object.keys(filters).length > 0 ? [{ $match: filters }] : []),
        {
          $group: {
            _id: '$category',
            count: { $sum: 1 }
          }
        }
      ])

      // Type distribution
      const typeStats = await Report.aggregate([
        ...(Object.keys(filters).length > 0 ? [{ $match: filters }] : []),
        {
          $group: {
            _id: '$reportType',
            count: { $sum: 1 }
          }
        }
      ])

      // Recent reports (last 7 days)
      const sevenDaysAgo = new Date()
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

      const recentReports = await Report.countDocuments({
        createdAt: { $gte: sevenDaysAgo },
        ...filters
      })

      // Average resolution time
      const resolvedReports = await Report.aggregate([
        {
          $match: {
            status: 'resolved',
            'resolution.resolvedAt': { $exists: true },
            ...filters
          }
        },
        {
          $project: {
            resolutionTime: {
              $subtract: ['$resolution.resolvedAt', '$createdAt']
            }
          }
        },
        {
          $group: {
            _id: null,
            avgResolutionTime: { $avg: '$resolutionTime' },
            count: { $sum: 1 }
          }
        }
      ])

      return {
        status: statusStats,
        priority: priorityStats,
        category: categoryStats,
        type: typeStats,
        recentCount: recentReports,
        resolution: resolvedReports[0] || { avgResolutionTime: 0, count: 0 }
      }
    } catch (error) {
      console.error('ReportService.getReportStats error:', error)
      throw error
    }
  }

  /**
   * Bulk update report priorities
   */
  static async bulkUpdatePriority(reportIds: string[], priority: string): Promise<number> {
    try {
      const result = await Report.updateMany(
        { _id: { $in: reportIds.map(id => new Types.ObjectId(id)) } },
        { $set: { priority } }
      )

      return result.modifiedCount
    } catch (error) {
      console.error('ReportService.bulkUpdatePriority error:', error)
      throw error
    }
  }

  /**
   * Get reports by reported entity
   */
  static async getReportsByEntity(
    entityType: 'post' | 'user' | 'chat',
    entityId: string
  ): Promise<IReport[]> {
    try {
      const filter: any = { category: entityType }
      
      switch (entityType) {
        case 'post':
          filter.reportedPost = entityId
          break
        case 'user':
          filter.reportedUser = entityId
          break
        case 'chat':
          filter.reportedChat = entityId
          break
      }

      const reports = await Report.find(filter)
        .populate('reportedBy', 'username email')
        .populate('adminNotes.admin', 'username email')
        .sort({ createdAt: -1 })

      return reports
    } catch (error) {
      console.error('ReportService.getReportsByEntity error:', error)
      throw error
    }
  }
}