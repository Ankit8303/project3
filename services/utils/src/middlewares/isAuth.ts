import { Request, Response, NextFunction } from "express";
import jwt, { type JwtPayload } from "jsonwebtoken";

export interface AuthenticatedRequest extends Request {
  user?: {
    _id: string;
    name: string;
    email: string;
    image?: string;
    role: string;
    restaurantId?: string;
  };
}

function getJwtSecret(): string {
  const secret = process.env.JWT_SEC;
  if (!secret || secret.length < 32) {
    throw new Error("JWT_SEC must be configured with at least 32 characters");
  }
  return secret;
}

export const isAuth = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): void => {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith("Bearer ")) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    const decoded = jwt.verify(header.slice(7).trim(), getJwtSecret(), {
      algorithms: ["HS256"],
      issuer: "tomato-auth",
      audience: "tomato-services",
    }) as JwtPayload & { user?: AuthenticatedRequest["user"] };

    if (!decoded.user?._id) {
      res.status(401).json({ message: "Invalid application token" });
      return;
    }

    req.user = decoded.user;
    next();
  } catch {
    res.status(401).json({ message: "Unauthorized" });
  }
};
