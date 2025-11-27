/**
 * Lens Product Master Routes
 * Defines all routes for lens product management
 */

import express from "express";
import * as lensProductController from "../controllers/lensProductMasterController.js";
import { authenticateToken } from "../middleware/auth.js";

const router = express.Router();

/**
 * @swagger
 * /api/v1/lens-products:
 *   post:
 *     summary: Create a new lens product
 *     tags: [Lens Products]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - brand_id
 *               - category_id
 *               - material_id
 *               - type_id
 *               - product_code
 *               - lens_name
 *             properties:
 *               brand_id:
 *                 type: integer
 *               category_id:
 *                 type: integer
 *               material_id:
 *                 type: integer
 *               type_id:
 *                 type: integer
 *               product_code:
 *                 type: string
 *               lens_name:
 *                 type: string
 *               sphere_from:
 *                 type: number
 *               sphere_to:
 *                 type: number
 *               cylinder_from:
 *                 type: number
 *               cylinder_to:
 *                 type: number
 *               add_from:
 *                 type: number
 *               add_to:
 *                 type: number
 *               range_text:
 *                 type: string
 *     responses:
       201:
         description: Product created successfully
 */
router.post("/", authenticateToken, lensProductController.createLensProduct);

/**
 * @swagger
 * /api/v1/lens-products:
 *   get:
 *     summary: Get all lens products with filters
 *     tags: [Lens Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *       - in: query
 *         name: brand_id
 *         schema:
 *           type: integer
 *       - in: query
 *         name: category_id
 *         schema:
 *           type: integer
 *       - in: query
 *         name: material_id
 *         schema:
 *           type: integer
 *       - in: query
 *         name: type_id
 *         schema:
 *           type: integer
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *     responses:
       200:
         description: Products retrieved successfully
 */
router.get("/", authenticateToken, lensProductController.getAllLensProducts);

/**
 * @swagger
 * /api/v1/lens-products/calculate-cost:
 *   post:
 *     summary: Calculate product cost based on customer, lens price, and fitting
 *     tags: [Lens Products]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - customer_id
 *               - lensPrice_id
 *               - fitting_id
 *             properties:
 *               customer_id:
 *                 type: integer
 *                 description: Customer ID
 *               lensPrice_id:
 *                 type: integer
 *                 description: Lens Price Master ID
 *               fitting_id:
 *                 type: integer
 *                 description: Lens Fitting Master ID
 *               quantity:
 *                 type: integer
 *                 default: 1
 *                 minimum: 1
 *                 description: Quantity of products
 *           example:
 *             customer_id: 1
 *             lensPrice_id: 5
 *             fitting_id: 1
 *             quantity: 2
 *     responses:
 *       200:
 *         description: Cost calculated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     customer:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: integer
 *                         code:
 *                           type: string
 *                         name:
 *                           type: string
 *                         shopname:
 *                           type: string
 *                     product:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: integer
 *                         product_code:
 *                           type: string
 *                         lens_name:
 *                           type: string
 *                         brand:
 *                           type: object
 *                         category:
 *                           type: object
 *                     coating:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: integer
 *                         name:
 *                           type: string
 *                         short_name:
 *                           type: string
 *                     pricing:
 *                       type: object
 *                       properties:
 *                         lensPrice_id:
 *                           type: integer
 *                         basePrice:
 *                           type: number
 *                         quantity:
 *                           type: integer
 *                         hasPriceMapping:
 *                           type: boolean
 *                         discountRate:
 *                           type: number
 *                         discountAmount:
 *                           type: number
 *                         costWithoutDiscount:
 *                           type: number
 *                         costWithDiscount:
 *                           type: number
 *                         finalCost:
 *                           type: number
 *                         savings:
 *                           type: number
 *       400:
 *         description: Invalid request data
 *       404:
 *         description: Customer or lens price not found
 */
router.post(
  "/calculate-cost",
  authenticateToken,
  lensProductController.calculateProductCost
);

/**
 * @swagger
 * /api/v1/lens-products/with-prices:
 *   get:
 *     summary: Get all lens products with their price master data
 *     tags: [Lens Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of items per page
 *       - in: query
 *         name: brand_id
 *         schema:
 *           type: integer
 *         description: Filter by brand ID
 *       - in: query
 *         name: category_id
 *         schema:
 *           type: integer
 *         description: Filter by category ID
 *       - in: query
 *         name: material_id
 *         schema:
 *           type: integer
 *         description: Filter by material ID
 *       - in: query
 *         name: type_id
 *         schema:
 *           type: integer
 *         description: Filter by type ID
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search in product name, code, or range text
 *       - in: query
 *         name: activeStatus
 *         schema:
 *           type: string
 *           enum: [active, inactive, all]
 *         description: Filter by active status
 *     responses:
 *       200:
 *         description: Products with prices retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                       product_code:
 *                         type: string
 *                       lens_name:
 *                         type: string
 *                       brand:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: integer
 *                           name:
 *                             type: string
 *                       prices:
 *                         type: array
 *                         items:
 *                           type: object
 *                           properties:
 *                             id:
 *                               type: integer
 *                             price:
 *                               type: number
 *                             coating:
 *                               type: object
 *                               properties:
 *                                 id:
 *                                   type: integer
 *                                 name:
 *                                   type: string
 *                                 short_name:
 *                                   type: string
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     total:
 *                       type: integer
 *                     pages:
 *                       type: integer
 */
router.get(
  "/with-prices",
  authenticateToken,
  lensProductController.getProductsWithPrices
);

/**
 * @swagger
 * /api/v1/lens-products/dropdown:
 *   get:
 *     summary: Get lens products for dropdown with optional filters
 *     tags: [Lens Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: brand_id
 *         schema:
 *           type: integer
 *       - in: query
 *         name: category_id
 *         schema:
 *           type: integer
 *       - in: query
 *         name: material_id
 *         schema:
 *           type: integer
 *       - in: query
 *         name: type_id
 *         schema:
 *           type: integer
 *     responses:
       200:
         description: Dropdown data retrieved successfully
 */
router.get(
  "/dropdown",
  authenticateToken,
  lensProductController.getLensProductsDropdown
);

/**
 * @swagger
 * /api/v1/lens-products/statistics:
 *   get:
 *     summary: Get lens product statistics
 *     tags: [Lens Products]
 *     security:
 *       - bearerAuth: []
 *     responses:
       200:
         description: Statistics retrieved successfully
 */
router.get(
  "/statistics",
  authenticateToken,
  lensProductController.getLensProductStatistics
);

/**
 * @swagger
 * /api/v1/lens-products/by-category/{categoryId}:
 *   get:
 *     summary: Get products by category
 *     tags: [Lens Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: categoryId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
       200:
         description: Products by category retrieved successfully
 */
router.get(
  "/by-category/:categoryId",
  authenticateToken,
  lensProductController.getProductsByCategory
);

/**
 * @swagger
 * /api/v1/lens-products/{id}:
 *   get:
 *     summary: Get lens product by ID
 *     tags: [Lens Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
       200:
         description: Product retrieved successfully
 */
router.get("/:id", authenticateToken, lensProductController.getLensProductById);

/**
 * @swagger
 * /api/v1/lens-products/{id}:
 *   put:
 *     summary: Update lens product
 *     tags: [Lens Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               brand_id:
 *                 type: integer
 *               category_id:
 *                 type: integer
 *               material_id:
 *                 type: integer
 *               type_id:
 *                 type: integer
 *               product_code:
 *                 type: string
 *               lens_name:
 *                 type: string
 *     responses:
       200:
         description: Product updated successfully
 */
router.put("/:id", authenticateToken, lensProductController.updateLensProduct);

/**
 * @swagger
 * /api/v1/lens-products/{id}:
 *   delete:
 *     summary: Delete lens product (soft delete)
 *     tags: [Lens Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
       200:
         description: Product deleted successfully
 */
router.delete(
  "/:id",
  authenticateToken,
  lensProductController.deleteLensProduct
);

// ============================================================================
// PRICING MANAGEMENT ROUTES
// ============================================================================

/**
 * @swagger
 * /api/v1/lens-products/{lensId}/prices:
 *   get:
 *     summary: Get all prices for a specific lens product
 *     tags: [Lens Products - Pricing]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: lensId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Lens product ID
 *     responses:
 *       200:
 *         description: Lens prices retrieved successfully
 *       404:
 *         description: Lens product not found
 */
router.get(
  "/:lensId/prices",
  authenticateToken,
  lensProductController.getLensPricesByLensId
);

/**
 * @swagger
 * /api/v1/lens-products/{lensId}/prices/bulk:
 *   post:
 *     summary: Bulk add or update prices for a lens product
 *     tags: [Lens Products - Pricing]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: lensId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Lens product ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - prices
 *             properties:
 *               prices:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required:
 *                     - coating_id
 *                     - price
 *                   properties:
 *                     coating_id:
 *                       type: integer
 *                       description: Coating ID
 *                     price:
 *                       type: number
 *                       description: Price value
 *           example:
 *             prices:
 *               - coating_id: 1
 *                 price: 2500.00
 *               - coating_id: 2
 *                 price: 3200.00
 *     responses:
 *       200:
 *         description: Prices bulk processed successfully
 *       400:
 *         description: Invalid request data
 *       404:
 *         description: Lens product not found
 */
router.post(
  "/:lensId/prices/bulk",
  authenticateToken,
  lensProductController.bulkAddOrUpdateLensPrices
);

/**
 * @swagger
 * /api/v1/lens-products/{lensId}/prices/{coatingId}:
 *   post:
 *     summary: Add or update price for a specific lens-coating combination
 *     tags: [Lens Products - Pricing]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: lensId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Lens product ID
 *       - in: path
 *         name: coatingId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Coating ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - price
 *             properties:
 *               price:
 *                 type: number
 *                 description: Price value
 *                 minimum: 0
 *           example:
 *             price: 2500.00
 *     responses:
 *       200:
 *         description: Price added/updated successfully
 *       400:
 *         description: Invalid request data
 *       404:
 *         description: Lens or coating not found
 */
router.post(
  "/:lensId/prices/:coatingId",
  authenticateToken,
  lensProductController.addOrUpdateLensPrice
);

/**
 * @swagger
 * /api/v1/lens-products/{lensId}/prices/{coatingId}:
 *   delete:
 *     summary: Delete price for a specific lens-coating combination
 *     tags: [Lens Products - Pricing]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: lensId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Lens product ID
 *       - in: path
 *         name: coatingId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Coating ID
 *     responses:
 *       200:
 *         description: Price deleted successfully
 *       404:
 *         description: Price not found for this lens-coating combination
 */
router.delete(
  "/:lensId/prices/:coatingId",
  authenticateToken,
  lensProductController.deleteLensPrice
);

export default router;
