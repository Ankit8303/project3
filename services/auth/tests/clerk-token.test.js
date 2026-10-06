import { generateKeyPairSync } from "node:crypto";
import { test } from "node:test";
import assert from "node:assert/strict";
import jwt from "jsonwebtoken";
import { verifyClerkSessionToken } from "../src/security/clerkToken.js";
const { privateKey, publicKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
const jwk = publicKey.export({ format: "jwk" });
const jwks = {
    keys: [{ ...jwk, kid: "test-kid", alg: "RS256", use: "sig", kty: "RSA" }],
};
const validPayload = {
    sub: "user_test_123",
    azp: "http://localhost:5173",
    iss: "https://example.clerk.accounts.dev",
};
function sign(payload = validPayload) {
    return jwt.sign(payload, privateKey, {
        algorithm: "RS256",
        keyid: "test-kid",
        expiresIn: "5m",
    });
}
test("accepts a valid Clerk session token", async () => {
    const result = await verifyClerkSessionToken(sign(), {
        authorizedParties: ["http://localhost:5173"],
        jwksFetcher: async () => jwks,
    });
    assert.equal(result.userId, "user_test_123");
    assert.equal(result.authorizedParty, "http://localhost:5173");
});
test("rejects a token signed by an unknown key", async () => {
    const { privateKey: attackerKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
    const token = jwt.sign(validPayload, attackerKey, {
        algorithm: "RS256",
        keyid: "attacker-kid",
        expiresIn: "5m",
    });
    await assert.rejects(verifyClerkSessionToken(token, {
        authorizedParties: ["http://localhost:5173"],
        jwksFetcher: async () => jwks,
    }), /unknown signing key/i);
});
test("rejects a token from an unauthorized frontend", async () => {
    const token = sign({ ...validPayload, azp: "https://evil.example" });
    await assert.rejects(verifyClerkSessionToken(token, {
        authorizedParties: ["http://localhost:5173"],
        jwksFetcher: async () => jwks,
    }), /unauthorized party/i);
});
test("rejects a token without a subject", async () => {
    const token = sign({ ...validPayload, sub: undefined });
    await assert.rejects(verifyClerkSessionToken(token, {
        authorizedParties: ["http://localhost:5173"],
        jwksFetcher: async () => jwks,
    }), /subject/i);
});
