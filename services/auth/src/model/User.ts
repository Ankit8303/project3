import mongoose, { Document, Schema } from "mongoose";

export interface IUser extends Document {
  name: string;
  email: string;
  image?: string;
  role?: "customer" | "rider" | "seller" | "admin" | null;
  clerkId?: string | null;
}

const schema: Schema<IUser> = new Schema(
  {
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    image: {
      type: String,
      default: "",
    },
    role: {
      type: String,
      enum: ["customer", "rider", "seller", "admin", null],
      default: null,
    },
    clerkId: {
      type: String,
      default: null,
      unique: true,
      sparse: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

const User = mongoose.model<IUser>("User", schema);
export default User;
