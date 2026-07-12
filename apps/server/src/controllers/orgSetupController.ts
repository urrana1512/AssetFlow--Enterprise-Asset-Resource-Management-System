import { Response } from 'express';
import prisma from '../lib/prisma';
import { logActivity } from '../services/loggerService';
import { AuthenticatedRequest } from '../middleware/auth';
import { Role, EmployeeStatus } from '@prisma/client';

// Department Circular Reference Checker
async function detectCircularHierarchy(deptId: string, targetParentId: string): Promise<boolean> {
  let currentParentId: string | null = targetParentId;
  while (currentParentId) {
    if (currentParentId === deptId) {
      return true;
    }
    const parentDept: { parentId: string | null } | null = await prisma.department.findUnique({
      where: { id: currentParentId },
      select: { parentId: true },
    });
    currentParentId = parentDept ? parentDept.parentId : null;
  }
  return false;
}

// -------------------------------------------------------------
// DEPARTMENTS
// -------------------------------------------------------------
export async function getDepartments(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const departments = await prisma.department.findMany({
      include: {
        head: {
          select: { id: true, name: true, email: true },
        },
        parent: {
          select: { id: true, name: true },
        },
      },
      orderBy: { name: 'asc' },
    });
    res.json(departments);
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Failed to fetch departments' });
  }
}

export async function createDepartment(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { name, headId, parentId } = req.body;

    if (!name) {
      res.status(400).json({ message: 'Department name is required' });
      return;
    }

    const dept = await prisma.department.create({
      data: {
        name,
        headId: headId || null,
        parentId: parentId || null,
      },
    });

    if (req.user) {
      await logActivity(req.user.id, 'CREATE_DEPARTMENT', 'Department', dept.id, { name });
    }

    res.status(201).json(dept);
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Failed to create department' });
  }
}

export async function updateDepartment(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const id = req.params.id as string;
    const { name, headId, parentId, status } = req.body;

    const existing = await prisma.department.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ message: 'Department not found' });
      return;
    }

    // Circular parenting check
    if (parentId && parentId !== id) {
      const isCircular = await detectCircularHierarchy(id, parentId);
      if (isCircular) {
        res.status(400).json({ message: 'Circular relationship detected: Parent cannot be a child of this department.' });
        return;
      }
    }

    const updated = await prisma.department.update({
      where: { id },
      data: {
        name: name !== undefined ? name : existing.name,
        headId: headId !== undefined ? headId : existing.headId,
        parentId: parentId !== undefined ? (parentId === '' ? null : parentId) : existing.parentId,
        status: status !== undefined ? status : existing.status,
      },
    });

    if (req.user) {
      await logActivity(req.user.id, 'UPDATE_DEPARTMENT', 'Department', id, { name, status });
    }

    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Failed to update department' });
  }
}

export async function deactivateDepartment(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const id = req.params.id as string;

    const updated = await prisma.department.update({
      where: { id },
      data: { status: EmployeeStatus.INACTIVE },
    });

    if (req.user) {
      await logActivity(req.user.id, 'DEACTIVATE_DEPARTMENT', 'Department', id);
    }

    res.json({ message: 'Department deactivated successfully', department: updated });
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Failed to deactivate department' });
  }
}

// -------------------------------------------------------------
// ASSET CATEGORIES
// -------------------------------------------------------------
export async function getCategories(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const categories = await prisma.assetCategory.findMany({
      orderBy: { name: 'asc' },
    });
    res.json(categories);
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Failed to fetch categories' });
  }
}

export async function createCategory(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { name, extraFields } = req.body;

    if (!name) {
      res.status(400).json({ message: 'Category name is required' });
      return;
    }

    const existing = await prisma.assetCategory.findUnique({ where: { name } });
    if (existing) {
      res.status(400).json({ message: 'Category with this name already exists' });
      return;
    }

    const cat = await prisma.assetCategory.create({
      data: {
        name,
        extraFields: extraFields || null,
      },
    });

    if (req.user) {
      await logActivity(req.user.id, 'CREATE_CATEGORY', 'AssetCategory', cat.id, { name });
    }

    res.status(201).json(cat);
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Failed to create category' });
  }
}

export async function updateCategory(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const id = req.params.id as string;
    const { name, extraFields } = req.body;

    const existing = await prisma.assetCategory.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ message: 'Category not found' });
      return;
    }

    const updated = await prisma.assetCategory.update({
      where: { id },
      data: {
        name: name !== undefined ? name : existing.name,
        extraFields: extraFields !== undefined ? extraFields : existing.extraFields,
      },
    });

    if (req.user) {
      await logActivity(req.user.id, 'UPDATE_CATEGORY', 'AssetCategory', id, { name });
    }

    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Failed to update category' });
  }
}

// -------------------------------------------------------------
// EMPLOYEES DIRECTORY & PROMOTION
// -------------------------------------------------------------
export async function getEmployees(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const employees = await prisma.employee.findMany({
      include: {
        department: {
          select: { id: true, name: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    // Remove passwordHash before sending
    const cleaned = employees.map(emp => {
      const { passwordHash, ...rest } = emp;
      return rest;
    });

    res.json(cleaned);
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Failed to fetch employees' });
  }
}

export async function updateEmployeeRole(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const id = req.params.id as string;
    const { role } = req.body;

    if (!role || !Object.values(Role).includes(role)) {
      res.status(400).json({ message: 'A valid role is required' });
      return;
    }

    const existing = await prisma.employee.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ message: 'Employee not found' });
      return;
    }

    const updated = await prisma.employee.update({
      where: { id },
      data: { role },
      include: {
        department: { select: { name: true } },
      },
    });

    if (req.user) {
      await logActivity(
        req.user.id,
        'PROMOTE_EMPLOYEE',
        'Employee',
        id,
        {
          targetName: updated.name,
          targetEmail: updated.email,
          previousRole: existing.role,
          newRole: updated.role,
        }
      );
    }

    res.json({
      message: 'Employee role updated successfully',
      employee: {
        id: updated.id,
        name: updated.name,
        email: updated.email,
        role: updated.role,
        departmentName: updated.department?.name || null,
      },
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Failed to update employee role' });
  }
}
