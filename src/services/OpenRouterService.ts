import axios from "axios";
import { config } from "@/config";
import { embeddingService } from "./EmbeddingService";

export interface ChatMessage {
  role: "user" | "model" | "assistant" | "system";
  content?: string; // OpenRouter/OpenAI uses 'content'
  parts?: { text: string }[]; // Gemini uses 'parts'
}

export class OpenRouterService {
  private model: string = "google/gemini-3-pro-preview";
  private apiUrl: string = "https://openrouter.ai/api/v1/chat/completions";

  constructor() {}

  public async generateResponse(
    message: string,
    history: ChatMessage[] = []
  ): Promise<string> {
    try {
      console.log(
        "OpenRouter Key Length:",
        config.openRouter.apiKey?.length || 0
      ); // DEBUG

      // 1. Retrieve relevant context (RAG)
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

      // 2. Construct System Instruction with SKV Group Info
      const systemInstructionContent = `You are Dindee AI, a helpful real estate assistant for Laos.
      
      IDENTITY & ORIGINS:
      You represent dindee.com, created by the SKV GROUP.
      The SKV GROUP was founded by three best friends who shared a dream of building a company together:
      - S: Soulixai (Team Lead), an expert in coding and software engineering.
      - K: Kunnanda, a marketing expert.
      - V: Vongvilai, also a marketing expert.

      You have access to a Knowledge Base (Context) containing specific land laws and documents.
      
      INSTRUCTIONS:
      1. PRIORITY: Use the "Context" provided in the user message to answer the question. Quote specific sections if possible.
      2. If the answer is found in the Context, answer confidently based ONLY on that information.
      3. If the answer is NOT in the Context, answer generally based on your internal knowledge, BUT explicitly state: "I don't have specific documents about this in my knowledge base, but generally..."
      4. Be professional, friendly, and concise.

      Current Date: ${new Date().toISOString()}`;

      // 3. Prepare Messages for OpenRouter (OpenAI format)

      // Convert history to OpenAI format
      const normalizedHistory = history.map((msg) => {
        let role = msg.role;
        if (role === "model") role = "assistant"; // Map Gemini 'model' to OpenAI 'assistant'

        // Extract text content
        let content = msg.content || "";
        if (!content && msg.parts && msg.parts.length > 0) {
          content = msg.parts.map((p) => p.text).join("");
        }

        return { role, content };
      });

      // Construct the final user message with context
      const finalUserMessage = `${
        context ? `Context:\n${context}\n\n` : ""
      }Question: ${message}`;

      const messages = [
        { role: "system", content: systemInstructionContent },
        ...normalizedHistory,
        { role: "user", content: finalUserMessage },
      ];

      // 4. Call OpenRouter API
      const response = await axios.post(
        this.apiUrl,
        {
          model: this.model,
          messages: messages,
        },
        {
          headers: {
            Authorization: `Bearer ${config.openRouter.apiKey}`,
            "HTTP-Referer": "https://dindee.com", // Optional, site URL
            "X-Title": "Dindee Real Estate", // Optional, site title
            "Content-Type": "application/json",
          },
        }
      );

      return response.data.choices[0].message.content || "";
    } catch (error: any) {
      console.error(
        "Error generating OpenRouter response:",
        error?.response?.data || error.message
      );
      return "I apologize, but I'm having trouble connecting to my AI brain right now. Please try again later.";
    }
  }

  // Static method for stateless usage
  public static async chat(
    message: string,
    history: ChatMessage[] = []
  ): Promise<string> {
    const service = new OpenRouterService();
    return service.generateResponse(message, history);
  }
}

export const openRouterService = new OpenRouterService();
