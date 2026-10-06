import assert from "node:assert/strict";
import { allowedNextStatuses, canTransitionOrder, assertOrderTransition } from "../src/domain/orderStateMachine.ts";

const valid = [
  ["placed", "accepted"],
  ["placed", "cancelled"],
  ["accepted", "preparing"],
  ["preparing", "ready_for_rider"],
  ["ready_for_rider", "rider_assigned"],
  ["rider_assigned", "picked_up"],
  ["picked_up", "delivered"],
];
for (const [from, to] of valid) assert.equal(canTransitionOrder(from, to), true, `${from}->${to} should be valid`);

const invalid = [
  ["placed", "delivered"],
  ["accepted", "placed"],
  ["accepted", "delivered"],
  ["preparing", "picked_up"],
  ["ready_for_rider", "delivered"],
  ["delivered", "cancelled"],
  ["cancelled", "accepted"],
];
for (const [from, to] of invalid) assert.equal(canTransitionOrder(from, to), false, `${from}->${to} should be invalid`);

assert.deepEqual(allowedNextStatuses("delivered"), []);
assert.throws(() => assertOrderTransition("delivered", "preparing"), /Invalid order transition/);
console.log("order-state-machine: all tests passed");
