import express from "express";
import UserMasterController from "../controllers/userMasterController.js";
import { authenticateToken, requireRole } from "../middleware/auth.js";

const router = express.Router();
const userMasterController = new UserMasterController();

/**
 * @swagger
 * components:
 *   schemas:
 *     UserMaster:
 *       type: object
 *       required:
 *         - firstname
 *         - lastname
 *         - email
 *         - password
 *         - usercode
 *         - phone
 *         - department_id
 *         - role_id
 *       properties:
 *         id:
 *           type: integer
 *           description: Auto-generated unique identifier
 *         firstname:
 *           type: string
 *           minLength: 1
 *           maxLength: 100
 *           description: User's first name
 *           example: "John"
 *         lastname:
 *           type: string
 *           minLength: 1
 *           maxLength: 100
 *           description: User's last name
 *           example: "Doe"
 *         email:
 *           type: string
 *           format: email
 *           maxLength: 255
 *           description: User's email address (must be unique)
 *           example: "john.doe@example.com"
 *         password:
 *           type: string
 *           minLength: 6
 *           maxLength: 100
 *           description: User's password (will be hashed)
 *           example: "securePassword123"
 *         usercode:
 *           type: string
 *           minLength: 1
 *           maxLength: 50
 *           description: Unique user code identifier
 *           example: "USR001"
 *         phone:
 *           type: string
 *           maxLength: 20
 *           description: User's phone number
 *           example: "+1234567890"
 *         address:
 *           type: string
 *           maxLength: 500
 *           description: User's address
 *           example: "123 Main Street"
 *         city:
 *           type: string
 *           maxLength: 100
 *           description: User's city
 *           example: "New York"
 *         state:
 *           type: string
 *           maxLength: 100
 *           description: User's state
 *           example: "NY"
 *         pincode:
 *           type: string
 *           maxLength: 20
 *           description: User's pincode
 *           example: "10001"
 *         blood_group:
 *           type: string
 *           enum: [A+, A-, B+, B-, AB+, AB-, O+, O-]
 *           description: User's blood group
 *           example: "A+"
 *         date_of_birth:
 *           type: string
 *           format: date
 *           description: User's date of birth
 *           example: "1990-01-15"
 *         department_id:
 *           type: integer
 *           description: ID of the user's department
 *           example: 1
 *         role_id:
 *           type: integer
 *           description: ID of the user's role
 *           example: 2
 *         delete_status:
 *           type: boolean
 *           default: false
 *           description: Soft delete flag
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: Record creation timestamp
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: Record last update timestamp
 *
 *     UserMasterResponse:
 *       allOf:
 *         - $ref: '#/components/schemas/UserMaster'
 *         - type: object
 *           properties:
 *             password:
 *               description: Password field is excluded from responses for security
 *
 *     UserMasterCreate:
 *       type: object
 *       required:
 *         - firstname
 *         - lastname
 *         - email
 *         - password
 *         - usercode
 *         - phone
 *         - department_id
 *         - role_id
 *       properties:
 *         firstname:
 *           type: string
 *           minLength: 1
 *           maxLength: 100
 *         lastname:
 *           type: string
 *           minLength: 1
 *           maxLength: 100
 *         email:
 *           type: string
 *           format: email
 *           maxLength: 255
 *         password:
 *           type: string
 *           minLength: 6
 *           maxLength: 100
 *         usercode:
 *           type: string
 *           minLength: 1
 *           maxLength: 50
 *         phone:
 *           type: string
 *           maxLength: 20
 *         address:
 *           type: string
 *           maxLength: 500
 *         city:
 *           type: string
 *           maxLength: 100
 *         state:
 *           type: string
 *           maxLength: 100
 *         pincode:
 *           type: string
 *           maxLength: 20
 *         blood_group:
 *           type: string
 *           enum: [A+, A-, B+, B-, AB+, AB-, O+, O-]
 *         date_of_birth:
 *           type: string
 *           format: date
 *         department_id:
 *           type: integer
 *         role_id:
 *           type: integer
 *
 *     UserMasterUpdate:
 *       type: object
 *       properties:
 *         firstname:
 *           type: string
 *           minLength: 1
 *           maxLength: 100
 *         lastname:
 *           type: string
 *           minLength: 1
 *           maxLength: 100
 *         email:
 *           type: string
 *           format: email
 *           maxLength: 255
 *         password:
 *           type: string
 *           minLength: 6
 *           maxLength: 100
 *           description: Optional - only provide if updating password
 *         usercode:
 *           type: string
 *           minLength: 1
 *           maxLength: 50
 *         phone:
 *           type: string
 *           maxLength: 20
 *         address:
 *           type: string
 *           maxLength: 500
 *         city:
 *           type: string
 *           maxLength: 100
 *         state:
 *           type: string
 *           maxLength: 100
 *         pincode:
 *           type: string
 *           maxLength: 20
 *         blood_group:
 *           type: string
 *           enum: [A+, A-, B+, B-, AB+, AB-, O+, O-]
 *         date_of_birth:
 *           type: string
 *           format: date
 *         department_id:
 *           type: integer
 *         role_id:
 *           type: integer
 *
 *     DropdownItem:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         name:
 *           type: string
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
 *   name: User Master
 *   description: User Master management endpoints
 */

/**
 * @swagger
 * /api/user-master:
 *   post:
 *     summary: Create a new user master
 *     tags: [User Master]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UserMasterCreate'
 *     responses:
 *       201:
 *         description: User master created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/UserMasterResponse'
 *       400:
 *         description: Validation failed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Validation failed"
 *                 errors:
 *                   type: array
 *                   items:
 *                     type: string
 *       409:
 *         description: User email or code already exists
 *       500:
 *         description: Internal server error
 */
router.post(
  "/",
//   authenticateToken,
//   requireRole(["Admin"]),
  userMasterController.create.bind(userMasterController)
);

/**
 * @swagger
 * /api/user-master:
 *   get:
 *     summary: Get paginated list of user masters
 *     tags: [User Master]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *         description: Number of items per page
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search in firstname, lastname, email, or usercode
 *       - in: query
 *         name: department_id
 *         schema:
 *           type: integer
 *         description: Filter by department ID
 *       - in: query
 *         name: role_id
 *         schema:
 *           type: integer
 *         description: Filter by role ID
 *     responses:
 *       200:
 *         description: User masters retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/UserMasterResponse'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     total:
 *                       type: integer
 *                     totalPages:
 *                       type: integer
 *                     hasNext:
 *                       type: boolean
 *                     hasPrev:
 *                       type: boolean
 *       400:
 *         description: Invalid query parameters
 *       500:
 *         description: Internal server error
 */
router.get(
  "/",
//   authenticateToken,
//   requireRole(["Admin"]),
  userMasterController.list.bind(userMasterController)
);

/**
 * @swagger
 * /api/user-master/dropdown:
 *   get:
 *     summary: Get user dropdown list
 *     tags: [User Master]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User dropdown retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/DropdownItem'
 *       500:
 *         description: Internal server error
 */
router.get(
  "/dropdown",
//   authenticateToken,
  userMasterController.getDropdown.bind(userMasterController)
);

/**
 * @swagger
 * /api/user-master/roles:
 *   get:
 *     summary: Get roles dropdown
 *     tags: [User Master]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Roles dropdown retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/DropdownItem'
 *       500:
 *         description: Internal server error
 */
router.get(
  "/roles",
//   authenticateToken,
  userMasterController.getRoles.bind(userMasterController)
);

/**
 * @swagger
 * /api/user-master/departments:
 *   get:
 *     summary: Get departments dropdown
 *     tags: [User Master]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Departments dropdown retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/DropdownItem'
 *       500:
 *         description: Internal server error
 */
router.get(
  "/departments",
//   authenticateToken,
  userMasterController.getDepartments.bind(userMasterController)
);

/**
 * @swagger
 * /api/user-master/stats:
 *   get:
 *     summary: Get user statistics
 *     tags: [User Master]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User statistics retrieved successfully
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
 *                     totalUsers:
 *                       type: integer
 *                       example: 150
 *       500:
 *         description: Internal server error
 */
router.get(
  "/stats",
//   authenticateToken,
  userMasterController.getStats.bind(userMasterController)
);

/**
 * @swagger
 * /api/user-master/check-email:
 *   post:
 *     summary: Check if user email exists
 *     tags: [User Master]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "john.doe@example.com"
 *               excludeId:
 *                 type: integer
 *                 description: ID to exclude from check (for updates)
 *                 example: 1
 *     responses:
 *       200:
 *         description: Email check completed
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
 *                     exists:
 *                       type: boolean
 *                       example: false
 *                     email:
 *                       type: string
 *                       example: "john.doe@example.com"
 *       400:
 *         description: Invalid email format
 *       500:
 *         description: Internal server error
 */
router.post(
  "/check-email",
//   authenticateToken,
  userMasterController.checkUserEmail.bind(userMasterController)
);

/**
 * @swagger
 * /api/user-master/check-usercode:
 *   post:
 *     summary: Check if user code exists
 *     tags: [User Master]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - usercode
 *             properties:
 *               usercode:
 *                 type: string
 *                 example: "USR001"
 *               excludeId:
 *                 type: integer
 *                 description: ID to exclude from check (for updates)
 *                 example: 1
 *     responses:
 *       200:
 *         description: User code check completed
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
 *                     exists:
 *                       type: boolean
 *                       example: false
 *                     usercode:
 *                       type: string
 *                       example: "USR001"
 *       400:
 *         description: Invalid user code format
 *       500:
 *         description: Internal server error
 */
router.post(
  "/check-usercode",
//   authenticateToken,
  userMasterController.checkUserCode.bind(userMasterController)
);

/**
 * @swagger
 * /api/user-master/{id}:
 *   get:
 *     summary: Get user master by ID
 *     tags: [User Master]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: User master ID
 *     responses:
 *       200:
 *         description: User master retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/UserMasterResponse'
 *       400:
 *         description: Invalid ID parameter
 *       404:
 *         description: User master not found
 *       500:
 *         description: Internal server error
 */
router.get(
  "/:id",
//   authenticateToken,
  userMasterController.getById.bind(userMasterController)
);

/**
 * @swagger
 * /api/user-master/{id}:
 *   put:
 *     summary: Update user master
 *     tags: [User Master]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: User master ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UserMasterUpdate'
 *     responses:
 *       200:
 *         description: User master updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/UserMasterResponse'
 *       400:
 *         description: Validation failed
 *       404:
 *         description: User master not found
 *       409:
 *         description: Email or user code already exists
 *       500:
 *         description: Internal server error
 */
router.put(
  "/:id",
//   authenticateToken,
//   requireRole(["Admin"]),
  userMasterController.update.bind(userMasterController)
);

/**
 * @swagger
 * /api/user-master/{id}:
 *   delete:
 *     summary: Delete user master (soft delete)
 *     tags: [User Master]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: User master ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - updatedBy
 *             properties:
 *               updatedBy:
 *                 type: integer
 *                 description: ID of user performing the delete operation
 *                 example: 1
 *     responses:
 *       200:
 *         description: User master deleted successfully
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
 *                   example: "User master deleted successfully"
 *       400:
 *         description: Invalid ID parameter or missing updatedBy
 *       404:
 *         description: User master not found
 *       500:
 *         description: Internal server error
 */
router.delete(
  "/:id",
//   authenticateToken,
//   requireRole(["Admin"]),
  userMasterController.delete.bind(userMasterController)
);

export default router;
