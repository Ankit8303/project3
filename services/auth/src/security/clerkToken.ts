import axios from "axios";
import { createPublicKey, type KeyObject } from "node:crypto";
import jwt, { type JwtHeader, type JwtPayload } from "jsonwebtoken";

export interface ClerkJwk {
  kty: string;
  kid?: string;
  alg?: string;
  use?: string;
  n?: string;
  e?: string;
  [key: string]: unknown;
}

export interface ClerkJwks {
  keys: ClerkJwk[];
}

export interface ClerkSession {
  userId: string;
  authorizedParty: string;
  issuer?: string;
  sessionId?: string;
}

interface VerificationOptions {
  authorizedParties: string[];
  issuer?: string;
  jwtKey?: string;
  jwksFetcher?: () => Promise<ClerkJwks>;
}

const jwksCache = new Map<string, KeyObject>();

const defaultJwksFetcher = async (): Promise<ClerkJwks> => {
  const response = await axios.get<ClerkJwks>(
    process.env.CLERK_JWKS_URL || "https://api.clerk.com/v1/jwks",
    { timeout: 5_000 },
  );
  return response.data;
};

function getBearerToken(authorization: string | undefined): string {
  if (!authorization?.startsWith("Bearer ")) {
    throw new Error("Missing Clerk bearer token");
  }

  const token = authorization.slice("Bearer ".length).trim();
  if (!token) {
    throw new Error("Missing Clerk bearer token");
  }

  return token;
}

function getSigningKey(header: JwtHeader, jwks: ClerkJwks): KeyObject {
  if (header.alg !== "RS256") {
    throw new Error("Unsupported Clerk signing algorithm");
  }

  if (!header.kid) {
    throw new Error("Missing Clerk signing key id");
  }

  const cached = jwksCache.get(header.kid);
  if (cached) return cached;

  const jwk = jwks.keys.find((key) => key.kid === header.kid);
  if (!jwk || jwk.kty !== "RSA" || !jwk.n || !jwk.e) {
    throw new Error("Unknown signing key");
  }

  const key = createPublicKey({ key: jwk, format: "jwk" });
  jwksCache.set(header.kid, key);
  return key;
}

function verifyClaims(payload: string | JwtPayload, options: VerificationOptions): ClerkSession {
  if (typeof payload === "string") {
    throw new Error("Invalid Clerk token payload");
  }

  if (!payload.sub) {
    throw new Error("Clerk token subject is missing");
  }

  const authorizedParty = typeof payload.azp === "string" ? payload.azp : undefined;
  if (!authorizedParty || !options.authorizedParties.includes(authorizedParty)) {
    throw new Error("Unauthorized party");
  }

  if (options.issuer && payload.iss !== options.issuer) {
    throw new Error("Invalid Clerk token issuer");
  }

  const session: ClerkSession = {
    userId: payload.sub,
    authorizedParty,
  };

  if (typeof payload.iss === "string") session.issuer = payload.iss;
  if (typeof payload.sid === "string") session.sessionId = payload.sid;

  return session;
}

export async function verifyClerkSessionToken(
  token: string,
  options: VerificationOptions,
): Promise<ClerkSession> {
  if (options.authorizedParties.length === 0) {
    throw new Error("At least one Clerk authorized party is required");
  }

  const decoded = jwt.decode(token, { complete: true });
  if (!decoded || typeof decoded === "string" || !decoded.header) {
    throw new Error("Invalid Clerk token");
  }

  let signingKey: KeyObject;
  if (options.jwtKey) {
    signingKey = createPublicKey(options.jwtKey);
  } else {
    const jwks = await (options.jwksFetcher || defaultJwksFetcher)();
    signingKey = getSigningKey(decoded.header, jwks);
  }

  const payload = jwt.verify(token, signingKey, {
    algorithms: ["RS256"],
    issuer: options.issuer,
  });

  return verifyClaims(payload, options);
}

export function clerkBearerTokenFromAuthorization(authorization: string | undefined): string {
  return getBearerToken(authorization);
}
