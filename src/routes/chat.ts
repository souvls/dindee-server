import { Router } from 'express'
import {
  createOrGetChat,
  getUserChats,
  getChatById,
  sendMessage,
  closeChat,
  archiveChat
} from '@/controllers/chat'
import { auth } from '@/middlewares/auth'

const router: Router = Router()

/**
 * @swagger
 * tags:
 *   name: Chat
 *   description: Chat management endpoints
 */

// Create or get existing chat for a post
router.post('/', auth, createOrGetChat)

// Get user's chat list
router.get('/', auth, getUserChats)

// Get chat details with messages
router.get('/:chatId', auth, getChatById)

// Send a message in a chat
router.post('/:chatId/messages', auth, sendMessage)

// Close a chat (poster/admin only)
router.put('/:chatId/close', auth, closeChat)

// Archive a chat
router.put('/:chatId/archive', auth, archiveChat)

export default router