import * as cron from 'node-cron';
import prisma from '../lib/prisma';
import { createNotification } from '../services/loggerService';
import { BookingStatus } from '@prisma/client';

export function startOverdueCheckCron() {
  console.log('Registering Overdue Check Cron Job (runs every hour)...');

  // Run every hour
  cron.schedule('0 * * * *', async () => {
    console.log('[CRON]: Running overdue checks and booking state updates...');

    try {
      const now = new Date();

      // 1. CHECK OVERDUE ASSET ALLOCATIONS
      const overdueAllocations = await prisma.allocation.findMany({
        where: {
          isActive: true,
          expectedReturnDate: {
            lt: now,
          },
        },
        include: {
          asset: { select: { name: true, assetTag: true } },
          employee: { select: { id: true, name: true } },
        },
      });

      for (const alloc of overdueAllocations) {
        const message = `Asset allocation for ${alloc.asset.name} (${alloc.asset.assetTag}) is overdue! Expected return date was ${alloc.expectedReturnDate?.toLocaleDateString()}.`;
        
        if (alloc.employeeId) {
          await createNotification(alloc.employeeId, 'asset_overdue', message);
        } else if (alloc.departmentId) {
          // Notify Department Head
          const dept = await prisma.department.findUnique({
            where: { id: alloc.departmentId },
            select: { headId: true },
          });
          if (dept?.headId) {
            await createNotification(dept.headId, 'asset_overdue', `Departmental ${message}`);
          }
        }
      }

      // 2. AUTO-TRANSITION BOOKINGS: UPCOMING -> ONGOING
      const upcomingToOngoing = await prisma.booking.updateMany({
        where: {
          status: BookingStatus.UPCOMING,
          startTime: { lte: now },
          endTime: { gt: now },
        },
        data: {
          status: BookingStatus.ONGOING,
        },
      });

      if (upcomingToOngoing.count > 0) {
        console.log(`[CRON]: Transformed ${upcomingToOngoing.count} upcoming bookings to ONGOING.`);
      }

      // 3. AUTO-TRANSITION BOOKINGS: ONGOING -> COMPLETED
      const ongoingToCompleted = await prisma.booking.updateMany({
        where: {
          status: { in: [BookingStatus.ONGOING, BookingStatus.UPCOMING] },
          endTime: { lte: now },
        },
        data: {
          status: BookingStatus.COMPLETED,
        },
      });

      if (ongoingToCompleted.count > 0) {
        console.log(`[CRON]: Transformed ${ongoingToCompleted.count} bookings to COMPLETED.`);
      }

    } catch (error) {
      console.error('[CRON ERROR]: Error processing overdue checks:', error);
    }
  });
}
