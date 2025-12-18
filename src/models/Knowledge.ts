import mongoose, { Schema, Document } from "mongoose";

export interface IKnowledge extends Document {
  content: string;
  source: string;
  embedding: number[];
  createdAt: Date;
}

const KnowledgeSchema: Schema = new Schema({
  content: { type: String, required: true },
  source: { type: String, required: true }, // e.g., "rawlandlao.pdf"
  embedding: {
    type: [Number],
    required: true,
    index: false, // Vector search index is managed in Atlas
  },
  createdAt: { type: Date, default: Date.now },
});

export const Knowledge = mongoose.model<IKnowledge>(
  "Knowledge",
  KnowledgeSchema
);
