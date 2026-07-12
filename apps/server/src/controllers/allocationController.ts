import { Response } from 'express';
import prisma from '../lib/prisma';
import { logActivity, createNotification } from '../services/loggerService';
import { AuthenticatedRequest } from '../middleware/auth';
import { AssetStatus, TransferStatus, Role } from '@prisma/client';

// -------------------------------------------------------------
// ASSET ALLOCATION
// -------------------------------------------------------------
export async function createAllocation(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { assetId, employeeId, departmentId, expectedReturnDate } = req.body;
  try {

    if (!assetId) {
      res.status(400).json({ message: 'Asset ID is required' });
      return;
    }

    if (!employeeId && !departmentId) {
      res.status(400).json({ message: 'Either Employee ID or Department ID is required' });
      return;
    }

    // Atomic Transaction to verify and allocate
    const result = await prisma.$transaction(async (tx) => {
      // 1. Fetch asset with lock (or normal read check)
      const asset = await tx.asset.findUnique({
        where: { id: assetId },
      });

      if (!asset) {
        throw new Error('ASSET_NOT_FOUND');
      }

      if (asset.status !== AssetStatus.AVAILABLE) {
        throw new Error('ASSET_NOT_AVAILABLE');
      }

      // 2. Create allocation
      const allocation = await tx.allocation.create({
        data: {
          assetId,
          employeeId: employeeId || null,
          departmentId: departmentId || null,
          expectedReturnDate: expectedReturnDate ? new Date(expectedReturnDate) : null,
          isActive: true,
        },
        include: {
          employee: {
            select: { id: true, name: true, email: true },
          },
          asset: {
            select: { id: true, name: true, assetTag: true },
          },
        },
      });

      // 3. Update asset status
      await tx.asset.update({
        where: { id: assetId },
        data: {
          status: AssetStatus.ALLOCATED,
          departmentId: departmentId || null, // assign to dept if specified
        },
      });

      return allocation;
    });

    if (req.user) {
      const recipientName = result.employee ? result.employee.name : `Department ${departmentId}`;
      await logActivity(req.user.id, 'ALLOCATE_ASSET', 'Asset', assetId, {
        assetTag: result.asset.assetTag,
        allocatedTo: recipientName,
      });

      if (employeeId) {
        await createNotification(
          employeeId,
          'asset_assigned',
          `Asset ${result.asset.name} (${result.asset.assetTag}) has been allocated to you.`
        );
      }
    }

    res.status(201).json(result);
  } catch (error: any) {
    if (error.message === 'ASSET_NOT_FOUND') {
      res.status(404).json({ message: 'Asset not found' });
      return;
    }

    if (error.message === 'ASSET_NOT_AVAILABLE') {
      // Fetch active holder info for conflict reporting
      const activeAlloc = await prisma.allocation.findFirst({
        where: { assetId, isActive: true },
        include: {
          employee: {
            select: { id: true, name: true, email: true, department: { select: { name: true } } },
          },
        },
      });

      res.status(409).json({
        message: 'Conflict: Asset is already allocated.',
        holder: activeAlloc ? {
          id: activeAlloc.employeeId,
          name: activeAlloc.employee?.name || 'Departmental Use',
          email: activeAlloc.employee?.email || 'N/A',
          department: activeAlloc.employee?.department?.name || 'N/A',
        } : null,
      });
      return;
    }

    res.status(500).json({ message: error.message || 'Failed to allocate asset' });
  }
}

export async function returnAllocation(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const id = req.params.id as string; // allocationId
    const { conditionOnReturn, notes } = req.body;

    const allocation = await prisma.allocation.findUnique({
      where: { id },
      include: {
        asset: { select: { id: true, assetTag: true, name: true } },
      },
    });

    if (!allocation || !allocation.isActive) {
      res.status(404).json({ message: 'Active allocation not found' });
      return;
    }

    // Perform return in transaction
    await prisma.$transaction([
      prisma.allocation.update({
        where: { id },
        data: {
          isActive: false,
          returnedAt: new Date(),
          conditionOnReturn: conditionOnReturn || 'Good',
        },
      }),
      prisma.asset.update({
        where: { id: allocation.assetId },
        data: {
          status: AssetStatus.AVAILABLE,
          condition: conditionOnReturn || undefined, // optionally update condition
        },
      }),
    ]);

    if (req.user) {
      await logActivity(req.user.id, 'RETURN_ASSET', 'Asset', allocation.assetId, {
        assetTag: allocation.asset.assetTag,
        conditionOnReturn,
        notes,
      });

      if (allocation.employeeId) {
        await createNotification(
          allocation.employeeId,
          'asset_returned',
          `Asset ${allocation.asset.name} (${allocation.asset.assetTag}) return has been checked in.`
        );
      }
    }

    res.json({ message: 'Asset marked returned successfully' });
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Failed to process return' });
  }
}

// -------------------------------------------------------------
// TRANSFER REQUESTS
// -------------------------------------------------------------
export async function getTransferRequests(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    // Managers/Admins see all. Employees see requests involving them.
    const where: any = {};
    if (req.user && req.user.role === Role.EMPLOYEE) {
      where.OR = [
        { toEmployeeId: req.user.id },
        { allocation: { employeeId: req.user.id } },
      ];
    }

    const transfers = await prisma.transferRequest.findMany({
      where,
      include: {
        allocation: {
          include: {
            asset: { select: { id: true, name: true, assetTag: true } },
            employee: { select: { id: true, name: true, email: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Populate "toEmployee" details manually (since prisma schema lacks relation for toEmployeeId)
    const transfersWithToEmployee = await Promise.all(
      transfers.map(async (t) => {
        let toEmployee = null;
        if (t.toEmployeeId) {
          toEmployee = await prisma.employee.findUnique({
            where: { id: t.toEmployeeId },
            select: { id: true, name: true, email: true },
          });
        }
        return {
          ...t,
          toEmployee,
        };
      })
    );

    res.json(transfersWithToEmployee);
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Failed to fetch transfer requests' });
  }
}

export async function createTransferRequest(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { allocationId, toEmployeeId, reason } = req.body;

    if (!allocationId || !toEmployeeId) {
      res.status(400).json({ message: 'Allocation ID and target Employee ID are required' });
      return;
    }

    const allocation = await prisma.allocation.findUnique({
      where: { id: allocationId },
      include: {
        asset: { select: { name: true, assetTag: true } },
      },
    });

    if (!allocation || !allocation.isActive) {
      res.status(400).json({ message: 'Active allocation not found for transfer' });
      return;
    }

    const transfer = await prisma.transferRequest.create({
      data: {
        allocationId,
        toEmployeeId,
        reason: reason || '',
        status: TransferStatus.REQUESTED,
      },
    });

    if (req.user) {
      await logActivity(req.user.id, 'REQUEST_TRANSFER', 'TransferRequest', transfer.id, {
        assetTag: allocation.asset.assetTag,
        toEmployeeId,
      });

      // Notify the target employee
      await createNotification(
        toEmployeeId,
        'transfer_requested',
        `A transfer request has been initiated to assign Asset ${allocation.asset.name} (${allocation.asset.assetTag}) to you.`
      );

      // Notify the current holder (if not the initiator)
      if (allocation.employeeId && allocation.employeeId !== req.user.id) {
        await createNotification(
          allocation.employeeId,
          'transfer_requested',
          `A transfer request has been initiated to move Asset ${allocation.asset.name} (${allocation.asset.assetTag}) to another employee.`
        );
      }
    }

    res.status(201).json(transfer);
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Failed to create transfer request' });
  }
}

export async function resolveTransferRequest(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const id = req.params.id as string;
    const { action } = req.body; // 'approve' | 'reject'

    if (!['approve', 'reject'].includes(action)) {
      res.status(400).json({ message: 'Valid action (approve or reject) is required' });
      return;
    }

    const transfer = await prisma.transferRequest.findUnique({
      where: { id },
      include: {
        allocation: {
          include: {
            asset: { select: { id: true, name: true, assetTag: true } },
          },
        },
      },
    });

    if (!transfer || transfer.status !== TransferStatus.REQUESTED) {
      res.status(400).json({ message: 'Active transfer request not found' });
      return;
    }

    if (action === 'reject') {
      const updated = await prisma.transferRequest.update({
        where: { id },
        data: {
          status: TransferStatus.REJECTED,
          approvedById: req.user?.id,
          resolvedAt: new Date(),
        },
      });

      if (req.user) {
        await logActivity(req.user.id, 'REJECT_TRANSFER', 'TransferRequest', id);
        if (transfer.allocation.employeeId) {
          await createNotification(
            transfer.allocation.employeeId,
            'transfer_rejected',
            `Transfer request for Asset ${transfer.allocation.asset.name} was rejected.`
          );
        }
      }

      res.json(updated);
      return;
    }

    // Process approval (Approve + Complete Re-allocation in transaction)
    const result = await prisma.$transaction(async (tx) => {
      // 1. Update transfer request status
      const updatedTransfer = await tx.transferRequest.update({
        where: { id },
        data: {
          status: TransferStatus.COMPLETED,
          approvedById: req.user?.id,
          resolvedAt: new Date(),
        },
      });

      // 2. Deactivate previous allocation
      await tx.allocation.update({
        where: { id: transfer.allocationId },
        data: {
          isActive: false,
          returnedAt: new Date(),
          conditionOnReturn: 'Transferred',
        },
      });

      // 3. Create new allocation for target employee
      const targetEmp = await tx.employee.findUnique({
        where: { id: transfer.toEmployeeId! },
      });

      const newAlloc = await tx.allocation.create({
        data: {
          assetId: transfer.allocation.assetId,
          employeeId: transfer.toEmployeeId,
          isActive: true,
        },
      });

      // 4. Update asset's department to target employee's department
      await tx.asset.update({
        where: { id: transfer.allocation.assetId },
        data: {
          departmentId: targetEmp?.departmentId || null,
        },
      });

      return { updatedTransfer, newAlloc };
    });

    if (req.user) {
      await logActivity(req.user.id, 'APPROVE_TRANSFER', 'TransferRequest', id, {
        assetTag: transfer.allocation.asset.assetTag,
        toEmployeeId: transfer.toEmployeeId,
      });

      // Notify previous owner
      if (transfer.allocation.employeeId) {
        await createNotification(
          transfer.allocation.employeeId,
          'transfer_approved',
          `Transfer request approved. Asset ${transfer.allocation.asset.name} has been transferred out.`
        );
      }

      // Notify new owner
      if (transfer.toEmployeeId) {
        await createNotification(
          transfer.toEmployeeId,
          'transfer_approved',
          `Transfer approved! Asset ${transfer.allocation.asset.name} (${transfer.allocation.asset.assetTag}) is now allocated to you.`
        );
      }
    }

    res.json(result.updatedTransfer);
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Failed to resolve transfer request' });
  }
}
