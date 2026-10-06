import express from "express";
import { isAuth, isSeller } from "../middlewares/isAuth.js";
import { requireInternalService } from "../security/internalService.js";
import {
  assignRiderToOrder,
  createOrder,
  fetchOrderForPayment,
  fetchRestaurantOrders,
  fetchSingleOrder,
  getCurrentOrderForRider,
  getMyOrders,
  updateOrderStatus,
  updateOrderStatusRider,
  getAvailableOrdersForRider,
  cancelOrderCustomer,
  submitOrderReview,
  authorizeOrderRoom,
} from "../controllers/order.js";

const router = express.Router();

router.get("/available/rider", requireInternalService, getAvailableOrdersForRider);
router.get("/myorder", isAuth, getMyOrders);
router.get("/:id", isAuth, fetchSingleOrder);
router.post("/new", isAuth, createOrder);
router.put("/cancel/:id", isAuth, cancelOrderCustomer);
router.post("/review/:id", isAuth, submitOrderReview);
router.get("/payment/:id", requireInternalService, fetchOrderForPayment);
router.post("/internal/authorize-room", requireInternalService, authorizeOrderRoom);
router.get(
  "/restaurant/:restaurantId",
  isAuth,
  isSeller,
  fetchRestaurantOrders
);
router.put("/:orderId", isAuth, isSeller, updateOrderStatus);
router.put("/assign/rider", requireInternalService, assignRiderToOrder);
router.get("/current/rider", requireInternalService, getCurrentOrderForRider);
router.put("/update/status/rider", requireInternalService, updateOrderStatusRider);

export default router;
