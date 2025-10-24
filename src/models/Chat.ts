import { Schema, model, Document, Types } from 'mongoose'

export interface IMessage {
  _id?: Types.ObjectId
  sender: Types.ObjectId
  content: string
  timestamp: Date
  isRead: boolean
  messageType: 'text' | 'image' | 'file'
  attachments?: {
    url: string
    fileName: string
    fileSize: number
    mimeType: string
  }[]
}

export interface IChat extends Document {
  participants: {
    user: Types.ObjectId
    role: 'user' | 'admin' | 'poster'
    lastSeen: Date
  }[]
  post: Types.ObjectId
  messages: IMessage[]
  status: 'active' | 'closed' | 'archived'
  createdAt: Date
  updatedAt: Date
  lastMessageAt: Date
  unreadCount: {
    [userId: string]: number
  }
}

const MessageSchema = new Schema<IMessage>({
  sender: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  content: { type: String, required: true, maxLength: 1000 },
  timestamp: { type: Date, default: Date.now },
  isRead: { type: Boolean, default: false },
  messageType: { 
    type: String, 
    enum: ['text', 'image', 'file'], 
    default: 'text' 
  },
  attachments: [{
    url: String,
    fileName: String,
    fileSize: Number,
    mimeType: String
  }]
}, { _id: true })

const ChatSchema = new Schema<IChat>({
  participants: [{
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    role: { 
      type: String, 
      enum: ['user', 'admin', 'poster'], 
      required: true 
    },
    lastSeen: { type: Date, default: Date.now }
  }],
  post: { type: Schema.Types.ObjectId, ref: 'Post', required: true },
  messages: [MessageSchema],
  status: { 
    type: String, 
    enum: ['active', 'closed', 'archived'], 
    default: 'active' 
  },
  lastMessageAt: { type: Date, default: Date.now },
  unreadCount: {
    type: Map,
    of: Number,
    default: () => new Map()
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
})

// Indexes for performance
ChatSchema.index({ 'participants.user': 1 })
ChatSchema.index({ post: 1 })
ChatSchema.index({ status: 1 })
ChatSchema.index({ lastMessageAt: -1 })
ChatSchema.index({ 'participants.user': 1, status: 1 })

// Virtual for latest message
ChatSchema.virtual('latestMessage').get(function() {
  return this.messages && this.messages.length > 0 
    ? this.messages[this.messages.length - 1] 
    : null
})

// Method to add message
ChatSchema.methods.addMessage = function(messageData: Partial<IMessage>) {
  const message = {
    ...messageData,
    timestamp: new Date(),
    isRead: false
  }
  
  this.messages.push(message)
  this.lastMessageAt = new Date()
  
  // Update unread count for other participants
  this.participants.forEach((participant: any) => {
    if (participant.user.toString() !== messageData.sender?.toString()) {
      const userId = participant.user.toString()
      const currentCount = this.unreadCount.get(userId) || 0
      this.unreadCount.set(userId, currentCount + 1)
    }
  })
  
  return this.save()
}

// Method to mark messages as read
ChatSchema.methods.markAsRead = function(userId: string) {
  this.messages.forEach((message: IMessage) => {
    if (message.sender.toString() !== userId) {
      message.isRead = true
    }
  })
  
  this.unreadCount.set(userId, 0)
  
  // Update participant's last seen
  const participant = this.participants.find((p: any) => 
    p.user.toString() === userId
  )
  if (participant) {
    participant.lastSeen = new Date()
  }
  
  return this.save()
}

export const Chat = model<IChat>('Chat', ChatSchema)