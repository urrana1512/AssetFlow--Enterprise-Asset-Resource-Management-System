import { Response } from 'express';
import prisma from '../lib/prisma';
import { logActivity, createNotification } from '../services/loggerService';
import { AuthenticatedRequest } from '../middleware/auth';
import { MaintenanceStatus, AssetStatus, Role } from '@prisma/client';

export async function getMaintenanceRequests(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const requests = await prisma.maintenanceRequest.findMany({
      include: {
        asset: {
          select: { id: true, name: true, assetTag: true, status: true },
        },
        requestedBy: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(requests);
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Failed to fetch maintenance requests' });
  }
}

export async function createMaintenanceRequest(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { assetId, issue, priority, photoUrl } = req.body;

    if (!assetId || !issue || !priority) {
      res.status(400).json({ message: 'Asset ID, issue, and priority are required' });
      return;
    }

    if (!req.user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const request = await prisma.maintenanceRequest.create({
      data: {
        assetId,
        requestedById: req.user.id,
        issue,
        priority,
        photoUrl: photoUrl || null,
        status: MaintenanceStatus.PENDING,
      },
      include: {
        asset: { select: { assetTag: true, name: true } },
      },
    });

    await logActivity(req.user.id, 'CREATE_MAINTENANCE', 'MaintenanceRequest', request.id, {
      assetTag: request.asset.assetTag,
      priority,
    });

    res.status(201).json(request);
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Failed to create maintenance request' });
  }
}

export async function updateMaintenanceRequest(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const id = req.params.id as string;
    const { status, technicianName, priority, issue } = req.body;

    const existing = await prisma.maintenanceRequest.findUnique({
      where: { id },
      include: {
        asset: { select: { id: true, assetTag: true, name: true } },
      },
    });

    if (!existing) {
      res.status(404).json({ message: 'Maintenance request not found' });
      return;
    }

    const userRole = req.user?.role;

    // Enforce role-based state machine transitions
    if (status && status !== existing.status) {
      // 1. Pending -> Approved/Rejected can only be done by Admin or Asset Manager
      if (existing.status === MaintenanceStatus.PENDING && (status === MaintenanceStatus.APPROVED || status === MaintenanceStatus.REJECTED)) {
        if (userRole !== Role.ADMIN && userRole !== Role.ASSET_MANAGER) {
          res.status(403).json({ message: 'Forbidden: Only Asset Managers or Admins can approve or reject requests' });
          return;
        }
      }

      // 2. Approved -> Technician Assigned or In Progress
      if (existing.status === MaintenanceStatus.APPROVED && status === MaintenanceStatus.TECHNICIAN_ASSIGNED) {
        if (userRole !== Role.ADMIN && userRole !== Role.ASSET_MANAGER) {
          res.status(403).json({ message: 'Forbidden: Only Asset Managers or Admins can assign technicians' });
          return;
        }
      }
    }

    // Process updates
    const result = await prisma.$transaction(async (tx) => {
      const updateData: any = {};
      if (status !== undefined) updateData.status = status as MaintenanceStatus;
      if (technicianName !== undefined) updateData.technicianName = technicianName;
      if (priority !== undefined) updateData.priority = priority;
      if (issue !== undefined) updateData.issue = issue;

      // Handle specific status change side effects
      if (status === MaintenanceStatus.APPROVED && existing.status !== MaintenanceStatus.APPROVED) {
        updateData.approvedById = req.user?.id;
        // Flip linked asset status to UNDER_MAINTENANCE
        await tx.asset.update({
          where: { id: existing.assetId },
          data: { status: AssetStatus.UNDER_MAINTENANCE },
        });
      }

      if (status === MaintenanceStatus.RESOLVED && existing.status !== MaintenanceStatus.RESOLVED) {
        updateData.resolvedAt = new Date();
        // Flip linked asset status back to AVAILABLE
        await tx.asset.update({
          where: { id: existing.assetId },
          data: { status: AssetStatus.AVAILABLE },
        });
      }

      if (status === MaintenanceStatus.REJECTED && existing.status !== MaintenanceStatus.REJECTED) {
        updateData.resolvedAt = new Date();
        // Flip linked asset status back to AVAILABLE if it was set otherwise
        await tx.asset.update({
          where: { id: existing.assetId },
          data: { status: AssetStatus.AVAILABLE },
        });
      }

      const updated = await tx.maintenanceRequest.update({
        where: { id },
        data: updateData,
        include: {
          asset: { select: { assetTag: true, name: true } },
        },
      });

      return updated;
    });

    if (req.user) {
      await logActivity(req.user.id, 'UPDATE_MAINTENANCE', 'MaintenanceRequest', id, {
        assetTag: result.asset.assetTag,
        status: result.status,
      });

      // Notify the original requester of updates
      await createNotification(
        result.requestedById,
        'maintenance_updated',
        `Your maintenance request for ${result.asset.name} (${result.asset.assetTag}) has been set to ${result.status}.`
      );
    }

    res.json(result);
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Failed to update maintenance request' });
  }
}
