import { Response } from 'express';
import prisma from '../lib/prisma';
import { AuthenticatedRequest } from '../middleware/auth';

export async function getNotifications(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const notifications = await prisma.notification.findMany({
      where: { employeeId: req.user.id },
      orderBy: { createdAt: 'desc' },
    });

    res.json(notifications);
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Failed to fetch notifications' });
  }
}

export async function markNotificationRead(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const id = req.params.id as string;

    if (!req.user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const updated = await prisma.notification.update({
      where: {
        id,
        employeeId: req.user.id, // Enforce security boundary
      },
      data: { isRead: true },
    });

    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Failed to mark notification as read' });
  }
}

export async function getActivityLogs(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { employeeId, entityType, action } = req.query;

    const where: any = {};
    if (employeeId) where.employeeId = String(employeeId);
    if (entityType) where.entityType = String(entityType);
    if (action) where.action = String(action);

    const logs = await prisma.activityLog.findMany({
      where,
      include: {
        employee: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(logs);
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Failed to fetch activity logs' });
  }
}
