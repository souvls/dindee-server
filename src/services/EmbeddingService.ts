import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { config } from "@/config";
import pdf from "pdf-parse";
import fs from "fs";
import { Knowledge } from "@/models/Knowledge";

export class EmbeddingService {
  private embeddings: GoogleGenerativeAIEmbeddings;

  constructor() {
    this.embeddings = new GoogleGenerativeAIEmbeddings({
      modelName: "text-embedding-004", // Using recent embedding model
      apiKey: config.gemini.apiKey,
    });
  }

  /**
   * Process a PDF file, split into chunks, embed, and store in MongoDB
   */
  async ingestPDF(
    filePath: string,
    sourceName: string
  ): Promise<{ chunks: number }> {
    console.log(`Matching PDF: ${filePath}`);

    // 1. Read PDF
    const dataBuffer = fs.readFileSync(filePath);
    const data = await pdf(dataBuffer);
    const text = data.text;

    console.log(`PDF loaded. Length: ${text.length} chars`);

    // 2. Split Text
    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1000,
      chunkOverlap: 200,
    });

    const docs = await splitter.createDocuments([text]);
    console.log(`Split into ${docs.length} chunks`);

    // 3. Generate Embeddings & Store
    let savedCount = 0;

    // Process in batches to avoid rate limits
    const BATCH_SIZE = 10;

    for (let i = 0; i < docs.length; i += BATCH_SIZE) {
      const batch = docs.slice(i, i + BATCH_SIZE);

      const batchPromises = batch.map(async (doc: any) => {
        try {
          const vectors = await this.embeddings.embedQuery(doc.pageContent);

          await Knowledge.create({
            content: doc.pageContent,
            source: sourceName,
            embedding: vectors,
          });
          savedCount++;
        } catch (error) {
          console.error(`Error embedding chunk:`, error);
        }
      });

      await Promise.all(batchPromises);
      console.log(
        `Processed batch ${i / BATCH_SIZE + 1} / ${Math.ceil(
          docs.length / BATCH_SIZE
        )}`
      );
    }

    return { chunks: savedCount };
  }

  /**
   * Search for relevant chunks
   */
  async search(query: string, limit: number = 3): Promise<string[]> {
    const queryEmbedding = await this.embeddings.embedQuery(query);

    // MongoDB Vector Search Aggregation
    const results = await Knowledge.aggregate([
      {
        $vectorSearch: {
          index: "vector_index", // User must create this index in Atlas
          path: "embedding",
          queryVector: queryEmbedding,
          numCandidates: 100,
          limit: limit,
        },
      },
      {
        $project: {
          content: 1,
          score: { $meta: "vectorSearchScore" },
        },
      },
    ]);

    return results.map((r) => r.content);
  }
}

export const embeddingService = new EmbeddingService();
