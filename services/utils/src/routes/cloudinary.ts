import express from "express";
import cloudinary from "cloudinary";
import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { requireInternalService } from "../middlewares/internalService.js";

const router = express.Router();
const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
const IMAGE_DATA_URI = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/;

router.post("/upload", requireInternalService, async (req, res) => {
  try {
    const buffer = typeof req.body?.buffer === "string" ? req.body.buffer : "";
    const matches = buffer.match(IMAGE_DATA_URI);
    if (!matches) return res.status(400).json({ message: "Only JPEG, PNG, or WebP image data is accepted" });

    const mimeType = matches[1];
    const base64Data = matches[2];
    const bytes = Buffer.from(base64Data, "base64");
    if (!bytes.length || bytes.length > MAX_UPLOAD_BYTES) {
      return res.status(413).json({ message: "Image exceeds the 5 MB upload limit" });
    }

    const { CLOUD_NAME, CLOUD_API_KEY, CLOUD_SECRET_KEY } = process.env;
    const cloudinaryConfigured = Boolean(CLOUD_NAME && CLOUD_API_KEY && CLOUD_SECRET_KEY);

    if (cloudinaryConfigured) {
      try {
        const cloud = await cloudinary.v2.uploader.upload(buffer, { resource_type: "image" });
        return res.json({ url: cloud.secure_url });
      } catch (error) {
        console.error("[Cloudinary] Upload failed");
        if (process.env.NODE_ENV === "production" || process.env.ALLOW_LOCAL_UPLOADS !== "true") {
          return res.status(503).json({ message: "Image storage is temporarily unavailable" });
        }
      }
    } else if (process.env.NODE_ENV === "production" || process.env.ALLOW_LOCAL_UPLOADS !== "true") {
      return res.status(503).json({ message: "Image storage is not configured" });
    }

    const uploadsDir = path.join(process.cwd(), "uploads");
    await fs.mkdir(uploadsDir, { recursive: true });
    const extension = mimeType.split("/")[1];
    const filename = `${crypto.randomUUID()}.${extension}`;
    await fs.writeFile(path.join(uploadsDir, filename), bytes, { flag: "wx" });
    const host = req.get("host") || "localhost:5002";
    const protocol = req.protocol === "https" ? "https" : "http";
    return res.json({ url: `${protocol}://${host}/uploads/${filename}` });
  } catch {
    console.error("[Upload] Upload processing failed");
    return res.status(500).json({ message: "Upload failed" });
  }
});

export default router;
