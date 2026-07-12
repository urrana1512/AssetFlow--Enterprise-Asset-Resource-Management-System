import { Router } from 'express';
import {
  getDepartments,
  createDepartment,
  updateDepartment,
  deactivateDepartment,
  getCategories,
  createCategory,
  updateCategory,
  getEmployees,
  updateEmployeeRole
} from '../controllers/orgSetupController';
import { authenticateJWT, requireRole } from '../middleware/auth';
import { Role } from '@prisma/client';

const router = Router();

// Departments (Read for authenticated, modifications for Admin only)
router.get('/departments', authenticateJWT as any, getDepartments as any);
router.post('/departments', authenticateJWT as any, requireRole([Role.ADMIN]) as any, createDepartment as any);
router.patch('/departments/:id', authenticateJWT as any, requireRole([Role.ADMIN]) as any, updateDepartment as any);
router.patch('/departments/:id/deactivate', authenticateJWT as any, requireRole([Role.ADMIN]) as any, deactivateDepartment as any);

// Asset Categories (Read for authenticated, modifications for Admin only)
router.get('/categories', authenticateJWT as any, getCategories as any);
router.post('/categories', authenticateJWT as any, requireRole([Role.ADMIN]) as any, createCategory as any);
router.patch('/categories/:id', authenticateJWT as any, requireRole([Role.ADMIN]) as any, updateCategory as any);

// Employee Directory (Read for authenticated, role promotion for Admin only)
router.get('/employees', authenticateJWT as any, getEmployees as any);
router.patch('/employees/:id/role', authenticateJWT as any, requireRole([Role.ADMIN]) as any, updateEmployeeRole as any);

export default router;
