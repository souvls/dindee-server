import mongoose, { Schema, Document } from 'mongoose'

export interface IBookmark extends Document {
  userId: mongoose.Types.ObjectId;
  postId: mongoose.Types.ObjectId;
  createdAt: Date;
}

const bookmarkSchema = new Schema<IBookmark>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  postId: {
    type: Schema.Types.ObjectId,
    ref: 'Post',
    required: true,
  },
}, {
  timestamps: true,
})

// Compound index để ensure unique bookmark และ query performance
bookmarkSchema.index({ userId: 1, postId: 1 }, { unique: true })
bookmarkSchema.index({ postId: 1, createdAt: -1 })
bookmarkSchema.index({ userId: 1, createdAt: -1 })

export const Bookmark = mongoose.model<IBookmark>('Bookmark', bookmarkSchema)