import axios from "axios";
import { randomUUID } from "node:crypto";
import getBuffer from "../config/datauri.js";
import { AuthenticatedRequest } from "../middlewares/isAuth.js";
import TryCatch from "../middlewares/trycatch.js";
import { Rider } from "../model/Rider.js";
import { decryptPii, encryptPii, maskPii } from "../security/pii.js";

export const addRiderProfile = TryCatch(
  async (req: AuthenticatedRequest, res) => {
    const user = req.user;

    if (!user) {
      return res.status(401).json({
        message: "Unauthorized",
      });
    }

    if (user.role !== "rider") {
      return res.status(403).json({
        message: "Only riders can create rider profile",
      });
    }

    const file = req.file;

    if (!file) {
      return res.status(400).json({
        message: "Rider Image is required",
      });
    }

    const fileBuffer = getBuffer(file);

    if (!fileBuffer?.content) {
      return res.status(500).json({
        message: "Failed to generate image buffer",
      });
    }

    const { data: uploadResult } = await axios.post(
      `${process.env.UTILS_SERVICE}/api/upload`,
      {
        buffer: fileBuffer.content,
      },
      { headers: { "x-internal-key": process.env.INTERNAL_SERVICE_KEY } }
    );

    const {
      phoneNumber,
      aadharNumber,
      drivingLicenseNumber,
      latitude,
      longitude,
    } = req.body;

    if (
      !phoneNumber ||
      !aadharNumber ||
      !drivingLicenseNumber ||
      latitude === undefined ||
      longitude === undefined
    ) {
      return res.status(400).json({
        message: "All fields are required",
      });
    }

    const existingProfile = await Rider.findOne({
      userId: user._id,
    });

    if (existingProfile) {
      return res.status(400).json({
        message: "Rider profile already exists",
      });
    }

    const riderProfile = await Rider.create({
      userId: user._id,
      picture: uploadResult.url,
      phoneNumber: encryptPii(String(phoneNumber)),
      aadharNumber: encryptPii(String(aadharNumber)),
      drivingLicenseNumber: encryptPii(String(drivingLicenseNumber)),
      location: {
        type: "Point",
        coordinates: [longitude, latitude],
      },
      isAvailble: false,
      activeOrderId: null,
      reservationId: null,
      reservationExpiresAt: null,
      isVerified: false,
    });

    return res.status(201).json({
      message: "Rider profile created successfully",
      riderProfile: {
        id: riderProfile._id,
        userId: riderProfile.userId,
        picture: riderProfile.picture,
        phoneNumber: maskPii(String(phoneNumber)),
        isVerified: riderProfile.isVerified,
        location: riderProfile.location,
        isAvailble: riderProfile.isAvailble,
      },
    });
  }
);

export const fetchMyProfile = TryCatch(
  async (req: AuthenticatedRequest, res) => {
    const user = req.user;

    if (!user) {
      return res.status(401).json({
        message: "Unauthorized",
      });
    }

    const account = await Rider.findOne({ userId: user._id }).select("+phoneNumber +aadharNumber +drivingLicenseNumber");
    if (!account) return res.status(404).json({ message: "Rider profile not found" });

    res.json({
      id: account._id,
      userId: account.userId,
      picture: account.picture,
      phoneNumber: decryptPii(account.phoneNumber),
      isVerified: account.isVerified,
      location: account.location,
      isAvailble: account.isAvailble,
      activeOrderId: account.activeOrderId,
      lastActiveAt: account.lastActiveAt,
    });
  }
);

export const toggleRiderAvailablity = TryCatch(
  async (req: AuthenticatedRequest, res) => {
    const user = req.user;

    if (!user) {
      return res.status(401).json({
        message: "Unauthorized",
      });
    }

    if (user.role !== "rider") {
      return res.status(403).json({
        message: "Only riders can create rider profile",
      });
    }

    const { isAvailble, latitude, longitude } = req.body;

    if (typeof isAvailble !== "boolean") {
      return res.status(400).json({
        message: "isAvailble must be boolean",
      });
    }

    if (latitude === undefined || longitude === undefined) {
      return res.status(400).json({
        message: "location is required",
      });
    }

    const rider = await Rider.findOne({
      userId: user._id,
    });

    if (!rider) {
      return res.status(404).json({
        message: "Rider profile not found",
      });
    }

    if (isAvailble && !rider.isVerified) {
      return res.status(403).json({
        message: "Rider is not verified",
      });
    }

    if (isAvailble && rider.activeOrderId) {
      return res.status(409).json({
        message: "Rider has an active delivery",
      });
    }

    if (!isAvailble && rider.activeOrderId) {
      return res.status(409).json({
        message: "Complete the active delivery before going offline",
      });
    }

    rider.isAvailble = isAvailble;

    rider.location = {
      type: "Point",
      coordinates: [longitude, latitude],
    };
    rider.lastActiveAt = new Date();

    await rider.save();

    res.json({
      message: isAvailble ? "Rider is now online" : "Rider is now offline",
      rider,
    });
  }
);

export const acceptOrder = TryCatch(async (req: AuthenticatedRequest, res) => {
  const riderUserId = req.user?._id;
  const { orderId } = req.params;

  if (!riderUserId || !orderId) {
    return res.status(400).json({ message: "rider and order are required" });
  }

  // Recover an abandoned reservation before attempting a new claim. The
  // restaurant service is authoritative for whether the order was actually assigned.
  const existingRider = await Rider.findOne({ userId: riderUserId });
  if (!existingRider) {
    return res.status(404).json({ message: "Rider profile not found" });
  }

  if (existingRider.activeOrderId) {
    const reservationExpired =
      existingRider.reservationExpiresAt !== null &&
      existingRider.reservationExpiresAt.getTime() < Date.now();

    if (!reservationExpired) {
      return res.status(409).json({ message: "Rider already has an active delivery" });
    }

    try {
      await axios.get(
        `${process.env.RESTAURANT_SERVICE}/api/order/current/rider?riderId=${existingRider._id}`,
        {
          headers: { "x-internal-key": process.env.INTERNAL_SERVICE_KEY },
          timeout: 5_000,
        },
      );
      return res.status(409).json({ message: "Rider already has an active delivery" });
    } catch (reconciliationError: any) {
      if (reconciliationError.response?.status !== 404) {
        return res.status(503).json({ message: "Unable to reconcile rider delivery state" });
      }

      await Rider.findOneAndUpdate(
        { userId: riderUserId, activeOrderId: existingRider.activeOrderId, reservationExpiresAt: { $lt: new Date() } },
        { $set: { activeOrderId: null, reservationId: null, reservationExpiresAt: null, isAvailble: true } },
      );
    }
  }

  const reservationId = randomUUID();
  const reservationExpiresAt = new Date(Date.now() + 30_000);

  // Reserve the rider atomically. A rider can never reserve two orders.
  const rider = await Rider.findOneAndUpdate(
    {
      userId: riderUserId,
      isAvailble: true,
      isVerified: true,
      activeOrderId: null,
      $or: [
        { reservationId: null },
        { reservationExpiresAt: { $lt: new Date() } },
      ],
    },
    {
      $set: {
        activeOrderId: orderId,
        reservationId,
        reservationExpiresAt,
        isAvailble: false,
        lastActiveAt: new Date(),
      },
    },
    { new: true },
  );

  if (!rider) {
    return res.status(409).json({
      message: "Rider is unavailable or already has an active delivery",
    });
  }

  try {
    const riderContact = await Rider.findById(rider._id).select("+phoneNumber");
    if (!riderContact) throw new Error("Rider contact record unavailable");

    const { data } = await axios.put(
      `${process.env.RESTAURANT_SERVICE}/api/order/assign/rider`,
      {
        orderId,
        riderId: rider._id.toString(),
        riderUserId: rider.userId,
        riderName: req.user?.name || "Delivery Partner",
        riderPhone: decryptPii(riderContact.phoneNumber),
        reservationId,
      },
      {
        headers: {
          "x-internal-key": process.env.INTERNAL_SERVICE_KEY,
        },
        timeout: 10_000,
      },
    );

    if (!data.success) {
      throw new Error("Rider assignment was not accepted");
    }

    await Rider.findOneAndUpdate(
      { userId: riderUserId, activeOrderId: orderId, reservationId },
      { $set: { reservationId: null, reservationExpiresAt: null } },
    );

    return res.json({ message: "Order accepted", order: data.order });
  } catch (error: any) {
    // A timeout can mean the restaurant service committed the assignment but
    // the response was lost. Reconcile before releasing the rider reservation.
    try {
      const { data } = await axios.get(
        `${process.env.RESTAURANT_SERVICE}/api/order/current/rider?riderId=${rider._id}`,
        {
          headers: { "x-internal-key": process.env.INTERNAL_SERVICE_KEY },
          timeout: 5_000,
        },
      );

      if (data?._id && String(data._id) === String(orderId)) {
        await Rider.findOneAndUpdate(
          { userId: riderUserId, activeOrderId: orderId, reservationId },
          { $set: { reservationId: null, reservationExpiresAt: null } },
        );
        return res.json({ message: "Order accepted", order: data });
      }
    } catch (reconciliationError: any) {
      if (reconciliationError.response?.status === 404) {
        await Rider.findOneAndUpdate(
          { userId: riderUserId, activeOrderId: orderId, reservationId },
          {
            $set: { activeOrderId: null, reservationId: null, reservationExpiresAt: null, isAvailble: true },
          },
        );

        const status = error.response?.status;
        return res.status(status && status >= 400 && status < 500 ? status : 409).json({
          message: error.response?.data?.message || "Order is no longer available",
        });
      }

      // Assignment state is unknown. Keep the reservation instead of risking
      // a second delivery assignment; reconciliation can safely retry later.
      return res.status(503).json({
        message: "Assignment state is uncertain; please retry shortly",
      });
    }
  }
});

export const fetchMyCurrentOrder = TryCatch(
  async (req: AuthenticatedRequest, res) => {
    const riderUserId = req.user?._id;

    if (!riderUserId) {
      return res.status(400).json({
        message: "Please Login",
      });
    }

    const rider = await Rider.findOne({
      userId: riderUserId,
      isVerified: true,
    });

    if (!rider) {
      return res.status(404).json({ message: "rider not found" });
    }

    try {
      const { data } = await axios.get(
        `${process.env.RESTAURANT_SERVICE}/api/order/current/rider?riderId=${rider._id}`,
        {
          headers: {
            "x-internal-key": process.env.INTERNAL_SERVICE_KEY,
          },
        }
      );

      res.json({
        order: data,
      });
    } catch (error: any) {
      res.status(500).json({
        message: error.response.data.message,
      });
    }
  }
);

export const updateOrderStatus = TryCatch(
  async (req: AuthenticatedRequest, res) => {
    const userId = req.user?._id;

    if (!userId) {
      return res.status(401).json({
        message: "Please Login",
      });
    }

    const rider = await Rider.findOne({ userId: userId });

    if (!rider) {
      return res.status(404).json({
        message: "Please Login",
      });
    }

    const { orderId } = req.params;
    const { otp } = req.body;

    try {
      const { data } = await axios.put(
        `${process.env.RESTAURANT_SERVICE}/api/order/update/status/rider`,
        { orderId, otp, riderId: rider._id.toString() },
        {
          headers: {
            "x-internal-key": process.env.INTERNAL_SERVICE_KEY,
          },
        }
      );

      if (data.order?.status === "delivered") {
        await Rider.findOneAndUpdate(
          { userId: userId, activeOrderId: String(orderId) },
          { $set: { activeOrderId: null, reservationId: null, reservationExpiresAt: null, isAvailble: true, lastActiveAt: new Date() } },
        );
      }

      res.json({
        message: data.message,
        order: data.order,
      });
    } catch (error: any) {
      console.log(error);
      const status = error.response?.status || 500;
      res.status(status).json({
        message: error.response?.data?.message || "Failed to update status",
      });
    }
  }
);

export const fetchAvailableOrders = TryCatch(
  async (req: AuthenticatedRequest, res) => {
    const userId = req.user?._id;

    if (!userId) {
      return res.status(401).json({
        message: "Please Login",
      });
    }

    const rider = await Rider.findOne({ userId: userId });

    if (!rider) {
      return res.status(404).json({
        message: "Rider profile not found",
      });
    }

    if (rider.activeOrderId) {
      return res.json({ orders: [] });
    }

    try {
      const { data } = await axios.get(
        `${process.env.RESTAURANT_SERVICE}/api/order/available/rider`,
        {
          headers: {
            "x-internal-key": process.env.INTERNAL_SERVICE_KEY,
          },
        }
      );

      res.json({
        orders: data.orders || [],
      });
    } catch (error: any) {
      res.status(500).json({
        message: error.response?.data?.message || "Failed to fetch orders",
      });
    }
  }
);
