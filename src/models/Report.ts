import { Schema, model, Document, Types } from 'mongoose'

export interface IReport extends Document {
  reportedBy: Types.ObjectId
  reportedPost?: Types.ObjectId
  reportedUser?: Types.ObjectId
  reportedChat?: Types.ObjectId
  reportType: 'spam' | 'inappropriate' | 'fake' | 'harassment' | 'scam' | 'other'
  category: 'post' | 'user' | 'chat'
  title: string
  description: string
  evidence?: {
    screenshots: string[]
    attachments: {
      url: string
      fileName: string
      fileSize: number
      mimeType: string
    }[]
  }
  status: 'pending' | 'reviewing' | 'resolved' | 'rejected'
  priority: 'low' | 'medium' | 'high' | 'critical'
  adminNotes: {
    note: string
    admin: Types.ObjectId
    timestamp: Date
  }[]
  resolution?: {
    action: 'no_action' | 'warning' | 'content_removal' | 'account_suspension' | 'account_ban'
    reason: string
    resolvedBy: Types.ObjectId
    resolvedAt: Date
  }
  createdAt: Date
  updatedAt: Date
}

const ReportSchema = new Schema<IReport>({
  reportedBy: { 
    type: Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  reportedPost: { 
    type: Schema.Types.ObjectId, 
    ref: 'Post',
    required: function() { return this.category === 'post' }
  },
  reportedUser: { 
    type: Schema.Types.ObjectId, 
    ref: 'User',
    required: function() { return this.category === 'user' }
  },
  reportedChat: { 
    type: Schema.Types.ObjectId, 
    ref: 'Chat',
    required: function() { return this.category === 'chat' }
  },
  reportType: {
    type: String,
    enum: ['spam', 'inappropriate', 'fake', 'harassment', 'scam', 'other'],
    required: true
  },
  category: {
    type: String,
    enum: ['post', 'user', 'chat'],
    required: true
  },
  title: {
    type: String,
    required: true,
    maxLength: 200,
    trim: true
  },
  description: {
    type: String,
    required: true,
    maxLength: 1000,
    trim: true
  },
  evidence: {
    screenshots: [String],
    attachments: [{
      url: { type: String, required: true },
      fileName: { type: String, required: true },
      fileSize: { type: Number, required: true },
      mimeType: { type: String, required: true }
    }]
  },
  status: {
    type: String,
    enum: ['pending', 'reviewing', 'resolved', 'rejected'],
    default: 'pending'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium'
  },
  adminNotes: [{
    note: { type: String, required: true, maxLength: 500 },
    admin: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    timestamp: { type: Date, default: Date.now }
  }],
  resolution: {
    action: {
      type: String,
      enum: ['no_action', 'warning', 'content_removal', 'account_suspension', 'account_ban']
    },
    reason: String,
    resolvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    resolvedAt: Date
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
})

// Indexes for performance
ReportSchema.index({ reportedBy: 1 })
ReportSchema.index({ reportedPost: 1 })
ReportSchema.index({ reportedUser: 1 })
ReportSchema.index({ reportedChat: 1 })
ReportSchema.index({ status: 1 })
ReportSchema.index({ priority: 1 })
ReportSchema.index({ category: 1 })
ReportSchema.index({ reportType: 1 })
ReportSchema.index({ createdAt: -1 })
ReportSchema.index({ status: 1, priority: -1 })

// Virtual for days since creation
ReportSchema.virtual('daysSinceCreated').get(function() {
  const now = new Date()
  const diffTime = Math.abs(now.getTime() - this.createdAt.getTime())
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
})

// Method to add admin note
ReportSchema.methods.addAdminNote = function(note: string, adminId: Types.ObjectId) {
  this.adminNotes.push({
    note,
    admin: adminId,
    timestamp: new Date()
  })
  
  if (this.status === 'pending') {
    this.status = 'reviewing'
  }
  
  return this.save()
}

// Method to resolve report
ReportSchema.methods.resolve = function(
  action: string, 
  reason: string, 
  resolvedBy: Types.ObjectId
) {
  this.status = 'resolved'
  this.resolution = {
    action,
    reason,
    resolvedBy,
    resolvedAt: new Date()
  }
  
  return this.save()
}

// Method to reject report
ReportSchema.methods.reject = function(reason: string, resolvedBy: Types.ObjectId) {
  this.status = 'rejected'
  this.resolution = {
    action: 'no_action',
    reason,
    resolvedBy,
    resolvedAt: new Date()
  }
  
  return this.save()
}

// Static method to get reports statistics
ReportSchema.statics.getReportsStats = async function() {
  const pipeline = [
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 }
      }
    }
  ]
  
  const statusStats = await this.aggregate(pipeline)
  
  const typeStats = await this.aggregate([
    {
      $group: {
        _id: '$reportType',
        count: { $sum: 1 }
      }
    }
  ])
  
  const priorityStats = await this.aggregate([
    {
      $group: {
        _id: '$priority',
        count: { $sum: 1 }
      }
    }
  ])
  
  return {
    status: statusStats,
    type: typeStats,
    priority: priorityStats
  }
}

export const Report = model<IReport>('Report', ReportSchema)