import assert from "node:assert/strict";
import { canTransitionRiderDelivery } from "../dist/domain/deliveryStateMachine.js";

const valid = [
  ["available", "reserved"],
  ["reserved", "assigned"],
  ["reserved", "available"],
  ["assigned", "picked_up"],
  ["picked_up", "delivered"],
  ["delivered", "available"],
];

const invalid = [
  ["available", "assigned"],
  ["available", "picked_up"],
  ["assigned", "available"],
  ["assigned", "delivered"],
  ["delivered", "assigned"],
  ["delivered", "picked_up"],
  ["reserved", "picked_up"],
];

for (const [from, to] of valid) {
  assert.equal(canTransitionRiderDelivery(from, to), true, `${from} -> ${to}`);
}
for (const [from, to] of invalid) {
  assert.equal(canTransitionRiderDelivery(from, to), false, `${from} -> ${to}`);
}

console.log("rider delivery state machine: all tests passed");
