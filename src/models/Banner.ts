import mongoose, { Schema, Document } from "mongoose";

export interface IBanner extends Document {
  name: string;
  description: string;
  image: string;
  linkToAdsPage?: string;
  dateStart: Date;
  dateEnd: Date;
  displayDuration: number; // seconds per rotation
  isActive: boolean;
  position: "top" | "sidebar" | "sidebar_bottom" | "bottom";
  priority: number; // Higher number = higher priority
  viewCount: number;
  clickCount: number;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const bannerSchema = new Schema<IBanner>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    description: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500,
    },
    image: {
      type: String,
      required: true,
    },
    linkToAdsPage: {
      type: String,
      trim: true,
    },
    dateStart: {
      type: Date,
      required: true,
    },
    dateEnd: {
      type: Date,
      required: true,
    },
    displayDuration: {
      type: Number,
      required: true,
      min: 1,
      max: 60,
      default: 5, // 5 seconds default
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    position: {
      type: String,
      enum: ["top", "sidebar", "sidebar_bottom", "bottom"],
      default: "sidebar",
    },
    priority: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    viewCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    clickCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
bannerSchema.index({ isActive: 1, priority: -1 });
bannerSchema.index({ dateStart: 1, dateEnd: 1 });
bannerSchema.index({ createdBy: 1 });

// Check if banner is currently valid
bannerSchema.methods.isValid = function (): boolean {
  const now = new Date();
  return this.isActive && this.dateStart <= now && this.dateEnd >= now;
};

export const Banner = mongoose.model<IBanner>("Banner", bannerSchema);
