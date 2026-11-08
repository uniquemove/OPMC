import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { testConnection } from './config/db.js';

import authRoutes from './routes/authRoutes.js';
import challengeRoutes from './routes/challengeRoutes.js';
import workoutRoutes from './routes/workoutRoutes.js';
import runningRoutes from './routes/runningRoutes.js';
import statsRoutes from './routes/statsRoutes.js';
import uploadRoutes from './routes/uploadRoutes.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middlewares
app.use(cors({
  origin: true, // Echoes the requesting origin (e.g., https://one-punch-man-challenge.vercel.app) to allow credentials
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Clean & normalize request URLs (strips duplicate slashes: //api/... -> /api/...)
app.use((req, res, next) => {
  req.url = req.url.replace(/\/+/g, '/');
  next();
});

// Root Endpoint
app.get('/', (req, res) => {
  res.json({
    status: 'online',
    service: 'One Punch Man Challenge Backend API 🥊',
    version: '1.0.0',
    health: '/api/health',
    timestamp: new Date().toISOString(),
  });
});

// Health Check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    message: 'One Punch Man Challenge Backend API is operational! 🥊',
    timestamp: new Date().toISOString(),
  });
});

// Mount Routes
app.use('/api/auth', authRoutes);
app.use('/api/challenge', challengeRoutes);
app.use('/api/workouts', workoutRoutes);
app.use('/api/running', runningRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/upload', uploadRoutes);

// 404 Handler - Clean user-friendly message
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Đường dẫn yêu cầu không tồn tại trên hệ thống máy chủ.' });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('[Internal Server Error]', err);
  res.status(500).json({ success: false, message: 'Internal Server Error: ' + err.message });
});

// Start server
app.listen(PORT, async () => {
  console.log(`====================================================`);
  console.log(`🥊 ONE PUNCH MAN CHALLENGE API RUNNING ON PORT ${PORT}`);
  console.log(`🚀 Base URL: http://localhost:${PORT}`);
  console.log(`====================================================`);
  await testConnection();
});
