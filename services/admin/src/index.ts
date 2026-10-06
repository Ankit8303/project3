import express from "express";
import dotenv from "dotenv";
import adminRoutes from "./routes/admin.js";
import cors from "cors";
import { corsOptions } from "./security/cors.js";

dotenv.config();

const app = express();

app.get("/health", (_req, res) => res.status(200).json({ status: "ok", service: "admin" }));
app.use(cors(corsOptions));
app.use("/api/v1", adminRoutes);

app.listen(process.env.PORT, () => {
  console.log(`Admin Service is running on port ${process.env.PORT}`);
});
