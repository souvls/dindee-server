import { Request, Response } from "express";
import { BannerService } from "@/services/BannerService";
import { ResponseHelper } from "@/utils/ResponseHelper";

// Public endpoints

// Get active banners for home page
export const getActiveBanners = async (req: Request, res: Response) => {
  try {
    const banners = await BannerService.getActiveBanners();

    return ResponseHelper.success(
      res,
      banners,
      "Active banners retrieved successfully"
    );
  } catch (error) {
    console.error("Error fetching active banners:", error);
    return ResponseHelper.error(res, "Failed to fetch banners", 500);
  }
};

// Track banner view
export const trackBannerView = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    await BannerService.incrementViewCount(id);

    return ResponseHelper.success(res, null, "View tracked successfully");
  } catch (error) {
    console.error("Error tracking banner view:", error);
    return ResponseHelper.error(res, "Failed to track view", 500);
  }
};

// Track banner click
export const trackBannerClick = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    await BannerService.incrementClickCount(id);

    return ResponseHelper.success(res, null, "Click tracked successfully");
  } catch (error) {
    console.error("Error tracking banner click:", error);
    return ResponseHelper.error(res, "Failed to track click", 500);
  }
};

// Admin endpoints

// Get all banners (with pagination)
export const getAllBanners = async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const isActive =
      req.query.isActive === "true"
        ? true
        : req.query.isActive === "false"
        ? false
        : undefined;

    const { banners, total } = await BannerService.getAllBanners(
      page,
      limit,
      isActive
    );

    return ResponseHelper.success(
      res,
      {
        banners,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
      "Banners retrieved successfully"
    );
  } catch (error) {
    console.error("Error fetching banners:", error);
    return ResponseHelper.error(res, "Failed to fetch banners", 500);
  }
};

// Get single banner
export const getBannerById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const banner = await BannerService.getBannerById(id);

    if (!banner) {
      return ResponseHelper.notFound(res, "Banner not found");
    }

    return ResponseHelper.success(res, banner, "Banner retrieved successfully");
  } catch (error) {
    console.error("Error fetching banner:", error);
    return ResponseHelper.error(res, "Failed to fetch banner", 500);
  }
};

// Create banner
export const createBanner = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;

    if (!userId) {
      return ResponseHelper.unauthorized(res, "User not authenticated");
    }

    const {
      name,
      description,
      linkToAdsPage,
      dateStart,
      dateEnd,
      displayDuration,
      isActive,
      priority,
    } = req.body;

    let image = req.body.image;

    // Handle file upload
    if (req.file) {
      try {
        const { uploadFileToS3 } = await import("@/helpers/s3Helper");
        image = await uploadFileToS3(req.file, "banners");
      } catch (uploadError) {
        console.error("File upload error:", uploadError);
        return ResponseHelper.error(res, "Failed to upload image", 500);
      }
    }

    // Validation
    if (!name || !description || !image || !dateStart || !dateEnd) {
      return ResponseHelper.badRequest(res, "Missing required fields");
    }

    const banner = await BannerService.createBanner(
      {
        name,
        description,
        image,
        linkToAdsPage,
        dateStart: new Date(dateStart),
        dateEnd: new Date(dateEnd),
        displayDuration: displayDuration || 5,
        isActive: isActive !== undefined ? String(isActive) === "true" : true,
        priority: priority || 0,
      },
      userId
    );

    return res.status(201).json({
      success: true,
      message: "Banner created successfully",
      data: banner,
    });
  } catch (error: any) {
    console.error("Error creating banner:", error);

    if (error.name === "ValidationError") {
      return ResponseHelper.badRequest(res, error.message);
    }

    return ResponseHelper.error(res, "Failed to create banner", 500);
  }
};

// Update banner
export const updateBanner = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Handle file upload
    if (req.file) {
      try {
        const { uploadFileToS3 } = await import("@/helpers/s3Helper");
        updateData.image = await uploadFileToS3(req.file, "banners");
      } catch (uploadError) {
        console.error("File upload error:", uploadError);
        return ResponseHelper.error(res, "Failed to upload image", 500);
      }
    }

    // Convert date strings to Date objects if present
    if (updateData.dateStart) {
      updateData.dateStart = new Date(updateData.dateStart);
    }
    if (updateData.dateEnd) {
      updateData.dateEnd = new Date(updateData.dateEnd);
    }

    const banner = await BannerService.updateBanner(id, updateData);

    if (!banner) {
      return ResponseHelper.notFound(res, "Banner not found");
    }

    return ResponseHelper.success(res, banner, "Banner updated successfully");
  } catch (error: any) {
    console.error("Error updating banner:", error);

    if (error.name === "ValidationError") {
      return ResponseHelper.badRequest(res, error.message);
    }

    return ResponseHelper.error(res, "Failed to update banner", 500);
  }
};

// Delete banner
export const deleteBanner = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const success = await BannerService.deleteBanner(id);

    if (!success) {
      return ResponseHelper.notFound(res, "Banner not found");
    }

    return ResponseHelper.success(res, null, "Banner deleted successfully");
  } catch (error) {
    console.error("Error deleting banner:", error);
    return ResponseHelper.error(res, "Failed to delete banner", 500);
  }
};

// Toggle banner active status
export const toggleBannerStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const banner = await BannerService.toggleActiveStatus(id);

    if (!banner) {
      return ResponseHelper.notFound(res, "Banner not found");
    }

    return ResponseHelper.success(
      res,
      banner,
      `Banner ${banner.isActive ? "activated" : "deactivated"} successfully`
    );
  } catch (error) {
    console.error("Error toggling banner status:", error);
    return ResponseHelper.error(res, "Failed to toggle banner status", 500);
  }
};

// Get banner statistics
export const getBannerStats = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const stats = await BannerService.getBannerStats(id);

    if (!stats) {
      return ResponseHelper.notFound(res, "Banner not found");
    }

    return ResponseHelper.success(
      res,
      stats,
      "Banner statistics retrieved successfully"
    );
  } catch (error) {
    console.error("Error fetching banner stats:", error);
    return ResponseHelper.error(res, "Failed to fetch statistics", 500);
  }
};
