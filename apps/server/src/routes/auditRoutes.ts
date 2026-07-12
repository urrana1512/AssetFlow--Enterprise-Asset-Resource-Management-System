import { Router } from 'express';
import {
  getAuditCycles,
  createAuditCycle,
  getAuditAssignments,
  verifyAuditAssignment,
  closeAuditCycle
} from '../controllers/auditController';
import { authenticateJWT, requireRole } from '../middleware/auth';
import { Role } from '@prisma/client';

const router = Router();

router.get('/audit-cycles', authenticateJWT as any, getAuditCycles as any);
router.post('/audit-cycles', authenticateJWT as any, requireRole([Role.ADMIN]) as any, createAuditCycle as any);
router.get('/audit-assignments', authenticateJWT as any, getAuditAssignments as any);
router.patch('/audit-assignments/:id/verify', authenticateJWT as any, verifyAuditAssignment as any);
router.post('/audit-cycles/:id/close', authenticateJWT as any, requireRole([Role.ADMIN]) as any, closeAuditCycle as any);

export default router;
