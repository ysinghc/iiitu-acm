/**
 * Mongo connection with serverless-friendly caching.
 * Single choke point so every request path shares one pool.
 */
const mongoose = require('mongoose');
const env = require('./env');

let cachedPromise = null;

async function connectDb() {
  if (mongoose.connection.readyState === 1) return mongoose.connection;
  if (cachedPromise && mongoose.connection.readyState === 2) return cachedPromise;

  if (!env.mongoUri) {
    throw new Error('MONGODB_URI environment variable is missing.');
  }

  mongoose.set('strictQuery', true);
  cachedPromise = mongoose
    .connect(env.mongoUri, { serverSelectionTimeoutMS: 5000 })
    .then((db) => {
      console.log('Connected to MongoDB');
      return db;
    })
    .catch((err) => {
      cachedPromise = null;
      console.error('Database connection error:', err.message);
      throw err;
    });

  return cachedPromise;
}

module.exports = connectDb;
