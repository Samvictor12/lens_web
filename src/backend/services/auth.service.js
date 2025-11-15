import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import prisma from '../config/prisma.js';
import { APIError } from '../middleware/errorHandler.js';

/**
 * Authentication Service
 * Handles user authentication, JWT token generation, and refresh tokens
 */
export class AuthService {
  constructor() {
    this.JWT_SECRET = process.env.JWT_SECRET || 'your-jwt-secret-key';
    this.REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET || 'your-refresh-token-secret';
    this.JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '15m';
    this.REFRESH_TOKEN_EXPIRES_IN = process.env.REFRESH_TOKEN_EXPIRES_IN || '7d';
  }

  /**
   * Authenticate user with username and password
   * @param {string} username - Username
   * @param {string} password - Plain text password
   * @returns {Object} User data with tokens
   */
  async login(username, password) {
    try {
      // Find user by username
      const user = await prisma.user.findFirst({
        where: {
          username: username
        },
        include: {
          role: {
            include: {
              permissions: true
            }
          }
        }
      });

      console.log("User ", user, user.password, bcrypt.hashSync(password, 10));


      if (!user) {
        throw new APIError('Invalid username or password', 401, 'INVALID_CREDENTIALS');
      }

      // Check if user is deleted
      if (user.delete_status === true) {
        throw new APIError('You do not have login access. Please contact administrator.', 403, 'NO_LOGIN_ACCESS');
      }

      // Check if user account is active
      if (user.active_status === false) {
        throw new APIError('Your account is inactive. Please contact administrator for login access.', 403, 'ACCOUNT_INACTIVE');
      }

      // Check if login is enabled
      if (user.is_login === false) {
        throw new APIError('Login is not enabled for this account. Please contact administrator.', 403, 'LOGIN_NOT_ENABLED');
      }

      // Verify password
      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        throw new APIError('Invalid username or password', 401, 'INVALID_CREDENTIALS');
      }

      // Generate tokens
      const { accessToken, refreshToken } = await this.generateTokens(user);

      // Store refresh token in database
      await this.storeRefreshToken(user.id, refreshToken);

      // Remove password and flatten role object for response
      const { password: _, role, ...userWithoutPassword } = user;

      return {
        user: {
          ...userWithoutPassword,
          roleName: role?.name || null,
          roleId: user.role_id
        },
        accessToken,
        refreshToken,
        tokenType: 'Bearer',
        expiresIn: this.JWT_EXPIRES_IN
      };
    } catch (error) {
      if (error instanceof APIError) throw error;
      console.error('Login error:', error);
      throw new APIError('Authentication failed', 500);
    }
  }

  /**
   * Generate access and refresh tokens
   * @param {Object} user - User object
   * @returns {Object} Access and refresh tokens
   */
  async generateTokens(user) {
    try {
      const payload = {
        userId: user.id,
        email: user.email,
        usercode: user.usercode,
        username: user.username,
        roleId: user.role_id,
        roleName: user.role?.name || null
      };

      const accessToken = jwt.sign(payload, this.JWT_SECRET, {
        expiresIn: this.JWT_EXPIRES_IN,
        issuer: 'lens-management',
        audience: 'lens-users'
      });

      const refreshToken = jwt.sign(
        { userId: user.id, tokenType: 'refresh' },
        this.REFRESH_TOKEN_SECRET,
        {
          expiresIn: this.REFRESH_TOKEN_EXPIRES_IN,
          issuer: 'lens-management',
          audience: 'lens-users'
        }
      );

      return { accessToken, refreshToken };
    } catch (error) {
      console.error('Token generation error:', error);
      throw new APIError('Token generation failed', 500);
    }
  }

  /**
   * Store refresh token in database
   * @param {number} userId - User ID
   * @param {string} refreshToken - Refresh token
   */
  async storeRefreshToken(userId, refreshToken) {
    try {
      // Create refresh token table entry if it doesn't exist
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7); // 7 days from now

      await prisma.refreshToken.upsert({
        where: { userId },
        update: {
          token: refreshToken,
          expiresAt,
          updatedAt: new Date()
        },
        create: {
          userId,
          token: refreshToken,
          expiresAt,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });
    } catch (error) {
      console.error('Store refresh token error:', error);
      // Don't throw error here as login should still succeed
    }
  }

  /**
   * Refresh access token using refresh token
   * @param {string} refreshToken - Refresh token
   * @returns {Object} New access token and refresh token
   */
  async refreshAccessToken(refreshToken) {
    try {
      if (!refreshToken) {
        throw new APIError('Refresh token is required', 401);
      }

      // Verify refresh token
      const decoded = jwt.verify(refreshToken, this.REFRESH_TOKEN_SECRET);

      // Check if refresh token exists in database and is not expired
      const storedToken = await prisma.refreshToken.findUnique({
        where: { userId: decoded.userId },
        include: {
          user: {
            include: {
              role: {
                include: {
                  permissions: true
                }
              },
              departmentDetails: true
            }
          }
        }
      });

      if (!storedToken || storedToken.token !== refreshToken || new Date() > storedToken.expiresAt) {
        throw new APIError('Invalid or expired refresh token', 401);
      }

      // Check if user is still active
      if (!storedToken.user.active_status || storedToken.user.delete_status) {
        throw new APIError('User account is not active', 401);
      }

      // Generate new tokens
      const { accessToken, refreshToken: newRefreshToken } = await this.generateTokens(storedToken.user);

      // Update refresh token in database
      await this.storeRefreshToken(storedToken.user.id, newRefreshToken);

      return {
        accessToken,
        refreshToken: newRefreshToken,
        tokenType: 'Bearer',
        expiresIn: this.JWT_EXPIRES_IN
      };
    } catch (error) {
      if (error instanceof jwt.JsonWebTokenError) {
        throw new APIError('Invalid refresh token', 401);
      }
      if (error instanceof APIError) throw error;
      console.error('Refresh token error:', error);
      throw new APIError('Token refresh failed', 500);
    }
  }

  /**
   * Logout user and invalidate refresh token
   * @param {number} userId - User ID
   */
  async logout(userId) {
    try {
      await prisma.refreshToken.delete({
        where: { userId }
      });
      return { message: 'Logged out successfully' };
    } catch (error) {
      console.error('Logout error:', error);
      // Don't throw error as logout should always succeed
      return { message: 'Logged out successfully' };
    }
  }

  /**
   * Validate access token and return user data
   * @param {string} token - Access token
   * @returns {Object} User data
   */
  async validateToken(token) {
    try {
      const decoded = jwt.verify(token, this.JWT_SECRET);

      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        include: {
          role: {
            include: {
              permissions: true
            }
          },
          departmentDetails: true
        }
      });

      if (!user || !user.active_status || user.delete_status) {
        throw new APIError('User not found or inactive', 401);
      }

      return user;
    } catch (error) {
      if (error instanceof jwt.JsonWebTokenError) {
        throw new APIError('Invalid token', 401);
      }
      throw error;
    }
  }

  /**
   * Get current user profile
   * @param {number} userId - User ID
   * @returns {Object} User profile
   */
  async getProfile(userId) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          name: true,
          email: true,
          phonenumber: true,
          alternatenumber: true,
          bloodgroup: true,
          usercode: true,
          address: true,
          city: true,
          state: true,
          pincode: true,
          department_id: true,
          active_status: true,
          createdAt: true,
          updatedAt: true,
          role: {
            select: {
              id: true,
              name: true,
              permissions: {
                select: {
                  action: true,
                  subject: true
                }
              }
            }
          },
          departmentDetails: {
            select: {
              id: true,
              name: true
            }
          }
        }
      });

      if (!user) {
        throw new APIError('User not found', 404);
      }

      return user;
    } catch (error) {
      if (error instanceof APIError) throw error;
      console.error('Get profile error:', error);
      throw new APIError('Failed to get user profile', 500);
    }
  }

  /**
   * Change user password
   * @param {number} userId - User ID
   * @param {string} currentPassword - Current password
   * @param {string} newPassword - New password
   */
  async changePassword(userId, currentPassword, newPassword) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId }
      });

      if (!user) {
        throw new APIError('User not found', 404);
      }

      // Verify current password
      const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
      if (!isCurrentPasswordValid) {
        throw new APIError('Current password is incorrect', 400);
      }

      // Hash new password
      const hashedNewPassword = await bcrypt.hash(newPassword, 10);

      // Update password
      await prisma.user.update({
        where: { id: userId },
        data: {
          password: hashedNewPassword,
          updatedAt: new Date(),
          updatedBy: userId
        }
      });

      // Invalidate refresh token to force re-login
      await this.logout(userId);

      return { message: 'Password changed successfully' };
    } catch (error) {
      if (error instanceof APIError) throw error;
      console.error('Change password error:', error);
      throw new APIError('Failed to change password', 500);
    }
  }

  /**
   * Get all active sessions for admin
   * @returns {Array} Active sessions
   */
  async getActiveSessions() {
    try {
      const sessions = await prisma.refreshToken.findMany({
        where: {
          expiresAt: {
            gt: new Date()
          }
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              usercode: true,
              role: {
                select: {
                  name: true
                }
              }
            }
          }
        },
        orderBy: {
          updatedAt: 'desc'
        }
      });

      return sessions.map(session => ({
        userId: session.userId,
        userName: session.user.name,
        email: session.user.email,
        usercode: session.user.usercode,
        role: session.user.role?.name,
        lastActivity: session.updatedAt,
        createdAt: session.createdAt
      }));
    } catch (error) {
      console.error('Get active sessions error:', error);
      throw new APIError('Failed to get active sessions', 500);
    }
  }
}

export default AuthService;