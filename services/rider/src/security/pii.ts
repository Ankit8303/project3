import crypto from "node:crypto";

const VERSION = "v1";
const ALGORITHM = "aes-256-gcm";
const IV_BYTES = 12;
const TAG_BYTES = 16;

export function requirePiiEncryptionKey(): Buffer {
  const raw = process.env.PII_ENCRYPTION_KEY?.trim();
  if (!raw) throw new Error("PII_ENCRYPTION_KEY is required");

  let key: Buffer;
  if (/^[0-9a-fA-F]{64}$/.test(raw)) key = Buffer.from(raw, "hex");
  else {
    try { key = Buffer.from(raw, "base64"); } catch { throw new Error("PII_ENCRYPTION_KEY must be 32-byte base64 or 64-char hex"); }
  }
  if (key.length !== 32) throw new Error("PII_ENCRYPTION_KEY must decode to exactly 32 bytes");
  return key;
}

export function encryptPii(value: string): string {
  if (!value || typeof value !== "string") throw new Error("PII value must be a non-empty string");
  const iv = crypto.randomBytes(IV_BYTES);
  const cipher = crypto.createCipheriv(ALGORITHM, requirePiiEncryptionKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [VERSION, iv.toString("base64url"), tag.toString("base64url"), ciphertext.toString("base64url")].join(".");
}

export function decryptPii(value: string): string {
  const [version, ivRaw, tagRaw, ciphertextRaw] = value.split(".");
  if (version !== VERSION || !ivRaw || !tagRaw || !ciphertextRaw) throw new Error("Invalid encrypted PII format");
  const iv = Buffer.from(ivRaw, "base64url");
  const tag = Buffer.from(tagRaw, "base64url");
  const ciphertext = Buffer.from(ciphertextRaw, "base64url");
  if (iv.length !== IV_BYTES || tag.length !== TAG_BYTES) throw new Error("Invalid encrypted PII envelope");
  const decipher = crypto.createDecipheriv(ALGORITHM, requirePiiEncryptionKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
}

export function maskPii(value: string): string {
  const normalized = String(value);
  if (normalized.length <= 4) return "****";
  return `${"*".repeat(Math.min(8, normalized.length - 4))}${normalized.slice(-4)}`;
}
