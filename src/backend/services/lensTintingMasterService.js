import prisma from '../config/prisma.js';
import { APIError } from '../utils/errors.js';

/**
 * Lens Tinting Master Service
 */
export class LensTintingMasterService {

    async createLensTinting(tintingData) {
        try {
            const existingTinting = await prisma.lensTintingMaster.findUnique({
                where: { name: tintingData.name }
            });

            if (existingTinting) {
                throw new APIError('Tinting name already exists', 409, 'DUPLICATE_NAME');
            }

            const tinting = await prisma.lensTintingMaster.create({
                data: {
                    name: tintingData.name,
                    short_name: tintingData.short_name,
                    description: tintingData.description,
                    tinting_price: tintingData.tinting_price,
                    activeStatus: tintingData.activeStatus ?? true,
                    deleteStatus: false,
                    createdBy: tintingData.createdBy,
                    updatedBy: tintingData.createdBy
                },
                include: {
                    Usercreated: { select: { id: true, name: true, email: true } }
                }
            });

            return tinting;
        } catch (error) {
            if (error instanceof APIError) throw error;
            console.error('Error creating lens tinting:', error);
            throw new APIError('Failed to create lens tinting', 500, 'CREATE_TINTING_ERROR');
        }
    }

  async getAllLensTintings(queryParams) {
    try {
      const { page = 1, limit = 10, sortBy = 'createdAt', sortOrder = 'desc', search, activeStatus } = queryParams;
      
      const where = { deleteStatus: false };

            if (search) {
                where.OR = [
                    { name: { contains: search, mode: 'insensitive' } },
                    { short_name: { contains: search, mode: 'insensitive' } },
                    { description: { contains: search, mode: 'insensitive' } }
                ];
            }

            if (activeStatus !== undefined && activeStatus !== 'all') {
                where.activeStatus = activeStatus === 'true' || activeStatus === true;
            }

            const offset = (page - 1) * limit;
            const total = await prisma.lensTintingMaster.count({ where });

            const tintings = await prisma.lensTintingMaster.findMany({
                where,
                skip: offset,
                take: parseInt(limit),
                orderBy: { [sortBy]: sortOrder },
                include: {
                    Usercreated: { select: { id: true, name: true } },
                    Userupdated: { select: { id: true, name: true } },
                    _count: { select: { saleOrders: true } }
                }
            });

            return {
                data: tintings,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total,
                    pages: Math.ceil(total / limit)
                }
            };
        } catch (error) {
            console.error('Error fetching lens tintings:', error);
            throw new APIError('Failed to fetch lens tintings', 500, 'FETCH_TINTINGS_ERROR');
        }
    }

    async getLensTintingById(id) {
        try {
            const tinting = await prisma.lensTintingMaster.findUnique({
                where: { id },
                include: {
                    Usercreated: { select: { id: true, name: true, email: true } },
                    Userupdated: { select: { id: true, name: true, email: true } },
                    _count: { select: { saleOrders: true } }
                }
            });

            if (!tinting || tinting.deleteStatus) {
                throw new APIError('Lens tinting not found', 404, 'TINTING_NOT_FOUND');
            }

            return tinting;
        } catch (error) {
            if (error instanceof APIError) throw error;
            console.error('Error fetching lens tinting:', error);
            throw new APIError('Failed to fetch lens tinting', 500, 'FETCH_TINTING_ERROR');
        }
    }

    async updateLensTinting(id, updateData) {
        try {
            const existing = await prisma.lensTintingMaster.findUnique({ where: { id } });

            if (!existing || existing.deleteStatus) {
                throw new APIError('Lens tinting not found', 404, 'TINTING_NOT_FOUND');
            }

            if (updateData.name && updateData.name !== existing.name) {
                const duplicate = await prisma.lensTintingMaster.findFirst({
                    where: { name: updateData.name, id: { not: id }, deleteStatus: false }
                });

                if (duplicate) {
                    throw new APIError('Tinting name already exists', 409, 'DUPLICATE_NAME');
                }
            }

            const updated = await prisma.lensTintingMaster.update({
                where: { id },
                data: {
                    name: updateData.name,
                    short_name: updateData.short_name,
                    description: updateData.description,
                    tinting_price: updateData.tinting_price,
                    activeStatus: updateData.activeStatus,
                    updatedBy: updateData.updatedBy
                },
                include: {
                    Usercreated: { select: { id: true, name: true } },
                    Userupdated: { select: { id: true, name: true } }
                }
            });

            return updated;
        } catch (error) {
            if (error instanceof APIError) throw error;
            console.error('Error updating lens tinting:', error);
            throw new APIError('Failed to update lens tinting', 500, 'UPDATE_TINTING_ERROR');
        }
    }

    async deleteLensTinting(id, updatedBy) {
        try {
            const existing = await prisma.lensTintingMaster.findUnique({
                where: { id },
                include: { _count: { select: { saleOrders: true } } }
            });

            if (!existing || existing.deleteStatus) {
                throw new APIError('Lens tinting not found', 404, 'TINTING_NOT_FOUND');
            }

            if (existing._count.saleOrders > 0) {
                throw new APIError('Cannot delete tinting with existing sale orders', 400, 'TINTING_HAS_ORDERS');
            }

            await prisma.lensTintingMaster.update({
                where: { id },
                data: { deleteStatus: true, activeStatus: false, updatedBy }
            });

            return true;
        } catch (error) {
            if (error instanceof APIError) throw error;
            console.error('Error deleting lens tinting:', error);
            throw new APIError('Failed to delete lens tinting', 500, 'DELETE_TINTING_ERROR');
        }
    }

    async getTintingDropdown(filters = {}) {
        try {
            const where = { activeStatus: true, deleteStatus: false };

            // Filter by name (partial match, case-insensitive)
            if (filters.name) {
                where.name = {
                    contains: filters.name,
                    mode: 'insensitive'
                };
            }

            // Filter by short_name (partial match, case-insensitive)
            if (filters.short_name) {
                where.short_name = {
                    contains: filters.short_name,
                    mode: 'insensitive'
                };
            }

            const tintings = await prisma.lensTintingMaster.findMany({
                where,
                select: { id: true, name: true, short_name: true, description: true, tinting_price: true },
                orderBy: { name: 'asc' }
            });

            return tintings.map(t => ({
                id: t.id,
                label: t.name,
                value: t.id,
                short_name: t.short_name,
                description: t.description,
                tinting_price: t.tinting_price
            }));
        } catch (error) {
            console.error('Error fetching tinting dropdown:', error);
            throw new APIError('Failed to fetch tinting dropdown', 500, 'FETCH_DROPDOWN_ERROR');
        }
    }

    async getTintingStats() {
        try {
            const [total, active, inactive] = await Promise.all([
                prisma.lensTintingMaster.count({ where: { deleteStatus: false } }),
                prisma.lensTintingMaster.count({ where: { deleteStatus: false, activeStatus: true } }),
                prisma.lensTintingMaster.count({ where: { deleteStatus: false, activeStatus: false } })
            ]);

            return { total, active, inactive };
        } catch (error) {
            console.error('Error fetching tinting stats:', error);
            throw new APIError('Failed to fetch tinting statistics', 500, 'FETCH_STATS_ERROR');
        }
    }
}

export default LensTintingMasterService;
