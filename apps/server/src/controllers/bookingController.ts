import { Response } from 'express';
import prisma from '../lib/prisma';
import { logActivity, createNotification } from '../services/loggerService';
import { AuthenticatedRequest } from '../middleware/auth';
import { BookingStatus, Role } from '@prisma/client';

export async function getBookings(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { assetId, date } = req.query;

    const where: any = {};
    if (assetId) {
      where.assetId = String(assetId);
    }

    if (date) {
      const searchDate = new Date(String(date));
      const startOfDay = new Date(searchDate.setHours(0, 0, 0, 0));
      const endOfDay = new Date(searchDate.setHours(23, 59, 59, 999));

      where.startTime = {
        gte: startOfDay,
      };
      where.endTime = {
        lte: endOfDay,
      };
    }

    const bookings = await prisma.booking.findMany({
      where,
      include: {
        asset: {
          select: { id: true, name: true, assetTag: true, isBookable: true },
        },
        bookedBy: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: { startTime: 'asc' },
    });

    res.json(bookings);
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Failed to fetch bookings' });
  }
}

export async function createBooking(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { assetId, startTime, endTime } = req.body;

    if (!assetId || !startTime || !endTime) {
      res.status(400).json({ message: 'Asset ID, Start Time, and End Time are required' });
      return;
    }

    const start = new Date(startTime);
    const end = new Date(endTime);

    if (start >= end) {
      res.status(400).json({ message: 'Start time must be before end time' });
      return;
    }

    if (!req.user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    // Atomic transaction checking overlap
    const result = await prisma.$transaction(async (tx) => {
      // 1. Verify asset is bookable
      const asset = await tx.asset.findUnique({
        where: { id: assetId },
      });

      if (!asset) {
        throw new Error('ASSET_NOT_FOUND');
      }

      if (!asset.isBookable) {
        throw new Error('ASSET_NOT_BOOKABLE');
      }

      // 2. Query overlapping bookings
      const conflicting = await tx.booking.findFirst({
        where: {
          assetId,
          status: { not: BookingStatus.CANCELLED },
          startTime: { lt: end },
          endTime: { gt: start },
        },
        include: {
          bookedBy: { select: { name: true } },
        },
      });

      if (conflicting) {
        throw conflicting; // Throw conflicting booking details to catch block
      }

      // 3. Create booking
      const newBooking = await tx.booking.create({
        data: {
          assetId,
          bookedById: req.user!.id,
          startTime: start,
          endTime: end,
          status: BookingStatus.UPCOMING,
        },
        include: {
          asset: { select: { name: true, assetTag: true } },
        },
      });

      return newBooking;
    });

    await logActivity(req.user.id, 'CREATE_BOOKING', 'Booking', result.id, {
      assetTag: result.asset.assetTag,
      startTime: result.startTime,
      endTime: result.endTime,
    });

    await createNotification(
      req.user.id,
      'booking_confirmed',
      `Booking confirmed for ${result.asset.name} (${result.asset.assetTag}) from ${start.toLocaleString()} to ${end.toLocaleString()}.`
    );

    res.status(201).json(result);
  } catch (error: any) {
    if (error.message === 'ASSET_NOT_FOUND') {
      res.status(404).json({ message: 'Asset not found' });
      return;
    }

    if (error.message === 'ASSET_NOT_BOOKABLE') {
      res.status(400).json({ message: 'This asset is not registered as a bookable resource.' });
      return;
    }

    // Check if error is a conflicting booking object
    if (error.startTime && error.endTime) {
      res.status(409).json({
        message: 'Conflict: Asset is already booked during this time window.',
        conflictingBooking: {
          id: error.id,
          bookedBy: error.bookedBy?.name || 'Another employee',
          startTime: error.startTime,
          endTime: error.endTime,
        },
      });
      return;
    }

    res.status(500).json({ message: error.message || 'Failed to create booking' });
  }
}

export async function cancelBooking(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const id = req.params.id as string;

    const booking = await prisma.booking.findUnique({
      where: { id },
      include: {
        asset: { select: { name: true, assetTag: true } },
      },
    });

    if (!booking) {
      res.status(404).json({ message: 'Booking not found' });
      return;
    }

    // Role check: Only the bookedBy user, Asset Managers, or Admins can cancel
    if (
      req.user &&
      booking.bookedById !== req.user.id &&
      req.user.role !== Role.ADMIN &&
      req.user.role !== Role.ASSET_MANAGER
    ) {
      res.status(403).json({ message: 'Access forbidden: You cannot cancel someone else\'s booking' });
      return;
    }

    const updated = await prisma.booking.update({
      where: { id },
      data: { status: BookingStatus.CANCELLED },
    });

    if (req.user) {
      await logActivity(req.user.id, 'CANCEL_BOOKING', 'Booking', id, {
        assetTag: booking.asset.assetTag,
      });

      await createNotification(
        booking.bookedById,
        'booking_cancelled',
        `Your booking for ${booking.asset.name} (${booking.asset.assetTag}) was cancelled.`
      );
    }

    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Failed to cancel booking' });
  }
}

export async function rescheduleBooking(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const id = req.params.id as string;
    const { startTime, endTime } = req.body;

    if (!startTime || !endTime) {
      res.status(400).json({ message: 'Start time and end time are required for rescheduling' });
      return;
    }

    const start = new Date(startTime);
    const end = new Date(endTime);

    if (start >= end) {
      res.status(400).json({ message: 'Start time must be before end time' });
      return;
    }

    const booking = await prisma.booking.findUnique({
      where: { id },
      include: {
        asset: { select: { name: true, assetTag: true } },
      },
    });

    if (!booking) {
      res.status(404).json({ message: 'Booking not found' });
      return;
    }

    if (
      req.user &&
      booking.bookedById !== req.user.id &&
      req.user.role !== Role.ADMIN &&
      req.user.role !== Role.ASSET_MANAGER
    ) {
      res.status(403).json({ message: 'Access forbidden: You cannot reschedule someone else\'s booking' });
      return;
    }

    // Check overlap in transaction
    const result = await prisma.$transaction(async (tx) => {
      // Query conflicts excluding the current booking itself
      const conflicting = await tx.booking.findFirst({
        where: {
          assetId: booking.assetId,
          id: { not: id },
          status: { not: BookingStatus.CANCELLED },
          startTime: { lt: end },
          endTime: { gt: start },
        },
        include: {
          bookedBy: { select: { name: true } },
        },
      });

      if (conflicting) {
        throw conflicting;
      }

      const updated = await tx.booking.update({
        where: { id },
        data: {
          startTime: start,
          endTime: end,
          status: BookingStatus.UPCOMING, // Reset status to upcoming if it was ongoing/completed
        },
      });

      return updated;
    });

    if (req.user) {
      await logActivity(req.user.id, 'RESCHEDULE_BOOKING', 'Booking', id, {
        assetTag: booking.asset.assetTag,
        startTime: result.startTime,
        endTime: result.endTime,
      });

      await createNotification(
        booking.bookedById,
        'booking_rescheduled',
        `Your booking for ${booking.asset.name} was rescheduled to ${start.toLocaleString()} - ${end.toLocaleString()}.`
      );
    }

    res.json(result);
  } catch (error: any) {
    if (error.startTime && error.endTime) {
      res.status(409).json({
        message: 'Conflict: Rescheduling overlaps with an existing booking.',
        conflictingBooking: {
          id: error.id,
          bookedBy: error.bookedBy?.name || 'Another employee',
          startTime: error.startTime,
          endTime: error.endTime,
        },
      });
      return;
    }
    res.status(500).json({ message: error.message || 'Failed to reschedule booking' });
  }
}
