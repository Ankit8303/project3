import express from "express";
import dotenv from "dotenv";
import cloudinary from "cloudinary";
import cors from "cors";
import { corsOptions } from "./security/cors.js";
import uploadRoutes from "./routes/cloudinary.js";
import paymentRoutes from "./routes/payment.js";
import { connectRabbitMQ } from "./config/rabbitmq.js";
import { stripeWebhook } from "./routes/payment.js";

dotenv.config();

connectRabbitMQ();

const app = express();

app.use(cors(corsOptions));

// Stripe requires the exact raw request body for signature verification.
app.post("/api/payment/stripe/webhook", express.raw({ type: "application/json" }), stripeWebhook);

app.use(express.json({ limit: "8mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

import path from "path";
import fs from "fs";

const { CLOUD_NAME, CLOUD_API_KEY, CLOUD_SECRET_KEY } = process.env;

if (
  CLOUD_NAME &&
  CLOUD_API_KEY &&
  CLOUD_SECRET_KEY &&
  !CLOUD_NAME.includes("your") &&
  !CLOUD_API_KEY.includes("your")
) {
  cloudinary.v2.config({
    cloud_name: CLOUD_NAME,
    api_key: CLOUD_API_KEY,
    api_secret: CLOUD_SECRET_KEY,
  });
  console.log("☁️ Cloudinary configured successfully");
} else {
  console.log("⚠️ Cloudinary not configured or placeholder detected - using local storage fallback for uploads");
}

const uploadsDir = path.join(process.cwd(), "uploads");
if (process.env.NODE_ENV !== "production" && process.env.ALLOW_LOCAL_UPLOADS === "true") {
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
  app.use("/uploads", express.static(uploadsDir));
}

app.use("/api", uploadRoutes);
app.use("/api/payment", paymentRoutes);

app.get("/health", (_req, res) => res.status(200).json({ status: "ok", service: "utils" }));

const PORT = process.env.PORT || 5002;

app.listen(PORT, () => {
  console.log(`Utils service is running on port ${PORT}`);
});
