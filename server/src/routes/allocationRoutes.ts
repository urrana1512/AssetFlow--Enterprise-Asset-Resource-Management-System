import { Router } from 'express';
import {
  createAllocation,
  returnAllocation,
  getTransferRequests,
  createTransferRequest,
  resolveTransferRequest
} from '../controllers/allocationController';
import { authenticateJWT } from '../middleware/auth';

const router = Router();

router.post('/allocations', authenticateJWT as any, createAllocation as any);
router.post('/allocations/:id/return', authenticateJWT as any, returnAllocation as any);

router.get('/transfer-requests', authenticateJWT as any, getTransferRequests as any);
router.post('/transfer-requests', authenticateJWT as any, createTransferRequest as any);
router.patch('/transfer-requests/:id/resolve', authenticateJWT as any, resolveTransferRequest as any);

export default router;
