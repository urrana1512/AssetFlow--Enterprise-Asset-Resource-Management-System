import { Router } from 'express';
import {
  getBookings,
  createBooking,
  cancelBooking,
  rescheduleBooking
} from '../controllers/bookingController';
import { authenticateJWT } from '../middleware/auth';

const router = Router();

router.get('/bookings', authenticateJWT as any, getBookings as any);
router.post('/bookings', authenticateJWT as any, createBooking as any);
router.patch('/bookings/:id/cancel', authenticateJWT as any, cancelBooking as any);
router.patch('/bookings/:id/reschedule', authenticateJWT as any, rescheduleBooking as any);

export default router;
