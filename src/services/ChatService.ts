import { Types } from 'mongoose'
import { Chat, IChat, IMessage } from '@/models/Chat'
import { Post } from '@/models/Post'
import { User } from '@/models/User'

export class ChatService {
  
  /**
   * Create or get existing chat between user and post owner
   */
  static async createOrGetChat(userId: string, postId: string): Promise<IChat | null> {
    try {
      // Check if post exists
      const post = await Post.findById(postId)
      if (!post) {
        throw new Error('Post not found')
      }

      const posterId = post.authorId.toString()

      // Don't allow user to chat with themselves
      if (userId === posterId) {
        throw new Error('Cannot create chat with yourself')
      }

      // Check if chat already exists
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

      return chat
    } catch (error) {
      console.error('ChatService.createOrGetChat error:', error)
      throw error
    }
  }

  /**
   * Get user's chat list with filters
   */
  static async getUserChats(
    userId: string, 
    filters: {
      status?: string
      page?: number
      limit?: number
    } = {}
  ): Promise<{
    chats: any[]
    pagination: {
      page: number
      limit: number
      total: number
      pages: number
    }
  }> {
    try {
      const { status = 'active', page = 1, limit = 20 } = filters
      const skip = (page - 1) * limit

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
        .limit(limit)

      const total = await Chat.countDocuments(filter)

      const chatsWithUnreadCount = chats.map(chat => {
        const chatObj = chat.toObject()
        return {
          ...chatObj,
          unreadCount: chat.unreadCount ? ((chat.unreadCount as any).get(userId) || 0) : 0,
          latestMessage: chat.messages.length > 0 ? chat.messages[chat.messages.length - 1] : null
        }
      })

      return {
        chats: chatsWithUnreadCount,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    } catch (error) {
      console.error('ChatService.getUserChats error:', error)
      throw error
    }
  }

  /**
   * Get chat by ID with message pagination
   */
  static async getChatById(
    chatId: string, 
    userId: string,
    pagination: { page?: number, limit?: number } = {}
  ): Promise<any> {
    try {
      const { page = 1, limit = 50 } = pagination

      const chat = await Chat.findById(chatId)
        .populate('participants.user', 'username email avatar')
        .populate('post', 'title price location images author')

      if (!chat) {
        throw new Error('Chat not found')
      }

      // Check if user is participant
      const isParticipant = chat.participants.some(
        (p: any) => p.user._id.toString() === userId
      )

      if (!isParticipant) {
        throw new Error('Not authorized to view this chat')
      }

      // Paginate messages (newest first)
      const startIndex = Math.max(0, chat.messages.length - (page * limit))
      const endIndex = chat.messages.length - ((page - 1) * limit)
      
      const paginatedMessages = chat.messages.slice(startIndex, endIndex).reverse()

      return {
        ...chat.toObject(),
        messages: paginatedMessages,
        totalMessages: chat.messages.length,
        hasMoreMessages: startIndex > 0
      }
    } catch (error) {
      console.error('ChatService.getChatById error:', error)
      throw error
    }
  }

  /**
   * Send a message in a chat
   */
  static async sendMessage(
    chatId: string,
    senderId: string,
    messageData: {
      content: string
      messageType?: 'text' | 'image' | 'file'
      attachments?: any[]
    }
  ): Promise<IMessage> {
    try {
      const { content, messageType = 'text', attachments = [] } = messageData

      if (!content || content.trim().length === 0) {
        throw new Error('Message content is required')
      }

      if (content.length > 1000) {
        throw new Error('Message content is too long (max 1000 characters)')
      }

      const chat = await Chat.findById(chatId)
      if (!chat) {
        throw new Error('Chat not found')
      }

      // Check if user is participant
      const isParticipant = chat.participants.some(
        (p: any) => p.user.toString() === senderId
      )

      if (!isParticipant) {
        throw new Error('Not authorized to send messages')
      }

      // Check if chat is active
      if (chat.status !== 'active') {
        throw new Error('Cannot send messages to inactive chat')
      }

      const message = {
        sender: new Types.ObjectId(senderId),
        content: content.trim(),
        messageType,
        attachments,
        timestamp: new Date(),
        isRead: false
      }
      
      chat.messages.push(message)
      chat.lastMessageAt = new Date()
      
      // Update unread count for other participants
      chat.participants.forEach((participant: any) => {
        if (participant.user.toString() !== senderId) {
          const participantId = participant.user.toString()
          if (chat.unreadCount) {
            const currentCount = (chat.unreadCount as any).get(participantId) || 0
            ;(chat.unreadCount as any).set(participantId, currentCount + 1)
          }
        }
      })
      
      await chat.save()

      // Return the latest message
      return chat.messages[chat.messages.length - 1]
    } catch (error) {
      console.error('ChatService.sendMessage error:', error)
      throw error
    }
  }

  /**
   * Mark messages as read
   */
  static async markMessagesAsRead(chatId: string, userId: string): Promise<IChat> {
    try {
      const chat = await Chat.findById(chatId)
      if (!chat) {
        throw new Error('Chat not found')
      }

      // Check if user is participant
      const isParticipant = chat.participants.some(
        (p: any) => p.user.toString() === userId
      )

      if (!isParticipant) {
        throw new Error('Not authorized to mark messages as read')
      }

      // Mark messages as read
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
        p.user.toString() === userId
      )
      if (participant) {
        participant.lastSeen = new Date()
      }

      await chat.save()
      return chat
    } catch (error) {
      console.error('ChatService.markMessagesAsRead error:', error)
      throw error
    }
  }

  /**
   * Close a chat (poster or admin only)
   */
  static async closeChat(chatId: string, userId: string, userRole: string): Promise<IChat> {
    try {
      const chat = await Chat.findById(chatId).populate('post', 'author')
      if (!chat) {
        throw new Error('Chat not found')
      }

      // Check if user can close chat
      const postOwnerId = (chat.post as any).author?.toString()
      const isPostOwner = postOwnerId === userId
      const isAdmin = userRole === 'admin'

      if (!isPostOwner && !isAdmin) {
        throw new Error('Only post owner or admin can close chats')
      }

      chat.status = 'closed'
      await chat.save()

      return chat
    } catch (error) {
      console.error('ChatService.closeChat error:', error)
      throw error
    }
  }

  /**
   * Archive a chat
   */
  static async archiveChat(chatId: string, userId: string): Promise<IChat> {
    try {
      const chat = await Chat.findById(chatId)
      if (!chat) {
        throw new Error('Chat not found')
      }

      // Check if user is participant
      const isParticipant = chat.participants.some(
        (p: any) => p.user.toString() === userId
      )

      if (!isParticipant) {
        throw new Error('You can only archive your own chats')
      }

      chat.status = 'archived'
      await chat.save()

      return chat
    } catch (error) {
      console.error('ChatService.archiveChat error:', error)
      throw error
    }
  }

  /**
   * Get chat statistics
   */
  static async getChatStats(userId?: string): Promise<any> {
    try {
      const pipeline: any[] = []

      if (userId) {
        pipeline.push({
          $match: {
            'participants.user': new Types.ObjectId(userId)
          }
        })
      }

      pipeline.push(
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 }
          }
        }
      )

      const statusStats = await Chat.aggregate(pipeline)

      // Get message stats
      const messageStats = await Chat.aggregate([
        ...(userId ? [{ $match: { 'participants.user': new Types.ObjectId(userId) } }] : []),
        {
          $project: {
            messageCount: { $size: '$messages' },
            lastMessageAt: 1
          }
        },
        {
          $group: {
            _id: null,
            totalMessages: { $sum: '$messageCount' },
            averageMessages: { $avg: '$messageCount' },
            totalChats: { $sum: 1 }
          }
        }
      ])

      return {
        status: statusStats,
        messages: messageStats[0] || { totalMessages: 0, averageMessages: 0, totalChats: 0 }
      }
    } catch (error) {
      console.error('ChatService.getChatStats error:', error)
      throw error
    }
  }
}