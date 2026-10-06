import axios from "axios";
import getBuffer from "../config/datauri.js";
import { AuthenticatedRequest } from "../middlewares/isAuth.js";
import TryCatch from "../middlewares/trycatch.js";
import Restaurant from "../models/Restaurant.js";
import jwt from "jsonwebtoken";
import {
  cacheGet,
  cacheSet,
  cacheDel,
  cacheDelByPattern,
} from "../config/cache.js";

export const addRestraunt = TryCatch(async (req: AuthenticatedRequest, res) => {
  const user = req.user;

  if (!user) {
    return res.status(401).json({
      message: "Unauthorized",
    });
  }

  const existingRestaunrant = await Restaurant.findOne({
    ownerId: user._id,
  });

  if (existingRestaunrant) {
    return res.status(400).json({
      message: "You already have a restaurant",
    });
  }

  const { name, description, latitude, longitude, formattedAddress, phone } =
    req.body;

  if (!name || !latitude || !longitude || !phone) {
    return res.status(400).json({
      message: "Please give all details (name, phone, location)",
    });
  }

  const file = req.file;

  if (!file) {
    return res.status(400).json({
      message: "Please give image",
    });
  }

  const fileBuffer = getBuffer(file);

  if (!fileBuffer?.content) {
    return res.status(500).json({
      message: "Failed to create file buffer",
    });
  }

  let imageUrl = "";
  try {
    const { data: uploadResult } = await axios.post(
      `${process.env.UTILS_SERVICE}/api/upload`,
      {
        buffer: fileBuffer.content,
      },
      { headers: { "x-internal-key": process.env.INTERNAL_SERVICE_KEY } }
    );
    imageUrl = uploadResult.url;
  } catch (uploadErr: any) {
    const msg = uploadErr.response?.data?.message || uploadErr.message || "Failed to upload image";
    return res.status(500).json({ message: `Image upload failed: ${msg}` });
  }

  const restaurant = await Restaurant.create({
    name,
    description,
    phone: Number(phone),
    image: imageUrl,
    ownerId: user._id,
    autoLocation: {
      type: "Point",
      coordinates: [Number(longitude), Number(latitude)],
      formattedAddress,
    },
    isVerified: true,
    isOpen: true,
  });

  await cacheDelByPattern("restaurants:");

  return res.status(201).json({
    message: "Restaurant created successfully",
    restaurant,
  });
});

export const fetchMyRestaurant = TryCatch(
  async (req: AuthenticatedRequest, res) => {
    if (!req.user) {
      return res.status(401).json({
        message: "Please Login",
      });
    }
    const restaurant = await Restaurant.findOne({ ownerId: req.user._id });

    if (!restaurant) {
      return res.status(400).json({
        message: "No Restaurant found",
      });
    }

    if (!req.user.restaurantId) {
      const token = jwt.sign(
        {
          user: {
            ...req.user,
            restaurantId: restaurant._id,
          },
        },
        process.env.JWT_SEC as string,
        {
          expiresIn: "15d",
        }
      );

      return res.json({ restaurant, token });
    }

    res.json({ restaurant });
  }
);

export const updateStatusRestaurant = TryCatch(
  async (req: AuthenticatedRequest, res) => {
    if (!req.user) {
      return res.status(403).json({
        message: "Please Login",
      });
    }

    const { status } = req.body;

    if (typeof status !== "boolean") {
      return res.status(400).json({
        message: "Status must be boolean",
      });
    }

    const restaurant = await Restaurant.findOneAndUpdate(
      {
        ownerId: req.user._id,
      },
      { isOpen: status },
      { new: true }
    );

    if (!restaurant) {
      return res.status(404).json({
        message: "Restaurant not found",
      });
    }

    await cacheDelByPattern("restaurants:");
    await cacheDel(`restaurant:${restaurant._id}`);

    res.json({
      message: "Restaurant status Updated",
      restaurant,
    });
  }
);

export const updateRestaurant = TryCatch(
  async (req: AuthenticatedRequest, res) => {
    if (!req.user) {
      return res.status(403).json({
        message: "Please Login",
      });
    }

    const { name, description } = req.body;

    const restaurant = await Restaurant.findOneAndUpdate(
      { ownerId: req.user._id },
      { name: name, description: description },
      { new: true }
    );

    if (!restaurant) {
      return res.status(404).json({
        message: "Restaurant not found",
      });
    }

    await cacheDelByPattern("restaurants:");
    await cacheDel(`restaurant:${restaurant._id}`);

    res.json({
      message: "Restaurant Updated",
      restaurant,
    });
  }
);

export const getNearbyRestaurant = TryCatch(async (req, res) => {
  const { latitude, longitude, radius = 50000, search = "" } = req.query;

  if (!latitude || !longitude) {
    return res.status(400).json({
      message: "Latitude and longitude are required",
    });
  }

  // Cache lookup (neighborhood rounded coordinates to share cache across close users)
  const normLat = Number(latitude).toFixed(3);
  const normLng = Number(longitude).toFixed(3);
  const cacheKey = `restaurants:${normLat}:${normLng}:${radius}:${search || "all"}`;

  const cached = await cacheGet<any>(cacheKey);
  if (cached) {
    res.setHeader("X-Cache", "HIT");
    return res.json(cached);
  }

  const query: any = {
    isVerified: true,
  };

  if (search && typeof search === "string") {
    query.name = { $regex: search, $options: "i" };
  }

  let restaurants = await Restaurant.aggregate([
    {
      $geoNear: {
        near: {
          type: "Point",
          coordinates: [Number(longitude), Number(latitude)],
        },
        distanceField: "distance",
        maxDistance: Number(radius),
        spherical: true,
        query,
      },
    },
    {
      $sort: {
        isOpen: -1,
        distance: 1,
      },
    },
    {
      $addFields: {
        distanceKm: {
          $round: [{ $divide: ["$distance", 1000] }, 2],
        },
      },
    },
  ]);

  // If no restaurants found within strict radius, show all verified restaurants
  if (restaurants.length === 0) {
    const fallbackList = await Restaurant.find(query).sort({ isOpen: -1, createdAt: -1 });
    restaurants = fallbackList.map((r) => {
      const doc = r.toObject();
      return {
        ...doc,
        distance: 1500,
        distanceKm: 1.5,
      };
    });
  }

  const responsePayload = {
    success: true,
    count: restaurants.length,
    restaurants,
  };

  // Cache for 60 seconds
  await cacheSet(cacheKey, responsePayload, 60);

  res.setHeader("X-Cache", "MISS");
  res.json(responsePayload);
});

export const fetchSingleRestaurant = TryCatch(async (req, res) => {
  const cacheKey = `restaurant:${req.params.id}`;
  const cached = await cacheGet<any>(cacheKey);
  if (cached) {
    res.setHeader("X-Cache", "HIT");
    return res.json(cached);
  }

  const restaurant = await Restaurant.findById(req.params.id);
  if (restaurant) {
    await cacheSet(cacheKey, restaurant, 300); // 5 min TTL
  }

  res.setHeader("X-Cache", "MISS");
  res.json(restaurant);
});
