import test from "node:test";
import assert from "node:assert/strict";
import {
  canCancelCustomerOrder,
  canManageRestaurantOrder,
  canReviewDeliveredOrder,
  canViewCustomerOrder,
} from "../dist/security/authorization.js";

const customer = { _id: "customer-1", role: "customer" };
const otherCustomer = { _id: "customer-2", role: "customer" };
const seller = { _id: "seller-1", role: "seller" };
const order = { userId: "customer-1", restaurantId: "restaurant-1", status: "placed" };

test("customer can only view their own order", () => {
  assert.equal(canViewCustomerOrder(customer, order), true);
  assert.equal(canViewCustomerOrder(otherCustomer, order), false);
  assert.equal(canViewCustomerOrder(seller, order), false);
});

test("seller can manage only orders belonging to their restaurant", () => {
  assert.equal(canManageRestaurantOrder(seller, order, "restaurant-1"), true);
  assert.equal(canManageRestaurantOrder(seller, order, "restaurant-2"), false);
  assert.equal(canManageRestaurantOrder(customer, order, "restaurant-1"), false);
});

test("customer can cancel only their own placed order", () => {
  assert.equal(canCancelCustomerOrder(customer, order), true);
  assert.equal(canCancelCustomerOrder(otherCustomer, order), false);
  assert.equal(canCancelCustomerOrder(customer, { ...order, status: "preparing" }), false);
});

test("only the customer who owns a delivered order can review it", () => {
  const delivered = { ...order, status: "delivered" };
  assert.equal(canReviewDeliveredOrder(customer, delivered), true);
  assert.equal(canReviewDeliveredOrder(otherCustomer, delivered), false);
  assert.equal(canReviewDeliveredOrder(customer, order), false);
});
