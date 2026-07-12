import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../lib/prisma';
import { logActivity } from '../services/loggerService';
import { AuthenticatedRequest } from '../middleware/auth';
import { Role } from '@prisma/client';

const JWT_SECRET = process.env.JWT_SECRET || 'supersecretjwtkeyforassetflowsystem123456';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'anotherrefreshsecretkeyforassetflow123456';

function generateAccessToken(user: { id: string; email: string; role: Role; departmentId: string | null }) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role, departmentId: user.departmentId },
    JWT_SECRET,
    { expiresIn: '15m' }
  );
}

function generateRefreshToken(userId: string) {
  return jwt.sign({ id: userId }, JWT_REFRESH_SECRET, { expiresIn: '7d' });
}

export async function signup(req: Request, res: Response): Promise<void> {
  try {
    const { name, email, password, departmentId } = req.body;

    if (!name || !email || !password) {
      res.status(400).json({ message: 'Name, email, and password are required' });
      return;
    }

    const existingUser = await prisma.employee.findUnique({
      where: { email },
    });

    if (existingUser) {
      res.status(400).json({ message: 'An employee with this email already exists' });
      return;
    }

    // Force ROLE to EMPLOYEE - no client-supplied roles allowed
    const hashedPassword = await bcrypt.hash(password, 10);
    const employee = await prisma.employee.create({
      data: {
        name,
        email,
        passwordHash: hashedPassword,
        role: Role.EMPLOYEE,
        departmentId: departmentId || null,
      },
    });

    await logActivity(employee.id, 'EMPLOYEE_SIGNUP', 'Employee', employee.id, {
      email: employee.email,
    });

    res.status(201).json({
      message: 'Employee registered successfully. Please login.',
      user: {
        id: employee.id,
        name: employee.name,
        email: employee.email,
        role: employee.role,
      },
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Signup failed' });
  }
}

export async function login(req: Request, res: Response): Promise<void> {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ message: 'Email and password are required' });
      return;
    }

    const employee = await prisma.employee.findUnique({
      where: { email },
    });

    if (!employee || employee.status === 'INACTIVE') {
      res.status(401).json({ message: 'Invalid credentials or inactive account' });
      return;
    }

    const isMatch = await bcrypt.compare(password, employee.passwordHash);
    if (!isMatch) {
      res.status(401).json({ message: 'Invalid credentials' });
      return;
    }

    const accessToken = generateAccessToken(employee);
    const refreshToken = generateRefreshToken(employee.id);

    await logActivity(employee.id, 'EMPLOYEE_LOGIN', 'Employee', employee.id);

    res.json({
      accessToken,
      refreshToken,
      user: {
        id: employee.id,
        name: employee.name,
        email: employee.email,
        role: employee.role,
        departmentId: employee.departmentId,
        avatarUrl: employee.avatarUrl,
      },
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Login failed' });
  }
}

export async function refresh(req: Request, res: Response): Promise<void> {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      res.status(400).json({ message: 'Refresh token is required' });
      return;
    }

    const decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET) as { id: string };
    const employee = await prisma.employee.findUnique({
      where: { id: decoded.id },
    });

    if (!employee || employee.status === 'INACTIVE') {
      res.status(401).json({ message: 'Invalid token or inactive account' });
      return;
    }

    const accessToken = generateAccessToken(employee);
    res.json({ accessToken });
  } catch (error) {
    res.status(401).json({ message: 'Invalid or expired refresh token' });
  }
}

export async function getMe(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const employee = await prisma.employee.findUnique({
      where: { id: req.user.id },
      include: {
        department: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!employee) {
      res.status(404).json({ message: 'Employee not found' });
      return;
    }

    res.json({
      id: employee.id,
      name: employee.name,
      email: employee.email,
      role: employee.role,
      departmentId: employee.departmentId,
      departmentName: employee.department?.name || null,
      avatarUrl: employee.avatarUrl,
      status: employee.status,
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Failed to fetch current user' });
  }
}

export async function forgotPassword(req: Request, res: Response): Promise<void> {
  const { email } = req.body;
  console.log(`[MOCK EMAIL]: Password reset request received for ${email}. Reset link: http://localhost:5173/reset-password?email=${encodeURIComponent(email)}`);
  res.json({ message: 'If an account exists, a password reset link has been printed to the server logs.' });
}

export async function resetPassword(req: Request, res: Response): Promise<void> {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      res.status(400).json({ message: 'Email and new password are required' });
      return;
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    await prisma.employee.update({
      where: { email },
      data: { passwordHash: hashedPassword },
    });

    res.json({ message: 'Password has been reset successfully.' });
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Password reset failed' });
  }
}
