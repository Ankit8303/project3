import { Request, Response, NextFunction } from "express";
import jwt, { type JwtPayload } from "jsonwebtoken";
import { IUser } from "../model/User.js";

export interface AuthenticatedRequest extends Request {
  user?: IUser | null;
}

function getJwtSecret(): string {
  const secret = process.env.JWT_SEC;
  if (!secret || secret.length < 32) {
    throw new Error("JWT_SEC must be configured with at least 32 characters");
  }
  return secret;
}

export const isAuth = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith("Bearer ")) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    const token = authHeader.slice("Bearer ".length).trim();
    if (!token) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    const decodedValue = jwt.verify(token, getJwtSecret(), {
      algorithms: ["HS256"],
      issuer: "tomato-auth",
      audience: "tomato-services",
    }) as JwtPayload & { user?: IUser };

    if (!decodedValue.user?._id) {
      res.status(401).json({ message: "Invalid application token" });
      return;
    }

    req.user = decodedValue.user;
    next();
  } catch {
    res.status(401).json({ message: "Unauthorized" });
  }
};
