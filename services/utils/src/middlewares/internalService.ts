import crypto from "node:crypto";
import type { NextFunction, Request, Response } from "express";

export function requireInternalService(req: Request, res: Response, next: NextFunction): void {
  const expected = process.env.INTERNAL_SERVICE_KEY;
  const supplied = req.header("x-internal-key");
  if (!expected || !supplied) { res.status(503).json({ message: "Internal service authentication is not configured" }); return; }
  const a = Buffer.from(supplied);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) { res.status(403).json({ message: "Forbidden" }); return; }
  next();
}
