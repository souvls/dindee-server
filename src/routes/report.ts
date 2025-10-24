import { Router } from 'express'
import {
  createReport,
  getUserReports,
  getReportById,
  getAllReports,
  addAdminNote,
  resolveReport,
  rejectReport
} from '@/controllers/report'
import { auth } from '@/middlewares/auth'

const router: Router = Router()

/**
 * @swagger
 * tags:
 *   name: Report
 *   description: Report management endpoints
 */

// User endpoints
router.post('/', auth, createReport)
router.get('/', auth, getUserReports)
router.get('/:reportId', auth, getReportById)

// Admin endpoints
router.get('/admin/all', auth, getAllReports)
router.post('/:reportId/note', auth, addAdminNote)
router.put('/:reportId/resolve', auth, resolveReport)
router.put('/:reportId/reject', auth, rejectReport)

export default router