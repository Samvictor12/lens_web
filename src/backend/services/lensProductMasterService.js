import prisma from "../config/prisma.js";
import { APIError } from "../middleware/errorHandler.js";

/**
 * Lens Product Master Service
 */
class LensProductMasterService {
  async createLensProduct(productData) {
    try {
      // Validate foreign keys exist
      const [brand, category, material, type] = await Promise.all([
        prisma.lensBrandMaster.findUnique({
          where: { id: productData.brand_id, deleteStatus: false },
        }),
        prisma.lensCategoryMaster.findUnique({
          where: { id: productData.category_id, deleteStatus: false },
        }),
        prisma.lensMaterialMaster.findUnique({
          where: { id: productData.material_id, deleteStatus: false },
        }),
        prisma.lensTypeMaster.findUnique({
          where: { id: productData.type_id, deleteStatus: false },
        }),
      ]);

      if (!brand) throw new APIError("Brand not found", 404, "BRAND_NOT_FOUND");
      if (!category)
        throw new APIError("Category not found", 404, "CATEGORY_NOT_FOUND");
      if (!material)
        throw new APIError("Material not found", 404, "MATERIAL_NOT_FOUND");
      if (!type) throw new APIError("Type not found", 404, "TYPE_NOT_FOUND");

      // Validate coating IDs if prices are provided
      if (productData.prices && productData.prices.length > 0) {
        const coatingIds = productData.prices.map((p) => p.coating_id);
        const coatings = await prisma.lensCoatingMaster.findMany({
          where: {
            id: { in: coatingIds },
            deleteStatus: false,
          },
        });

        if (coatings.length !== coatingIds.length) {
          throw new APIError(
            "One or more coating IDs are invalid",
            400,
            "INVALID_COATING_IDS"
          );
        }

        // Validate for duplicate coating IDs in the prices array
        const uniqueCoatings = new Set(coatingIds);
        if (uniqueCoatings.size !== coatingIds.length) {
          throw new APIError(
            "Duplicate coating IDs found in prices",
            400,
            "DUPLICATE_COATING_IDS"
          );
        }
      }

      const product = await prisma.lensProductMaster.create({
        data: {
          brand_id: productData.brand_id,
          category_id: productData.category_id,
          material_id: productData.material_id,
          type_id: productData.type_id,
          product_code: productData.product_code,
          lens_name: productData.lens_name,
          index_value: productData.index_value,
          sphere_min: productData.sphere_min,
          sphere_max: productData.sphere_max,
          sphere_extra_charge: productData.sphere_extra_charge || 0,
          cyl_min: productData.cyl_min,
          cyl_max: productData.cyl_max,
          cylinder_extra_charge: productData.cylinder_extra_charge || 0,
          add_min: productData.add_min,
          add_max: productData.add_max,
          range_text: productData.range_text,
          activeStatus: productData.activeStatus ?? true,
          deleteStatus: false,
          createdBy: productData.createdBy,
          updatedBy: productData.createdBy,
          lensPriceMasters: {
            create:
              productData.prices?.map((price) => ({
                coating_id: price.coating_id,
                price: price.price,
                activeStatus: true,
                deleteStatus: false,
                createdBy: productData.createdBy,
                updatedBy: productData.createdBy,
              })) || [],
          },
        },
        include: {
          brand: { select: { id: true, name: true } },
          category: { select: { id: true, name: true } },
          material: { select: { id: true, name: true } },
          type: { select: { id: true, name: true } },
          Usercreated: { select: { id: true, name: true } },
          lensPriceMasters: {
            where: { deleteStatus: false },
            include: {
              coating: { select: { id: true, name: true, short_name: true } },
            },
          },
        },
      });

      return product;
    } catch (error) {
      if (error instanceof APIError) throw error;
      console.error("Error creating lens product:", error);
      throw new APIError(
        "Failed to create lens product",
        500,
        "CREATE_PRODUCT_ERROR"
      );
    }
  }

  async getAllLensProducts(queryParams) {
    try {
      const {
        page = 1,
        limit = 10,
        sortBy = "createdAt",
        sortOrder = "desc",
        search,
        activeStatus,
        brand_id,
        category_id,
        material_id,
        type_id,
      } = queryParams;
      console.log(
        "activeStatus,brand_id,category_id,material_id,type_id",
        activeStatus,
        brand_id,
        category_id,
        material_id,
        type_id
      );

      const where = { deleteStatus: false };

      if (search) {
        where.OR = [
          { lens_name: { contains: search, mode: "insensitive" } },
          { product_code: { contains: search, mode: "insensitive" } },
          { range_text: { contains: search, mode: "insensitive" } },
        ];
      }

      if (activeStatus !== undefined && activeStatus !== "all") {
        where.activeStatus = activeStatus === "active";
      }
      if (brand_id) where.brand_id = parseInt(brand_id);
      if (category_id) where.category_id = parseInt(category_id);
      if (material_id) where.material_id = parseInt(material_id);
      if (type_id) where.type_id = parseInt(type_id);

      const offset = (page - 1) * limit;
      const total = await prisma.lensProductMaster.count({ where });

      const products = await prisma.lensProductMaster.findMany({
        where,
        skip: offset,
        take: parseInt(limit),
        orderBy: { [sortBy]: sortOrder },
        include: {
          brand: { select: { id: true, name: true } },
          category: { select: { id: true, name: true } },
          material: { select: { id: true, name: true } },
          type: { select: { id: true, name: true } },
          Usercreated: { select: { id: true, name: true } },
          Userupdated: { select: { id: true, name: true } },
          _count: { select: { lensPriceMasters: true } },
        },
      });

      return {
        data: products,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      console.error("Error fetching lens products:", error);
      throw new APIError(
        "Failed to fetch lens products",
        500,
        "FETCH_PRODUCTS_ERROR"
      );
    }
  }

  async getLensProductById(id) {
    try {
      const product = await prisma.lensProductMaster.findUnique({
        where: { id },
        include: {
          brand: { select: { id: true, name: true, description: true } },
          category: { select: { id: true, name: true, description: true } },
          material: { select: { id: true, name: true, description: true } },
          type: { select: { id: true, name: true, description: true } },
          Usercreated: { select: { id: true, name: true, email: true } },
          Userupdated: { select: { id: true, name: true, email: true } },
          lensPriceMasters: {
            where: { deleteStatus: false },
            include: {
              coating: { select: { id: true, name: true, short_name: true } },
            },
          },
        },
      });

      if (!product || product.deleteStatus) {
        throw new APIError("Lens product not found", 404, "PRODUCT_NOT_FOUND");
      }

      return product;
    } catch (error) {
      if (error instanceof APIError) throw error;
      console.error("Error fetching lens product:", error);
      throw new APIError(
        "Failed to fetch lens product",
        500,
        "FETCH_PRODUCT_ERROR"
      );
    }
  }

  async updateLensProduct(id, updateData) {
    try {
      const existing = await prisma.lensProductMaster.findUnique({
        where: { id },
        include: {
          lensPriceMasters: {
            where: { deleteStatus: false },
          },
        },
      });

      if (!existing || existing.deleteStatus) {
        throw new APIError("Lens product not found", 404, "PRODUCT_NOT_FOUND");
      }

      // Validate coating IDs if prices are provided
      if (updateData.prices && updateData.prices.length > 0) {
        const coatingIds = updateData.prices.map((p) => p.coating_id);
        const coatings = await prisma.lensCoatingMaster.findMany({
          where: {
            id: { in: coatingIds },
            deleteStatus: false,
          },
        });

        if (coatings.length !== coatingIds.length) {
          throw new APIError(
            "One or more coating IDs are invalid",
            400,
            "INVALID_COATING_IDS"
          );
        }

        // Validate for duplicate coating IDs
        const uniqueCoatings = new Set(coatingIds);
        if (uniqueCoatings.size !== coatingIds.length) {
          throw new APIError(
            "Duplicate coating IDs found in prices",
            400,
            "DUPLICATE_COATING_IDS"
          );
        }
      }

      const updated = await prisma.lensProductMaster.update({
        where: { id },
        data: {
          brand_id: updateData.brand_id,
          category_id: updateData.category_id,
          material_id: updateData.material_id,
          type_id: updateData.type_id,
          product_code: updateData.product_code,
          lens_name: updateData.lens_name,
          index_value: updateData.index_value,
          sphere_min: updateData.sphere_min,
          sphere_max: updateData.sphere_max,
          sphere_extra_charge: updateData.sphere_extra_charge !== undefined ? updateData.sphere_extra_charge : undefined,
          cyl_min: updateData.cyl_min,
          cyl_max: updateData.cyl_max,
          cylinder_extra_charge: updateData.cylinder_extra_charge !== undefined ? updateData.cylinder_extra_charge : undefined,
          add_min: updateData.add_min,
          add_max: updateData.add_max,
          range_text: updateData.range_text,
          activeStatus: updateData.activeStatus,
          updatedBy: updateData.updatedBy,
        },
        include: {
          brand: { select: { id: true, name: true } },
          category: { select: { id: true, name: true } },
          material: { select: { id: true, name: true } },
          type: { select: { id: true, name: true } },
          lensPriceMasters: {
            where: { deleteStatus: false },
            include: {
              coating: { select: { id: true, name: true, short_name: true } },
            },
          },
        },
      });

      return updated;
    } catch (error) {
      if (error instanceof APIError) throw error;
      console.error("Error updating lens product:", error);
      throw new APIError(
        "Failed to update lens product",
        500,
        "UPDATE_PRODUCT_ERROR"
      );
    }
  }

  async deleteLensProduct(id, updatedBy) {
    try {
      const existing = await prisma.lensProductMaster.findUnique({
        where: { id },
        include: { _count: { select: { lensPriceMasters: true } } },
      });

      if (!existing || existing.deleteStatus) {
        throw new APIError("Lens product not found", 404, "PRODUCT_NOT_FOUND");
      }

      if (existing._count.lensPriceMasters > 0) {
        throw new APIError(
          "Cannot delete product with existing price records",
          400,
          "PRODUCT_HAS_PRICES"
        );
      }

      await prisma.lensProductMaster.update({
        where: { id },
        data: { deleteStatus: true, activeStatus: false, updatedBy },
      });

      return true;
    } catch (error) {
      if (error instanceof APIError) throw error;
      console.error("Error deleting lens product:", error);
      throw new APIError(
        "Failed to delete lens product",
        500,
        "DELETE_PRODUCT_ERROR"
      );
    }
  }

  async getProductDropdown(filters = {}) {
    try {
      const where = { activeStatus: true, deleteStatus: false };

      if (filters.brand_id) where.brand_id = filters.brand_id;
      if (filters.category_id) where.category_id = filters.category_id;
      if (filters.material_id) where.material_id = filters.material_id;
      if (filters.type_id) where.type_id = filters.type_id;

      const products = await prisma.lensProductMaster.findMany({
        where,
        select: {
          id: true,
          lens_name: true,
          product_code: true,
          brand: { select: { name: true } },
          category: { select: { name: true } },
        },
        orderBy: { lens_name: "asc" },
      });

      return products.map((p) => ({
        id: p.id,
        label: `${p.lens_name} (${p.product_code})`,
        value: p.id,
        product_code: p.product_code,
        lens_name: p.lens_name,
        brand: p.brand.name,
        category: p.category.name,
      }));
    } catch (error) {
      console.error("Error fetching product dropdown:", error);
      throw new APIError(
        "Failed to fetch product dropdown",
        500,
        "FETCH_DROPDOWN_ERROR"
      );
    }
  }

  async getProductStats() {
    try {
      const [total, active, inactive, byCategory] = await Promise.all([
        prisma.lensProductMaster.count({ where: { deleteStatus: false } }),
        prisma.lensProductMaster.count({
          where: { deleteStatus: false, activeStatus: true },
        }),
        prisma.lensProductMaster.count({
          where: { deleteStatus: false, activeStatus: false },
        }),
        prisma.lensProductMaster.groupBy({
          by: ["category_id"],
          where: { deleteStatus: false },
          _count: { id: true },
        }),
      ]);

      return { total, active, inactive, byCategory };
    } catch (error) {
      console.error("Error fetching product stats:", error);
      throw new APIError(
        "Failed to fetch product statistics",
        500,
        "FETCH_STATS_ERROR"
      );
    }
  }

  /**
   * Add or update price for a specific lens-coating combination
   * @param {number} lensId - Lens product ID
   * @param {number} coatingId - Coating ID
   * @param {number} price - Price value
   * @param {number} userId - User ID for audit
   */
  async addOrUpdateLensPrice(lensId, coatingId, price, userId) {
    try {
      // Validate lens exists
      const lens = await prisma.lensProductMaster.findUnique({
        where: { id: lensId, deleteStatus: false },
      });
      if (!lens) {
        throw new APIError("Lens product not found", 404, "LENS_NOT_FOUND");
      }

      // Validate coating exists
      const coating = await prisma.lensCoatingMaster.findUnique({
        where: { id: coatingId, deleteStatus: false },
      });
      if (!coating) {
        throw new APIError("Coating not found", 404, "COATING_NOT_FOUND");
      }

      // Check if price already exists for this lens-coating combination
      const existingPrice = await prisma.lensPriceMaster.findFirst({
        where: {
          lens_id: lensId,
          coating_id: coatingId,
          deleteStatus: false,
        },
      });

      let result;
      if (existingPrice) {
        // Update existing price
        result = await prisma.lensPriceMaster.update({
          where: { id: existingPrice.id },
          data: {
            price: price,
            updatedBy: userId,
          },
          include: {
            lens: {
              select: { id: true, lens_name: true, product_code: true },
            },
            coating: {
              select: { id: true, name: true, short_name: true },
            },
          },
        });
      } else {
        // Create new price
        result = await prisma.lensPriceMaster.create({
          data: {
            lens_id: lensId,
            coating_id: coatingId,
            price: price,
            activeStatus: true,
            deleteStatus: false,
            createdBy: userId,
            updatedBy: userId,
          },
          include: {
            lens: {
              select: { id: true, lens_name: true, product_code: true },
            },
            coating: {
              select: { id: true, name: true, short_name: true },
            },
          },
        });
      }

      return result;
    } catch (error) {
      if (error instanceof APIError) throw error;
      console.error("Error adding/updating lens price:", error);
      throw new APIError(
        "Failed to add or update lens price",
        500,
        "ADD_UPDATE_PRICE_ERROR"
      );
    }
  }

  /**
   * Bulk add/update prices for a lens product
   * @param {number} lensId - Lens product ID
   * @param {Array} prices - Array of {coating_id, price}
   * @param {number} userId - User ID for audit
   */
  async bulkAddOrUpdateLensPrices(lensId, prices, userId) {
    try {
      // Validate lens exists
      const lens = await prisma.lensProductMaster.findUnique({
        where: { id: lensId, deleteStatus: false },
      });
      if (!lens) {
        throw new APIError("Lens product not found", 404, "LENS_NOT_FOUND");
      }

      // Validate all coating IDs
      const coatingIds = prices.map((p) => p.coating_id);
      const uniqueCoatings = new Set(coatingIds);
      if (uniqueCoatings.size !== coatingIds.length) {
        throw new APIError(
          "Duplicate coating IDs found in prices",
          400,
          "DUPLICATE_COATING_IDS"
        );
      }

      const coatings = await prisma.lensCoatingMaster.findMany({
        where: {
          id: { in: coatingIds },
          deleteStatus: false,
        },
      });

      if (coatings.length !== coatingIds.length) {
        throw new APIError(
          "One or more coating IDs are invalid",
          400,
          "INVALID_COATING_IDS"
        );
      }

      // Get existing prices for this lens
      const existingPrices = await prisma.lensPriceMaster.findMany({
        where: {
          lens_id: lensId,
          deleteStatus: false,
        },
      });

      const existingPriceMap = new Map(
        existingPrices.map((p) => [p.coating_id, p])
      );

      const results = [];

      // Process each price
      for (const priceData of prices) {
        const existing = existingPriceMap.get(priceData.coating_id);

        if (existing) {
          // Update existing
          const updated = await prisma.lensPriceMaster.update({
            where: { id: existing.id },
            data: {
              price: priceData.price,
              updatedBy: userId,
            },
          });
          results.push({ ...updated, operation: "updated" });
        } else {
          // Create new
          const created = await prisma.lensPriceMaster.create({
            data: {
              lens_id: lensId,
              coating_id: priceData.coating_id,
              price: priceData.price,
              activeStatus: true,
              deleteStatus: false,
              createdBy: userId,
              updatedBy: userId,
            },
          });
          results.push({ ...created, operation: "created" });
        }
      }

      // Fetch the updated lens with all prices
      const updatedLens = await prisma.lensProductMaster.findUnique({
        where: { id: lensId },
        include: {
          lensPriceMasters: {
            where: { deleteStatus: false },
            include: {
              coating: {
                select: { id: true, name: true, short_name: true },
              },
            },
          },
        },
      });

      return {
        lens: updatedLens,
        pricesProcessed: results.length,
        details: results,
      };
    } catch (error) {
      if (error instanceof APIError) throw error;
      console.error("Error bulk updating lens prices:", error);
      throw new APIError(
        "Failed to bulk update lens prices",
        500,
        "BULK_UPDATE_PRICE_ERROR"
      );
    }
  }

  /**
   * Delete price for a specific lens-coating combination
   * @param {number} lensId - Lens product ID
   * @param {number} coatingId - Coating ID
   * @param {number} userId - User ID for audit
   */
  async deleteLensPrice(lensId, coatingId, userId) {
    try {
      const existingPrice = await prisma.lensPriceMaster.findFirst({
        where: {
          lens_id: lensId,
          coating_id: coatingId,
          deleteStatus: false,
        },
      });

      if (!existingPrice) {
        throw new APIError(
          "Price not found for this lens-coating combination",
          404,
          "PRICE_NOT_FOUND"
        );
      }

      await prisma.lensPriceMaster.update({
        where: { id: existingPrice.id },
        data: {
          deleteStatus: true,
          activeStatus: false,
          updatedBy: userId,
        },
      });

      return true;
    } catch (error) {
      if (error instanceof APIError) throw error;
      console.error("Error deleting lens price:", error);
      throw new APIError(
        "Failed to delete lens price",
        500,
        "DELETE_PRICE_ERROR"
      );
    }
  }

  /**
   * Get all prices for a specific lens product
   * @param {number} lensId - Lens product ID
   */
  async getLensPricesByLensId(lensId) {
    try {
      const lens = await prisma.lensProductMaster.findUnique({
        where: { id: lensId, deleteStatus: false },
      });

      if (!lens) {
        throw new APIError("Lens product not found", 404, "LENS_NOT_FOUND");
      }

      const prices = await prisma.lensPriceMaster.findMany({
        where: {
          lens_id: lensId,
          deleteStatus: false,
        },
        include: {
          coating: {
            select: { id: true, name: true, short_name: true },
          },
        },
        orderBy: {
          coating: { name: "asc" },
        },
      });

      return prices;
    } catch (error) {
      if (error instanceof APIError) throw error;
      console.error("Error fetching lens prices:", error);
      throw new APIError(
        "Failed to fetch lens prices",
        500,
        "FETCH_PRICES_ERROR"
      );
    }
  }

  /**
   * Get all products with their prices
   * @param {Object} queryParams - Query parameters for filtering and pagination
   * @returns {Promise<Object>} Products with prices and pagination
   */
  async getProductsWithPrices(queryParams = {}) {
    try {
      const {
        page = 1,
        limit = 10,
        sortBy = "createdAt",
        sortOrder = "desc",
        search,
        activeStatus,
        brand_id,
        category_id,
        material_id,
        type_id,
      } = queryParams;

      const where = { deleteStatus: false };

      if (search) {
        where.OR = [
          { lens_name: { contains: search, mode: "insensitive" } },
          { product_code: { contains: search, mode: "insensitive" } },
          { range_text: { contains: search, mode: "insensitive" } },
        ];
      }

      if (activeStatus !== undefined && activeStatus !== "all") {
        where.activeStatus = activeStatus === "active";
      }
      if (brand_id) where.brand_id = parseInt(brand_id);
      if (category_id) where.category_id = parseInt(category_id);
      if (material_id) where.material_id = parseInt(material_id);
      if (type_id) where.type_id = parseInt(type_id);

      const offset = (page - 1) * limit;
      const total = await prisma.lensProductMaster.count({ where });

      const products = await prisma.lensProductMaster.findMany({
        where,
        skip: offset,
        take: parseInt(limit),
        orderBy: { [sortBy]: sortOrder },
        select: {
          id: true,
          product_code: true,
          lens_name: true,
          brand: {
            select: {
              id: true,
              name: true,
            },
          },
          lensPriceMasters: {
            where: {
              deleteStatus: false,
              activeStatus: true,
            },
            select: {
              id: true,
              price: true,
              coating: {
                select: {
                  id: true,
                  name: true,
                  short_name: true,
                },
              },
              createdAt: true,
              updatedAt: true,
            },
            orderBy: {
              coating: { name: "asc" },
            },
          },
        },
      });

      // Transform the data structure
      const transformedProducts = products.map((product) => ({
        id: product.id,
        product_code: product.product_code,
        lens_name: product.lens_name,
        brand: product.brand.name,
        prices: product.lensPriceMasters,
      }));

      return {
        data: transformedProducts,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      console.error("Error fetching products with prices:", error);
      throw new APIError(
        "Failed to fetch products with prices",
        500,
        "FETCH_PRODUCTS_WITH_PRICES_ERROR"
      );
    }
  }

  /**
   * Calculate cost for a product based on customer and price master
   * @param {Object} params - Calculation parameters
   * @param {number} params.customer_id - Customer ID
   * @param {number} params.lensPrice_id - Lens Price Master ID
   * @param {number} params.quantity - Quantity (default: 1)
   * @returns {Promise<Object>} Cost calculation with and without discount
   */
  async calculateProductCost(params) {
    try {
      const { customer_id, lensPrice_id, quantity = 1 } = params;

      // Validate inputs
      if (!customer_id) {
        throw new APIError("Customer ID is required", 400, "CUSTOMER_ID_REQUIRED");
      }
      if (!lensPrice_id) {
        throw new APIError("Lens Price ID is required", 400, "LENS_PRICE_ID_REQUIRED");
      }

      // Fetch customer
      const customer = await prisma.customer.findUnique({
        where: { id: parseInt(customer_id), delete_status: false },
        select: {
          id: true,
          code: true,
          name: true,
          shopname: true,
        },
      });

      if (!customer) {
        throw new APIError("Customer not found", 404, "CUSTOMER_NOT_FOUND");
      }

      // Fetch lens price master with product details
      const lensPrice = await prisma.lensPriceMaster.findUnique({
        where: { id: parseInt(lensPrice_id), deleteStatus: false },
        include: {
          lens: {
            select: {
              id: true,
              product_code: true,
              lens_name: true,
              brand: {
                select: {
                  id: true,
                  name: true,
                },
              },
              category: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
          coating: {
            select: {
              id: true,
              name: true,
              short_name: true,
            },
          },
        },
      });

      if (!lensPrice) {
        throw new APIError("Lens price not found", 404, "LENS_PRICE_NOT_FOUND");
      }

      // Check for price mapping
      const priceMapping = await prisma.priceMapping.findFirst({
        where: {
          customer_id: parseInt(customer_id),
          lensPrice_id: parseInt(lensPrice_id),
        },
        select: {
          id: true,
          discountRate: true,
          discountPrice: true,
        },
      });

      // Calculate costs
      const basePrice = lensPrice.price;
      const totalQuantity = parseInt(quantity);
      
      // Cost without discount
      const costWithoutDiscount = basePrice * totalQuantity;

      // Cost with discount (if mapping exists)
      let costWithDiscount = costWithoutDiscount;
      let discountRate = 0;
      let discountAmount = 0;
      let hasPriceMapping = false;

      if (priceMapping) {
        hasPriceMapping = true;
        discountRate = priceMapping.discountRate;
        costWithDiscount = priceMapping.discountPrice * totalQuantity;
        discountAmount = costWithoutDiscount - costWithDiscount;
      }

      return {
        customer: customer,
        product: {
          id: lensPrice.lens.id,
          product_code: lensPrice.lens.product_code,
          lens_name: lensPrice.lens.lens_name,
          brand: lensPrice.lens.brand,
          category: lensPrice.lens.category,
        },
        coating: lensPrice.coating,
        pricing: {
          lensPrice_id: lensPrice.id,
          basePrice: basePrice,
          quantity: totalQuantity,
          hasPriceMapping: hasPriceMapping,
          discountRate: discountRate,
          discountAmount: discountAmount,
          costWithoutDiscount: costWithoutDiscount,
          costWithDiscount: costWithDiscount,
          finalCost: costWithDiscount,
          savings: discountAmount,
        },
      };
    } catch (error) {
      if (error instanceof APIError) throw error;
      console.error("Error calculating product cost:", error);
      throw new APIError(
        "Failed to calculate product cost",
        500,
        "CALCULATE_COST_ERROR"
      );
    }
  }
}

// Create and export service instance
const serviceInstance = new LensProductMasterService();

// Export individual methods for direct use
export const createLensProduct =
  serviceInstance.createLensProduct.bind(serviceInstance);
export const getAllLensProducts =
  serviceInstance.getAllLensProducts.bind(serviceInstance);
export const getLensProductById =
  serviceInstance.getLensProductById.bind(serviceInstance);
export const updateLensProduct =
  serviceInstance.updateLensProduct.bind(serviceInstance);
export const deleteLensProduct =
  serviceInstance.deleteLensProduct.bind(serviceInstance);
export const getProductDropdown =
  serviceInstance.getProductDropdown.bind(serviceInstance);
export const getProductStats =
  serviceInstance.getProductStats.bind(serviceInstance);
export const addOrUpdateLensPrice =
  serviceInstance.addOrUpdateLensPrice.bind(serviceInstance);
export const bulkAddOrUpdateLensPrices =
  serviceInstance.bulkAddOrUpdateLensPrices.bind(serviceInstance);
export const deleteLensPrice =
  serviceInstance.deleteLensPrice.bind(serviceInstance);
export const getLensPricesByLensId =
  serviceInstance.getLensPricesByLensId.bind(serviceInstance);
export const getProductsWithPrices =
  serviceInstance.getProductsWithPrices.bind(serviceInstance);
export const calculateProductCost =
  serviceInstance.calculateProductCost.bind(serviceInstance);

export default LensProductMasterService;
