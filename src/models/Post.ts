import mongoose, { Schema, Document } from 'mongoose'

// Interfaces สำหรับข้อมูลเฉพาะของแต่ละประเภท
export interface HouseDetails {
  floors?: number;
  bedrooms?: number;
  bathrooms?: number;
  livingRooms?: number;
  kitchens?: number;
  parkingSpaces?: number;
  gardenArea?: number;
  balconies?: number;
}

export interface LandDetails {
  dimensions?: {
    length: number;
    width: number;
  };
  landType?: 'A' | 'B' | 'C' | 'D'; // ประเภทที่ดิน
  landUse?: string; // การใช้ประโยชน์ที่ดิน
  soilType?: string;
  waterSource?: boolean;
  roadAccess?: boolean;
  utilities?: string[]; // สาธารณูปโภค
}

export interface CondoDetails {
  floor?: number;
  totalFloors?: number;
  bedrooms?: number;
  bathrooms?: number;
  balconies?: number;
  parkingSpaces?: number;
  facilities?: string[]; // สิ่งอำนวยความสะดวก
}

export interface LocationDetails {
  address: {
    street: string;
    district: string;
    province: string;
    postalCode?: string;
    country?: string;

  };
  coordinates: {
    type: 'Point';
    coordinates: [number, number]; // Center point [lng, lat] for geospatial queries
  };
  boundary?: [number, number][]; // Polygon boundary for land plots [[lng, lat], ...]
  nearbyPlaces?: {
    schools?: string[];
    hospitals?: string[];
    shopping?: string[];
    transport?: string[];
  };
}

export interface MediaFiles {
  images: string[];
  videos?: string[];
  documents?: string[]; // เอกสารประกอบ
  floorPlan?: string; // แปลนบ้าน/ห้อง
}

export interface LegalDocuments {
  titleDeed?: string; // โฉนดที่ดิน
  landCertificate?: string; // หนังสือรับรองการทำประโยชน์
  constructionPermit?: string; // ใบอนุญาตก่อสร้าง
  occupancyCertificate?: string; // ใบรับรองการใช้อาคาร
  other?: string[];
}

export interface IPost extends Document {
  title: string
  description: string
  price: number
  pricePerUnit?: number; // ราคาต่อตารางเมตร หรือต่อหน่วย
  propertyType: 'house' | 'land' | 'condo' | 'apartment' | 'villa' | 'townhouse'
  listingType: 'sell' | 'rent' | 'lease'; // ขาย เช่า เซ้ง
  
  // ข้อมูลพื้นที่
  area: number; // พื้นที่ทั้งหมด
  usableArea?: number; // พื้นที่ใช้สอย
  
  // ข้อมูลตำแหน่ง
  location: LocationDetails;
  
  // ข้อมูลเฉพาะตามประเภท
  houseDetails?: HouseDetails;
  landDetails?: LandDetails;
  condoDetails?: CondoDetails;
  
  // ไฟล์สื่อ
  media: MediaFiles;
  
  // เอกสารกฎหมาย
  legalDocuments?: LegalDocuments;
  
  // ข้อมูลการดูแล
  condition: 'new' | 'excellent' | 'good' | 'fair' | 'poor';
  yearBuilt?: number;
  lastRenovated?: number;
  
  // ข้อมูลธุรกิจ
  status: 'pending' | 'approved' | 'rejected' | 'sold' | 'rented';
  featured: boolean; // แนะนำพิเศษ
  urgent: boolean; // ขายด่วน
  authorId: mongoose.Types.ObjectId;
  
  // SEO และการค้นหา
  tags?: string[];
  keywords?: string[];
  
  // Analytics fields
  viewCount: number; // จำนวนการดูทั้งหมด
  uniqueViewCount: number; // จำนวนการดูที่ไม่ซ้ำ (unique users/IPs)
  bookmarkCount: number; // จำนวน bookmark
  
  createdAt: Date
  updatedAt: Date
}

const postSchema = new Schema<IPost>({
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200,
  },
  description: {
    type: String,
    required: true,
    trim: true,
    maxlength: 3000,
  },
  price: {
    type: Number,
    required: true,
    min: 0,
  },
  pricePerUnit: {
    type: Number,
    min: 0,
  },
  propertyType: {
    type: String,
    required: true,
    enum: ['house', 'land', 'condo', 'apartment', 'villa', 'townhouse'],
  },
  listingType: {
    type: String,
    required: true,
    enum: ['sell', 'rent', 'lease'],
    default: 'sell',
  },
  
  // ข้อมูลพื้นที่
  area: {
    type: Number,
    required: true,
    min: 0,
  },
  usableArea: {
    type: Number,
    min: 0,
  },
  
  // ข้อมูลตำแหน่ง
  location: {
    address: {
      street: { type: String, required: true, trim: true },
      district: { type: String, required: true, trim: true },
      province: { type: String, required: true, trim: true },
      postalCode: { type: String, trim: true },
      country: { type: String, default: 'Laos', trim: true },
    },
    coordinates: {
      type: {
        type: String,
        enum: ['Point'],
        required: true
      },
      coordinates: {
        type: [Number],
        required: true,
        validate: {
          validator: function(val: number[]) {
            return val.length === 2;
          },
          message: 'Coordinates must be an array of [longitude, latitude]'
        }
      }
    },
    boundary: {
      type: [[Number]],
      validate: {
        validator: function(val: number[][]) {
          if (!val) return true; // Optional field
          // At least 4 points, each with [lng, lat]
          return val.length >= 4 &&
                 val.every((coord: number[]) => coord.length === 2);
        },
        message: 'Boundary must be an array of at least 4 coordinate pairs [[lng, lat], ...]'
      }
    },
    nearbyPlaces: {
      schools: [{ type: String }],
      hospitals: [{ type: String }],
      shopping: [{ type: String }],
      transport: [{ type: String }],
    },
  },
  
  // ข้อมูลเฉพาะบ้าน
  houseDetails: {
    floors: { type: Number, min: 1 },
    bedrooms: { type: Number, min: 0 },
    bathrooms: { type: Number, min: 0 },
    livingRooms: { type: Number, min: 0 },
    kitchens: { type: Number, min: 0 },
    parkingSpaces: { type: Number, min: 0 },
    gardenArea: { type: Number, min: 0 },
    balconies: { type: Number, min: 0 },
  },
  
  // ข้อมูลเฉพาะที่ดิน
  landDetails: {
    dimensions: {
      length: { type: Number, min: 0 },
      width: { type: Number, min: 0 },
    },
    landType: {
      type: String,
      enum: ['A', 'B', 'C', 'D'],
    },
    landUse: { type: String, trim: true },
    soilType: { type: String, trim: true },
    waterSource: { type: Boolean, default: false },
    roadAccess: { type: Boolean, default: true },
    utilities: [{ type: String }],
  },
  
  // ข้อมูลเฉพาะคอนโด
  condoDetails: {
    floor: { type: Number, min: 1 },
    totalFloors: { type: Number, min: 1 },
    bedrooms: { type: Number, min: 0 },
    bathrooms: { type: Number, min: 0 },
    balconies: { type: Number, min: 0 },
    parkingSpaces: { type: Number, min: 0 },
    facilities: [{ type: String }],
  },
  
  // ไฟล์สื่อ
  media: {
    images: {
      type: [{ type: String }],
      required: true,
      validate: {
        validator: function(v: string[]) {
          return v && v.length > 0;
        },
        message: 'ต้องมีรูปภาพอย่างน้อย 1 รูป'
      }
    },
    videos: [{ type: String }],
    documents: [{ type: String }],
    floorPlan: { type: String },
  },
  
  // เอกสารกฎหมาย
  legalDocuments: {
    titleDeed: { type: String },
    landCertificate: { type: String },
    constructionPermit: { type: String },
    occupancyCertificate: { type: String },
    other: [{ type: String }],
  },
  
  // ข้อมูลการดูแล
  condition: {
    type: String,
    enum: ['new', 'excellent', 'good', 'fair', 'poor'],
    default: 'good',
  },
  yearBuilt: {
    type: Number,
    min: 1900,
    max: new Date().getFullYear() + 5,
  },
  lastRenovated: {
    type: Number,
    min: 1900,
    max: new Date().getFullYear(),
  },
  
  // ข้อมูลธุรกิจ
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'sold', 'rented'],
    default: 'pending',
  },
  featured: {
    type: Boolean,
    default: false,
  },
  urgent: {
    type: Boolean,
    default: false,
  },
  authorId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  
  // SEO และการค้นหา
  tags: [{ type: String, trim: true }],
  keywords: [{ type: String, trim: true }],
  
  // Analytics fields
  viewCount: {
    type: Number,
    default: 0,
    min: 0,
  },
  uniqueViewCount: {
    type: Number,
    default: 0,
    min: 0,
  },
  bookmarkCount: {
    type: Number,
    default: 0,
    min: 0,
  },
}, {
  timestamps: true,
})

// Indexes for efficient queries
postSchema.index({ status: 1, createdAt: -1 })
postSchema.index({ authorId: 1, createdAt: -1 })
postSchema.index({ propertyType: 1, listingType: 1 })
postSchema.index({ 'location.coordinates': '2dsphere' }) // สำหรับ GeoJSON geospatial queries
postSchema.index({ price: 1, area: 1 })
postSchema.index({ featured: -1, createdAt: -1 })
postSchema.index({ tags: 1 })
postSchema.index({ 'location.address.province': 1, 'location.address.district': 1 })

// Analytics indexes
postSchema.index({ viewCount: -1, createdAt: -1 })
postSchema.index({ uniqueViewCount: -1, createdAt: -1 })
postSchema.index({ bookmarkCount: -1, createdAt: -1 })
postSchema.index({ propertyType: 1, viewCount: -1 })
postSchema.index({ 'location.address.province': 1, viewCount: -1 })

export const Post = mongoose.model<IPost>('Post', postSchema)