import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI;

declare global {
  var mongooseCache: {
    conn: typeof mongoose | null;
    promise: Promise<typeof mongoose> | null;
  };
}

let cached = global.mongooseCache;

if (!cached) {
  global.mongooseCache = { conn: null, promise: null };
  cached = global.mongooseCache;
}

// Ensures efficient connection to MongoDB.
// In development, Next.js hot reload would open a new connection on every change.
// This function stores the connection in a global cached avoiding duplicates.
// If the connection already exists, it returns it, if not, it creates a new one and saves it
// in the cached, and if connection fails, it clears the cached so retries can happen properly.
export const connectToDatabase = async () => {
  if (!MONGODB_URI) throw new Error("MONGODB_URI must be set within .env");

  if (cached.conn) return cached.conn;

  if (!cached.promise) {
    cached.promise = mongoose.connect(MONGODB_URI, { bufferCommands: false });
  }

  try {
    cached.conn = await cached.promise;
  } catch (error) {
    cached.promise = null;
    throw error;
  }

  console.log(`Connected to database ${process.env.NODE_ENV} - ${MONGODB_URI}`);

  return cached.conn;
};
