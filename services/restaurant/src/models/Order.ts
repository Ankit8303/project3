import mongoose, { Schema, Document } from "mongoose";
import { OrderStatus } from "../domain/orderStateMachine.js";

export interface IOrder extends Document {
  userId: string;
  restaurantId: string;
  restaurantName: string;
  riderId?: string | null;
  riderPhone: number | null;
  riderName: string | null;
  distance: number;
  riderAmount: number;

  items: {
    itemId: string;
    name: string;
    price: number;
    quauntity: number;
  }[];

  subtotal: number;
  deliveryFee: number;
  platfromFee: number;
  discount?: number;
  couponCode?: string | null;
  tipAmount?: number;
  totalAmount: number;

  addressId: string;

  deliveryInstructions?: string | null;
  review?: {
    rating: number;
    comment?: string;
    tags?: string[];
    createdAt: Date;
  } | null;

  deliveryAddress: {
    fromattedAddress: string;
    mobile: number;
    latitude: number;
    longitude: number;
  };

  deliveryOtp?: string | null;

  status: OrderStatus;

  paymentMethod: "stripe";
  paymentStatus: "pending" | "paid" | "failed";
  paymentId?: string | null;
  paymentProvider?: "stripe" | "demo" | null;

  expiresAt: Date;

  createdAt: Date;
  updatedAt: Date;
}

const OrderSchema = new Schema<IOrder>(
  {
    userId: {
      type: String,
      required: true,
    },
    restaurantId: {
      type: String,
      required: true,
    },
    restaurantName: {
      type: String,
      required: true,
    },
    riderId: {
      type: String,
      default: null,
    },
    riderName: {
      type: String,
      default: null,
    },
    riderPhone: {
      type: Number,
      default: null,
    },
    riderAmount: {
      type: Number,
      required: true,
    },
    deliveryOtp: {
      type: String,
      default: null,
    },
    distance: {
      type: Number,
      required: true,
    },

    items: [
      {
        itemId: String,
        name: String,
        price: Number,
        quauntity: Number,
      },
    ],

    subtotal: Number,
    deliveryFee: Number,
    platfromFee: Number,
    discount: { type: Number, default: 0 },
    couponCode: { type: String, default: null },
    tipAmount: { type: Number, default: 0 },
    totalAmount: Number,

    addressId: {
      type: String,
      required: true,
    },

    deliveryAddress: {
      fromattedAddress: { type: String, required: true },
      mobile: { type: Number, required: true },
      latitude: Number,
      longitude: Number,
    },

    deliveryInstructions: {
      type: String,
      default: null,
    },

    review: {
      rating: { type: Number, min: 1, max: 5 },
      comment: { type: String, default: "" },
      tags: [{ type: String }],
      createdAt: { type: Date, default: Date.now },
    },

    status: {
      type: String,
      enum: [
        "placed",
        "accepted",
        "preparing",
        "ready_for_rider",
        "rider_assigned",
        "picked_up",
        "delivered",
        "cancelled",
      ],
      default: "placed",
    },

    paymentMethod: {
      type: String,
      enum: ["stripe"],
      default: "stripe",
    },

    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "failed"],
      default: "pending",
      index: true,
    },

    paymentId: {
      type: String,
      default: null,
      index: true,
      sparse: true,
    },

    paymentProvider: {
      type: String,
      enum: ["stripe", "demo"],
      default: null,
    },

    expiresAt: {
      type: Date,
      index: { expireAfterSeconds: 0 },
    },
  },
  {
    timestamps: true,
  }
);


// Compound indexes for the three highest-volume order read paths.
OrderSchema.index({ userId: 1, paymentStatus: 1, createdAt: -1 });
OrderSchema.index({ restaurantId: 1, paymentStatus: 1, createdAt: -1 });
OrderSchema.index({ status: 1, paymentStatus: 1, riderId: 1, createdAt: -1 });

export default mongoose.model<IOrder>("Order", OrderSchema);
