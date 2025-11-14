import prisma from '../config/prisma.js';
import { APIError } from '../middleware/errorHandler.js';

/**
 * Lens Price Master Service
 */
export class LensPriceMasterService {
  
  async createLensPrice(priceData) {
    try {
      // Validate foreign keys
      const [lens, coating] = await Promise.all([
        prisma.lensProductMaster.findUnique({ where: { id: priceData.lens_id, deleteStatus: false } }),
        prisma.lensCoatingMaster.findUnique({ where: { id: priceData.coating_id, deleteStatus: false } })
      ]);

      if (!lens) throw new APIError('Lens product not found', 404, 'LENS_NOT_FOUND');
      if (!coating) throw new APIError('Coating not found', 404, 'COATING_NOT_FOUND');

      // Check for duplicate lens-coating combination
      const existing = await prisma.lensPriceMaster.findFirst({
        where: {
          lens_id: priceData.lens_id,
          coating_id: priceData.coating_id,
          deleteStatus: false
        }
      });

      if (existing) {
        throw new APIError('Price already exists for this lens-coating combination', 409, 'DUPLICATE_PRICE');
      }

      const price = await prisma.lensPriceMaster.create({
        data: {
          lens_id: priceData.lens_id,
          coating_id: priceData.coating_id,
          price: priceData.price,
          activeStatus: priceData.activeStatus ?? true,
          deleteStatus: false,
          createdBy: priceData.createdBy,
          updatedBy: priceData.createdBy
        },
        include: {
          lens: {
            select: {
              id: true,
              lens_name: true,
              product_code: true,
              brand: { select: { name: true } }
            }
          },
          coating: {
            select: { id: true, name: true, short_name: true }
          },
          Usercreated: { select: { id: true, name: true } }
        }
      });

      return price;
    } catch (error) {
      if (error instanceof APIError) throw error;
      console.error('Error creating lens price:', error);
      throw new APIError('Failed to create lens price', 500, 'CREATE_PRICE_ERROR');
    }
  }

  async getLensPrices(queryParams) {
    try {
      const { 
        page = 1, 
        limit = 10, 
        sortBy = 'createdAt', 
        sortOrder = 'desc', 
        search, 
        activeStatus,
        lens_id,
        coating_id,
        minPrice,
        maxPrice
      } = queryParams;
      
      const where = { deleteStatus: false };
      
      if (search) {
        where.OR = [
          { lens: { lens_name: { contains: search, mode: 'insensitive' } } },
          { lens: { product_code: { contains: search, mode: 'insensitive' } } },
          { coating: { name: { contains: search, mode: 'insensitive' } } }
        ];
      }
      
      if (activeStatus !== undefined) where.activeStatus = activeStatus === 'true';
      if (lens_id) where.lens_id = parseInt(lens_id);
      if (coating_id) where.coating_id = parseInt(coating_id);
      
      if (minPrice || maxPrice) {
        where.price = {};
        if (minPrice) where.price.gte = parseFloat(minPrice);
        if (maxPrice) where.price.lte = parseFloat(maxPrice);
      }

      const offset = (page - 1) * limit;
      const total = await prisma.lensPriceMaster.count({ where });

      const prices = await prisma.lensPriceMaster.findMany({
        where,
        skip: offset,
        take: parseInt(limit),
        orderBy: { [sortBy]: sortOrder },
        include: {
          lens: {
            select: {
              id: true,
              lens_name: true,
              product_code: true,
              brand: { select: { name: true } },
              category: { select: { name: true } },
              material: { select: { name: true } },
              type: { select: { name: true } }
            }
          },
          coating: {
            select: { id: true, name: true, short_name: true }
          },
          Usercreated: { select: { id: true, name: true } },
          Userupdated: { select: { id: true, name: true } }
        }
      });

      return {
        data: prices,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      console.error('Error fetching lens prices:', error);
      throw new APIError('Failed to fetch lens prices', 500, 'FETCH_PRICES_ERROR');
    }
  }

  async getLensPriceById(id) {
    try {
      const price = await prisma.lensPriceMaster.findUnique({
        where: { id },
        include: {
          lens: {
            select: {
              id: true,
              lens_name: true,
              product_code: true,
              index_value: true,
              brand: { select: { id: true, name: true } },
              category: { select: { id: true, name: true } },
              material: { select: { id: true, name: true } },
              type: { select: { id: true, name: true } }
            }
          },
          coating: {
            select: { id: true, name: true, short_name: true, description: true }
          },
          Usercreated: { select: { id: true, name: true, email: true } },
          Userupdated: { select: { id: true, name: true, email: true } }
        }
      });

      if (!price || price.deleteStatus) {
        throw new APIError('Lens price not found', 404, 'PRICE_NOT_FOUND');
      }

      return price;
    } catch (error) {
      if (error instanceof APIError) throw error;
      console.error('Error fetching lens price:', error);
      throw new APIError('Failed to fetch lens price', 500, 'FETCH_PRICE_ERROR');
    }
  }

  async updateLensPrice(id, updateData) {
    try {
      const existing = await prisma.lensPriceMaster.findUnique({ where: { id } });

      if (!existing || existing.deleteStatus) {
        throw new APIError('Lens price not found', 404, 'PRICE_NOT_FOUND');
      }

      // Check for duplicate if lens_id or coating_id is being updated
      if ((updateData.lens_id && updateData.lens_id !== existing.lens_id) || 
          (updateData.coating_id && updateData.coating_id !== existing.coating_id)) {
        const duplicate = await prisma.lensPriceMaster.findFirst({
          where: {
            lens_id: updateData.lens_id || existing.lens_id,
            coating_id: updateData.coating_id || existing.coating_id,
            id: { not: id },
            deleteStatus: false
          }
        });

        if (duplicate) {
          throw new APIError('Price already exists for this lens-coating combination', 409, 'DUPLICATE_PRICE');
        }
      }

      const updated = await prisma.lensPriceMaster.update({
        where: { id },
        data: {
          lens_id: updateData.lens_id,
          coating_id: updateData.coating_id,
          price: updateData.price,
          activeStatus: updateData.activeStatus,
          updatedBy: updateData.updatedBy
        },
        include: {
          lens: {
            select: {
              id: true,
              lens_name: true,
              product_code: true
            }
          },
          coating: {
            select: { id: true, name: true, short_name: true }
          }
        }
      });

      return updated;
    } catch (error) {
      if (error instanceof APIError) throw error;
      console.error('Error updating lens price:', error);
      throw new APIError('Failed to update lens price', 500, 'UPDATE_PRICE_ERROR');
    }
  }

  async deleteLensPrice(id, updatedBy) {
    try {
      const existing = await prisma.lensPriceMaster.findUnique({ where: { id } });

      if (!existing || existing.deleteStatus) {
        throw new APIError('Lens price not found', 404, 'PRICE_NOT_FOUND');
      }

      await prisma.lensPriceMaster.update({
        where: { id },
        data: { deleteStatus: true, activeStatus: false, updatedBy }
      });

      return true;
    } catch (error) {
      if (error instanceof APIError) throw error;
      console.error('Error deleting lens price:', error);
      throw new APIError('Failed to delete lens price', 500, 'DELETE_PRICE_ERROR');
    }
  }

  /**
   * Get price for specific lens and coating combination
   */
  async getPriceByLensAndCoating(lens_id, coating_id) {
    try {
      const price = await prisma.lensPriceMaster.findFirst({
        where: {
          lens_id,
          coating_id,
          activeStatus: true,
          deleteStatus: false
        },
        include: {
          lens: { select: { lens_name: true, product_code: true } },
          coating: { select: { name: true, short_name: true } }
        }
      });

      if (!price) {
        throw new APIError('Price not found for this combination', 404, 'PRICE_NOT_FOUND');
      }

      return price;
    } catch (error) {
      if (error instanceof APIError) throw error;
      console.error('Error fetching price by lens and coating:', error);
      throw new APIError('Failed to fetch price', 500, 'FETCH_PRICE_ERROR');
    }
  }

  /**
   * Get all prices for a specific lens
   */
  async getPricesByLens(lens_id) {
    try {
      const prices = await prisma.lensPriceMaster.findMany({
        where: {
          lens_id,
          activeStatus: true,
          deleteStatus: false
        },
        include: {
          coating: { select: { id: true, name: true, short_name: true } }
        },
        orderBy: { price: 'asc' }
      });

      return prices;
    } catch (error) {
      console.error('Error fetching prices by lens:', error);
      throw new APIError('Failed to fetch prices', 500, 'FETCH_PRICES_ERROR');
    }
  }

  async getPriceStats() {
    try {
      const [total, active, inactive, avgPrice, minPrice, maxPrice] = await Promise.all([
        prisma.lensPriceMaster.count({ where: { deleteStatus: false } }),
        prisma.lensPriceMaster.count({ where: { deleteStatus: false, activeStatus: true } }),
        prisma.lensPriceMaster.count({ where: { deleteStatus: false, activeStatus: false } }),
        prisma.lensPriceMaster.aggregate({
          where: { deleteStatus: false, activeStatus: true },
          _avg: { price: true }
        }),
        prisma.lensPriceMaster.aggregate({
          where: { deleteStatus: false, activeStatus: true },
          _min: { price: true }
        }),
        prisma.lensPriceMaster.aggregate({
          where: { deleteStatus: false, activeStatus: true },
          _max: { price: true }
        })
      ]);

      return {
        total,
        active,
        inactive,
        avgPrice: avgPrice._avg.price || 0,
        minPrice: minPrice._min.price || 0,
        maxPrice: maxPrice._max.price || 0
      };
    } catch (error) {
      console.error('Error fetching price stats:', error);
      throw new APIError('Failed to fetch price statistics', 500, 'FETCH_STATS_ERROR');
    }
  }
}

export default LensPriceMasterService;
