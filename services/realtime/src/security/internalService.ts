import { timingSafeEqual } from "node:crypto";
import type { NextFunction, Request, Response } from "express";

function safeEqual(left: string, right: string): boolean {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function requireInternalService(req: Request, res: Response, next: NextFunction): void {
  const configured = process.env.INTERNAL_SERVICE_KEY;
  const supplied = req.header("x-internal-key");

  if (!configured || !supplied || !safeEqual(supplied, configured)) {
    res.status(403).json({ message: "Forbidden" });
    return;
  }

  next();
}
