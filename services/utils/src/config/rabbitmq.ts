import amqp from "amqplib";

let channel: amqp.Channel;

export const connectRabbitMQ = async (retries = 10, delay = 2000): Promise<void> => {
  const rabbitUrl = process.env.RABBITMQ_URL || "amqp://admin:admin123@127.0.0.1:5672";

  for (let i = 0; i < retries; i++) {
    try {
      const connection = await amqp.connect(rabbitUrl);
      channel = await connection.createChannel();

      const paymentQueue = process.env.PAYMENT_QUEUE || "payment_event";

      await channel.assertQueue(paymentQueue, {
        durable: true,
      });

      console.log("🐇 connected To Rabbitmq(utils service)");
      return;
    } catch (err: any) {
      console.warn(`[RabbitMQ] Utils connection attempt ${i + 1}/${retries} failed: ${err.message}. Retrying in ${delay}ms...`);
      if (i === retries - 1) throw err;
      await new Promise((res) => setTimeout(res, delay));
    }
  }
};

export const getChannel = () => channel;

