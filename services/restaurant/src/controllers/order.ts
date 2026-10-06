import axios from "axios";
import mongoose from "mongoose";
import { AuthenticatedRequest } from "../middlewares/isAuth.js";
import TryCatch from "../middlewares/trycatch.js";
import Address from "../models/Address.js";
import Cart from "../models/Cart.js";
import { IMenuItem } from "../models/MenuItems.js";
import Order from "../models/Order.js";
import Restaurant, { IRestaurant } from "../models/Restaurant.js";
import { publishEvent } from "../config/order.publisher.js";
import {
  canCancelCustomerOrder,
  canManageRestaurantOrder,
  canReviewDeliveredOrder,
  canViewCustomerOrder,
} from "../security/authorization.js";
import { canTransitionOrder, OrderStatus } from "../domain/orderStateMachine.js";

export const createOrder = TryCatch(async (req: AuthenticatedRequest, res) => {
  const user = req.user;
  if (!user) {
    return res.status(401).json({
      message: "Unauthorized",
    });
  }

  if (user.role !== "customer") {
    return res.status(403).json({
      message: "Customer role required",
    });
  }

  const { paymentMethod = "stripe", addressId, couponCode, tipAmount = 0, deliveryInstructions } = req.body;

  if (!addressId) {
    return res.status(400).json({
      message: "Address is required",
    });
  }

  const address = await Address.findOne({
    _id: addressId,
    userId: user._id,
  });

  if (!address) {
    return res.status(404).json({
      message: "Address Not found",
    });
  }

  const getDistanceKm = (
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number => {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return +(R * c).toFixed(2);
  };

  const cartItems = await Cart.find({ userId: user._id })
    .populate<{ itemId: IMenuItem }>("itemId")
    .populate<{ restaurantId: IRestaurant }>("restaurantId");

  if (cartItems.length === 0) {
    return res.status(400).json({ message: "Cart is empty" });
  }

  const firstCartItem = cartItems[0];

  if (!firstCartItem || !firstCartItem.restaurantId) {
    return res.status(400).json({
      message: "Invailid Cart Data",
    });
  }

  const restaurantId = firstCartItem.restaurantId._id;

  const restaurant = await Restaurant.findById(restaurantId);

  if (!restaurant) {
    return res.status(404).json({
      message: "No restaurant with this id",
    });
  }

  if (!restaurant.isOpen) {
    return res.status(404).json({
      message: "Sorry this restaurant is closed for now",
    });
  }

  const distance = getDistanceKm(
    address.location.coordinates[1],
    address.location.coordinates[0],
    restaurant.autoLocation.coordinates[1],
    restaurant.autoLocation.coordinates[0]
  );

  let subtotal = 0;

  const orderItems = cartItems.map((cart) => {
    const item = cart.itemId;

    if (!item) {
      throw new Error("Invalid cart item");
    }

    const itemTotal = item.price * cart.quauntity;

    subtotal += itemTotal;

    return {
      itemId: item._id.toString(),
      name: item.name,
      price: item.price,
      quauntity: cart.quauntity,
    };
  });

  let deliveryFee = subtotal < 250 ? 49 : 0;
  const platfromFee = 7;
  let discount = 0;
  let normalizedCoupon: string | null = null;

  if (couponCode) {
    const code = String(couponCode).trim().toUpperCase();
    if (code === "WELCOME50") {
      discount = Math.min(100, Math.round(subtotal * 0.5));
      normalizedCoupon = "WELCOME50";
    } else if (code === "FREEDEL") {
      discount = deliveryFee;
      deliveryFee = 0;
      normalizedCoupon = "FREEDEL";
    } else if (code === "FLAT30" && subtotal >= 100) {
      discount = 30;
      normalizedCoupon = "FLAT30";
    }
  }

  const tip = Math.max(0, Number(tipAmount) || 0);
  const totalAmount = Math.max(0, subtotal - discount) + deliveryFee + platfromFee + tip;

  const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

  const [longitude, latitude] = address.location.coordinates;

  const riderAmount = Math.ceil(distance) * 17;

  const order = await Order.create({
    userId: user._id.toString(),
    restaurantId: restaurantId.toString(),
    restaurantName: restaurant.name,
    riderId: null,
    distance,
    riderAmount,
    items: orderItems,
    subtotal,
    deliveryFee,
    platfromFee,
    discount,
    couponCode: normalizedCoupon,
    tipAmount: tip,
    totalAmount,
    addressId: address._id.toString(),
    deliveryInstructions: deliveryInstructions ? String(deliveryInstructions).trim() : null,
    deliveryAddress: {
      fromattedAddress: address.formattedAddress,
      mobile: address.mobile,
      latitude,
      longitude,
    },

    paymentMethod,
    paymentStatus: "pending",
    status: "placed",
    deliveryOtp: Math.floor(1000 + Math.random() * 9000).toString(),
    expiresAt,
  });

  await Cart.deleteMany({ userId: user._id });

  res.json({
    message: "Order created successfully",
    orderId: order._id.toString(),
    amount: totalAmount,
  });
});

export const fetchOrderForPayment = TryCatch(async (req, res) => {
  if (req.headers["x-internal-key"] !== process.env.INTERNAL_SERVICE_KEY) {
    return res.status(403).json({
      message: "Forbidden",
    });
  }

  const requesterUserId = String(req.headers["x-user-id"] || "");
  const paymentId = String(req.headers["x-payment-id"] || "");
  if (!requesterUserId) {
    return res.status(403).json({ message: "Missing payment owner identity" });
  }

  const orderId = String(req.params.id || "");
  const order = await Order.findOne({ _id: orderId, userId: requesterUserId });

  if (!order) {
    return res.status(404).json({
      message: "Order not found",
    });
  }

  if (order.paymentStatus !== "pending") {
    if (order.paymentStatus === "paid" && paymentId && order.paymentId === paymentId) {
      return res.json({
        orderId: order._id,
        userId: order.userId,
        amount: order.totalAmount,
        currency: "INR",
        paymentStatus: order.paymentStatus,
        paymentId: order.paymentId,
      });
    }
    return res.status(409).json({ message: "Order is no longer payable" });
  }

  res.json({
    orderId: order._id,
    userId: order.userId,
    amount: order.totalAmount,
    currency: "INR",
  });
});

export const fetchRestaurantOrders = TryCatch(
  async (req: AuthenticatedRequest, res) => {
    const user = req.user;

    const { restaurantId: rawRestaurantId } = req.params;
    const restaurantId = String(rawRestaurantId || "");

    if (!user) {
      return res.status(401).json({
        message: "Unauthorized",
      });
    }

    if (!restaurantId) {
      return res.status(400).json({
        message: "Restaurant id is required",
      });
    }

    const restaurant = await Restaurant.findById(restaurantId).select("ownerId");
    if (!restaurant) {
      return res.status(404).json({ message: "Restaurant not found" });
    }

    if (!canManageRestaurantOrder(user, { userId: "", restaurantId }, restaurant.ownerId.toString())) {
      return res.status(403).json({ message: "You are not allowed to view these orders" });
    }

    const limit = req.query.limit ? Math.min(Math.max(Number(req.query.limit), 0), 100) : 50;

    const orders = await Order.find({
      restaurantId,
      paymentStatus: "paid",
    })
      .sort({ createdAt: -1 })
      .limit(limit);

    return res.json({
      success: true,
      count: orders.length,
      orders,
    });
  }
);

const ALLOWED_STATUSES: readonly OrderStatus[] = ["accepted", "preparing", "ready_for_rider"];

export const updateOrderStatus = TryCatch(
  async (req: AuthenticatedRequest, res) => {
    const user = req.user;

    const { orderId } = req.params;
    const { status } = req.body;

    if (!user) {
      return res.status(401).json({
        message: "Unauthorized",
      });
    }

    if (!ALLOWED_STATUSES.includes(status)) {
      return res.status(400).json({
        message: "Invalid order status",
      });
    }

    const order = await Order.findById(orderId);

    if (!order) {
      return res.status(404).json({
        message: "Order not found",
      });
    }

    if (order.paymentStatus !== "paid") {
      return res.status(409).json({
        message: "Order payment is not confirmed",
      });
    }

    if (!canTransitionOrder(order.status, status)) {
      return res.status(409).json({
        message: `Invalid order transition: ${order.status} -> ${status}`,
      });
    }

    const restaurant = await Restaurant.findById(order.restaurantId);

    if (!restaurant) {
      return res.status(404).json({
        message: "Restaurant not found",
      });
    }

    if (restaurant.ownerId !== user._id.toString()) {
      return res.status(401).json({
        message: "You are not allowed to update this order",
      });
    }

    const updatedOrder = await Order.findOneAndUpdate(
      { _id: String(orderId), paymentStatus: "paid", status: order.status },
      { $set: { status } },
      { new: true },
    );

    if (!updatedOrder) {
      return res.status(409).json({
        message: "Order changed concurrently; retry with the latest state",
      });
    }

    order.status = updatedOrder.status;

    await axios.post(
      `${process.env.REALTIME_SERVICE}/api/v1/internal/emit`,
      {
        event: "order:update",
        room: `user:${order.userId}`,
        payload: {
          orderId: order._id,
          status: updatedOrder.status,
        },
      },
      {
        headers: {
          "x-internal-key": process.env.INTERNAL_SERVICE_KEY,
        },
      }
    );

    // now assign riders
    if (status === "ready_for_rider") {
      console.log(
        "Publishing Order ready for rider event for order",
        order._id
      );

      await publishEvent("ORDER_READY_FOR_RIDER", {
        orderId: order._id.toString(),
        restaurantId: restaurant._id.toString(),
        location: restaurant.autoLocation,
      });

      console.log("Event Published successfully");
    }

    res.json({
      message: "order status updated successfully",
      order: updatedOrder,
    });
  }
);

export const getMyOrders = TryCatch(async (req: AuthenticatedRequest, res) => {
  if (!req.user) {
    return res.status(401).json({
      message: "Unauthorized",
    });
  }

  const orders = await Order.find({
    userId: req.user._id.toString(),
    paymentStatus: "paid",
  }).sort({ createdAt: -1 });

  res.json({ orders });
});

export const fetchSingleOrder = TryCatch(
  async (req: AuthenticatedRequest, res) => {
    if (!req.user) {
      return res.status(401).json({
        message: "Unauthorized",
      });
    }

    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({
        message: "Order not found",
      });
    }

    const isCustomerOwner = canViewCustomerOrder(req.user, order);
    let isRestaurantOwner = false;

    if (req.user.role === "seller") {
      const restaurant = await Restaurant.findById(order.restaurantId).select("ownerId");
      isRestaurantOwner = restaurant?.ownerId?.toString() === req.user._id.toString();
    }

    if (!isCustomerOwner && !isRestaurantOwner) {
      return res.status(403).json({
        message: "You are not allowed to view this order",
      });
    }

    const orderObj: any = order.toObject();

    // Attach restaurant location
    try {
      const restaurant = await Restaurant.findById(order.restaurantId);
      if (restaurant && restaurant.autoLocation?.coordinates) {
        orderObj.restaurantLocation = {
          latitude: restaurant.autoLocation.coordinates[1],
          longitude: restaurant.autoLocation.coordinates[0],
        };
      }
    } catch (e) {
      console.log("Error attaching restaurant location:", e);
    }

    // Attach rider latest known location
    if (order.riderId) {
      try {
        const rider = await mongoose.connection
          .collection("riders")
          .findOne({ _id: new mongoose.Types.ObjectId(order.riderId) });

        if (rider && rider.location?.coordinates && rider.location.coordinates.length === 2) {
          orderObj.riderLocation = {
            latitude: rider.location.coordinates[1],
            longitude: rider.location.coordinates[0],
          };
        } else if (orderObj.restaurantLocation) {
          orderObj.riderLocation = orderObj.restaurantLocation;
        }
      } catch (e) {
        console.log("Error attaching rider location:", e);
      }
    }

    if (!order.deliveryOtp) {
      order.deliveryOtp = Math.floor(1000 + Math.random() * 9000).toString();
      await order.save();
    }
    orderObj.deliveryOtp = order.deliveryOtp;

    res.json(orderObj);
  }
);

export const authorizeOrderRoom = TryCatch(async (req, res) => {
  const { orderId, userId, role } = req.body;

  if (!orderId || !userId || !role) {
    return res.status(400).json({ message: "orderId, userId and role are required" });
  }

  const order = await Order.findById(orderId).select("userId restaurantId riderId");
  if (!order) {
    return res.status(404).json({ message: "Order not found" });
  }

  if (role === "customer") {
    return res.json({ allowed: order.userId === String(userId) });
  }

  if (role === "seller") {
    const restaurant = await Restaurant.findById(order.restaurantId).select("ownerId");
    return res.json({ allowed: restaurant?.ownerId?.toString() === String(userId) });
  }

  if (role === "rider") {
    if (!order.riderId) return res.json({ allowed: false });
    const rider = await mongoose.connection.collection("riders").findOne({
      _id: new mongoose.Types.ObjectId(order.riderId),
      userId: String(userId),
    });
    return res.json({ allowed: Boolean(rider) });
  }

  return res.json({ allowed: false });
});

export const assignRiderToOrder = TryCatch(async (req, res) => {
  if (req.headers["x-internal-key"] !== process.env.INTERNAL_SERVICE_KEY) {
    return res.status(403).json({
      message: "Forbidden",
    });
  }

  const { orderId, riderId, riderUserId, riderName, riderPhone, reservationId } = req.body;

  if (!orderId || !riderId || !riderUserId || !reservationId) {
    return res.status(400).json({ message: "orderId, riderId, riderUserId and reservationId are required" });
  }

  const orderUpdated = await Order.findOneAndUpdate(
    { _id: orderId, riderId: null, status: "ready_for_rider", paymentStatus: "paid" },
    {
      riderId,
      riderName,
      riderPhone,
      status: "rider_assigned",
    },
    { new: true }
  );

  if (!orderUpdated) {
    return res.status(409).json({
      message: "Order is no longer available for rider assignment",
    });
  }

  await axios.post(
    `${process.env.REALTIME_SERVICE}/api/v1/internal/emit`,
    {
      event: "order:rider_assigned",
      room: `user:${orderUpdated.userId}`,
      payload: orderUpdated,
    },
    {
      headers: {
        "x-internal-key": process.env.INTERNAL_SERVICE_KEY,
      },
    }
  );
  await axios.post(
    `${process.env.REALTIME_SERVICE}/api/v1/internal/emit`,
    {
      event: "order:rider_assigned",
      room: `restaurant:${orderUpdated.restaurantId}`,
      payload: orderUpdated,
    },
    {
      headers: {
        "x-internal-key": process.env.INTERNAL_SERVICE_KEY,
      },
    }
  );

  res.json({
    message: "Rider Assigned Successfully",
    success: true,
    order: orderUpdated,
  });
});

export const getCurrentOrderForRider = TryCatch(async (req, res) => {
  if (req.headers["x-internal-key"] !== process.env.INTERNAL_SERVICE_KEY) {
    return res.status(403).json({
      message: "Forbidden",
    });
  }

  const { riderId } = req.query;

  if (!riderId) {
    return res.status(400).json({
      message: "Rider id is required",
    });
  }

  const order = await Order.findOne({
    riderId: riderId as string,
    status: { $in: ["rider_assigned", "picked_up"] },
  }).populate("restaurantId");

  if (!order) {
    return res.status(404).json({
      message: "Order not found",
    });
  }

  res.json(order);
});

export const updateOrderStatusRider = TryCatch(async (req, res) => {
  if (req.headers["x-internal-key"] !== process.env.INTERNAL_SERVICE_KEY) {
    return res.status(403).json({
      message: "Forbidden",
    });
  }

  const { orderId, otp, riderId } = req.body;

  if (!orderId || !riderId) {
    return res.status(400).json({ message: "orderId and riderId are required" });
  }

  const order = await Order.findOne({ _id: orderId, riderId });

  if (!order) {
    return res.status(404).json({
      message: "Order not found",
    });
  }

  if (order.status === "rider_assigned") {
    const updatedOrder = await Order.findOneAndUpdate(
      { _id: orderId, riderId, status: "rider_assigned" },
      { $set: { status: "picked_up" } },
      { new: true },
    );

    if (!updatedOrder) {
      return res.status(409).json({ message: "Order changed concurrently; retry with the latest state" });
    }

    order.status = updatedOrder.status;

    await axios.post(
      `${process.env.REALTIME_SERVICE}/api/v1/internal/emit`,
      {
        event: "order:rider_assigned",
        room: `restaurant:${order.restaurantId}`,
        payload: order,
      },
      {
        headers: {
          "x-internal-key": process.env.INTERNAL_SERVICE_KEY,
        },
      }
    );

    await axios.post(
      `${process.env.REALTIME_SERVICE}/api/v1/internal/emit`,
      {
        event: "order:rider_assigned",
        room: `user:${order.userId}`,
        payload: order,
      },
      {
        headers: {
          "x-internal-key": process.env.INTERNAL_SERVICE_KEY,
        },
      }
    );

    return res.json({
      message: "Order updated Successfully",
      order: updatedOrder,
    });
  }

  if (order.status === "picked_up") {
    // Verify delivery OTP
    if (order.deliveryOtp) {
      if (!otp) {
        return res.status(400).json({
          message: "Delivery OTP is required. Ask customer for their 4-digit code.",
        });
      }
      if (otp.toString().trim() !== order.deliveryOtp.toString().trim()) {
        return res.status(400).json({
          message: "Invalid Delivery OTP. Please verify with customer.",
        });
      }
    }

    const updatedOrder = await Order.findOneAndUpdate(
      { _id: orderId, riderId, status: "picked_up" },
      { $set: { status: "delivered" } },
      { new: true },
    );

    if (!updatedOrder) {
      return res.status(409).json({ message: "Order changed concurrently; retry with the latest state" });
    }

    order.status = updatedOrder.status;

    await axios.post(
      `${process.env.REALTIME_SERVICE}/api/v1/internal/emit`,
      {
        event: "order:rider_assigned",
        room: `restaurant:${order.restaurantId}`,
        payload: order,
      },
      {
        headers: {
          "x-internal-key": process.env.INTERNAL_SERVICE_KEY,
        },
      }
    );

    await axios.post(
      `${process.env.REALTIME_SERVICE}/api/v1/internal/emit`,
      {
        event: "order:rider_assigned",
        room: `user:${order.userId}`,
        payload: order,
      },
      {
        headers: {
          "x-internal-key": process.env.INTERNAL_SERVICE_KEY,
        },
      }
    );

    return res.json({
      message: "Order updated Successfully",
      order: updatedOrder,
    });
  }

  return res.status(409).json({ message: "Invalid rider order transition" });
});

export const getAvailableOrdersForRider = TryCatch(async (req, res) => {
  if (req.headers["x-internal-key"] !== process.env.INTERNAL_SERVICE_KEY) {
    return res.status(403).json({
      message: "Forbidden",
    });
  }

  const orders = await Order.find({
    status: "ready_for_rider",
    paymentStatus: "paid",
    riderId: null,
  }).sort({ createdAt: -1 });

  res.json({
    orders,
  });
});

export const cancelOrderCustomer = TryCatch(async (req: AuthenticatedRequest, res) => {
  const user = req.user;
  if (!user) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const { id } = req.params;
  const order = await Order.findById(id);
  if (!order) {
    return res.status(404).json({ message: "Order not found" });
  }

  if (!canCancelCustomerOrder(user, order)) {
    return res.status(403).json({ message: "You are not allowed to cancel this order" });
  }

  if (!canTransitionOrder(order.status, "cancelled")) {
    return res.status(409).json({
      message: "Order cannot be cancelled after the restaurant has accepted or started preparation",
    });
  }

  const updatedOrder = await Order.findOneAndUpdate(
    { _id: order._id, userId: user._id.toString(), status: "placed" },
    { $set: { status: "cancelled" } },
    { new: true },
  );

  if (!updatedOrder) {
    return res.status(409).json({ message: "Order changed concurrently; cancellation rejected" });
  }

  try {
    await axios.post(
      `${process.env.REALTIME_SERVICE}/api/v1/internal/emit`,
      {
        event: "order:status_update",
        room: `order:${order._id}`,
        payload: { orderId: updatedOrder._id, status: updatedOrder.status },
      },
      {
        headers: { "x-internal-key": process.env.INTERNAL_SERVICE_KEY },
      }
    );
  } catch (e) {}

  res.json({
    message: "Order cancelled successfully. Full refund initiated.",
    order: updatedOrder,
  });
});

export const submitOrderReview = TryCatch(async (req: AuthenticatedRequest, res) => {
  const user = req.user;
  if (!user) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const { id } = req.params;
  const { rating, comment = "", tags = [] } = req.body;

  if (!rating || rating < 1 || rating > 5) {
    return res.status(400).json({ message: "Please provide a rating between 1 and 5 stars" });
  }

  const order = await Order.findById(id);
  if (!order) {
    return res.status(404).json({ message: "Order not found" });
  }

  if (!canReviewDeliveredOrder(user, order)) {
    return res.status(403).json({ message: "Only the customer who owns a delivered order can review it" });
  }

  if (order.review) {
    return res.status(409).json({ message: "Order review already submitted" });
  }

  order.review = {
    rating: Number(rating),
    comment: String(comment || "").trim(),
    tags: Array.isArray(tags) ? tags : [],
    createdAt: new Date(),
  };

  await order.save();

  res.json({
    message: "Thank you! Your review has been submitted successfully ⭐",
    review: order.review,
  });
});
