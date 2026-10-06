import { Server } from "socket.io";
import http from "http";
import jwt from "jsonwebtoken";
import { createEventRateLimiter, isValidOrderId, isValidSocketUser, normalizeChatMessage, normalizeLocationUpdate, type SocketUser } from "./policy.js";

let io: Server;

async function authorizeOrderRoom(orderId: string, user: SocketUser): Promise<boolean> {
  const serviceUrl = process.env.RESTAURANT_SERVICE;
  const internalKey = process.env.INTERNAL_SERVICE_KEY;

  if (!serviceUrl || !internalKey) return false;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3_000);
    try {
      const response = await fetch(`${serviceUrl}/api/order/internal/authorize-room`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-internal-key": internalKey,
        },
        body: JSON.stringify({ orderId, userId: user._id, role: user.role }),
        signal: controller.signal,
      });
      if (!response.ok) return false;
      const data = await response.json() as { allowed?: boolean };
      return data.allowed === true;
    } finally {
      clearTimeout(timeout);
    }
  } catch (error) {
    console.error("Order room authorization failed:", error);
    return false;
  }
}

export const initSocket = (server: http.Server) => {
  const allowedOrigins = (process.env.CORS_ORIGINS || "http://localhost:5173")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  io = new Server(server, {
    cors: {
      origin: allowedOrigins,
    },
  });

  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token;

      if (!token) {
        return next(new Error("Unauthorized"));
      }

      const secret = process.env.JWT_SEC;
      if (!secret || secret.length < 32) {
        throw new Error("JWT_SEC must be configured with at least 32 characters");
      }

      const decoded = jwt.verify(token, secret, {
        algorithms: ["HS256"],
        issuer: "tomato-auth",
        audience: "tomato-services",
      }) as jwt.JwtPayload;

      if (!decoded || !isValidSocketUser(decoded.user)) {
        return next(new Error("Unauthorized"));
      }

      socket.data.user = decoded.user;
      next();
    } catch (error) {
      console.log("❌ Socket auth failed: ", error);
      next(new Error("Unauthorized"));
    }
  });

  io.on("connection", (socket) => {
    const user = socket.data.user as SocketUser | undefined;

    if (!user) {
      socket.disconnect();
      return;
    }

    const userId = user._id;
    const joinLimiter = createEventRateLimiter({ maxEvents: 10, windowMs: 10_000 });
    const locationLimiter = createEventRateLimiter({ maxEvents: 30, windowMs: 10_000 });
    const chatLimiter = createEventRateLimiter({ maxEvents: 10, windowMs: 10_000 });

    socket.join(`user:${userId}`);

    if (user.restaurantId && user.role === "seller") {
      socket.join(`restaurant:${user.restaurantId}`);
    }

    socket.on("join", async (room: string) => {
      if (!joinLimiter.allow()) {
        socket.emit("rate_limit:error", { event: "join", retryAfterMs: 10_000 });
        return;
      }
      if (typeof room !== "string" || room.length > 100) return;

      if (room === `user:${userId}`) {
        socket.join(room);
        return;
      }

      if (user.role === "seller" && room === `restaurant:${user.restaurantId}`) {
        socket.join(room);
        return;
      }

      const orderId = room.startsWith("order:") ? room.slice("order:".length) : "";
      if (isValidOrderId(orderId) && await authorizeOrderRoom(orderId, user)) {
        socket.join(room);
        return;
      }

      socket.emit("authorization:error", {
        message: "You are not authorized to join this room",
      });
    });

    socket.on("leave", (room: string) => {
      if (typeof room === "string" && room.length <= 100) {
        socket.leave(room);
      }
    });

    socket.on("rider:location:update", async (data: unknown) => {
      if (user.role !== "rider" || !locationLimiter.allow()) {
        if (user.role === "rider") socket.emit("rate_limit:error", { event: "rider:location:update", retryAfterMs: 10_000 });
        return;
      }

      const location = normalizeLocationUpdate(data);
      if (!location) return;
      if (!(await authorizeOrderRoom(location.orderId, user))) return;

      io.to(`order:${location.orderId}`).emit("rider:location", {
        latitude: location.latitude,
        longitude: location.longitude,
      });
      io.to(`user:${userId}`).emit("rider:location", {
        latitude: location.latitude,
        longitude: location.longitude,
      });
    });

    socket.on("order:chat:send", async (data: unknown) => {
      if (!chatLimiter.allow()) {
        socket.emit("rate_limit:error", { event: "order:chat:send", retryAfterMs: 10_000 });
        return;
      }

      const messageData = normalizeChatMessage(data);
      if (!messageData) return;
      if (!(await authorizeOrderRoom(messageData.orderId, user))) return;

      const payload = {
        orderId: messageData.orderId,
        message: messageData.message,
        senderId: userId,
        senderName: user.name || "User",
        senderRole: user.role || "customer",
        timestamp: new Date().toISOString(),
      };

      io.to(`order:${messageData.orderId}`).emit("order:chat:receive", payload);
    });

    socket.on("disconnect", () => {
      console.log(`User disconnected:${userId}`);
    });
  });

  return io;
};

export const getIO = () => {
  if (!io) {
    throw new Error("Socket.io not initialized");
  }

  return io;
};
