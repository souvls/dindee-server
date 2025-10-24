import mongoose, { Schema, Document } from 'mongoose'

export interface IViewHistory extends Document {
  postId: mongoose.Types.ObjectId;
  userId?: mongoose.Types.ObjectId; // Optional สำหรับ guest users
  ipAddress: string;
  userAgent?: string;
  viewedAt: Date;
  sessionId?: string; // สำหรับ track guest sessions
}

const viewHistorySchema = new Schema<IViewHistory>({
  postId: {
    type: Schema.Types.ObjectId,
    ref: 'Post',
    required: true,
  },
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    sparse: true, // Allow null values
  },
  ipAddress: {
    type: String,
    required: true,
  },
  userAgent: {
    type: String,
  },
  viewedAt: {
    type: Date,
    default: Date.now,
  },
  sessionId: {
    type: String,
  },
}, {
  timestamps: false, // ใช้ viewedAt แทน
})

// Indexes for efficient queries and prevent duplicate views
viewHistorySchema.index({ postId: 1, viewedAt: -1 })
viewHistorySchema.index({ userId: 1, viewedAt: -1 })
viewHistorySchema.index({ postId: 1, userId: 1 })
viewHistorySchema.index({ postId: 1, ipAddress: 1 })
viewHistorySchema.index({ postId: 1, sessionId: 1 })

// TTL index - auto delete records after 1 year
viewHistorySchema.index({ viewedAt: 1 }, { expireAfterSeconds: 365 * 24 * 60 * 60 })

export const ViewHistory = mongoose.model<IViewHistory>('ViewHistory', viewHistorySchema)