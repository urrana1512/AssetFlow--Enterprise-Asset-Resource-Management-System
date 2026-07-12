import { Router } from 'express';
import {
  getNotifications,
  markNotificationRead,
  getActivityLogs
} from '../controllers/notificationController';
import { authenticateJWT, requireRole } from '../middleware/auth';
import { Role } from '@prisma/client';

const router = Router();

router.get('/notifications', authenticateJWT as any, getNotifications as any);
router.patch('/notifications/:id/read', authenticateJWT as any, markNotificationRead as any);
router.get('/activity-logs', authenticateJWT as any, requireRole([Role.ADMIN, Role.ASSET_MANAGER]) as any, getActivityLogs as any);

export default router;
