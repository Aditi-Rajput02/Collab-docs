import mongoose from 'mongoose';

const MONGODB_URI = process.env.DATABASE_URL as string;

if (!MONGODB_URI) {
  throw new Error('DATABASE_URL env var is not set. Add MONGODB_URI to .env.local');
}

// Cache the connection across HMR reloads in development
declare global {
  // eslint-disable-next-line no-var
  var _mongoosePromise: Promise<typeof mongoose> | null;
}

let cached = global._mongoosePromise ?? null;

export async function connectDB(): Promise<typeof mongoose> {
  if (cached) return cached;

  const connectPromise = mongoose.connect(MONGODB_URI, {
    bufferCommands: false,
    maxPoolSize: 5,   // serverless-friendly — keep connections low
  });

  // Never cache a rejected promise — a single transient failure (cold-start
  // network blip, Atlas hiccup) would otherwise poison every request on this
  // warm Lambda instance until it's recycled, even though the DB is fine.
  connectPromise.catch(() => {
    cached = null;
    global._mongoosePromise = null;
  });

  cached = connectPromise;
  global._mongoosePromise = cached;
  return cached;
}
