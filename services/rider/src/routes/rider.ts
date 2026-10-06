import express from "express";
import { isAuth, isRider } from "../middlewares/isAuth.js";
import {
  acceptOrder,
  addRiderProfile,
  fetchMyCurrentOrder,
  fetchMyProfile,
  toggleRiderAvailablity,
  updateOrderStatus,
  fetchAvailableOrders,
} from "../controllers/rider.js";
import uploadFile from "../middlewares/multer.js";

const router = express.Router();

router.post("/new", isAuth, isRider, uploadFile, addRiderProfile);

router.get("/myprofile", isAuth, isRider, fetchMyProfile);
router.patch("/toggle", isAuth, isRider, toggleRiderAvailablity);
router.get("/orders/available", isAuth, isRider, fetchAvailableOrders);
router.post("/accept/:orderId", isAuth, isRider, acceptOrder);
router.get("/order/current", isAuth, isRider, fetchMyCurrentOrder);
router.put("/order/update/:orderId", isAuth, isRider, updateOrderStatus);

export default router;
