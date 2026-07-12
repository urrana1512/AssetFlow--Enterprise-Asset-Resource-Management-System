import { Response } from 'express';
import prisma from '../lib/prisma';
import { AuthenticatedRequest } from '../middleware/auth';

export async function getUtilizationReport(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    // Assets grouped by category and status
    const categories = await prisma.assetCategory.findMany({
      include: {
        assets: {
          select: { status: true },
        },
      },
    });

    const report = categories.map(cat => {
      const total = cat.assets.length;
      const allocated = cat.assets.filter(a => a.status === 'ALLOCATED').length;
      const reserved = cat.assets.filter(a => a.status === 'RESERVED').length;
      const utilizationRate = total > 0 ? ((allocated + reserved) / total) * 100 : 0;

      return {
        categoryId: cat.id,
        categoryName: cat.name,
        total,
        allocated,
        reserved,
        utilizationRate: Math.round(utilizationRate * 10) / 10,
      };
    });

    res.json(report);
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Failed to compile utilization report' });
  }
}

export async function getMaintenanceFrequencyReport(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const requests = await prisma.maintenanceRequest.findMany({
      select: { createdAt: true, priority: true, status: true },
    });

    // Group requests by month-year
    const groups: { [key: string]: { month: string; count: number; critical: number } } = {};

    requests.forEach(reqst => {
      const date = new Date(reqst.createdAt);
      const monthStr = date.toLocaleString('default', { month: 'short' });
      const year = date.getFullYear();
      const key = `${monthStr} ${year}`;

      if (!groups[key]) {
        groups[key] = { month: key, count: 0, critical: 0 };
      }

      groups[key].count += 1;
      if (reqst.priority === 'Critical') {
        groups[key].critical += 1;
      }
    });

    res.json(Object.values(groups));
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Failed to compile maintenance frequency report' });
  }
}

export async function getUpcomingMaintenanceOrRetirement(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    // Assets that are retired or have warranty expiring
    const assets = await prisma.asset.findMany({
      include: { category: true, department: true },
      orderBy: { acquisitionDate: 'asc' },
    });

    const report = assets.map(asset => {
      const extra: any = asset.extraFields || {};
      const warrantyMonths = Number(extra.warrantyPeriodMonths || 0);
      let warrantyExpiryDate: Date | null = null;

      if (asset.acquisitionDate && warrantyMonths > 0) {
        const acq = new Date(asset.acquisitionDate);
        warrantyExpiryDate = new Date(acq.setMonth(acq.getMonth() + warrantyMonths));
      }

      const isWarrantyExpired = warrantyExpiryDate ? warrantyExpiryDate.getTime() < Date.now() : false;

      return {
        id: asset.id,
        assetTag: asset.assetTag,
        name: asset.name,
        category: asset.category.name,
        department: asset.department?.name || 'Unassigned',
        status: asset.status,
        acquisitionDate: asset.acquisitionDate,
        acquisitionCost: asset.acquisitionCost,
        warrantyExpiryDate,
        isWarrantyExpired,
      };
    });

    res.json(report);
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Failed to compile retirement report' });
  }
}

export async function getDepartmentAllocationReport(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const departments = await prisma.department.findMany({
      include: {
        assets: {
          select: { id: true, status: true },
        },
      },
    });

    const report = departments.map(d => {
      const total = d.assets.length;
      const allocated = d.assets.filter(a => a.status === 'ALLOCATED').length;
      const maintenance = d.assets.filter(a => a.status === 'UNDER_MAINTENANCE').length;

      return {
        departmentId: d.id,
        departmentName: d.name,
        total,
        allocated,
        maintenance,
      };
    });

    res.json(report);
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Failed to compile department report' });
  }
}

export async function getBookingHeatmap(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const bookings = await prisma.booking.findMany({
      where: { status: { not: 'CANCELLED' } },
      select: { startTime: true },
    });

    // We compile counts per weekday (0-6) and hour slot (e.g. 9-11, 11-13, 13-15, 15-17, 17-19)
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const heatmap: { [key: string]: { day: string; hourRange: string; count: number } } = {};

    // Initialize all values to 0
    days.forEach(day => {
      ['09:00 - 12:00', '12:00 - 15:00', '15:00 - 18:00', '18:00 - 21:00'].forEach(slot => {
        heatmap[`${day}-${slot}`] = { day, hourRange: slot, count: 0 };
      });
    });

    bookings.forEach(b => {
      const date = new Date(b.startTime);
      const day = days[date.getDay()];
      const hour = date.getHours();

      let slot = '';
      if (hour >= 9 && hour < 12) slot = '09:00 - 12:00';
      else if (hour >= 12 && hour < 15) slot = '12:00 - 15:00';
      else if (hour >= 15 && hour < 18) slot = '15:00 - 18:00';
      else if (hour >= 18 && hour < 21) slot = '18:00 - 21:00';

      if (slot) {
        heatmap[`${day}-${slot}`].count += 1;
      }
    });

    res.json(Object.values(heatmap));
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Failed to compile booking heatmap' });
  }
}

export async function exportReportCSV(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const assets = await prisma.asset.findMany({
      include: { category: true, department: true },
    });

    let csvContent = 'Asset Tag,Asset Name,Category,Serial Number,Status,Location,Acquisition Date,Acquisition Cost\n';

    assets.forEach(a => {
      const acqDateStr = a.acquisitionDate ? new Date(a.acquisitionDate).toLocaleDateString() : '';
      const costStr = a.acquisitionCost ? String(a.acquisitionCost) : '';
      csvContent += `"${a.assetTag}","${a.name}","${a.category.name}","${a.serialNumber || ''}","${a.status}","${a.location || ''}","${acqDateStr}","${costStr}"\n`;
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=assetflow-report.csv');
    res.status(200).send(csvContent);
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Failed to export CSV' });
  }
}

export async function getDashboardData(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const now = new Date();
    const oneDayFromNow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const [
      availableCount,
      allocatedCount,
      maintenanceCount,
      activeBookingsCount,
      pendingTransfersCount,
      upcomingReturns,
      overdueReturns,
      recentActivity,
    ] = await Promise.all([
      prisma.asset.count({ where: { status: 'AVAILABLE' } }),
      prisma.asset.count({ where: { status: 'ALLOCATED' } }),
      prisma.maintenanceRequest.count({
        where: { status: { notIn: ['RESOLVED', 'REJECTED'] } },
      }),
      prisma.booking.count({
        where: {
          status: { in: ['UPCOMING', 'ONGOING'] },
          startTime: { lte: oneDayFromNow },
        },
      }),
      prisma.transferRequest.count({ where: { status: 'REQUESTED' } }),
      // Upcoming returns
      prisma.allocation.findMany({
        where: {
          isActive: true,
          expectedReturnDate: { gt: now, lte: sevenDaysFromNow },
        },
        include: {
          asset: { select: { name: true, assetTag: true } },
          employee: { select: { name: true } },
        },
      }),
      // Overdue returns
      prisma.allocation.findMany({
        where: {
          isActive: true,
          expectedReturnDate: { lt: now },
        },
        include: {
          asset: { select: { name: true, assetTag: true } },
          employee: { select: { name: true } },
        },
      }),
      // Recent activity
      prisma.activityLog.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
          employee: { select: { name: true, role: true } },
        },
      }),
    ]);

    res.json({
      kpis: {
        assetsAvailable: availableCount,
        assetsAllocated: allocatedCount,
        maintenanceToday: maintenanceCount,
        activeBookings: activeBookingsCount,
        pendingTransfers: pendingTransfersCount,
        upcomingReturnsCount: upcomingReturns.length,
      },
      upcomingReturns,
      overdueReturns,
      recentActivity,
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Failed to compile dashboard data' });
  }
}
