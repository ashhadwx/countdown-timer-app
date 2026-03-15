/**
 * MongoDB connection. Connect on startup, disconnect on shutdown.
 */
import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI || process.env.DATABASE_URL;

if (!MONGODB_URI) {
  throw new Error("MONGODB_URI or DATABASE_URL must be set in environment");
}

export async function connectMongo() {
  await mongoose.connect(MONGODB_URI);
}

export async function disconnectMongo() {
  await mongoose.disconnect();
}

export default mongoose;
