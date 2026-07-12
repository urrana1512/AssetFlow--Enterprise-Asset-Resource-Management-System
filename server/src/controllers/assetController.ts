import { Response, Request } from 'express';
import prisma from '../lib/prisma';
import { logActivity } from '../services/loggerService';
import { AuthenticatedRequest } from '../middleware/auth';
import { AssetStatus } from '@prisma/client';
import path from 'path';
import fs from 'fs';
import QRCode from 'qrcode';

// Helper to generate the next asset tag (AF-0001, AF-0002...)
async function generateNextAssetTag(): Promise<string> {
  const lastAsset = await prisma.asset.findFirst({
    where: {
      assetTag: {
        startsWith: 'AF-',
      },
    },
    orderBy: {
      assetTag: 'desc',
    },
    select: {
      assetTag: true,
    },
  });

  if (!lastAsset) {
    return 'AF-0001';
  }

  const matches = lastAsset.assetTag.match(/AF-(\d+)/);
  if (!matches) {
    return 'AF-0001';
  }

  const lastNum = parseInt(matches[1], 10);
  const nextNum = lastNum + 1;
  const paddedNum = String(nextNum).padStart(4, '0');
  return `AF-${paddedNum}`;
}

export async function getAssets(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { tag, serial, category, status, departmentId, location, search } = req.query;

    const where: any = {};

    if (tag) where.assetTag = { contains: String(tag), mode: 'insensitive' };
    if (serial) where.serialNumber = { contains: String(serial), mode: 'insensitive' };
    if (status) where.status = status as AssetStatus;
    if (departmentId) where.departmentId = String(departmentId);
    if (location) where.location = { contains: String(location), mode: 'insensitive' };

    if (category) {
      where.category = {
        name: { contains: String(category), mode: 'insensitive' },
      };
    }

    if (search) {
      where.OR = [
        { assetTag: { contains: String(search), mode: 'insensitive' } },
        { name: { contains: String(search), mode: 'insensitive' } },
        { serialNumber: { contains: String(search), mode: 'insensitive' } },
        { location: { contains: String(search), mode: 'insensitive' } },
      ];
    }

    const assets = await prisma.asset.findMany({
      where,
      include: {
        category: true,
        department: {
          select: { id: true, name: true },
        },
        allocations: {
          where: { isActive: true },
          include: {
            employee: {
              select: { id: true, name: true, email: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(assets);
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Failed to fetch assets' });
  }
}

export async function getAssetById(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const id = req.params.id as string;

    const asset = await prisma.asset.findUnique({
      where: { id },
      include: {
        category: true,
        department: {
          select: { id: true, name: true },
        },
        allocations: {
          include: {
            employee: {
              select: { id: true, name: true, email: true },
            },
          },
          orderBy: { allocatedAt: 'desc' },
        },
      },
    });

    if (!asset) {
      res.status(404).json({ message: 'Asset not found' });
      return;
    }

    res.json(asset);
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Failed to fetch asset detail' });
  }
}

export async function createAsset(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { name, categoryId, serialNumber, acquisitionDate, acquisitionCost, condition, location, isBookable, extraFields, photoUrls, documentUrls, departmentId } = req.body;

    if (!name || !categoryId) {
      res.status(400).json({ message: 'Asset name and category are required' });
      return;
    }

    // Check serial number uniqueness if provided
    if (serialNumber) {
      const existing = await prisma.asset.findUnique({ where: { serialNumber } });
      if (existing) {
        res.status(400).json({ message: 'An asset with this serial number already exists' });
        return;
      }
    }

    // Enforce Tag Generation inside transaction
    const assetTag = await generateNextAssetTag();

    // Setup Local QR Code Directory
    const qrsDir = path.join(__dirname, '..', '..', 'public', 'uploads', 'qrs');
    if (!fs.existsSync(qrsDir)) {
      fs.mkdirSync(qrsDir, { recursive: true });
    }

    const lookupUrl = `http://localhost:5173/assets/lookup?tag=${assetTag}`;
    const qrFileName = `qr-${assetTag}.png`;
    const qrPath = path.join(qrsDir, qrFileName);
    
    // Save QR Code File
    await QRCode.toFile(qrPath, JSON.stringify({ tag: assetTag, lookup: lookupUrl }));
    const qrCodeUrl = `http://localhost:5000/uploads/qrs/${qrFileName}`;

    const asset = await prisma.asset.create({
      data: {
        assetTag,
        name,
        categoryId,
        serialNumber: serialNumber || null,
        qrCodeUrl,
        acquisitionDate: acquisitionDate ? new Date(acquisitionDate) : null,
        acquisitionCost: acquisitionCost ? Number(acquisitionCost) : null,
        condition: condition || 'New',
        location: location || 'Headquarters',
        isBookable: !!isBookable,
        extraFields: extraFields || null,
        photoUrls: photoUrls || [],
        documentUrls: documentUrls || [],
        status: AssetStatus.AVAILABLE,
        departmentId: departmentId || null,
      },
      include: {
        category: true,
      },
    });

    if (req.user) {
      await logActivity(req.user.id, 'CREATE_ASSET', 'Asset', asset.id, {
        assetTag,
        name,
        category: asset.category.name,
      });
    }

    res.status(201).json(asset);
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Failed to register asset' });
  }
}

export async function updateAsset(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const id = req.params.id as string;
    const { name, serialNumber, acquisitionDate, acquisitionCost, condition, location, isBookable, extraFields, photoUrls, documentUrls, departmentId, status } = req.body;

    const existing = await prisma.asset.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ message: 'Asset not found' });
      return;
    }

    if (serialNumber && serialNumber !== existing.serialNumber) {
      const serialExists = await prisma.asset.findUnique({ where: { serialNumber } });
      if (serialExists) {
        res.status(400).json({ message: 'Another asset with this serial number already exists' });
        return;
      }
    }

    const updated = await prisma.asset.update({
      where: { id },
      data: {
        name: name !== undefined ? name : existing.name,
        serialNumber: serialNumber !== undefined ? serialNumber : existing.serialNumber,
        acquisitionDate: acquisitionDate !== undefined ? (acquisitionDate ? new Date(acquisitionDate) : null) : existing.acquisitionDate,
        acquisitionCost: acquisitionCost !== undefined ? (acquisitionCost ? Number(acquisitionCost) : null) : existing.acquisitionCost,
        condition: condition !== undefined ? condition : existing.condition,
        location: location !== undefined ? location : existing.location,
        isBookable: isBookable !== undefined ? !!isBookable : existing.isBookable,
        extraFields: extraFields !== undefined ? extraFields : existing.extraFields,
        photoUrls: photoUrls !== undefined ? photoUrls : existing.photoUrls,
        documentUrls: documentUrls !== undefined ? documentUrls : existing.documentUrls,
        departmentId: departmentId !== undefined ? (departmentId === '' ? null : departmentId) : existing.departmentId,
        status: status !== undefined ? status : existing.status,
      },
      include: {
        category: true,
      },
    });

    if (req.user) {
      await logActivity(req.user.id, 'UPDATE_ASSET', 'Asset', id, {
        assetTag: updated.assetTag,
        status: updated.status,
      });
    }

    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Failed to update asset' });
  }
}

// Combined allocation + maintenance history timeline (Screen 4 Detail Tab)
export async function getAssetHistory(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const id = req.params.id as string;

    const [allocations, maintenance] = await Promise.all([
      prisma.allocation.findMany({
        where: { assetId: id },
        include: {
          employee: {
            select: { id: true, name: true, email: true },
          },
        },
        orderBy: { allocatedAt: 'desc' },
      }),
      prisma.maintenanceRequest.findMany({
        where: { assetId: id },
        include: {
          requestedBy: {
            select: { id: true, name: true, email: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    const timeline: any[] = [];

    // Map allocations to history objects
    allocations.forEach(alloc => {
      timeline.push({
        id: alloc.id,
        type: 'allocation',
        date: alloc.allocatedAt,
        title: 'Asset Allocated',
        description: `Allocated to ${alloc.employee ? alloc.employee.name : 'Department'}. Expected Return: ${alloc.expectedReturnDate ? new Date(alloc.expectedReturnDate).toLocaleDateString() : 'N/A'}.`,
        user: alloc.employee || null,
        metadata: {
          isActive: alloc.isActive,
          returnedAt: alloc.returnedAt,
          conditionOnReturn: alloc.conditionOnReturn,
        },
      });

      if (alloc.returnedAt) {
        timeline.push({
          id: `${alloc.id}-return`,
          type: 'return',
          date: alloc.returnedAt,
          title: 'Asset Returned',
          description: `Returned. Condition: ${alloc.conditionOnReturn || 'Good'}.`,
          user: alloc.employee || null,
        });
      }
    });

    // Map maintenance requests to history objects
    maintenance.forEach(reqst => {
      timeline.push({
        id: reqst.id,
        type: 'maintenance',
        date: reqst.createdAt,
        title: `Maintenance Raised (${reqst.priority})`,
        description: `Issue: ${reqst.issue}. Status: ${reqst.status}.`,
        user: reqst.requestedBy,
        metadata: {
          status: reqst.status,
          resolvedAt: reqst.resolvedAt,
          technician: reqst.technicianName,
        },
      });

      if (reqst.resolvedAt) {
        timeline.push({
          id: `${reqst.id}-resolved`,
          type: 'maintenance_resolution',
          date: reqst.resolvedAt,
          title: 'Maintenance Resolved',
          description: `Resolved. Technician: ${reqst.technicianName || 'N/A'}.`,
          user: reqst.requestedBy,
        });
      }
    });

    // Sort timeline by date descending
    timeline.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    res.json(timeline);
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Failed to fetch asset history timeline' });
  }
}
