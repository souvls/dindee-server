import { Post, IPost } from '@/models/Post'
import { body } from 'express-validator'

export const postHelper = {
  formatPostResponse: (post: IPost) => {
    return {
      _id: post._id,
      title: post.title,
      description: post.description,
      price: post.price,
      pricePerUnit: post.pricePerUnit,
      propertyType: post.propertyType,
      listingType: post.listingType,
      area: post.area,
      usableArea: post.usableArea,
      location: post.location,
      houseDetails: post.houseDetails,
      landDetails: post.landDetails,
      condoDetails: post.condoDetails,
      media: post.media,
      legalDocuments: post.legalDocuments,
      condition: post.condition,
      yearBuilt: post.yearBuilt,
      lastRenovated: post.lastRenovated,
      status: post.status,
      featured: post.featured,
      urgent: post.urgent,
      authorId: post.authorId,
      tags: post.tags,
      keywords: post.keywords,
      viewCount: post.viewCount,
      uniqueViewCount: post.uniqueViewCount,
      bookmarkCount: post.bookmarkCount,
      createdAt: post.createdAt,
      updatedAt: post.updatedAt
    }
  },

  async getPostsByStatus(status: string, page: number = 1, limit: number = 10) {
    const skip = (page - 1) * limit
    
    const [posts, total] = await Promise.all([
      Post.find({ status })
        .populate('authorId', 'name email avatar')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Post.countDocuments({ status })
    ])

    return {
      posts,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    }
  },

  async updatePostStatus(id: string, status: string) {
    const post = await Post.findByIdAndUpdate(
      id,
      { status },
      { new: true }
    ).populate('authorId', 'name email avatar')

    if (!post) {
      throw new Error('Post not found')
    }

    return post
  }
}

export const postValidation = {
  create: [
    body('title').notEmpty().withMessage('Title is required'),
    body('description').notEmpty().withMessage('Description is required'),
    body('price').isNumeric().withMessage('Price must be a number'),
    body('propertyType').isIn(['house', 'land', 'condo', 'apartment', 'villa', 'townhouse']).withMessage('Invalid property type'),
    body('listingType').isIn(['sell', 'rent', 'lease']).withMessage('Invalid listing type'),
    body('area').isNumeric().withMessage('Area must be a number'),
    body('location.address.street').notEmpty().withMessage('Street is required'),
    body('location.address.district').notEmpty().withMessage('District is required'),
    body('location.address.province').notEmpty().withMessage('Province is required'),
    body('location.coordinates.latitude').isFloat({ min: -90, max: 90 }).withMessage('Invalid latitude'),
    body('location.coordinates.longitude').isFloat({ min: -180, max: 180 }).withMessage('Invalid longitude'),
    body('media.images').isArray({ min: 1 }).withMessage('At least one image is required'),
  ]
}