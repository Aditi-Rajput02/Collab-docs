import mongoose from 'mongoose';

// Cache the connection across HMR reloads in development and across
declare global {
  // eslint-disable-next-line no-var
  var _mongoosePromise: Promise<typeof mongoose> | null;
}

let cached = global._mongoosePromise ?? null;

export async function connectDB(): Promise<typeof mongoose> {
  const MONGODB_URI = process.env.DATABASE_URL;
  if (!MONGODB_URI) {
    throw new Error('DATABASE_URL env var is not set. Add it to .env.local');
  }

  if (cached) return cached;

  const connectPromise = mongoose.connect(MONGODB_URI, {
    bufferCommands: false,
    maxPoolSize: 5,
  });

  connectPromise.catch(() => {
    cached = null;
    global._mongoosePromise = null;
  });

  cached = connectPromise;
  global._mongoosePromise = cached;
  return cached;
}
