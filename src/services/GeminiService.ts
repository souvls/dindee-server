import { GoogleGenAI } from "@google/genai";
import { config } from "@/config";

// Initialize Gemini AI
const ai = new GoogleGenAI({ apiKey: config.gemini.apiKey });

export interface ChatMessage {
  role: "user" | "model";
  parts: { text: string }[];
}

const SYSTEM_INSTRUCTION: ChatMessage[] = [
  {
    role: "user",
    parts: [
      {
        text: "You are Dindee AI, a helpful real estate assistant. Answer questions about properties, buying, selling, and renting in a professional and friendly manner. Keep responses concise.",
      },
    ],
  },
  {
    role: "model",
    parts: [
      {
        text: "Hello! I am Dindee AI, your personal real estate assistant. How can I help you find your dream property today?",
      },
    ],
  },
];

import { embeddingService } from "./EmbeddingService";

export class GeminiService {
  private model: string = "gemini-2.0-flash";

  constructor() {
    //
  }

  public async generateResponse(
    message: string,
    history: ChatMessage[] = []
  ): Promise<string> {
    try {
      // 1. Retrieve relevant context
      let context = "";
      try {
        const relevantChunks = await embeddingService.search(message);
        if (relevantChunks.length > 0) {
          context =
            "Context from Knowledge Base:\n" +
            relevantChunks.join("\n\n") +
            "\n\n";
          console.log("RAG Context injected:", relevantChunks.length, "chunks");
        }
      } catch (err) {
        console.error("Vector search failed (ignoring):", err);
      }

      // 2. Construct Prompt with Context
      const systemInstruction = `You are Dindee AI, a helpful real estate assistant for Laos. 
      
      IDENTITY & ORIGINS:
      You represent dindee.com, created by the SKV GROUP.
      The SKV GROUP was founded by three best friends who shared a dream of building a company together:
      - S: Soulixai (Team Lead), an expert in coding and software engineering.
      - K: Kunnanda, a marketing expert.
      - V: Vongvilai, also a marketing expert.

      You have access to a Knowledge Base (Context) containing specific land laws and documents.
      
      INSTRUCTIONS:
      1. PRIORITY: Use the "Context" below to answer the user's question. Quote specific sections if possible.
      2. If the answer is found in the Context, answer confidenty based ONLY on that information.
      3. If the answer is NOT in the Context, answer generally based on your internal knowledge, BUT explicitly state: "I don't have specific documents about this in my knowledge base, but generally..."
      4. Be professional, friendly, and concise.

      Current Date: ${new Date().toISOString()}`;

      // Combine system instruction, custom context, and message
      const finalMessage = `${systemInstruction}\n\n${
        context ? `Context:\n${context}\n\n` : ""
      }Question: ${message}`;

      const response = await ai.models.generateContent({
        model: "gemini-1.5-flash-exp",
        contents: [
          ...history.map((msg: any) => ({
            role: msg.role === "user" ? "user" : "model",
            parts: [{ text: msg.content }],
          })),
          {
            role: "user",
            parts: [{ text: finalMessage }],
          },
        ] as any,
      });

      return response.text || "";
    } catch (error) {
      console.error("Error generating Gemini response:", error);
      return "I apologize, but I'm having trouble connecting to my AI brain right now. Please try again later.";
    }
  }

  // Static method for stateless usage if needed
  public static async chat(
    message: string,
    history: ChatMessage[] = []
  ): Promise<string> {
    const service = new GeminiService();
    return service.generateResponse(message, history);
  }
}

export const geminiService = new GeminiService();
