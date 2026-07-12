import { Router } from 'express';
import {
  getAssets,
  getAssetById,
  createAsset,
  updateAsset,
  getAssetHistory
} from '../controllers/assetController';
import { authenticateJWT, requireRole } from '../middleware/auth';
import { Role } from '@prisma/client';

const router = Router();

router.get('/', authenticateJWT as any, getAssets as any);
router.get('/:id', authenticateJWT as any, getAssetById as any);
router.get('/:id/history', authenticateJWT as any, getAssetHistory as any);
router.post('/', authenticateJWT as any, requireRole([Role.ADMIN, Role.ASSET_MANAGER]) as any, createAsset as any);
router.patch('/:id', authenticateJWT as any, requireRole([Role.ADMIN, Role.ASSET_MANAGER]) as any, updateAsset as any);

export default router;
