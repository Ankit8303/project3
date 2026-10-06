import type { CorsOptions } from "cors";

function getConfiguredOrigins(): string[] {
  return (process.env.CORS_ORIGINS || "http://localhost:5173,http://127.0.0.1:5173")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
}

export const corsOptions: CorsOptions = {
  origin(origin, callback) {
    // Non-browser/internal requests have no Origin header and remain valid.
    const configuredOrigins = getConfiguredOrigins();
    if (!origin || configuredOrigins.includes(origin)) {
      callback(null, true);
      return;
    }
    callback(new Error("CORS origin denied"));
  },
  credentials: true,
};
