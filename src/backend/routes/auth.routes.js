import express from 'express';
import AuthController from '../controllers/authControllerNew.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = express.Router();
const authController = new AuthController();

/**
 * @swagger
 * components:
 *   schemas:
 *     LoginRequest:
 *       type: object
 *       required:
 *         - username
 *         - password
 *       properties:
 *         username:
 *           type: string
 *           minLength: 3
 *           description: User's unique username
 *           example: "admin"
 *         password:
 *           type: string
 *           minLength: 6
 *           description: User password
 *           example: "securePassword123"
 * 
 *     LoginResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         message:
 *           type: string
 *           example: "Login successful"
 *         data:
 *           type: object
 *           properties:
 *             user:
 *               $ref: '#/components/schemas/UserProfile'
 *             accessToken:
 *               type: string
 *               example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *             refreshToken:
 *               type: string
 *               example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *             tokenType:
 *               type: string
 *               example: "Bearer"
 *             expiresIn:
 *               type: string
 *               example: "15m"
 * 
 *     RefreshTokenRequest:
 *       type: object
 *       required:
 *         - refreshToken
 *       properties:
 *         refreshToken:
 *           type: string
 *           description: Refresh token
 *           example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 * 
 *     RefreshTokenResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         message:
 *           type: string
 *           example: "Token refreshed successfully"
 *         data:
 *           type: object
 *           properties:
 *             accessToken:
 *               type: string
 *               example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *             refreshToken:
 *               type: string
 *               example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *             tokenType:
 *               type: string
 *               example: "Bearer"
 *             expiresIn:
 *               type: string
 *               example: "15m"
 * 
 *     UserProfile:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           example: 1
 *         name:
 *           type: string
 *           example: "John Doe"
 *         email:
 *           type: string
 *           format: email
 *           example: "john.doe@example.com"
 *         usercode:
 *           type: string
 *           example: "USR001"
 *         phonenumber:
 *           type: string
 *           example: "+1234567890"
 *         bloodgroup:
 *           type: string
 *           example: "A+"
 *         address:
 *           type: string
 *           example: "123 Main Street"
 *         city:
 *           type: string
 *           example: "New York"
 *         state:
 *           type: string
 *           example: "NY"
 *         pincode:
 *           type: string
 *           example: "10001"
 *         active_status:
 *           type: boolean
 *           example: true
 *         role:
 *           type: object
 *           properties:
 *             id:
 *               type: integer
 *               example: 1
 *             name:
 *               type: string
 *               example: "Admin"
 *             permissions:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   action:
 *                     type: string
 *                     example: "create"
 *                   subject:
 *                     type: string
 *                     example: "User"
 * 
 *     ChangePasswordRequest:
 *       type: object
 *       required:
 *         - currentPassword
 *         - newPassword
 *         - confirmPassword
 *       properties:
 *         currentPassword:
 *           type: string
 *           description: Current password
 *           example: "oldPassword123"
 *         newPassword:
 *           type: string
 *           minLength: 6
 *           description: New password (must contain uppercase, lowercase, and number)
 *           example: "NewSecurePassword123"
 *         confirmPassword:
 *           type: string
 *           description: Confirm new password
 *           example: "NewSecurePassword123"
 * 
 *     AuthSession:
 *       type: object
 *       properties:
 *         userId:
 *           type: integer
 *           example: 1
 *         userName:
 *           type: string
 *           example: "John Doe"
 *         email:
 *           type: string
 *           example: "john.doe@example.com"
 *         usercode:
 *           type: string
 *           example: "USR001"
 *         role:
 *           type: string
 *           example: "Admin"
 *         lastActivity:
 *           type: string
 *           format: date-time
 *           example: "2024-11-11T10:30:00Z"
 *         createdAt:
 *           type: string
 *           format: date-time
 *           example: "2024-11-11T09:00:00Z"
 * 
 *     ErrorResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: false
 *         message:
 *           type: string
 *           example: "Error message"
 *         errors:
 *           type: array
 *           items:
 *             type: string
 * 
 *   securitySchemes:
 *     bearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 */

/**
 * @swagger
 * tags:
 *   name: Authentication
 *   description: User authentication and authorization endpoints
 */

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: User login
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginRequest'
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/LoginResponse'
 *       400:
 *         description: Validation failed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Invalid credentials
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Internal server error
 */
router.post('/login', authController.login.bind(authController));

/**
 * @swagger
 * /api/auth/refresh:
 *   post:
 *     summary: Refresh access token
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RefreshTokenRequest'
 *     responses:
 *       200:
 *         description: Token refreshed successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/RefreshTokenResponse'
 *       400:
 *         description: Validation failed
 *       401:
 *         description: Invalid or expired refresh token
 *       500:
 *         description: Internal server error
 */
router.post('/refresh', authController.refreshToken.bind(authController));

/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     summary: User logout
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Logged out successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Logged out successfully"
 *       401:
 *         description: Authentication required
 *       500:
 *         description: Internal server error
 */
router.post('/logout', authenticateToken, authController.logout.bind(authController));

/**
 * @swagger
 * /api/auth/profile:
 *   get:
 *     summary: Get current user profile
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User profile retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/UserProfile'
 *       401:
 *         description: Authentication required
 *       404:
 *         description: User not found
 *       500:
 *         description: Internal server error
 */
router.get('/profile', authenticateToken, authController.getProfile.bind(authController));

/**
 * @swagger
 * /api/auth/change-password:
 *   post:
 *     summary: Change user password
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ChangePasswordRequest'
 *     responses:
 *       200:
 *         description: Password changed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Password changed successfully"
 *       400:
 *         description: Validation failed or current password is incorrect
 *       401:
 *         description: Authentication required
 *       404:
 *         description: User not found
 *       500:
 *         description: Internal server error
 */
router.post('/change-password', authenticateToken, authController.changePassword.bind(authController));

/**
 * @swagger
 * /api/auth/validate:
 *   get:
 *     summary: Validate access token
 *     tags: [Authentication]
 *     parameters:
 *       - in: header
 *         name: Authorization
 *         required: true
 *         schema:
 *           type: string
 *           example: "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *         description: Bearer token
 *     responses:
 *       200:
 *         description: Token is valid
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Token is valid"
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       $ref: '#/components/schemas/UserProfile'
 *                     isValid:
 *                       type: boolean
 *                       example: true
 *       401:
 *         description: Invalid or expired token
 *       500:
 *         description: Internal server error
 */
router.get('/validate', authController.validateToken.bind(authController));

/**
 * @swagger
 * /api/auth/sessions:
 *   get:
 *     summary: Get active sessions (Admin only)
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Active sessions retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     sessions:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/AuthSession'
 *                     totalActiveSessions:
 *                       type: integer
 *                       example: 5
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Admin access required
 *       500:
 *         description: Internal server error
 */
router.get('/sessions', authenticateToken, requireRole(['Admin']), authController.getActiveSessions.bind(authController));

/**
 * @swagger
 * /api/auth/sessions/{userId}:
 *   delete:
 *     summary: Revoke user session (Admin only)
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: integer
 *         description: User ID to revoke session for
 *     responses:
 *       200:
 *         description: User session revoked successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "User session revoked successfully"
 *       400:
 *         description: Invalid user ID
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Admin access required
 *       500:
 *         description: Internal server error
 */
router.delete('/sessions/:userId', authenticateToken, requireRole(['Admin']), authController.revokeSession.bind(authController));

/**
 * @swagger
 * /api/auth/stats:
 *   get:
 *     summary: Get authentication statistics (Admin only)
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Authentication statistics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     totalActiveSessions:
 *                       type: integer
 *                       example: 5
 *                     activeUsers:
 *                       type: integer
 *                       example: 5
 *                     sessionsByRole:
 *                       type: object
 *                       properties:
 *                         Admin:
 *                           type: integer
 *                           example: 1
 *                         Sales:
 *                           type: integer
 *                           example: 3
 *                         Inventory:
 *                           type: integer
 *                           example: 1
 *                     lastActivity:
 *                       type: string
 *                       format: date-time
 *                       example: "2024-11-11T10:30:00Z"
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Admin access required
 *       500:
 *         description: Internal server error
 */
router.get('/stats', authenticateToken, requireRole(['Admin']), authController.getAuthStats.bind(authController));

/**
 * @swagger
 * /api/auth/health:
 *   get:
 *     summary: Authentication service health check
 *     tags: [Authentication]
 *     responses:
 *       200:
 *         description: Authentication service is healthy
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Authentication service is healthy"
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                   example: "2024-11-11T10:30:00Z"
 *                 service:
 *                   type: string
 *                   example: "auth"
 *       500:
 *         description: Authentication service is unhealthy
 */
router.get('/health', authController.healthCheck.bind(authController));

export default router;