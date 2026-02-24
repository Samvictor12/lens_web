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

      // Check for duplicate product (same brand, category, material, type combination)
      const duplicateProduct = await prisma.lensProductMaster.findFirst({
        where: {
          brand_id: productData.brand_id,
          category_id: productData.category_id,
          material_id: productData.material_id,
          type_id: productData.type_id,
          deleteStatus: false,
        },
        select: {
          id: true,
          lens_name: true,
          product_code: true,
          brand: { select: { name: true } },
          category: { select: { name: true } },
          material: { select: { name: true } },
          type: { select: { name: true } },
        },
      });

      if (duplicateProduct) {
        throw new APIError(
          `A product with this combination already exists: ${duplicateProduct.brand.name} - ${duplicateProduct.category.name} - ${duplicateProduct.material.name} - ${duplicateProduct.type.name} (Product: ${duplicateProduct.lens_name})`,
          400,
          "DUPLICATE_PRODUCT_COMBINATION"
        );
      }

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
        groupBy,
      } = queryParams;
      console.log(
        "activeStatus,brand_id,category_id,material_id,type_id,groupBy",
        activeStatus,
        brand_id,
        category_id,
        material_id,
        type_id,
        groupBy
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

      // Handle group by request
      if (groupBy) {
        const validGroupByFields = ['brand_id', 'category_id', 'material_id', 'type_id'];
        const groupByField = groupBy.toLowerCase();

        if (validGroupByFields.includes(groupByField)) {
          const groupedData = await prisma.lensProductMaster.groupBy({
            by: [groupByField],
            where,
            _count: {
              id: true,
            },
          });

          // Fetch related data for each group
          const enrichedGroups = await Promise.all(
            groupedData.map(async (group) => {
              let relatedData = null;
              const groupValue = group[groupByField];

              if (groupByField === 'brand_id' && groupValue) {
                relatedData = await prisma.lensBrandMaster.findUnique({
                  where: { id: groupValue },
                  select: { id: true, name: true },
                });
              } else if (groupByField === 'category_id' && groupValue) {
                relatedData = await prisma.lensCategoryMaster.findUnique({
                  where: { id: groupValue },
                  select: { id: true, name: true },
                });
              } else if (groupByField === 'material_id' && groupValue) {
                relatedData = await prisma.lensMaterialMaster.findUnique({
                  where: { id: groupValue },
                  select: { id: true, name: true },
                });
              } else if (groupByField === 'type_id' && groupValue) {
                relatedData = await prisma.lensTypeMaster.findUnique({
                  where: { id: groupValue },
                  select: { id: true, name: true },
                });
              }

              return {
                [groupByField]: groupValue,
                count: group._count.id,
                name: relatedData?.name || 'Unknown',
              };
            })
          );

          return {
            groupBy: groupByField,
            data: enrichedGroups,
          };
        } else {
          throw new APIError(
            `Invalid groupBy field. Allowed values: ${validGroupByFields.join(', ')}`,
            400,
            "INVALID_GROUP_BY"
          );
        }
      }

      // Map frontend sortBy values to backend field names or relations
      const sortFieldMap = {
        lensName: 'lens_name',
        productCode: 'product_code',
        indexValue: 'index_value',
        rangeText: 'range_text',
        activeStatus: 'activeStatus',
        createdAt: 'createdAt',
        updatedAt: 'updatedAt',
        brandName: 'brand',
        categoryName: 'category',
        materialName: 'material',
        typeName: 'type',
      };

      const actualSortBy = sortFieldMap[sortBy] || sortBy;

      // Build orderBy based on whether it's a relation or direct field
      let orderByClause;
      if (['brand', 'category', 'material', 'type'].includes(actualSortBy)) {
        // For related tables, use nested orderBy
        orderByClause = { [actualSortBy]: { name: sortOrder } };
      } else {
        // For direct fields
        orderByClause = { [actualSortBy]: sortOrder };
      }

      const offset = (page - 1) * limit;
      const total = await prisma.lensProductMaster.count({ where });

      const products = await prisma.lensProductMaster.findMany({
        where,
        skip: offset,
        take: parseInt(limit),
        orderBy: orderByClause,
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
      if (error instanceof APIError) throw error;
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

      // Check for duplicate product (same brand, category, material, type combination)
      // Exclude the current product being updated
      const duplicateProduct = await prisma.lensProductMaster.findFirst({
        where: {
          brand_id: updateData.brand_id,
          category_id: updateData.category_id,
          material_id: updateData.material_id,
          type_id: updateData.type_id,
          deleteStatus: false,
          id: { not: id }, // Exclude current product
        },
        select: {
          id: true,
          lens_name: true,
          product_code: true,
          brand: { select: { name: true } },
          category: { select: { name: true } },
          material: { select: { name: true } },
          type: { select: { name: true } },
        },
      });

      if (duplicateProduct) {
        throw new APIError(
          `A product with this combination already exists: ${duplicateProduct.brand.name} - ${duplicateProduct.category.name} - ${duplicateProduct.material.name} - ${duplicateProduct.type.name} (Product: ${duplicateProduct.lens_name})`,
          400,
          "DUPLICATE_PRODUCT_COMBINATION"
        );
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
        where.activeStatus = activeStatus == 'true';
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
      const { customer_id, lensPrice_id, fitting_id, quantity = 1 } = params;

      // Validate inputs
      if (!customer_id) {
        throw new APIError("Customer ID is required", 400, "CUSTOMER_ID_REQUIRED");
      }
      if (!lensPrice_id) {
        throw new APIError("Lens Price ID is required", 400, "LENS_PRICE_ID_REQUIRED");
      }
      if (!fitting_id) {
        throw new APIError("Fitting ID is required", 400, "FITTING_ID_REQUIRED");
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

      // Fetch fitting master with price
      const fitting = await prisma.lensFittingMaster.findUnique({
        where: { id: parseInt(fitting_id), deleteStatus: false },
        select: {
          id: true,
          name: true,
          short_name: true,
          fitting_price: true,
        },
      });

      if (!fitting) {
        throw new APIError("Fitting not found", 404, "FITTING_NOT_FOUND");
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
      const fittingPrice = fitting.fitting_price || 0;
      const totalQuantity = parseInt(quantity);

      // Cost without discount (lens price + fitting price)
      const lensCostWithoutDiscount = basePrice * totalQuantity;
      const totalFittingPrice = fittingPrice * totalQuantity;
      const costWithoutDiscount = lensCostWithoutDiscount + totalFittingPrice;

      // Cost with discount (if mapping exists)
      let lensCostWithDiscount = lensCostWithoutDiscount;
      let costWithDiscount = costWithoutDiscount;
      let discountRate = 0;
      let discountAmount = 0;
      let hasPriceMapping = false;

      if (priceMapping) {
        hasPriceMapping = true;
        discountRate = priceMapping.discountRate;
        lensCostWithDiscount = priceMapping.discountPrice * totalQuantity;
        costWithDiscount = lensCostWithDiscount + totalFittingPrice;
        discountAmount = lensCostWithoutDiscount - lensCostWithDiscount;
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
        fitting: {
          id: fitting.id,
          name: fitting.name,
          short_name: fitting.short_name,
          fitting_price: fittingPrice,
        },
        pricing: {
          lensPrice_id: lensPrice.id,
          fitting_id: fitting.id,
          basePrice: basePrice,
          fittingPrice: fittingPrice,
          quantity: totalQuantity,
          hasPriceMapping: hasPriceMapping,
          discountRate: discountRate,
          discountAmount: discountAmount,
          lensCostWithoutDiscount: lensCostWithoutDiscount,
          lensCostWithDiscount: lensCostWithDiscount,
          totalFittingPrice: totalFittingPrice,
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

  /**
   * Get hierarchical discount data for a specific customer
   * @param {number} customerId - Customer ID
   */
  async getDiscountHierarchy(customerId) {
    try {
      // Check if customer exists
      const customer = await prisma.customer.findUnique({
        where: { id: customerId, delete_status: false },
      });

      if (!customer) {
        throw new APIError("Customer not found", 404, "CUSTOMER_NOT_FOUND");
      }

      // Check if customer has price mappings
      const priceMappingCount = await prisma.priceMapping.count({
        where: {
          customer_id: customerId,
        },
      });

      const hasPriceMapping = priceMappingCount > 0;

      // Fetch all brands with products
      const brands = await prisma.lensBrandMaster.findMany({
        where: {
          deleteStatus: false,
          activeStatus: true,
        },
        select: {
          id: true,
          name: true,
          lensProductMasters: {
            where: {
              deleteStatus: false,
              activeStatus: true,
            },
            select: {
              id: true,
              product_code: true,
              lens_name: true,
              lensPriceMasters: {
                where: {
                  deleteStatus: false,
                  activeStatus: true,
                },
                select: {
                  id: true,
                  price: true,
                  lens_id: true,
                  coating_id: true,
                  coating: {
                    select: {
                      id: true,
                      name: true,
                      short_name: true,
                    },
                  },
                  priceMappings: {
                    where: {
                      customer_id: customerId,
                    },
                    select: {
                      id: true,
                      discountRate: true,
                      discountPrice: true,
                    },
                  }, 
                },
                orderBy: {
                  coating: {
                    name: "asc",
                  },
                },
              },
            },
            orderBy: {
              lens_name: "asc",
            },
          },
        },
        orderBy: {
          name: "asc",
        },
      });

      // If customer has price mappings, replace standard prices with customer-specific prices
      if (hasPriceMapping) {
        // Get all price mappings for this customer
        const priceMappings = await prisma.priceMapping.findMany({
          where: {
            customer_id: customerId,
          },
          select: {
            lensPrice_id: true,
            discountPrice: true,
          },
        });

        // Create a map for quick lookup
        const priceMappingMap = new Map(
          priceMappings.map(pm => [pm.lensPrice_id, pm.discounted_price])
        );

        // Replace prices with customer-specific prices where available
        brands.forEach(brand => {
          brand.lensProductMasters.forEach(product => {
            product.lensPriceMasters.forEach(priceRecord => {
              const customerPrice = priceMappingMap.get(priceRecord.id);
              if (customerPrice !== undefined) {
                priceRecord.price = customerPrice;
                priceRecord.isCustomerPrice = true;
              } else {
                priceRecord.isCustomerPrice = false;
              }
            });
          });
        });
      }

      return {
        brands,
        hasPriceMapping,
        customer: {
          id: customer.id,
          code: customer.code,
          name: customer.name,
          shopname: customer.shopname,
        },
      };
    } catch (error) {
      if (error instanceof APIError) throw error;
      console.error("Error fetching discount hierarchy:", error);
      throw new APIError(
        "Failed to fetch discount hierarchy",
        500,
        "FETCH_HIERARCHY_ERROR"
      );
    }
  }

  /**
   * Apply customer-specific discounts - Optimized to only handle coating-level discounts
   * Frontend cascades brand/product discounts to coatings before sending
   * @param {number} customerId - Customer ID
   * @param {Array} discounts - Array of coating-level discount objects
   * @param {number} userId - User ID applying the discounts
   */
  async applyDiscounts(customerId, discounts, userId) {
    try {
      // Verify customer exists
      const customer = await prisma.customer.findUnique({
        where: { id: customerId, delete_status: false },
      });

      if (!customer) {
        throw new APIError("Customer not found", 404, "CUSTOMER_NOT_FOUND");
      }

      let affectedCount = 0;
      const results = [];

      // Process all discounts (all should be coating-level from frontend)
      for (const discount of discounts) {
        const { priceId, discount: discountPercent } = discount;

        // Fetch the original price record with status checks in WHERE clause
        const priceRecord = await prisma.lensPriceMaster.findFirst({
          where: { 
            id: priceId,
            deleteStatus: false,
            activeStatus: true
          },
        });

        if (priceRecord) {
          const originalPrice = priceRecord.price;
          const discountedPrice = originalPrice - (originalPrice * discountPercent) / 100;

          // Upsert price mapping
          await this.upsertPriceMapping(
            customerId,
            priceId,
            discountedPrice,
            discountPercent,
            userId
          );

          affectedCount++;

          results.push({
            priceId,
            originalPrice,
            discountPercent,
            discountedPrice,
          });
        }
      }

      return {
        affected: affectedCount,
        details: results,
        customer: {
          id: customer.id,
          name: customer.name,
          code: customer.code,
        },
      };
    } catch (error) {
      if (error instanceof APIError) throw error;
      console.error("Error applying discounts:", error);
      throw new APIError(
        "Failed to apply discounts",
        500,
        "APPLY_DISCOUNT_ERROR"
      );
    }
  }

  /**
   * Create or update price mapping for a customer
   * @param {number} customerId - Customer ID
   * @param {number} lensPriceId - Lens Price Master ID
   * @param {number} discountedPrice - Discounted price
   * @param {number} discountRate - Discount percentage
   * @param {number} userId - User ID
   */
  async upsertPriceMapping(customerId, lensPriceId, discountedPrice, discountRate, userId) {
    try {
      // Check if price mapping already exists
      const existingMapping = await prisma.priceMapping.findFirst({
        where: {
          customer_id: customerId,
          lensPrice_id: lensPriceId,
        },
      });

      if (existingMapping) {
        // Update existing mapping
        await prisma.priceMapping.update({
          where: { id: existingMapping.id },
          data: {
            discountPrice: discountedPrice,
            discountRate: discountRate,
            updatedBy: userId,
            updatedAt: new Date(),
          },
        });
      } else {
        // Create new mapping
        await prisma.priceMapping.create({
          data: {
            customer_id: customerId,
            lensPrice_id: lensPriceId,
            discountPrice: discountedPrice,
            discountRate: discountRate,
            createdBy: userId,
            updatedBy: userId,
          },
        });
      }
    } catch (error) {
      console.error("Error upserting price mapping:", error);
      throw error;
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
export const getDiscountHierarchy =
  serviceInstance.getDiscountHierarchy.bind(serviceInstance);
export const applyDiscounts =
  serviceInstance.applyDiscounts.bind(serviceInstance);

export default LensProductMasterService;
