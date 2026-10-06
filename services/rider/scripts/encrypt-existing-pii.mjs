import "dotenv/config";
import mongoose from "mongoose";
import { encryptPii } from "./dist/security/pii.js";

const uri = process.env.MONGO_URI;
if (!uri) throw new Error("MONGO_URI is required");

await mongoose.connect(uri);
const collection = mongoose.connection.collection("riders");
const cursor = collection.find({}, { projection: { aadharNumber: 1, drivingLicenseNumber: 1, phoneNumber: 1 } });
let migrated = 0;
for await (const rider of cursor) {
  const $set = {};
  for (const field of ["phoneNumber", "aadharNumber", "drivingLicenseNumber"]) {
    const value = rider[field];
    if (typeof value === "string" && !value.startsWith("v1.")) $set[field] = encryptPii(value);
  }
  if (Object.keys($set).length) {
    await collection.updateOne({ _id: rider._id }, { $set });
    migrated += 1;
  }
}
await mongoose.disconnect();
console.log(`Encrypted PII for ${migrated} rider records`);
