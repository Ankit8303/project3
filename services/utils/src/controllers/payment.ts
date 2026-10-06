import { Request, Response } from "express";
import axios from "axios";
import dotenv from "dotenv";
import Stripe from "stripe";
import { randomUUID } from "node:crypto";
import { publishPaymentSuccess } from "../config/payment.producer.js";
import { AuthenticatedRequest } from "../middlewares/isAuth.js";
import { amountsMatch, getPaymentMode, parseDemoSession } from "./paymentPolicy.js";

dotenv.config();

const stripeSecret = process.env.STRIPE_SECRET_KEY;
const stripe = stripeSecret ? new Stripe(stripeSecret) : null;

function paymentMode(): "stripe" | "demo" {
  return getPaymentMode(process.env.PAYMENT_MODE);
}

function requireStripe(): Stripe {
  if (!stripe) throw new Error("STRIPE_SECRET_KEY is not configured");
  return stripe;
}

async function getOrderForPayment(orderId: string, userId: string, paymentId?: string) {
  const { data } = await axios.get(
    `${process.env.RESTAURANT_SERVICE}/api/order/payment/${orderId}`,
    {
      headers: {
        "x-internal-key": process.env.INTERNAL_SERVICE_KEY,
        "x-user-id": userId,
        ...(paymentId ? { "x-payment-id": paymentId } : {}),
      },
    },
  );
  return data as { orderId: string; amount: number; currency: string; userId: string };
}

export const payWithStripe = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user;
    const orderId = String(req.body?.orderId || "");
    if (!user?._id) return res.status(401).json({ message: "Unauthorized" });
    if (!orderId) return res.status(400).json({ message: "Order ID is required" });

    const order = await getOrderForPayment(orderId, user._id);

    if (paymentMode() === "demo") {
      const demoSessionId = `demo_session_${orderId}_${randomUUID()}`;
      const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
      return res.json({
        url: `${frontendUrl}/ordersuccess?session_id=${encodeURIComponent(demoSessionId)}`,
        sessionId: demoSessionId,
        mode: "demo",
      });
    }

    const client = requireStripe();
    const frontendUrl = process.env.FRONTEND_URL;
    if (!frontendUrl) return res.status(500).json({ message: "FRONTEND_URL is required" });

    const session = await client.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      line_items: [{
        price_data: {
          currency: order.currency.toLowerCase(),
          product_data: { name: "Tomato Food Order" },
          unit_amount: Math.round(order.amount * 100),
        },
        quantity: 1,
      }],
      metadata: {
        orderId,
        userId: user._id,
      },
      client_reference_id: orderId,
      success_url: `${frontendUrl}/ordersuccess?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${frontendUrl}/checkout`,
    }, {
      idempotencyKey: `checkout:${orderId}`,
    });

    return res.json({ url: session.url, sessionId: session.id, mode: "stripe" });
  } catch (error: any) {
    const status = error?.response?.status === 403 ? 403 : 500;
    console.error("Stripe Checkout Error:", error?.message || error);
    return res.status(status).json({ message: error?.response?.data?.message || error?.message || "Stripe payment failed" });
  }
};

export const verifyDemoPayment = async (req: AuthenticatedRequest, res: Response) => {
  if (paymentMode() !== "demo") return res.status(404).json({ message: "Demo payments are disabled" });
  const sessionId = String(req.body?.sessionId || "");
  const user = req.user;
  if (!user?._id) return res.status(401).json({ message: "Unauthorized" });
  if (!sessionId.startsWith("demo_session_")) return res.status(400).json({ message: "Invalid demo session" });

  const orderId = parseDemoSession(sessionId);
  if (!orderId) return res.status(400).json({ message: "Invalid demo session" });

  const order = await getOrderForPayment(orderId, user._id);
  await publishPaymentSuccess({
    eventId: randomUUID(),
    orderId: order.orderId,
    paymentId: sessionId,
    provider: "demo",
    amount: order.amount,
    currency: order.currency,
  });

  return res.json({ message: "Demo payment accepted", orderId: order.orderId });
};

export const getStripePaymentStatus = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (paymentMode() !== "stripe") return res.status(404).json({ message: "Stripe payments are disabled" });
    const user = req.user;
    const sessionId = String(req.query.sessionId || "");
    if (!user?._id) return res.status(401).json({ message: "Unauthorized" });
    if (!sessionId) return res.status(400).json({ message: "Session ID is required" });

    const session = await requireStripe().checkout.sessions.retrieve(sessionId);
    const orderId = session.metadata?.orderId || session.client_reference_id;
    const userId = session.metadata?.userId;

    if (!orderId || userId !== user._id) return res.status(403).json({ message: "Payment session does not belong to this user" });

    return res.json({
      orderId,
      sessionId,
      paymentStatus: session.payment_status,
      webhookDriven: true,
    });
  } catch (error: any) {
    console.error("Stripe payment status error:", error?.message || error);
    return res.status(400).json({ message: "Unable to retrieve payment status" });
  }
};

export const stripeWebhook = async (req: Request, res: Response) => {
  if (paymentMode() !== "stripe") return res.status(404).send("Stripe webhooks are disabled");

  const signature = req.headers["stripe-signature"];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!signature || !webhookSecret) return res.status(400).send("Webhook configuration missing");

  try {
    const event = requireStripe().webhooks.constructEvent(req.body, signature, webhookSecret);

    if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") {
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.payment_status !== "paid") return res.status(200).json({ received: true });

      const orderId = session.metadata?.orderId || session.client_reference_id;
      const userId = session.metadata?.userId;
      if (!orderId || !userId) return res.status(400).send("Payment metadata missing");

      const paymentId = session.payment_intent ? String(session.payment_intent) : session.id;
      const order = await getOrderForPayment(orderId, userId, paymentId);
      if (session.amount_total == null || !amountsMatch(order.amount, session.amount_total, session.currency || "" , order.currency)) {
        return res.status(400).send("Payment amount or currency mismatch");
      }

      await publishPaymentSuccess({
        eventId: event.id,
        orderId,
        paymentId,
        provider: "stripe",
        amount: order.amount,
        currency: order.currency,
      });
    }

    return res.status(200).json({ received: true });
  } catch (error: any) {
    console.error("Stripe webhook error:", error?.message || error);
    return res.status(400).send("Invalid webhook");
  }
};
