import { neon } from '@neondatabase/serverless';

// Simple Neon client factory. Uses DATABASE_URL from env.
// In development, uses DEV_DATABASE_URL if available, otherwise falls back to DATABASE_URL
export const getDb = () => {
  let connectionString = process.env.DATABASE_URL;
  
  // Use development database if in development mode and DEV_DATABASE_URL is set
  if (process.env.NODE_ENV === 'development' && process.env.DEV_DATABASE_URL) {
    connectionString = process.env.DEV_DATABASE_URL;
  }
  
  if (!connectionString) {
    throw new Error('DATABASE_URL is not set. Add it to your environment.');
  }
  return neon(connectionString);
};
