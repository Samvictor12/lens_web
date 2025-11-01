import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await prisma.user.findUnique({
      where: { email },
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
        message: 'Invalid credentials'
      });
    }

    // TODO proper password hashing and JWT token generation
    if (password !== user.password) { // This is temporary for development
      return res.status(401).json({
        success,
        message: 'Invalid credentials'
      });
    }

    // TODO and return JWT token
    return res.json({
      success,
      data: {
        id.id,
        name.name,
        email.email,
        role.role.name,
        permissions.role.permissions
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({
      success,
      message: 'Internal server error'
    });
  }
};



