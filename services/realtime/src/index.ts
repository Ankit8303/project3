import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import { corsOptions } from "./security/cors.js";
import http from "http";
import { initSocket } from "./socket.js";
import internalRoute from "./routes/internal.js";

dotenv.config();

const app = express();

app.use(cors(corsOptions));
app.use(express.json());

app.use("/api/v1/internal", internalRoute);

const server = http.createServer(app);

initSocket(server);

app.get("/health", (_req, res) => res.status(200).json({ status: "ok", service: "realtime" }));

server.listen(process.env.PORT, () => {
  console.log(`Realtime service is running port ${process.env.PORT}`);
});
