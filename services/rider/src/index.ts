import express from "express";
import dotenv from "dotenv";
import connectDB from "./config/db.js";
import cors from "cors";
import { corsOptions } from "./security/cors.js";
import riderRoutes from "./routes/rider.js";
import { connectRabbitMQ } from "./config/rabbitmq.js";
import { startOrderReadyConsumer } from "./config/orderReady.consumer.js";

dotenv.config();

connectRabbitMQ()
  .then(() => startOrderReadyConsumer())
  .catch((err: any) => {
    console.error(`[RabbitMQ] Rider: broker unavailable (${err.message}). HTTP serving without order-ready events.`);
  });

const app = express();

app.get("/health", (_req, res) => res.status(200).json({ status: "ok", service: "rider" }));
app.use(express.json());
app.use(cors(corsOptions));

app.use("/api/rider", riderRoutes);

app.listen(process.env.PORT, () => {
  console.log(`Rider service is running on port ${process.env.PORT}`);
  connectDB();
});
