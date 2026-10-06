import express from "express";
import { getIO } from "../socket.js";
import { requireInternalService } from "../security/internalService.js";

const router = express.Router();

router.post("/emit", requireInternalService, (req, res) => {

  const { event, room, payload } = req.body;
  if (!event || !room) {
    return res.status(400).json({
      message: "event and room are required",
    });
  }

  const io = getIO();

  console.log(`📶 Emitting event ${event} to room ${room}`);

  io.to(room).emit(event, payload ?? {});

  return res.json({ sucess: true });
});

export default router;
