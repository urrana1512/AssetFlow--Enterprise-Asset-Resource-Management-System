import { Router } from 'express';
import {
  getUtilizationReport,
  getMaintenanceFrequencyReport,
  getUpcomingMaintenanceOrRetirement,
  getDepartmentAllocationReport,
  getBookingHeatmap,
  exportReportCSV,
  getDashboardData
} from '../controllers/reportController';
import { authenticateJWT } from '../middleware/auth';

const router = Router();

router.get('/dashboard', authenticateJWT as any, getDashboardData as any);
router.get('/utilization', authenticateJWT as any, getUtilizationReport as any);
router.get('/maintenance-frequency', authenticateJWT as any, getMaintenanceFrequencyReport as any);
router.get('/upcoming-maintenance-or-retirement', authenticateJWT as any, getUpcomingMaintenanceOrRetirement as any);
router.get('/department-allocation', authenticateJWT as any, getDepartmentAllocationReport as any);
router.get('/booking-heatmap', authenticateJWT as any, getBookingHeatmap as any);
router.get('/export', authenticateJWT as any, exportReportCSV as any);

export default router;
