import express from "express";
import connectDB from "./config/db.js";
import dotenv from "dotenv";
import restaurantRoutes from "./routes/restaraunt.js";
import itemRoutes from "./routes/menuitem.js";
import cartRoutes from "./routes/cart.js";
import addressRoutes from "./routes/address.js";
import orderRoutes from "./routes/order.js";
import cors from "cors";
import { corsOptions } from "./security/cors.js";
import { connectRabbitMQ } from "./config/rabbitmq.js";
import { startPaymentConsumer } from "./config/payment.consumer.js";
import { initCache, getCacheStatus } from "./config/cache.js";
import { requireInternalService } from "./security/internalService.js";

dotenv.config();

initCache().catch((err: any) => {
  console.error(`[Cache] Init error: ${err.message}`);
});

connectRabbitMQ()
  .then(() => startPaymentConsumer())
  .catch((err: any) => {
    console.error(`[RabbitMQ] Restaurant: broker unavailable (${err.message}). HTTP serving without payment events.`);
  });

const app = express();

app.use(cors(corsOptions));

app.use(express.json());

  app.get("/health", (_req, res) => res.status(200).json({ status: "ok", service: "restaurant" }));

const PORT = process.env.PORT || 5001;

app.get("/api/cache/status", requireInternalService, (_req, res) => {
  res.json(getCacheStatus());
});

app.use("/api/restaurant", restaurantRoutes);
app.use("/api/item", itemRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/address", addressRoutes);
app.use("/api/order", orderRoutes);

app.listen(PORT, () => {
  console.log(`Restaurant service is running on port ${PORT}`);
  connectDB();
});
