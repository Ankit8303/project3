import test from "node:test";
import assert from "node:assert/strict";
import { isRider } from "../dist/security/authorization.js";

test("only rider role is accepted by rider authorization", () => {
  assert.equal(isRider({ _id: "1", role: "rider" }), true);
  assert.equal(isRider({ _id: "1", role: "customer" }), false);
  assert.equal(isRider({ _id: "1", role: "seller" }), false);
  assert.equal(isRider(undefined), false);
});
