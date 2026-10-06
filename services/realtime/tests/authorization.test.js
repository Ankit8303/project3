import test from "node:test";
import assert from "node:assert/strict";
import { timingSafeEqual } from "node:crypto";

function sameSecret(a, b) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

test("internal service secrets require exact values", () => {
  assert.equal(sameSecret("secret-123", "secret-123"), true);
  assert.equal(sameSecret("secret-123", "secret-124"), false);
  assert.equal(sameSecret("secret-123", "secret-1234"), false);
});
