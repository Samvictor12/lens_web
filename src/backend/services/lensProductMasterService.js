import { PrismaClient } from '@prisma/client';
import { APIError } from '../middleware/errorHandler.js';

const prisma = new PrismaClient();

/**
 * Lens Product Master Service
 */
export class LensProductMasterService {

    async createLensProduct(productData) {
        try {
            // Validate foreign keys exist
            const [brand, category, material, type] = await Promise.all([
                prisma.lensBrandMaster.findUnique({ where: { id: productData.brand_id, deleteStatus: false } }),
                prisma.lensCategoryMaster.findUnique({ where: { id: productData.category_id, deleteStatus: false } }),
                prisma.lensMaterialMaster.findUnique({ where: { id: productData.material_id, deleteStatus: false } }),
                prisma.lensTypeMaster.findUnique({ where: { id: productData.type_id, deleteStatus: false } })
            ]);

            if (!brand) throw new APIError('Brand not found', 404, 'BRAND_NOT_FOUND');
            if (!category) throw new APIError('Category not found', 404, 'CATEGORY_NOT_FOUND');
            if (!material) throw new APIError('Material not found', 404, 'MATERIAL_NOT_FOUND');
            if (!type) throw new APIError('Type not found', 404, 'TYPE_NOT_FOUND');

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
                    cyl_min: productData.cyl_min,
                    cyl_max: productData.cyl_max,
                    add_min: productData.add_min,
                    add_max: productData.add_max,
                    range_text: productData.range_text,
                    activeStatus: productData.activeStatus ?? true,
                    deleteStatus: false,
                    createdBy: productData.createdBy,
                    updatedBy: productData.createdBy,
                },
                include: {
                    brand: { select: { id: true, name: true } },
                    category: { select: { id: true, name: true } },
                    material: { select: { id: true, name: true } },
                    type: { select: { id: true, name: true } },
                    Usercreated: { select: { id: true, name: true } }
                }
            });

            return product;
        } catch (error) {
            if (error instanceof APIError) throw error;
            console.error('Error creating lens product:', error);
            throw new APIError('Failed to create lens product', 500, 'CREATE_PRODUCT_ERROR');
        }
    }

    async getLensProducts(queryParams) {
        try {
            const {
                page = 1,
                limit = 10,
                sortBy = 'createdAt',
                sortOrder = 'desc',
                search,
                activeStatus,
                brand_id,
                category_id,
                material_id,
                type_id
            } = queryParams;

            const where = { deleteStatus: false };

            if (search) {
                where.OR = [
                    { lens_name: { contains: search, mode: 'insensitive' } },
                    { product_code: { contains: search, mode: 'insensitive' } },
                    { range_text: { contains: search, mode: 'insensitive' } }
                ];
            }

            if (activeStatus !== undefined) where.activeStatus = activeStatus === 'true';
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
                    _count: { select: { lensPriceMasters: true } }
                }
            });

            return {
                data: products,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total,
                    pages: Math.ceil(total / limit)
                }
            };
        } catch (error) {
            console.error('Error fetching lens products:', error);
            throw new APIError('Failed to fetch lens products', 500, 'FETCH_PRODUCTS_ERROR');
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
                            coating: { select: { id: true, name: true, short_name: true } }
                        }
                    }
                }
            });

            if (!product || product.deleteStatus) {
                throw new APIError('Lens product not found', 404, 'PRODUCT_NOT_FOUND');
            }

            return product;
        } catch (error) {
            if (error instanceof APIError) throw error;
            console.error('Error fetching lens product:', error);
            throw new APIError('Failed to fetch lens product', 500, 'FETCH_PRODUCT_ERROR');
        }
    }

    async updateLensProduct(id, updateData) {
        try {
            const existing = await prisma.lensProductMaster.findUnique({ where: { id } });

            if (!existing || existing.deleteStatus) {
                throw new APIError('Lens product not found', 404, 'PRODUCT_NOT_FOUND');
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
                    cyl_min: updateData.cyl_min,
                    cyl_max: updateData.cyl_max,
                    add_min: updateData.add_min,
                    add_max: updateData.add_max,
                    range_text: updateData.range_text,
                    activeStatus: updateData.activeStatus,
                    updatedBy: updateData.updatedBy
                },
                include: {
                    brand: { select: { id: true, name: true } },
                    category: { select: { id: true, name: true } },
                    material: { select: { id: true, name: true } },
                    type: { select: { id: true, name: true } }
                }
            });

            return updated;
        } catch (error) {
            if (error instanceof APIError) throw error;
            console.error('Error updating lens product:', error);
            throw new APIError('Failed to update lens product', 500, 'UPDATE_PRODUCT_ERROR');
        }
    }

    async deleteLensProduct(id, updatedBy) {
        try {
            const existing = await prisma.lensProductMaster.findUnique({
                where: { id },
                include: { _count: { select: { lensPriceMasters: true } } }
            });

            if (!existing || existing.deleteStatus) {
                throw new APIError('Lens product not found', 404, 'PRODUCT_NOT_FOUND');
            }

            if (existing._count.lensPriceMasters > 0) {
                throw new APIError('Cannot delete product with existing price records', 400, 'PRODUCT_HAS_PRICES');
            }

            await prisma.lensProductMaster.update({
                where: { id },
                data: { deleteStatus: true, activeStatus: false, updatedBy }
            });

            return true;
        } catch (error) {
            if (error instanceof APIError) throw error;
            console.error('Error deleting lens product:', error);
            throw new APIError('Failed to delete lens product', 500, 'DELETE_PRODUCT_ERROR');
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
                    category: { select: { name: true } }
                },
                orderBy: { lens_name: 'asc' }
            });

            return products.map(p => ({
                id: p.id,
                label: `${p.lens_name} (${p.product_code})`,
                value: p.id,
                product_code: p.product_code,
                lens_name: p.lens_name,
                brand: p.brand.name,
                category: p.category.name
            }));
        } catch (error) {
            console.error('Error fetching product dropdown:', error);
            throw new APIError('Failed to fetch product dropdown', 500, 'FETCH_DROPDOWN_ERROR');
        }
    }

    async getProductStats() {
        try {
            const [total, active, inactive, byCategory] = await Promise.all([
                prisma.lensProductMaster.count({ where: { deleteStatus: false } }),
                prisma.lensProductMaster.count({ where: { deleteStatus: false, activeStatus: true } }),
                prisma.lensProductMaster.count({ where: { deleteStatus: false, activeStatus: false } }),
                prisma.lensProductMaster.groupBy({
                    by: ['category_id'],
                    where: { deleteStatus: false },
                    _count: { id: true }
                })
            ]);

            return { total, active, inactive, byCategory };
        } catch (error) {
            console.error('Error fetching product stats:', error);
            throw new APIError('Failed to fetch product statistics', 500, 'FETCH_STATS_ERROR');
        }
    }
}

export default LensProductMasterService;
