import axios from "axios";
import getBuffer from "../config/datauri.js";
import { AuthenticatedRequest } from "../middlewares/isAuth.js";
import TryCatch from "../middlewares/trycatch.js";
import Restaurant from "../models/Restaurant.js";
import MenuItems from "../models/MenuItems.js";
import { cacheGet, cacheSet, cacheDel } from "../config/cache.js";

export const addMenuItem = TryCatch(async (req: AuthenticatedRequest, res) => {
  if (!req.user) {
    return res.status(401).json({
      message: "Please login",
    });
  }

  const restaurant = await Restaurant.findOne({ ownerId: req.user._id });

  if (!restaurant) {
    return res.status(404).json({
      message: "NO Restaurant found",
    });
  }

  const { name, description, price } = req.body;

  if (!name || !price) {
    return res.status(400).json({
      message: "Name and price are required",
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

  const { data: uploadResult } = await axios.post(
    `${process.env.UTILS_SERVICE}/api/upload`,
    {
      buffer: fileBuffer.content,
    },
    { headers: { "x-internal-key": process.env.INTERNAL_SERVICE_KEY } }
  );

  const item = await MenuItems.create({
    name,
    description,
    price,
    restaurantId: restaurant._id,
    image: uploadResult.url,
  });

  await cacheDel(`menu:${restaurant._id}`);

  res.json({
    message: "Item Added Successfully",
    item,
  });
});

export const getAllItems = TryCatch(async (req: AuthenticatedRequest, res) => {
  const { id } = req.params;
  if (!id) {
    return res.status(400).json({
      message: "Id is required",
    });
  }

  const cacheKey = `menu:${id}`;
  const cached = await cacheGet<any>(cacheKey);
  if (cached) {
    res.setHeader("X-Cache", "HIT");
    return res.json(cached);
  }

  const items = await MenuItems.find({ restaurantId: id });
  await cacheSet(cacheKey, items, 300); // 5 min TTL
  res.setHeader("X-Cache", "MISS");
  res.json(items);
});

export const deleteMenuItem = TryCatch(
  async (req: AuthenticatedRequest, res) => {
    if (!req.user) {
      return res.status(401).json({
        message: "Please login",
      });
    }

    const { itemId } = req.params;
    if (!itemId) {
      return res.status(400).json({
        message: "Id is required",
      });
    }

    const item = await MenuItems.findById(itemId);

    if (!item) {
      return res.status(404).json({
        message: "No item found",
      });
    }

    const restaraunt = await Restaurant.findOne({
      _id: item.restaurantId,
      ownerId: req.user._id,
    });

    if (!restaraunt) {
      return res.status(404).json({
        message: "NO Restaurant found",
      });
    }

    await item.deleteOne();
    await cacheDel(`menu:${item.restaurantId}`);

    res.json({
      message: "Menu item deleted successfully",
    });
  }
);

export const toggleMenuItemAvailability = TryCatch(
  async (req: AuthenticatedRequest, res) => {
    if (!req.user) {
      return res.status(401).json({
        message: "Please login",
      });
    }

    const { itemId } = req.params;
    if (!itemId) {
      return res.status(400).json({
        message: "Id is required",
      });
    }

    const item = await MenuItems.findById(itemId);

    if (!item) {
      return res.status(404).json({
        message: "No item found",
      });
    }

    const restaraunt = await Restaurant.findOne({
      _id: item.restaurantId,
      ownerId: req.user._id,
    });

    if (!restaraunt) {
      return res.status(404).json({
        message: "NO Restaurant found",
      });
    }

    item.isAvailable = !item.isAvailable;
    await item.save();
    await cacheDel(`menu:${item.restaurantId}`);

    res.json({
      message: `Item Marked as ${
        item.isAvailable ? "available" : "unavailable"
      }`,
      item,
    });
  }
);
