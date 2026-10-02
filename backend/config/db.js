import mongoose from 'mongoose';
import { seedDefaultAdmin } from '../controllers/authController.js';

let isConnecting = false;
let retryTimer = null;

const connectDB = async () => {
  if (isConnecting || mongoose.connection.readyState === 1) {
    return;
  }

  isConnecting = true;
  const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/retailApp';

  try {
    const conn = await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 5000,
    });
    console.log(`[MongoDB]: Successfully connected to ${conn.connection.host}/${conn.connection.name}`);
    if (retryTimer) {
      clearTimeout(retryTimer);
      retryTimer = null;
    }
    // Automatically guarantee default admin user exists
    await seedDefaultAdmin();
  } catch (error) {
    console.error(`[MongoDB Connection Error]: ${error.message}`);
    console.log('[MongoDB]: Retrying database connection in 5 seconds...');
    if (!retryTimer) {
      retryTimer = setTimeout(() => {
        retryTimer = null;
        connectDB();
      }, 5000);
    }
  } finally {
    isConnecting = false;
  }
};

mongoose.connection.on('disconnected', () => {
  console.warn('[MongoDB]: Database connection lost. Attempting to reconnect in 5 seconds...');
  if (!retryTimer) {
    retryTimer = setTimeout(() => {
      retryTimer = null;
      connectDB();
    }, 5000);
  }
});

mongoose.connection.on('error', (err) => {
  console.error(`[MongoDB Runtime Error]: ${err.message}`);
});

export default connectDB;
