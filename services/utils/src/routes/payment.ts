import express from "express";
import { payWithStripe, verifyDemoPayment, stripeWebhook, getStripePaymentStatus } from "../controllers/payment.js";
import { isAuth } from "../middlewares/isAuth.js";

const router = express.Router();

router.post("/stripe/create", isAuth, payWithStripe);
router.post("/stripe/verify", isAuth, verifyDemoPayment);
router.get("/stripe/status", isAuth, getStripePaymentStatus);
router.post("/create", isAuth, payWithStripe);
router.post("/verify", isAuth, verifyDemoPayment);

export { stripeWebhook };
export default router;
