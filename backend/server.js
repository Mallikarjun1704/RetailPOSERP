import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import connectDB from './config/db.js';

// Resolve __dirname in ES module syntax
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configurations - load .env relative to server.js
dotenv.config({ path: path.join(__dirname, '.env') });
const app = express();
const PORT = process.env.PORT || 5000;

// Ensure upload directory exists safely in writable user data or local dir
const uploadDir = process.env.USER_DATA_PATH
  ? path.join(process.env.USER_DATA_PATH, 'uploads')
  : path.join(__dirname, 'uploads');

if (!fs.existsSync(uploadDir)) {
  try {
    fs.mkdirSync(uploadDir, { recursive: true });
  } catch (err) {
    console.warn(`[Server Warning]: Could not create uploads directory at ${uploadDir}: ${err.message}`);
  }
}

// Import Route Files
import authRoutes from './routes/authRoutes.js';
import categoryRoutes from './routes/categoryRoutes.js';
import brandRoutes from './routes/brandRoutes.js';
import productRoutes from './routes/productRoutes.js';
import couponRoutes from './routes/couponRoutes.js';
import customerRoutes from './routes/customerRoutes.js';
import supplierRoutes from './routes/supplierRoutes.js';
import billingRoutes from './routes/billingRoutes.js';
import reportRoutes from './routes/reportRoutes.js';
import systemRoutes from './routes/systemRoutes.js';

// Middlewares
app.use(cors({
  origin: '*', // Allow local Electron frame connections
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization', 'authorization']
}));
app.use(express.json({ limit: '50mb' })); // Support larger base64 payloads/backups
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Static upload pathing
app.use('/uploads', express.static(uploadDir));

// Connect database
connectDB();

// API Namespace Mounting
app.use('/api/auth', authRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/brands', brandRoutes);
app.use('/api/products', productRoutes);
app.use('/api/coupons', couponRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/suppliers', supplierRoutes);
app.use('/api/billing', billingRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/system', systemRoutes);

// Server Connection health endpoint
app.get('/api/health', (req, res) => {
  const isDbConnected = mongoose.connection.readyState === 1;
  res.json({
    status: isDbConnected ? 'OK' : 'DEGRADED',
    database: isDbConnected ? 'Connected' : 'Disconnected',
    message: isDbConnected
      ? 'RetailPOS Backend is operating normally'
      : 'Backend running, but MongoDB connection is currently reconnecting...',
    time: new Date()
  });
});

// Root fallback (for Electron main framework verification)
app.get('/', (req, res) => {
  res.send('Tech Mart RetailPOS Express Backend API Server is active.');
});

// Error handling middleware
app.use((err, req, res, next) => {
  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  res.status(statusCode).json({
    success: false,
    message: err.message,
    stack: process.env.NODE_ENV === 'production' ? null : err.stack
  });
});

const server = app.listen(PORT, '127.0.0.1', () => {
  console.log(`RetailPOS server running in local offline mode at http://127.0.0.1:${PORT}`);
});

// Graceful shutdown handling
const handleShutdown = () => {
  console.log('[Server]: Closing HTTP server and database connections...');
  server.close(() => {
    mongoose.connection.close(false).then(() => {
      process.exit(0);
    });
  });
};

process.on('SIGTERM', handleShutdown);
process.on('SIGINT', handleShutdown);

