import { Router } from "express";
import authRoutes from "../auth";
import postRoutes from "../posts";
import chatRoutes from "../chat";
import reportRoutes from "../report";
import bannerRoutes from "../banners";
import bookmarkRoutes from "../bookmarks";
import userRoutes from "../users";
import path from "path";
import { embeddingService } from "@/services/EmbeddingService";
const router: Router = Router();

// V1 API Routes
router.use("/auth", authRoutes);
router.use("/posts", postRoutes); // Legacy posts routes
router.use("/chats", chatRoutes);
router.use("/reports", reportRoutes);
router.use("/banners", bannerRoutes);
router.use("/bookmarks", bookmarkRoutes);
router.use("/users", userRoutes);

// V1 API Info
router.get("/", async (req, res) => {
  res.json({
    version: "1.0.0",
    name: "Real Estate API v1",
    description: "REST API for Real Estate Application",
    endpoints: {
      auth: "/api/v1/auth",
      posts: "/api/v1/posts", // Legacy
      chats: "/api/v1/chats",
      reports: "/api/v1/reports",
      banners: "/api/v1/banners",
      properties: "/api/v1/properties", // New properties system
      admin: "/api/v1/admin",
    },
    documentation: "/api/v1/docs",
  });
});

export default router;
