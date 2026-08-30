const mongoose = require('mongoose');

let cachedPromise = null;

async function connect() {
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  if (cachedPromise && mongoose.connection.readyState === 2) {
    return cachedPromise;
  }

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('MONGODB_URI environment variable is missing.');
  }

  mongoose.set('strictQuery', true);

  cachedPromise = mongoose.connect(uri, {
    serverSelectionTimeoutMS: 5000
  })
    .then(db => {
      console.log("Connected to MongoDB");
      return db;
    })
    .catch(err => {
      cachedPromise = null;
      console.error("Database connection error:", err);
      throw err;
    });

  return cachedPromise;
}

module.exports = connect;

