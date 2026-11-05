const mongoose = require('mongoose');

let isConnected = false;

/**
 * Connect to MongoDB with graceful fallback to persistent local store
 * if local MongoDB server is not running.
 */
const connectDB = async () => {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/talkme';

  try {
    // Attempt standard connection with 1.5s timeout
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 1500
    });
    isConnected = true;
    console.log(`[MongoDB] Connected successfully to: ${uri}`);
  } catch (error) {
    console.warn(`[MongoDB] Primary connection unavailable (${error.message}).`);
    console.log(`[Storage] Switched to local JSON/Memory persistence in 'server/data/' for zero-setup execution.`);
    isConnected = false;
  }

  mongoose.connection.on('error', (err) => {
    console.error('[MongoDB] Connection error:', err.message);
  });

  mongoose.connection.on('disconnected', () => {
    console.warn('[MongoDB] Disconnected from MongoDB');
    isConnected = false;
  });
};

const disconnectDB = async () => {
  try {
    if (isConnected) {
      await mongoose.disconnect();
    }
    console.log('[Database] Disconnected cleanly');
  } catch (err) {
    console.error('[Database] Error during disconnect:', err.message);
  }
};

const isDbConnected = () => isConnected;

module.exports = { connectDB, disconnectDB, isDbConnected };
