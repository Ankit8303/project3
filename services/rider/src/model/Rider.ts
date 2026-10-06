import mongoose, { Schema, Document } from "mongoose";

export interface IRider extends Document {
  userId: string;
  picture: string;
  phoneNumber: string;
  aadharNumber: string;
  drivingLicenseNumber: string;
  isVerified: boolean;
  location: {
    type: "Point";
    coordinates: [number, number];
  };
  isAvailble: boolean;
  activeOrderId: string | null;
  reservationId: string | null;
  reservationExpiresAt: Date | null;
  lastActiveAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const schema = new Schema<IRider>(
  {
    userId: {
      type: String,
      required: true,
      unique: true,
    },
    picture: {
      type: String,
      required: true,
    },
    phoneNumber: {
      type: String,
      required: true,
      trim: true,
      select: false,
    },

    aadharNumber: {
      type: String,
      required: true,
      select: false,
    },
    drivingLicenseNumber: {
      type: String,
      required: true,
      select: false,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },

    location: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point",
      },
      coordinates: {
        type: [Number],
        required: true,
      },
    },

    isAvailble: {
      type: Boolean,
      default: false,
    },

    activeOrderId: {
      type: String,
      default: null,
      index: true,
    },

    reservationId: {
      type: String,
      default: null,
      index: true,
    },

    reservationExpiresAt: {
      type: Date,
      default: null,
      index: true,
    },

    lastActiveAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Supports the hot path: verified/available riders ordered by distance.
schema.index({ isAvailble: 1, isVerified: 1, location: "2dsphere" });


export const Rider = mongoose.model<IRider>("Rider", schema);
