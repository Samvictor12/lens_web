import prisma from '../config/prisma.js';
import { APIError } from '../middleware/errorHandler.js';

/**
 * Lens Type Master Service
 */
export class LensTypeMasterService {

    async createLensType(typeData) {
        try {
            const existingType = await prisma.lensTypeMaster.findUnique({
                where: { name: typeData.name }
            });

            if (existingType) {
                throw new APIError('Type name already exists', 409, 'DUPLICATE_NAME');
            }

            const type = await prisma.lensTypeMaster.create({
                data: {
                    name: typeData.name,
                    description: typeData.description,
                    activeStatus: typeData.activeStatus ?? true,
                    deleteStatus: false,
                    createdBy: typeData.createdBy,
                    updatedBy: typeData.createdBy
                },
                include: {
                    Usercreated: { select: { id: true, name: true, email: true } }
                }
            });

            return type;
        } catch (error) {
            if (error instanceof APIError) throw error;
            console.error('Error creating lens type:', error);
            throw new APIError('Failed to create lens type', 500, 'CREATE_TYPE_ERROR');
        }
    }

    async getLensTypes(queryParams) {
        try {
            const { page = 1, limit = 10, sortBy = 'createdAt', sortOrder = 'desc', search, activeStatus } = queryParams;

            const where = { deleteStatus: false };

            if (search) {
                where.OR = [
                    { name: { contains: search, mode: 'insensitive' } },
                    { description: { contains: search, mode: 'insensitive' } }
                ];
            }

            if (activeStatus !== undefined) {
                where.activeStatus = activeStatus === 'true';
            }

            const offset = (page - 1) * limit;
            const total = await prisma.lensTypeMaster.count({ where });

            const types = await prisma.lensTypeMaster.findMany({
                where,
                skip: offset,
                take: parseInt(limit),
                orderBy: { [sortBy]: sortOrder },
                include: {
                    Usercreated: { select: { id: true, name: true } },
                    Userupdated: { select: { id: true, name: true } },
                    _count: { select: { lensProductMasters: true } }
                }
            });

            return {
                data: types,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total,
                    pages: Math.ceil(total / limit)
                }
            };
        } catch (error) {
            console.error('Error fetching lens types:', error);
            throw new APIError('Failed to fetch lens types', 500, 'FETCH_TYPES_ERROR');
        }
    }

    async getLensTypeById(id) {
        try {
            const type = await prisma.lensTypeMaster.findUnique({
                where: { id },
                include: {
                    Usercreated: { select: { id: true, name: true, email: true } },
                    Userupdated: { select: { id: true, name: true, email: true } },
                    _count: { select: { lensProductMasters: true } }
                }
            });

            if (!type || type.deleteStatus) {
                throw new APIError('Lens type not found', 404, 'TYPE_NOT_FOUND');
            }

            return type;
        } catch (error) {
            if (error instanceof APIError) throw error;
            console.error('Error fetching lens type:', error);
            throw new APIError('Failed to fetch lens type', 500, 'FETCH_TYPE_ERROR');
        }
    }

    async updateLensType(id, updateData) {
        try {
            const existing = await prisma.lensTypeMaster.findUnique({ where: { id } });

            if (!existing || existing.deleteStatus) {
                throw new APIError('Lens type not found', 404, 'TYPE_NOT_FOUND');
            }

            if (updateData.name && updateData.name !== existing.name) {
                const duplicate = await prisma.lensTypeMaster.findFirst({
                    where: { name: updateData.name, id: { not: id }, deleteStatus: false }
                });

                if (duplicate) {
                    throw new APIError('Type name already exists', 409, 'DUPLICATE_NAME');
                }
            }

            const updated = await prisma.lensTypeMaster.update({
                where: { id },
                data: {
                    name: updateData.name,
                    description: updateData.description,
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
            console.error('Error updating lens type:', error);
            throw new APIError('Failed to update lens type', 500, 'UPDATE_TYPE_ERROR');
        }
    }

    async deleteLensType(id, updatedBy) {
        try {
            const existing = await prisma.lensTypeMaster.findUnique({
                where: { id },
                include: { _count: { select: { lensProductMasters: true } } }
            });

            if (!existing || existing.deleteStatus) {
                throw new APIError('Lens type not found', 404, 'TYPE_NOT_FOUND');
            }

            if (existing._count.lensProductMasters > 0) {
                throw new APIError('Cannot delete type with existing products', 400, 'TYPE_HAS_PRODUCTS');
            }

            await prisma.lensTypeMaster.update({
                where: { id },
                data: { deleteStatus: true, activeStatus: false, updatedBy }
            });

            return true;
        } catch (error) {
            if (error instanceof APIError) throw error;
            console.error('Error deleting lens type:', error);
            throw new APIError('Failed to delete lens type', 500, 'DELETE_TYPE_ERROR');
        }
    }

    async getTypeDropdown() {
        try {
            const types = await prisma.lensTypeMaster.findMany({
                where: { activeStatus: true, deleteStatus: false },
                select: { id: true, name: true, description: true },
                orderBy: { name: 'asc' }
            });

            return types.map(t => ({
                id: t.id,
                label: t.name,
                value: t.id,
                description: t.description
            }));
        } catch (error) {
            console.error('Error fetching type dropdown:', error);
            throw new APIError('Failed to fetch type dropdown', 500, 'FETCH_DROPDOWN_ERROR');
        }
    }

    async getTypeStats() {
        try {
            const [total, active, inactive] = await Promise.all([
                prisma.lensTypeMaster.count({ where: { deleteStatus: false } }),
                prisma.lensTypeMaster.count({ where: { deleteStatus: false, activeStatus: true } }),
                prisma.lensTypeMaster.count({ where: { deleteStatus: false, activeStatus: false } })
            ]);

            return { total, active, inactive };
        } catch (error) {
            console.error('Error fetching type stats:', error);
            throw new APIError('Failed to fetch type statistics', 500, 'FETCH_STATS_ERROR');
        }
    }
}

export default LensTypeMasterService;
