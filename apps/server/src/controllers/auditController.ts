import { Response } from 'express';
import prisma from '../lib/prisma';
import { logActivity, createNotification } from '../services/loggerService';
import { AuthenticatedRequest } from '../middleware/auth';
import { AuditVerification, AssetStatus, Role } from '@prisma/client';

export async function getAuditCycles(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const cycles = await prisma.auditCycle.findMany({
      include: {
        assignments: {
          include: {
            asset: { select: { id: true, name: true, assetTag: true, status: true } },
            auditor: { select: { id: true, name: true, email: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(cycles);
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Failed to fetch audit cycles' });
  }
}

export async function createAuditCycle(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { name, scopeType, scopeValue, startDate, endDate, auditorIds } = req.body;

    if (!name || !scopeType || !scopeValue || !startDate || !endDate || !auditorIds || auditorIds.length === 0) {
      res.status(400).json({ message: 'Audit cycle name, scope, start/end dates, and auditor assignments are required' });
      return;
    }

    // Determine target assets based on scope
    const scopeWhere: any = {};
    if (scopeType === 'department') {
      scopeWhere.departmentId = scopeValue;
    } else if (scopeType === 'location') {
      scopeWhere.location = { contains: scopeValue, mode: 'insensitive' };
    } else {
      res.status(400).json({ message: 'Invalid scope type' });
      return;
    }

    const assets = await prisma.asset.findMany({
      where: scopeWhere,
    });

    if (assets.length === 0) {
      res.status(400).json({ message: 'No assets found in the specified scope' });
      return;
    }

    const cycle = await prisma.$transaction(async (tx) => {
      // 1. Create Cycle
      const newCycle = await tx.auditCycle.create({
        data: {
          name,
          scopeType,
          scopeValue,
          startDate: new Date(startDate),
          endDate: new Date(endDate),
          isClosed: false,
        },
      });

      // 2. Map assets to auditors in round-robin fashion
      const assignmentsData = assets.map((asset, index) => {
        const auditorId = auditorIds[index % auditorIds.length];
        return {
          auditCycleId: newCycle.id,
          assetId: asset.id,
          auditorId,
          verification: AuditVerification.PENDING,
        };
      });

      // 3. Bulk insert assignments
      await tx.auditAssignment.createMany({
        data: assignmentsData,
      });

      return newCycle;
    });

    if (req.user) {
      await logActivity(req.user.id, 'CREATE_AUDIT_CYCLE', 'AuditCycle', cycle.id, {
        name,
        scopeType,
        scopeValue,
      });

      // Notify all assigned auditors
      for (const auditorId of auditorIds) {
        await createNotification(
          auditorId,
          'audit_assigned',
          `You have been assigned as an auditor for the new cycle: "${name}".`
        );
      }
    }

    res.status(201).json(cycle);
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Failed to create audit cycle' });
  }
}

export async function getAuditAssignments(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { cycleId } = req.query;

    const where: any = {};
    if (cycleId) {
      where.auditCycleId = String(cycleId);
    }

    // Standard employees can only see their own audit assignments
    if (req.user && req.user.role === Role.EMPLOYEE) {
      where.auditorId = req.user.id;
    }

    const assignments = await prisma.auditAssignment.findMany({
      where,
      include: {
        asset: {
          select: { id: true, name: true, assetTag: true, location: true, status: true },
        },
        auditor: {
          select: { id: true, name: true, email: true },
        },
        auditCycle: {
          select: { id: true, name: true, isClosed: true },
        },
      },
      orderBy: { verification: 'asc' },
    });

    res.json(assignments);
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Failed to fetch audit assignments' });
  }
}

export async function verifyAuditAssignment(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const id = req.params.id as string; // assignmentId
    const { verification, notes } = req.body;

    if (!verification || !Object.values(AuditVerification).includes(verification)) {
      res.status(400).json({ message: 'A valid verification status is required' });
      return;
    }

    const assignment = await prisma.auditAssignment.findUnique({
      where: { id },
      include: {
        auditCycle: { select: { isClosed: true } },
        asset: { select: { assetTag: true } },
      },
    });

    if (!assignment) {
      res.status(404).json({ message: 'Audit assignment not found' });
      return;
    }

    if (assignment.auditCycle.isClosed) {
      res.status(400).json({ message: 'Forbidden: Cannot edit assignments on a closed audit cycle' });
      return;
    }

    // Role check: Only the assigned auditor, Asset Manager, or Admin can verify
    if (
      req.user &&
      assignment.auditorId !== req.user.id &&
      req.user.role !== Role.ADMIN &&
      req.user.role !== Role.ASSET_MANAGER
    ) {
      res.status(403).json({ message: 'Forbidden: You are not the assigned auditor' });
      return;
    }

    const updated = await prisma.auditAssignment.update({
      where: { id },
      data: {
        verification: verification as AuditVerification,
        notes: notes !== undefined ? notes : assignment.notes,
        verifiedAt: new Date(),
      },
      include: {
        asset: { select: { id: true, name: true, assetTag: true } },
      },
    });

    if (req.user) {
      await logActivity(req.user.id, 'VERIFY_AUDIT_ASSET', 'AuditAssignment', id, {
        assetTag: updated.asset.assetTag,
        verification,
      });
    }

    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Failed to verify audit asset' });
  }
}

export async function closeAuditCycle(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const id = req.params.id as string; // cycleId

    const cycle = await prisma.auditCycle.findUnique({
      where: { id },
      include: {
        assignments: {
          select: { id: true, assetId: true, verification: true },
        },
      },
    });

    if (!cycle) {
      res.status(404).json({ message: 'Audit cycle not found' });
      return;
    }

    if (cycle.isClosed) {
      res.status(400).json({ message: 'Audit cycle is already closed' });
      return;
    }

    // Close Cycle and bulk update missing assets in transaction
    const result = await prisma.$transaction(async (tx) => {
      // 1. Lock cycle
      const updatedCycle = await tx.auditCycle.update({
        where: { id },
        data: { isClosed: true },
      });

      // 2. Identify missing assets in this cycle
      const missingAssignments = (cycle.assignments as any[]).filter(
        (a: any) => a.verification === AuditVerification.MISSING
      );

      const missingAssetIds = missingAssignments.map(a => a.assetId);

      // 3. Bulk transition confirmed missing assets to LOST
      if (missingAssetIds.length > 0) {
        await tx.asset.updateMany({
          where: { id: { in: missingAssetIds } },
          data: { status: AssetStatus.LOST },
        });
      }

      return { updatedCycle, lostCount: missingAssetIds.length };
    });

    if (req.user) {
      await logActivity(req.user.id, 'CLOSE_AUDIT_CYCLE', 'AuditCycle', id, {
        lostCount: result.lostCount,
      });
    }

    res.json({
      message: 'Audit cycle closed successfully. Assets updated.',
      cycle: result.updatedCycle,
      lostCount: result.lostCount,
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Failed to close audit cycle' });
  }
}
