import assert from "node:assert/strict";
import { encryptPii, decryptPii, maskPii, requirePiiEncryptionKey } from "../dist/security/pii.js";

process.env.PII_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString("base64");

const plaintext = "1234-5678-9012";
const encrypted = encryptPii(plaintext);

assert.notEqual(encrypted, plaintext);
assert.equal(decryptPii(encrypted), plaintext);
assert.match(maskPii(plaintext), /^\*+9012$/);

const previous = process.env.PII_ENCRYPTION_KEY;
delete process.env.PII_ENCRYPTION_KEY;
assert.throws(() => requirePiiEncryptionKey(), /PII_ENCRYPTION_KEY/);
process.env.PII_ENCRYPTION_KEY = previous;

console.log("PII protection: all tests passed");

assert.throws(() => decryptPii(encrypted.replace(/.$/, "x")), /Invalid|Unsupported|bad/i);
