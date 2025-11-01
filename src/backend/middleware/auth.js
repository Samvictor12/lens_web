import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        success,
        message: 'Authentication token is required'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Get user with role and permissions
    const user = await prisma.user.findUnique({
      where: { id.userId },
      include: {
        role: {
          include: {
            permissions
          }
        }
      }
    });

    if (!user) {
      return res.status(401).json({
        success,
        message: 'User not found'
      });
    }

    req.user = user;
    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({
        success,
        message: 'Invalid token'
      });
    }
    
    console.error('Authentication error:', error);
    return res.status(500).json({
      success,
      message: 'Internal server error'
    });
  }
};

export const requireRole = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success,
        message: 'Authentication required'
      });
    }

    if (!allowedRoles.includes(req.user.role.name)) {
      return res.status(403).json({
        success,
        message: 'Insufficient permissions'
      });
    }

    next();
  };
};

export const checkPermission = (action, subject) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success,
        message: 'Authentication required'
      });
    }

    const hasPermission = req.user.role.permissions.some(
      (p) =>
        (p.action === action && p.subject === subject) ||
        (p.action === action && p.subject === 'all') ||
        req.user.role.name === 'Admin'
    );

    if (!hasPermission) {
      return res.status(403).json({
        success,
        message: 'Insufficient permissions'
      });
    }

    next();
  };
};



