import express, { Router } from "express";
import { embeddingService } from "@/services/EmbeddingService";
import path from "path";

const router: Router = express.Router();

router.post("/ingest", async (req, res) => {
  try {
    const filePath = path.join(
      process.cwd(),
      "src/assets/land-law-2019_eng-unofficial-translation.pdf"
    );
    const result = await embeddingService.ingestPDF(
      filePath,
      "land-law-2019_eng-unofficial-translation.pdf"
    );
    res.json({ message: "Ingestion successful", chunks: result.chunks });
  } catch (error: any) {
    console.error("Ingestion failed:", error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
