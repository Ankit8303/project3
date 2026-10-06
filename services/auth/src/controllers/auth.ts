import axios from "axios";
import jwt from "jsonwebtoken";
import User, { type IUser } from "../model/User.js";
import TryCatch from "../middlewares/trycatch.js";
import {
  clerkBearerTokenFromAuthorization,
  verifyClerkSessionToken,
} from "../security/clerkToken.js";
import { AuthenticatedRequest } from "../middlewares/isAuth.js";

const SELF_SERVICE_ROLES = ["customer", "rider", "seller"] as const;
type SelfServiceRole = (typeof SELF_SERVICE_ROLES)[number];

interface ClerkUserResponse {
  id: string;
  first_name: string | null;
  last_name: string | null;
  image_url: string;
  email_addresses: Array<{
    email_address: string;
    id: string;
  }>;
  primary_email_address_id: string | null;
}

function requireJwtSecret(): string {
  const secret = process.env.JWT_SEC;
  if (!secret || secret.length < 32) {
    throw new Error("JWT_SEC must be configured with at least 32 characters");
  }
  return secret;
}

function authorizedParties(): string[] {
  return (process.env.CLERK_AUTHORIZED_PARTIES || "http://localhost:5173")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
}

async function getVerifiedClerkUser(userId: string): Promise<ClerkUserResponse> {
  const secretKey = process.env.CLERK_SECRET_KEY;
  if (!secretKey) {
    throw new Error("CLERK_SECRET_KEY is not configured");
  }

  const response = await axios.get<ClerkUserResponse>(
    `${process.env.CLERK_API_URL || "https://api.clerk.com/v1"}/users/${encodeURIComponent(userId)}`,
    {
      headers: {
        Authorization: `Bearer ${secretKey}`,
      },
      timeout: 5_000,
    },
  );

  return response.data;
}

function getPrimaryEmail(user: ClerkUserResponse): string {
  const primary = user.email_addresses.find(
    (email) => email.id === user.primary_email_address_id,
  );

  if (!primary?.email_address) {
    throw new Error("Authenticated Clerk user has no primary email address");
  }

  return primary.email_address.toLowerCase().trim();
}

function issueApplicationToken(user: IUser): string {
  const secret = requireJwtSecret();

  return jwt.sign(
    {
      user: {
        _id: user._id.toString(),
        name: user.name,
        email: user.email,
        image: user.image || "",
        role: user.role || null,
      },
    },
    secret,
    {
      expiresIn: "15m",
      issuer: "tomato-auth",
      audience: "tomato-services",
    },
  );
}

/**
 * Exchanges a verified Clerk session token for Tomato's short-lived application JWT.
 * Identity fields are sourced from Clerk, never from the request body.
 */
export const loginWithClerk = TryCatch(async (req, res) => {
  const clerkToken = clerkBearerTokenFromAuthorization(req.headers.authorization);
  const verificationOptions = {
    authorizedParties: authorizedParties(),
    ...(process.env.CLERK_ISSUER ? { issuer: process.env.CLERK_ISSUER } : {}),
    ...(process.env.CLERK_JWT_KEY ? { jwtKey: process.env.CLERK_JWT_KEY } : {}),
  };

  const clerkSession = await verifyClerkSessionToken(clerkToken, verificationOptions);

  const clerkUser = await getVerifiedClerkUser(clerkSession.userId);
  const email = getPrimaryEmail(clerkUser);
  const name = [clerkUser.first_name, clerkUser.last_name]
    .filter(Boolean)
    .join(" ")
    .trim() || email.split("@")[0] || "User";

  let user = await User.findOne({ clerkId: clerkSession.userId });

  if (!user) {
    // Migration-safe lookup: existing local users may predate Clerk linkage.
    user = await User.findOne({ email });

    if (user?.clerkId && user.clerkId !== clerkSession.userId) {
      return res.status(409).json({
        message: "This email is already linked to a different Clerk identity.",
      });
    }
  }

  if (!user) {
    user = await User.create({
      name,
      email,
      image: clerkUser.image_url || "",
      clerkId: clerkSession.userId,
      role: null,
    });
  } else {
    // Clerk owns identity/profile data. Local role remains owned by Tomato.
    user.name = name;
    user.email = email;
    user.image = clerkUser.image_url || "";
    user.clerkId = clerkSession.userId;
    await user.save();
  }

  const token = issueApplicationToken(user);

  res.status(200).json({
    message: "Authenticated successfully",
    token,
    user,
  });
});

export const addUserRole = TryCatch(async (req: AuthenticatedRequest, res) => {
  if (!req.user?._id) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const role = req.body?.role as SelfServiceRole;

  if (!SELF_SERVICE_ROLES.includes(role)) {
    return res.status(400).json({
      message: "Invalid self-service role. Administrator accounts are provisioned separately.",
    });
  }

  const existingUser = await User.findById(req.user._id);

  if (!existingUser) {
    return res.status(404).json({ message: "User not found" });
  }

  if (existingUser.role && existingUser.role !== role) {
    return res.status(403).json({
      message: `Account '${existingUser.email}' is permanently registered as '${existingUser.role}'. Role cannot be changed.`,
      user: existingUser,
    });
  }

  existingUser.role = role;
  await existingUser.save();

  const token = issueApplicationToken(existingUser);

  res.json({ user: existingUser, token });
});

export const myProfile = TryCatch(async (req: AuthenticatedRequest, res) => {
  if (!req.user) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const user = await User.findById(req.user._id).select("-__v");
  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  res.json(user);
});
