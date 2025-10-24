import { Request, Response } from 'express'
import { Types } from 'mongoose'
import { Chat, IChat } from '@/models/Chat'
import { Post } from '@/models/Post'
import { User } from '@/models/User'
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
 *     Message:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *         sender:
 *           type: string
 *         content:
 *           type: string
 *         timestamp:
 *           type: string
 *           format: date-time
 *         isRead:
 *           type: boolean
 *         messageType:
 *           type: string
 *           enum: [text, image, file]
 *         attachments:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               url:
 *                 type: string
 *               fileName:
 *                 type: string
 *               fileSize:
 *                 type: number
 *               mimeType:
 *                 type: string
 *     
 *     Chat:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *         participants:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               user:
 *                 type: string
 *               role:
 *                 type: string
 *                 enum: [user, admin, poster]
 *               lastSeen:
 *                 type: string
 *                 format: date-time
 *         post:
 *           type: string
 *         messages:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/Message'
 *         status:
 *           type: string
 *           enum: [active, closed, archived]
 *         lastMessageAt:
 *           type: string
 *           format: date-time
 *         unreadCount:
 *           type: object
 *         latestMessage:
 *           $ref: '#/components/schemas/Message'
 */

/**
 * @swagger
 * /api/chats:
 *   post:
 *     summary: Create or get existing chat for a post
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               postId:
 *                 type: string
 *                 description: ID of the post to chat about
 *             required:
 *               - postId
 *     responses:
 *       201:
 *         description: Chat created or retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Chat'
 */
export const createOrGetChat = async (req: AuthRequest, res: Response) => {
  try {
    const { postId } = req.body
    const userId = req.user?.userId

    if (!userId) {
      return ResponseHelper.unauthorized(res, 'User not authenticated')
    }

    if (!postId || !Types.ObjectId.isValid(postId)) {
      return ResponseHelper.badRequest(res, 'Valid post ID is required')
    }

    // Check if post exists
    const post = await Post.findById(postId)
    if (!post) {
      return ResponseHelper.notFound(res, 'Post not found')
    }

    const posterId = post.authorId.toString()

    // Check if chat already exists between user and post owner
    let chat = await Chat.findOne({
      post: postId,
      'participants.user': { $all: [userId, posterId] }
    }).populate('participants.user', 'username email avatar')

    if (!chat) {
      // Create new chat
      chat = new Chat({
        participants: [
          { user: userId, role: 'user', lastSeen: new Date() },
          { user: posterId, role: 'poster', lastSeen: new Date() }
        ],
        post: postId,
        messages: [],
        status: 'active',
        lastMessageAt: new Date(),
        unreadCount: new Map()
      })

      await chat.save()
      await chat.populate('participants.user', 'username email avatar')
    }

    ResponseHelper.success(res, chat, 'Chat retrieved successfully')
  } catch (error) {
    console.error('Create/Get Chat Error:', error)
    ResponseHelper.error(res, 'Failed to create or get chat')
  }
}

/**
 * @swagger
 * /api/chats:
 *   get:
 *     summary: Get user's chat list
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, closed, archived]
 *         description: Filter chats by status
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
 *         description: Chat list retrieved successfully
 */
export const getUserChats = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId
    const { status = 'active', page = 1, limit = 20 } = req.query

    if (!userId) {
      return ResponseHelper.unauthorized(res, 'User not authenticated')
    }

    const skip = (Number(page) - 1) * Number(limit)

    const filter: any = {
      'participants.user': userId
    }

    if (status && status !== 'all') {
      filter.status = status
    }

    const chats = await Chat.find(filter)
      .populate('participants.user', 'username email avatar')
      .populate('post', 'title price location images')
      .sort({ lastMessageAt: -1 })
      .skip(skip)
      .limit(Number(limit))

    const total = await Chat.countDocuments(filter)

    const chatsWithUnreadCount = chats.map(chat => {
      const chatObj = chat.toObject()
      return {
        ...chatObj,
        unreadCount: chat.unreadCount ? ((chat.unreadCount as any).get(userId) || 0) : 0
      }
    })

    ResponseHelper.success(res, {
      chats: chatsWithUnreadCount,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit))
      }
    }, 'Chats retrieved successfully')
  } catch (error) {
    console.error('Get User Chats Error:', error)
    ResponseHelper.error(res, 'Failed to retrieve chats')
  }
}

/**
 * @swagger
 * /api/chats/{chatId}:
 *   get:
 *     summary: Get chat details with messages
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: chatId
 *         required: true
 *         schema:
 *           type: string
 *         description: Chat ID
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number for messages
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *         description: Messages per page
 *     responses:
 *       200:
 *         description: Chat details retrieved successfully
 */
export const getChatById = async (req: AuthRequest, res: Response) => {
  try {
    const { chatId } = req.params
    const userId = req.user?.userId
    const { page = 1, limit = 50 } = req.query

    if (!userId) {
      return ResponseHelper.unauthorized(res, 'User not authenticated')
    }

    if (!Types.ObjectId.isValid(chatId)) {
      return ResponseHelper.badRequest(res, 'Invalid chat ID')
    }

    const chat = await Chat.findById(chatId)
      .populate('participants.user', 'username email avatar')
      .populate('post', 'title price location images author')

    if (!chat) {
      return ResponseHelper.notFound(res, 'Chat not found')
    }

    // Check if user is participant in this chat
    const isParticipant = chat.participants.some(
      (p: any) => p.user._id.toString() === userId
    )

    if (!isParticipant) {
      return ResponseHelper.forbidden(res, 'You are not authorized to view this chat')
    }

    // Paginate messages (newest first)
    const startIndex = Math.max(0, chat.messages.length - (Number(page) * Number(limit)))
    const endIndex = chat.messages.length - ((Number(page) - 1) * Number(limit))
    
    const paginatedMessages = chat.messages.slice(startIndex, endIndex).reverse()

    // Mark messages as read for current user
    chat.messages.forEach((message: any) => {
      if (message.sender.toString() !== userId) {
        message.isRead = true
      }
    })
    
    if (chat.unreadCount) {
      (chat.unreadCount as any).set(userId, 0)
    }
    
    // Update participant's last seen
    const participant = chat.participants.find((p: any) => 
      p.user._id?.toString() === userId || p.user.toString() === userId
    )
    if (participant) {
      participant.lastSeen = new Date()
    }
    
    await chat.save()

    const chatData = {
      ...chat.toObject(),
      messages: paginatedMessages,
      totalMessages: chat.messages.length,
      hasMoreMessages: startIndex > 0
    }

    ResponseHelper.success(res, chatData, 'Chat details retrieved successfully')
  } catch (error) {
    console.error('Get Chat By ID Error:', error)
    ResponseHelper.error(res, 'Failed to retrieve chat details')
  }
}

/**
 * @swagger
 * /api/chats/{chatId}/messages:
 *   post:
 *     summary: Send a message in a chat
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: chatId
 *         required: true
 *         schema:
 *           type: string
 *         description: Chat ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               content:
 *                 type: string
 *                 maxLength: 1000
 *               messageType:
 *                 type: string
 *                 enum: [text, image, file]
 *                 default: text
 *               attachments:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     url:
 *                       type: string
 *                     fileName:
 *                       type: string
 *                     fileSize:
 *                       type: number
 *                     mimeType:
 *                       type: string
 *             required:
 *               - content
 *     responses:
 *       201:
 *         description: Message sent successfully
 */
export const sendMessage = async (req: AuthRequest, res: Response) => {
  try {
    const { chatId } = req.params
    const { content, messageType = 'text', attachments } = req.body
    const userId = req.user?.userId

    if (!userId) {
      return ResponseHelper.unauthorized(res, 'User not authenticated')
    }

    if (!Types.ObjectId.isValid(chatId)) {
      return ResponseHelper.badRequest(res, 'Invalid chat ID')
    }

    if (!content || content.trim().length === 0) {
      return ResponseHelper.badRequest(res, 'Message content is required')
    }

    if (content.length > 1000) {
      return ResponseHelper.badRequest(res, 'Message content is too long (max 1000 characters)')
    }

    const chat = await Chat.findById(chatId)
    if (!chat) {
      return ResponseHelper.notFound(res, 'Chat not found')
    }

    // Check if user is participant in this chat
    const isParticipant = chat.participants.some(
      (p: any) => p.user.toString() === userId
    )

    if (!isParticipant) {
      return ResponseHelper.forbidden(res, 'You are not authorized to send messages in this chat')
    }

    // Check if chat is active
    if (chat.status !== 'active') {
      return ResponseHelper.badRequest(res, 'Cannot send messages to inactive chat')
    }

    const message = {
      sender: new Types.ObjectId(userId),
      content: content.trim(),
      messageType,
      attachments: attachments || [],
      timestamp: new Date(),
      isRead: false
    }
    
    chat.messages.push(message)
    chat.lastMessageAt = new Date()
    
    // Update unread count for other participants
    chat.participants.forEach((participant: any) => {
      if (participant.user.toString() !== userId) {
        const participantId = participant.user.toString()
        if (chat.unreadCount) {
          const currentCount = (chat.unreadCount as any).get(participantId) || 0
          ;(chat.unreadCount as any).set(participantId, currentCount + 1)
        }
      }
    })
    
    await chat.save()

    // Get the latest message to return
    const latestMessage = chat.messages[chat.messages.length - 1]

    ResponseHelper.success(res, latestMessage, 'Message sent successfully')
  } catch (error) {
    console.error('Send Message Error:', error)
    ResponseHelper.error(res, 'Failed to send message')
  }
}

/**
 * @swagger
 * /api/chats/{chatId}/close:
 *   put:
 *     summary: Close a chat (poster only)
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: chatId
 *         required: true
 *         schema:
 *           type: string
 *         description: Chat ID
 *     responses:
 *       200:
 *         description: Chat closed successfully
 */
export const closeChat = async (req: AuthRequest, res: Response) => {
  try {
    const { chatId } = req.params
    const userId = req.user?.userId

    if (!userId) {
      return ResponseHelper.unauthorized(res, 'User not authenticated')
    }

    if (!Types.ObjectId.isValid(chatId)) {
      return ResponseHelper.badRequest(res, 'Invalid chat ID')
    }

    const chat = await Chat.findById(chatId).populate('post', 'author')
    if (!chat) {
      return ResponseHelper.notFound(res, 'Chat not found')
    }

    // Check if user is the post owner or admin
    const postOwnerId = (chat.post as any).author.toString()
    const isPostOwner = postOwnerId === userId
    const isAdmin = req.user?.role === 'admin'

    if (!isPostOwner && !isAdmin) {
      return ResponseHelper.forbidden(res, 'Only post owner or admin can close chats')
    }

    chat.status = 'closed'
    await chat.save()

    ResponseHelper.success(res, chat, 'Chat closed successfully')
  } catch (error) {
    console.error('Close Chat Error:', error)
    ResponseHelper.error(res, 'Failed to close chat')
  }
}

/**
 * @swagger
 * /api/chats/{chatId}/archive:
 *   put:
 *     summary: Archive a chat
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: chatId
 *         required: true
 *         schema:
 *           type: string
 *         description: Chat ID
 *     responses:
 *       200:
 *         description: Chat archived successfully
 */
export const archiveChat = async (req: AuthRequest, res: Response) => {
  try {
    const { chatId } = req.params
    const userId = req.user?.userId

    if (!userId) {
      return ResponseHelper.unauthorized(res, 'User not authenticated')
    }

    if (!Types.ObjectId.isValid(chatId)) {
      return ResponseHelper.badRequest(res, 'Invalid chat ID')
    }

    const chat = await Chat.findById(chatId)
    if (!chat) {
      return ResponseHelper.notFound(res, 'Chat not found')
    }

    // Check if user is participant
    const isParticipant = chat.participants.some(
      (p: any) => p.user.toString() === userId
    )

    if (!isParticipant) {
      return ResponseHelper.forbidden(res, 'You can only archive your own chats')
    }

    chat.status = 'archived'
    await chat.save()

    ResponseHelper.success(res, chat, 'Chat archived successfully')
  } catch (error) {
    console.error('Archive Chat Error:', error)
    ResponseHelper.error(res, 'Failed to archive chat')
  }
}