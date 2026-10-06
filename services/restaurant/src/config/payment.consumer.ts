import axios from "axios";
import Order from "../models/Order.js";
import { getChannel } from "./rabbitmq.js";

export const startPaymentConsumer = async () => {
  const channel = getChannel();

  channel.consume(process.env.PAYMENT_QUEUE!, async (msg) => {
    if (!msg) return;

    try {
      const event = JSON.parse(msg.content.toString());
      if (event.type !== "PAYMENT_SUCCESS") {
        channel.ack(msg);
        return;
      }

      const { orderId, paymentId, provider, amount, currency } = event.data || {};
      if (!orderId || !paymentId || !provider || !Number.isFinite(amount) || currency !== "INR") {
        console.error("❌ Invalid payment event", event.eventId);
        channel.reject(msg, false);
        return;
      }

      const orderBefore = await Order.findById(orderId).select("totalAmount paymentStatus paymentId");
      if (!orderBefore) {
        channel.reject(msg, false);
        return;
      }

      if (Math.round(orderBefore.totalAmount * 100) !== Math.round(amount * 100)) {
        console.error("❌ Payment amount mismatch", { orderId, expected: orderBefore.totalAmount, received: amount });
        channel.reject(msg, false);
        return;
      }

      if (orderBefore.paymentStatus === "paid") {
        channel.ack(msg);
        return;
      }

      const order = await Order.findOneAndUpdate(
        { _id: orderId, paymentStatus: "pending", paymentId: null },
        {
          $set: {
            paymentStatus: "paid",
            paymentId,
            paymentProvider: provider,
          },
          $unset: { expiresAt: 1 },
        },
        { new: true },
      );

      if (!order) {
        channel.ack(msg);
        return;
      }

      console.log("✅ Order payment confirmed:", order._id);

      await axios.post(
        `${process.env.REALTIME_SERVICE}/api/v1/internal/emit`,
        {
          event: "order:new",
          room: `restaurant:${order.restaurantId}`,
          payload: { orderId: order._id },
        },
        { headers: { "x-internal-key": process.env.INTERNAL_SERVICE_KEY } },
      );

      channel.ack(msg);
    } catch (error) {
      console.error("❌ Payment consumer error:", error);
      channel.nack(msg, false, true);
    }
  });
};
