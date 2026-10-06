import express from "express";
import dotenv from "dotenv";
import connectDB from "./config/db.js";
import authRoute from "./routes/auth.js";
import cors from "cors";
import { corsOptions } from "./security/cors.js";

dotenv.config();

const app = express();

app.use(cors(corsOptions));

app.use(express.json());

app.use("/api/auth", authRoute);

  app.get("/health", (_req, res) => res.status(200).json({ status: "ok", service: "auth" }));

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Auth service is running on port ${PORT}`);
  connectDB();
});
