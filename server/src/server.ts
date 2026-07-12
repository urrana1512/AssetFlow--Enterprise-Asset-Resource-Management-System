import express from 'express';
import { createServer } from 'http';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import multer from 'multer';

// Load Environment Variables
dotenv.config();

import { initSocketServer } from './sockets/socket';
import { startOverdueCheckCron } from './jobs/overdueCheck';
import { errorHandler } from './middleware/errorHandler';

// Import Routes
import authRoutes from './routes/authRoutes';
import orgSetupRoutes from './routes/orgSetupRoutes';
import assetRoutes from './routes/assetRoutes';
import allocationRoutes from './routes/allocationRoutes';
import bookingRoutes from './routes/bookingRoutes';
import maintenanceRoutes from './routes/maintenanceRoutes';
import auditRoutes from './routes/auditRoutes';
import reportRoutes from './routes/reportRoutes';
import notificationRoutes from './routes/notificationRoutes';

const app = express();
const httpServer = createServer(app);

// Initialize Socket.io
initSocketServer(httpServer);

// Middleware
app.use(cors({ origin: '*' })); // Allow React Client
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Setup Static Upload Folders
const publicDir = path.join(__dirname, '..', 'public');
const uploadsDir = path.join(publicDir, 'uploads');
const filesDir = path.join(uploadsDir, 'files');

if (!fs.existsSync(filesDir)) {
  fs.mkdirSync(filesDir, { recursive: true });
}

app.use('/uploads', express.static(uploadsDir));

// Multer Storage Configuration (Cloudinary local mock fallback)
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, filesDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({ storage });

// Local File Upload Endpoint
app.post('/api/v1/upload', upload.single('file'), (req: any, res: any) => {
  if (!req.file) {
    res.status(400).json({ message: 'No file uploaded' });
    return;
  }
  const fileUrl = `http://localhost:5000/uploads/files/${req.file.filename}`;
  res.json({ url: fileUrl });
});

// Mount Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1', orgSetupRoutes);
app.use('/api/v1/assets', assetRoutes);
app.use('/api/v1', allocationRoutes);
app.use('/api/v1', bookingRoutes);
app.use('/api/v1', maintenanceRoutes);
app.use('/api/v1', auditRoutes);
app.use('/api/v1/reports', reportRoutes);
app.use('/api/v1', notificationRoutes);

// Global Error Handler
app.use(errorHandler as any);

// Start Cron Overdue Checks
startOverdueCheckCron();

// Start Server
const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => {
  console.log(`[SERVER RUNNING]: Listening on http://localhost:${PORT}`);
});
