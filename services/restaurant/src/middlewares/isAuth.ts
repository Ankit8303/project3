import { Request, Response, NextFunction } from "express";
import jwt, { JwtPayload } from "jsonwebtoken";

export interface IUser {
  _id: string;
  name: string;
  email: string;
  image: string;
  role: string;
  restaurantId: string;
}

export interface AuthenticatedRequest extends Request {
  user?: IUser | null;
}

export const isAuth = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      res.status(401).json({
        message: "Please Login - No auth header",
      });
      return;
    }

    const token = authHeader.split(" ")[1];

    if (!token) {
      res.status(401).json({
        message: "Please Login - Token missing",
      });
      return;
    }

    const secret = process.env.JWT_SEC;
    if (!secret || secret.length < 32) {
      throw new Error("JWT_SEC must be configured with at least 32 characters");
    }

    const decodedValue = jwt.verify(token, secret, {
      algorithms: ["HS256"],
      issuer: "tomato-auth",
      audience: "tomato-services",
    }) as JwtPayload;

    if (!decodedValue || !decodedValue.user) {
      res.status(401).json({
        message: "Invalid token",
      });
      return;
    }

    req.user = decodedValue.user;
    next();
  } catch (error) {
    res.status(401).json({
      message: "Unauthorized - invalid or expired token",
    });
  }
};

export const isSeller = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const user = req.user;

  if (!user || user.role !== "seller") {
    res.status(403).json({
      message: "You are not authorized seller",
    });
    return;
  }

  next();
};
