import prisma from '../config/prisma.js';
import { APIError } from '../middleware/errorHandler.js';

/**
 * Price Mapping Service
 * Handles bulk CRUD operations for customer-specific lens product pricing
 */
export class PriceMappingService {

  /**
   * Bulk create price mappings for a customer
   * @param {Object} data - Bulk price mapping data
   * @returns {Promise<Object>} Created price mappings
   */
  async bulkCreatePriceMappings(data) {
    try {
      const { customer_id, mappings, createdBy } = data;

      // Validate customer exists
      const customer = await prisma.customer.findUnique({
        where: { id: customer_id, delete_status: false }
      });

      if (!customer) {
        throw new APIError('Customer not found', 404, 'CUSTOMER_NOT_FOUND');
      }

      // Validate all lens prices exist and get their base prices
      const lensPriceIds = mappings.map(m => m.lensPrice_id);
      const lensPrices = await prisma.lensPriceMaster.findMany({
        where: {
          id: { in: lensPriceIds },
          deleteStatus: false
        }
      });

      if (lensPrices.length !== lensPriceIds.length) {
        throw new APIError('One or more lens prices not found', 404, 'LENS_PRICES_NOT_FOUND');
      }

      // Check for existing mappings for this customer and lens prices
      const existingMappings = await prisma.priceMapping.findMany({
        where: {
          customer_id,
          lensPrice_id: { in: lensPriceIds }
        }
      });

      if (existingMappings.length > 0) {
        const existingPriceIds = existingMappings.map(m => m.lensPrice_id);
        throw new APIError(
          `Price mappings already exist for lens prices: ${existingPriceIds.join(', ')}`,
          409,
          'DUPLICATE_PRICE_MAPPING'
        );
      }

      // Create a map of lens prices for quick lookup
      const lensPriceMap = new Map(lensPrices.map(lp => [lp.id, lp.price]));

      // Bulk create price mappings with calculated discount prices
      const priceMappingsData = mappings.map(mapping => {
        const basePrice = lensPriceMap.get(mapping.lensPrice_id);
        const discountRate = mapping.discountRate || 0;
        const discountPrice = basePrice - (basePrice * discountRate / 100);
        
        return {
          customer_id,
          lensPrice_id: mapping.lensPrice_id,
          discountRate,
          discountPrice,
          createdBy,
          updatedBy: createdBy
        };
      });

      const result = await prisma.priceMapping.createMany({
        data: priceMappingsData
      });

      // Fetch created mappings with relations
      const createdMappings = await prisma.priceMapping.findMany({
        where: {
          customer_id,
          lensPrice_id: { in: lensPriceIds }
        },
        include: {
          lensPrice: {
            include: {
              lens: {
                select: {
                  id: true,
                  product_code: true,
                  lens_name: true,
                  brand: { select: { id: true, name: true } },
                  category: { select: { id: true, name: true } },
                  material: { select: { id: true, name: true } },
                  type: { select: { id: true, name: true } }
                }
              },
              coating: {
                select: {
                  id: true,
                  name: true,
                  short_name: true
                }
              }
            }
          },
          customer: {
            select: {
              id: true,
              code: true,
              name: true,
              shopname: true
            }
          },
          createdByUser: {
            select: { id: true, name: true, email: true }
          }
        }
      });

      return {
        count: result.count,
        mappings: createdMappings
      };
    } catch (error) {
      if (error instanceof APIError) {
        throw error;
      }
      console.error('Error bulk creating price mappings:', error);
      throw new APIError('Failed to create price mappings', 500, 'CREATE_PRICE_MAPPING_ERROR');
    }
  }

  /**
   * Bulk update price mappings
   * @param {Object} data - Bulk update data
   * @returns {Promise<Object>} Updated price mappings
   */
  async bulkUpdatePriceMappings(data) {
    try {
      const { mappings, updatedBy } = data;

      if (!mappings || mappings.length === 0) {
        throw new APIError('No mappings provided for update', 400, 'NO_MAPPINGS_PROVIDED');
      }

      const mappingIds = mappings.map(m => m.id);

      // Verify all mappings exist
      const existingMappings = await prisma.priceMapping.findMany({
        where: { id: { in: mappingIds } }
      });

      if (existingMappings.length !== mappingIds.length) {
        throw new APIError('One or more price mappings not found', 404, 'MAPPINGS_NOT_FOUND');
      }

      // Fetch lens prices for discount calculation
      const lensPriceIds = existingMappings.map(m => m.lensPrice_id);
      const lensPrices = await prisma.lensPriceMaster.findMany({
        where: {
          id: { in: lensPriceIds },
          deleteStatus: false
        }
      });
      const lensPriceMap = new Map(lensPrices.map(lp => [lp.id, lp.price]));

      // Perform bulk update using transactions with recalculated discount prices
      const updatePromises = mappings.map(mapping => {
        const existingMapping = existingMappings.find(em => em.id === mapping.id);
        const basePrice = lensPriceMap.get(existingMapping.lensPrice_id);
        const discountRate = mapping.discountRate;
        const discountPrice = basePrice - (basePrice * discountRate / 100);

        return prisma.priceMapping.update({
          where: { id: mapping.id },
          data: {
            discountRate,
            discountPrice,
            updatedBy
          }
        });
      });

      await prisma.$transaction(updatePromises);

      // Fetch updated mappings with relations
      const updatedMappings = await prisma.priceMapping.findMany({
        where: { id: { in: mappingIds } },
        include: {
          lensPrice: {
            include: {
              lens: {
                select: {
                  id: true,
                  product_code: true,
                  lens_name: true,
                  brand: { select: { id: true, name: true } },
                  category: { select: { id: true, name: true } },
                  material: { select: { id: true, name: true } },
                  type: { select: { id: true, name: true } }
                }
              },
              coating: {
                select: {
                  id: true,
                  name: true,
                  short_name: true
                }
              }
            }
          },
          customer: {
            select: {
              id: true,
              code: true,
              name: true,
              shopname: true
            }
          },
          updatedByUser: {
            select: { id: true, name: true, email: true }
          }
        }
      });

      return {
        count: updatedMappings.length,
        mappings: updatedMappings
      };
    } catch (error) {
      if (error instanceof APIError) {
        throw error;
      }
      console.error('Error bulk updating price mappings:', error);
      throw new APIError('Failed to update price mappings', 500, 'UPDATE_PRICE_MAPPING_ERROR');
    }
  }

  /**
   * Get price mappings with filtering and pagination
   * @param {Object} queryParams - Query parameters
   * @returns {Promise<Object>} Paginated price mappings
   */
  async getPriceMappings(queryParams) {
    try {
      const {
        page = 1,
        limit = 10,
        sortBy = 'createdAt',
        sortOrder = 'desc',
        customer_id,
        lensPrice_id,
        search
      } = queryParams;

      const where = {};

      if (customer_id) {
        where.customer_id = parseInt(customer_id);
      }

      if (lensPrice_id) {
        where.lensPrice_id = parseInt(lensPrice_id);
      }

      // Search across customer name or lens product name
      if (search) {
        where.OR = [
          {
            customer: {
              name: { contains: search, mode: 'insensitive' }
            }
          },
          {
            customer: {
              code: { contains: search, mode: 'insensitive' }
            }
          },
          {
            lensPrice: {
              lens: {
                lens_name: { contains: search, mode: 'insensitive' }
              }
            }
          },
          {
            lensPrice: {
              lens: {
                product_code: { contains: search, mode: 'insensitive' }
              }
            }
          }
        ];
      }

      const skip = (parseInt(page) - 1) * parseInt(limit);
      const take = parseInt(limit);

      const total = await prisma.priceMapping.count({ where });

      const mappings = await prisma.priceMapping.findMany({
        where,
        skip,
        take,
        orderBy: { [sortBy]: sortOrder },
        include: {
          lensPrice: {
            include: {
              lens: {
                select: {
                  id: true,
                  product_code: true,
                  lens_name: true,
                  brand: { select: { id: true, name: true } },
                  category: { select: { id: true, name: true } },
                  material: { select: { id: true, name: true } },
                  type: { select: { id: true, name: true } }
                }
              },
              coating: {
                select: {
                  id: true,
                  name: true,
                  short_name: true
                }
              }
            }
          },
          customer: {
            select: {
              id: true,
              code: true,
              name: true,
              shopname: true,
              email: true,
              phone: true
            }
          },
          createdByUser: {
            select: { id: true, name: true }
          },
          updatedByUser: {
            select: { id: true, name: true }
          }
        }
      });

      return {
        data: mappings,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages: Math.ceil(total / parseInt(limit))
        }
      };
    } catch (error) {
      console.error('Error fetching price mappings:', error);
      throw new APIError('Failed to fetch price mappings', 500, 'FETCH_PRICE_MAPPING_ERROR');
    }
  }

  /**
   * Get price mappings by customer ID
   * @param {number} customer_id - Customer ID
   * @returns {Promise<Array>} Customer's price mappings
   */
  async getPriceMappingsByCustomer(customer_id) {
    try {
      const mappings = await prisma.priceMapping.findMany({
        where: { customer_id: parseInt(customer_id) },
        include: {
          lensPrice: {
            include: {
              lens: {
                select: {
                  id: true,
                  product_code: true,
                  lens_name: true,
                  brand: { select: { id: true, name: true } },
                  category: { select: { id: true, name: true } },
                  material: { select: { id: true, name: true } },
                  type: { select: { id: true, name: true } }
                }
              },
              coating: {
                select: {
                  id: true,
                  name: true,
                  short_name: true
                }
              }
            }
          },
          createdByUser: {
            select: { id: true, name: true }
          },
          updatedByUser: {
            select: { id: true, name: true }
          }
        },
        orderBy: { createdAt: 'desc' }
      });

      return mappings;
    } catch (error) {
      console.error('Error fetching customer price mappings:', error);
      throw new APIError('Failed to fetch customer price mappings', 500, 'FETCH_CUSTOMER_MAPPINGS_ERROR');
    }
  }

  /**
   * Get single price mapping by ID
   * @param {number} id - Price mapping ID
   * @returns {Promise<Object>} Price mapping
   */
  async getPriceMappingById(id) {
    try {
      const mapping = await prisma.priceMapping.findUnique({
        where: { id: parseInt(id) },
        include: {
          lensPrice: {
            include: {
              lens: {
                include: {
                  brand: true,
                  category: true,
                  material: true,
                  type: true
                }
              },
              coating: true
            }
          },
          customer: true,
          createdByUser: {
            select: { id: true, name: true, email: true }
          },
          updatedByUser: {
            select: { id: true, name: true, email: true }
          }
        }
      });

      if (!mapping) {
        throw new APIError('Price mapping not found', 404, 'MAPPING_NOT_FOUND');
      }

      return mapping;
    } catch (error) {
      if (error instanceof APIError) {
        throw error;
      }
      console.error('Error fetching price mapping:', error);
      throw new APIError('Failed to fetch price mapping', 500, 'FETCH_MAPPING_ERROR');
    }
  }

  /**
   * Bulk delete price mappings
   * @param {Object} data - Bulk delete data
   * @returns {Promise<Object>} Deletion result
   */
  async bulkDeletePriceMappings(data) {
    try {
      const { ids } = data;

      if (!ids || ids.length === 0) {
        throw new APIError('No mapping IDs provided for deletion', 400, 'NO_IDS_PROVIDED');
      }

      // Verify all mappings exist
      const existingMappings = await prisma.priceMapping.findMany({
        where: { id: { in: ids } }
      });

      if (existingMappings.length !== ids.length) {
        throw new APIError('One or more price mappings not found', 404, 'MAPPINGS_NOT_FOUND');
      }

      // Bulk delete
      const result = await prisma.priceMapping.deleteMany({
        where: { id: { in: ids } }
      });

      return {
        count: result.count,
        message: `Successfully deleted ${result.count} price mapping(s)`
      };
    } catch (error) {
      if (error instanceof APIError) {
        throw error;
      }
      console.error('Error bulk deleting price mappings:', error);
      throw new APIError('Failed to delete price mappings', 500, 'DELETE_PRICE_MAPPING_ERROR');
    }
  }

  /**
   * Delete all price mappings for a customer
   * @param {number} customer_id - Customer ID
   * @returns {Promise<Object>} Deletion result
   */
  async deleteCustomerPriceMappings(customer_id) {
    try {
      const result = await prisma.priceMapping.deleteMany({
        where: { customer_id: parseInt(customer_id) }
      });

      return {
        count: result.count,
        message: `Successfully deleted ${result.count} price mapping(s) for customer`
      };
    } catch (error) {
      console.error('Error deleting customer price mappings:', error);
      throw new APIError('Failed to delete customer price mappings', 500, 'DELETE_CUSTOMER_MAPPINGS_ERROR');
    }
  }

  /**
   * Bulk upsert price mappings (create or update)
   * @param {Object} data - Bulk upsert data
   * @returns {Promise<Object>} Upserted price mappings
   */
  async bulkUpsertPriceMappings(data) {
    try {
      const { customer_id, mappings, createdBy, updatedBy } = data;

      // Validate customer exists
      const customer = await prisma.customer.findUnique({
        where: { id: customer_id, delete_status: false }
      });

      if (!customer) {
        throw new APIError('Customer not found', 404, 'CUSTOMER_NOT_FOUND');
      }

      const lensPriceIds = mappings.map(m => m.lensPrice_id);

      // Fetch lens prices for discount calculation
      const lensPrices = await prisma.lensPriceMaster.findMany({
        where: {
          id: { in: lensPriceIds },
          deleteStatus: false
        }
      });

      if (lensPrices.length !== lensPriceIds.length) {
        throw new APIError('One or more lens prices not found', 404, 'LENS_PRICES_NOT_FOUND');
      }

      const lensPriceMap = new Map(lensPrices.map(lp => [lp.id, lp.price]));

      // Check which mappings already exist
      const existingMappings = await prisma.priceMapping.findMany({
        where: {
          customer_id,
          lensPrice_id: { in: lensPriceIds }
        }
      });

      const existingPriceIds = existingMappings.map(m => m.lensPrice_id);
      const newMappings = mappings.filter(m => !existingPriceIds.includes(m.lensPrice_id));
      const updateMappings = mappings.filter(m => existingPriceIds.includes(m.lensPrice_id));

      let createdCount = 0;
      let updatedCount = 0;

      // Create new mappings
      if (newMappings.length > 0) {
        const createData = newMappings.map(mapping => {
          const basePrice = lensPriceMap.get(mapping.lensPrice_id);
          const discountRate = mapping.discountRate || 0;
          const discountPrice = basePrice - (basePrice * discountRate / 100);

          return {
            customer_id,
            lensPrice_id: mapping.lensPrice_id,
            discountRate,
            discountPrice,
            createdBy,
            updatedBy: createdBy
          };
        });

        const createResult = await prisma.priceMapping.createMany({
          data: createData
        });
        createdCount = createResult.count;
      }

      // Update existing mappings
      if (updateMappings.length > 0) {
        const updatePromises = updateMappings.map(mapping => {
          const existing = existingMappings.find(e => e.lensPrice_id === mapping.lensPrice_id);
          const basePrice = lensPriceMap.get(mapping.lensPrice_id);
          const discountRate = mapping.discountRate;
          const discountPrice = basePrice - (basePrice * discountRate / 100);

          return prisma.priceMapping.update({
            where: { id: existing.id },
            data: {
              discountRate,
              discountPrice,
              updatedBy: updatedBy || createdBy
            }
          });
        });

        await prisma.$transaction(updatePromises);
        updatedCount = updatePromises.length;
      }

      // Fetch all mappings for this customer
      const allMappings = await prisma.priceMapping.findMany({
        where: {
          customer_id,
          lensPrice_id: { in: lensPriceIds }
        },
        include: {
          lensPrice: {
            include: {
              lens: {
                select: {
                  id: true,
                  product_code: true,
                  lens_name: true,
                  brand: { select: { id: true, name: true } },
                  category: { select: { id: true, name: true } }
                }
              },
              coating: {
                select: {
                  id: true,
                  name: true,
                  short_name: true
                }
              }
            }
          }
        }
      });

      return {
        created: createdCount,
        updated: updatedCount,
        total: allMappings.length,
        mappings: allMappings
      };
    } catch (error) {
      if (error instanceof APIError) {
        throw error;
      }
      console.error('Error bulk upserting price mappings:', error);
      throw new APIError('Failed to upsert price mappings', 500, 'UPSERT_PRICE_MAPPING_ERROR');
    }
  }
}

export default PriceMappingService;
