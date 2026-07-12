import prisma from '../lib/prisma';
import { emitToEmployee, emitToRole } from '../sockets/socket';
import { Role } from '@prisma/client';

export async function logActivity(
  employeeId: string,
  action: string,
  entityType: string,
  entityId: string,
  metadata?: any
) {
  try {
    const log = await prisma.activityLog.create({
      data: {
        employeeId,
        action,
        entityType,
        entityId,
        metadata: metadata || null,
      },
      include: {
        employee: {
          select: {
            name: true,
            email: true,
            role: true,
          },
        },
      },
    });

    // Emit live activity log to Admins and Asset Managers
    emitToRole(Role.ADMIN, 'activity_log:created', log);
    emitToRole(Role.ASSET_MANAGER, 'activity_log:created', log);
    
    return log;
  } catch (error) {
    console.error('Error creating activity log:', error);
  }
}

export async function createNotification(
  employeeId: string,
  type: string,
  message: string
) {
  try {
    const notification = await prisma.notification.create({
      data: {
        employeeId,
        type,
        message,
        isRead: false,
      },
    });

    // Emit live notification to the specific employee
    emitToEmployee(employeeId, 'notification:received', notification);
    
    return notification;
  } catch (error) {
    console.error('Error creating notification:', error);
  }
}
