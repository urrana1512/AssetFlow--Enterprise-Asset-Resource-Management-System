import { Router } from 'express';
import {
  getMaintenanceRequests,
  createMaintenanceRequest,
  updateMaintenanceRequest
} from '../controllers/maintenanceController';
import { authenticateJWT } from '../middleware/auth';

const router = Router();

router.get('/maintenance-requests', authenticateJWT as any, getMaintenanceRequests as any);
router.post('/maintenance-requests', authenticateJWT as any, createMaintenanceRequest as any);
router.patch('/maintenance-requests/:id', authenticateJWT as any, updateMaintenanceRequest as any);

export default router;
