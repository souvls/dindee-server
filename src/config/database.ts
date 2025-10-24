import mongoose from 'mongoose'
import { config } from '@/config'

export const connectDatabase = async (): Promise<void> => {
  try {
    await mongoose.connect(config.mongodb.uri)
    console.log('✅ MongoDB connected successfully')
  } catch (error) {
    console.error('❌ MongoDB connection error:', error)
    process.exit(1)
  }
}

export const disconnectDatabase = async (): Promise<void> => {
  try {
    await mongoose.disconnect()
    console.log('✅ MongoDB disconnected successfully')
  } catch (error) {
    console.error('❌ MongoDB disconnection error:', error)
  }
}