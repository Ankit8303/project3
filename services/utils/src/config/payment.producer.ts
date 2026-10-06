import { randomUUID } from "node:crypto";
import { getChannel } from "./rabbitmq.js";

export const publishPaymentSuccess = async (payload: {
  eventId?: string;
  orderId: string;
  paymentId: string;
  provider: "stripe" | "demo";
  amount: number;
  currency: string;
}) => {
  const channel = getChannel();
  const event = {
    type: "PAYMENT_SUCCESS",
    eventId: payload.eventId || randomUUID(),
    occurredAt: new Date().toISOString(),
    data: payload,
  };

  const published = channel.sendToQueue(
    process.env.PAYMENT_QUEUE!,
    Buffer.from(JSON.stringify(event)),
    { persistent: true, contentType: "application/json", messageId: event.eventId },
  );

  if (!published) throw new Error("Payment event was not accepted by RabbitMQ");
};
