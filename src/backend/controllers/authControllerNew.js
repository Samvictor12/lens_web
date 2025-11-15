import AuthService from '../services/auth.service.js';
import {
  validateLogin,
  validateRefreshToken,
  validateChangePassword,
  validateForgotPassword,
  validateResetPassword,
  sanitizeUserResponse
} from '../dto/authDto.js';
import { APIError } from '../middleware/errorHandler.js';

/**
 * Authentication Controller
 * Handles HTTP requests for authentication operations
 */
export class AuthController {
  constructor() {
    this.authService = new AuthService();
  }

  /**
   * User login
   * @route POST /api/auth/login
   */
  async login(req, res, next) {
    try {
      // Validate request body
      const validation = validateLogin(req.body);
      
      if (!validation.isValid) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: validation.errors
        });
      }

      // Authenticate user
      const authResult = await this.authService.login(
        validation.data.username,
        validation.data.password
      );

      // Log successful login (optional)
      console.log(`User logged in: ${authResult.user.username} (${authResult.user.usercode})`);

      res.json({
        success: true,
        message: 'Login successful',
        data: {
          user: sanitizeUserResponse(authResult.user),
          accessToken: authResult.accessToken,
          refreshToken: authResult.refreshToken,
          tokenType: authResult.tokenType,
          expiresIn: authResult.expiresIn
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Refresh access token
   * @route POST /api/auth/refresh
   */
  async refreshToken(req, res, next) {
    try {
      // Validate request body
      const validation = validateRefreshToken(req.body);
      
      if (!validation.isValid) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: validation.errors
        });
      }

      // Refresh token
      const tokenResult = await this.authService.refreshAccessToken(validation.data.refreshToken);

      res.json({
        success: true,
        message: 'Token refreshed successfully',
        data: tokenResult
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * User logout
   * @route POST /api/auth/logout
   */
  async logout(req, res, next) {
    try {
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      // Logout user
      await this.authService.logout(userId);

      res.json({
        success: true,
        message: 'Logged out successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get current user profile
   * @route GET /api/auth/profile
   */
  async getProfile(req, res, next) {
    try {
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      // Get user profile
      const profile = await this.authService.getProfile(userId);

      res.json({
        success: true,
        data: profile
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Change user password
   * @route POST /api/auth/change-password
   */
  async changePassword(req, res, next) {
    try {
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      // Validate request body
      const validation = validateChangePassword(req.body);
      
      if (!validation.isValid) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: validation.errors
        });
      }

      // Change password
      const result = await this.authService.changePassword(
        userId,
        validation.data.currentPassword,
        validation.data.newPassword
      );

      res.json({
        success: true,
        message: result.message
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Validate token
   * @route GET /api/auth/validate
   */
  async validateToken(req, res, next) {
    try {
      const authHeader = req.headers.authorization;
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
          success: false,
          message: 'Invalid authorization header'
        });
      }

      const token = authHeader.split(' ')[1];
      
      // Validate token
      const user = await this.authService.validateToken(token);

      res.json({
        success: true,
        message: 'Token is valid',
        data: {
          user: sanitizeUserResponse(user),
          isValid: true
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get active sessions (Admin only)
   * @route GET /api/auth/sessions
   */
  async getActiveSessions(req, res, next) {
    try {
      // Check if user is admin
      if (req.user?.role?.name !== 'Admin') {
        return res.status(403).json({
          success: false,
          message: 'Admin access required'
        });
      }

      // Get active sessions
      const sessions = await this.authService.getActiveSessions();

      res.json({
        success: true,
        data: {
          sessions,
          totalActiveSessions: sessions.length
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Revoke user session (Admin only)
   * @route DELETE /api/auth/sessions/:userId
   */
  async revokeSession(req, res, next) {
    try {
      // Check if user is admin
      if (req.user?.role?.name !== 'Admin') {
        return res.status(403).json({
          success: false,
          message: 'Admin access required'
        });
      }

      const targetUserId = parseInt(req.params.userId, 10);
      
      if (isNaN(targetUserId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid user ID'
        });
      }

      // Revoke session
      await this.authService.logout(targetUserId);

      res.json({
        success: true,
        message: 'User session revoked successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get authentication statistics (Admin only)
   * @route GET /api/auth/stats
   */
  async getAuthStats(req, res, next) {
    try {
      // Check if user is admin
      if (req.user?.role?.name !== 'Admin') {
        return res.status(403).json({
          success: false,
          message: 'Admin access required'
        });
      }

      // Get basic stats (you can extend this with more detailed analytics)
      const sessions = await this.authService.getActiveSessions();
      
      const stats = {
        totalActiveSessions: sessions.length,
        activeUsers: sessions.length, // One session per user
        sessionsByRole: sessions.reduce((acc, session) => {
          const role = session.role || 'Unknown';
          acc[role] = (acc[role] || 0) + 1;
          return acc;
        }, {}),
        lastActivity: sessions.length > 0 ? sessions[0].lastActivity : null
      };

      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Health check endpoint for auth service
   * @route GET /api/auth/health
   */
  async healthCheck(req, res) {
    try {
      res.json({
        success: true,
        message: 'Authentication service is healthy',
        timestamp: new Date().toISOString(),
        service: 'auth'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Authentication service is unhealthy',
        timestamp: new Date().toISOString()
      });
    }
  }
}

export default AuthController;