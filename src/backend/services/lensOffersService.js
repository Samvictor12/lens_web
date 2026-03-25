import prisma from '../config/prisma.js';
import { APIError } from '../utils/errors.js';

/**
 * Lens Offers Service
 * Handles business logic for promotional offers on lenses
 */
export class LensOffersService {

    async createLensOffer(offerData) {
        try {
            // Validate date range
            if (new Date(offerData.startDate) >= new Date(offerData.endDate)) {
                throw new APIError('End date must be after start date', 400, 'INVALID_DATE_RANGE');
            }

            // Validate offer type specific fields
            this.validateOfferTypeFields(offerData);

            const offer = await prisma.lensOffers.create({
                data: {
                    offerName: offerData.offerName,
                    description: offerData.description,
                    offerType: offerData.offerType,
                    discountValue: offerData.discountValue,
                    discountPercentage: offerData.discountPercentage,
                    offerPrice: offerData.offerPrice,
                    lens_id: offerData.lens_id || null,
                    coating_id: offerData.coating_id || null,
                    exchange_coating_id: offerData.exchange_coating_id || null,
                    withDiscount: offerData.withDiscount ?? false,
                    startDate: new Date(offerData.startDate),
                    endDate: new Date(offerData.endDate),
                    activeStatus: offerData.activeStatus ?? true,
                    deleteStatus: false,
                    createdBy: offerData.createdBy,
                    updatedBy: offerData.createdBy
                },
                include: {
                    lensProduct: {
                        select: { id: true, lens_name: true, product_code: true }
                    },
                    coating: {
                        select: { id: true, name: true, short_name: true }
                    },
                    exchangeCoating: {
                        select: { id: true, name: true, short_name: true }
                    },
                    createdByUser: { select: { id: true, name: true, email: true } }
                }
            });

            return offer;
        } catch (error) {
            if (error instanceof APIError) throw error;
            console.error('Error creating lens offer:', error);
            throw new APIError('Failed to create lens offer', 500, 'CREATE_OFFER_ERROR');
        }
    }

    async getAllLensOffers(queryParams) {
        try {
            const { 
                page = 1, 
                limit = 10, 
                sortBy = 'createdAt', 
                sortOrder = 'desc', 
                search, 
                activeStatus,
                offerType,
                lens_id,
                coating_id,
                isActive // Filter for currently active offers (within date range)
            } = queryParams;

            const where = { deleteStatus: false };

            if (search) {
                where.OR = [
                    { offerName: { contains: search, mode: 'insensitive' } },
                    { description: { contains: search, mode: 'insensitive' } }
                ];
            }

            if (activeStatus !== undefined && activeStatus !== 'all') {
                where.activeStatus = activeStatus === 'true' || activeStatus === true;
            }

            if (offerType) {
                where.offerType = offerType;
            }

            if (lens_id) {
                where.lens_id = parseInt(lens_id);
            }

            if (coating_id) {
                where.coating_id = parseInt(coating_id);
            }

            // Filter for currently active offers (within date range)
            if (isActive === 'true' || isActive === true) {
                const now = new Date();
                where.startDate = { lte: now };
                where.endDate = { gte: now };
                where.activeStatus = true;
            }

            const offset = (page - 1) * limit;
            const total = await prisma.lensOffers.count({ where });

            const offers = await prisma.lensOffers.findMany({
                where,
                skip: offset,
                take: parseInt(limit),
                orderBy: { [sortBy]: sortOrder },
                include: {
                    lensProduct: {
                        select: { id: true, lens_name: true, product_code: true }
                    },
                    coating: {
                        select: { id: true, name: true, short_name: true }
                    },
                    exchangeCoating: {
                        select: { id: true, name: true, short_name: true }
                    },
                    createdByUser: { select: { id: true, name: true } },
                    updatedByUser: { select: { id: true, name: true } },
                    _count: { select: { saleOrders: true } }
                }
            });

            return {
                data: offers,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total,
                    pages: Math.ceil(total / limit)
                }
            };
        } catch (error) {
            console.error('Error fetching lens offers:', error);
            throw new APIError('Failed to fetch lens offers', 500, 'FETCH_OFFERS_ERROR');
        }
    }

    async getLensOfferById(id) {
        try {
            const offer = await prisma.lensOffers.findUnique({
                where: { id },
                include: {
                    lensProduct: {
                        select: { 
                            id: true, 
                            lens_name: true, 
                            product_code: true,
                            brand: { select: { id: true, name: true } }
                        }
                    },
                    coating: {
                        select: { id: true, name: true, short_name: true }
                    },
                    exchangeCoating: {
                        select: { id: true, name: true, short_name: true }
                    },
                    createdByUser: { select: { id: true, name: true, email: true } },
                    updatedByUser: { select: { id: true, name: true, email: true } },
                    _count: { select: { saleOrders: true } }
                }
            });

            if (!offer || offer.deleteStatus) {
                throw new APIError('Lens offer not found', 404, 'OFFER_NOT_FOUND');
            }

            return offer;
        } catch (error) {
            if (error instanceof APIError) throw error;
            console.error('Error fetching lens offer:', error);
            throw new APIError('Failed to fetch lens offer', 500, 'FETCH_OFFER_ERROR');
        }
    }

    async updateLensOffer(id, updateData) {
        try {
            const existing = await prisma.lensOffers.findUnique({ where: { id } });

            if (!existing || existing.deleteStatus) {
                throw new APIError('Lens offer not found', 404, 'OFFER_NOT_FOUND');
            }

            // Validate date range if dates are being updated
            const startDate = updateData.startDate ? new Date(updateData.startDate) : existing.startDate;
            const endDate = updateData.endDate ? new Date(updateData.endDate) : existing.endDate;

            if (startDate >= endDate) {
                throw new APIError('End date must be after start date', 400, 'INVALID_DATE_RANGE');
            }

            // Validate offer type specific fields
            if (updateData.offerType || updateData.discountValue !== undefined || 
                updateData.discountPercentage !== undefined || updateData.offerPrice !== undefined) {
                this.validateOfferTypeFields({
                    offerType: updateData.offerType || existing.offerType,
                    discountValue: updateData.discountValue ?? existing.discountValue,
                    discountPercentage: updateData.discountPercentage ?? existing.discountPercentage,
                    offerPrice: updateData.offerPrice ?? existing.offerPrice
                });
            }

            const updated = await prisma.lensOffers.update({
                where: { id },
                data: {
                    offerName: updateData.offerName,
                    description: updateData.description,
                    offerType: updateData.offerType,
                    discountValue: updateData.discountValue,
                    discountPercentage: updateData.discountPercentage,
                    offerPrice: updateData.offerPrice,
                    lens_id: updateData.lens_id !== undefined ? updateData.lens_id : undefined,
                    coating_id: updateData.coating_id !== undefined ? updateData.coating_id : undefined,
                    exchange_coating_id: updateData.exchange_coating_id !== undefined ? updateData.exchange_coating_id : undefined,
                    withDiscount: updateData.withDiscount !== undefined ? updateData.withDiscount : undefined,
                    startDate: updateData.startDate ? new Date(updateData.startDate) : undefined,
                    endDate: updateData.endDate ? new Date(updateData.endDate) : undefined,
                    activeStatus: updateData.activeStatus,
                    updatedBy: updateData.updatedBy
                },
                include: {
                    lensProduct: {
                        select: { id: true, lens_name: true, product_code: true }
                    },
                    coating: {
                        select: { id: true, name: true, short_name: true }
                    },
                    exchangeCoating: {
                        select: { id: true, name: true, short_name: true }
                    },
                    createdByUser: { select: { id: true, name: true } },
                    updatedByUser: { select: { id: true, name: true } }
                }
            });

            return updated;
        } catch (error) {
            if (error instanceof APIError) throw error;
            console.error('Error updating lens offer:', error);
            throw new APIError('Failed to update lens offer', 500, 'UPDATE_OFFER_ERROR');
        }
    }

    async deleteLensOffer(id, updatedBy) {
        try {
            const existing = await prisma.lensOffers.findUnique({
                where: { id },
                include: { _count: { select: { saleOrders: true } } }
            });

            if (!existing || existing.deleteStatus) {
                throw new APIError('Lens offer not found', 404, 'OFFER_NOT_FOUND');
            }

            if (existing._count.saleOrders > 0) {
                throw new APIError('Cannot delete offer with existing sale orders', 400, 'OFFER_HAS_ORDERS');
            }

            await prisma.lensOffers.update({
                where: { id },
                data: { deleteStatus: true, activeStatus: false, updatedBy }
            });

            return true;
        } catch (error) {
            if (error instanceof APIError) throw error;
            console.error('Error deleting lens offer:', error);
            throw new APIError('Failed to delete lens offer', 500, 'DELETE_OFFER_ERROR');
        }
    }

    /**
     * Get currently active offers (within date range and activeStatus=true)
     */
    async getActiveOffers() {
        try {
            const now = new Date();
            const offers = await prisma.lensOffers.findMany({
                where: {
                    deleteStatus: false,
                    activeStatus: true,
                    startDate: { lte: now },
                    endDate: { gte: now }
                },
                include: {
                    lensProduct: {
                        select: { id: true, lens_name: true, product_code: true }
                    },
                    coating: {
                        select: { id: true, name: true, short_name: true }
                    },
                    exchangeCoating: {
                        select: { id: true, name: true, short_name: true }
                    }
                },
                orderBy: { createdAt: 'desc' }
            });

            return offers;
        } catch (error) {
            console.error('Error fetching active offers:', error);
            throw new APIError('Failed to fetch active offers', 500, 'FETCH_ACTIVE_OFFERS_ERROR');
        }
    }

    /**
     * Get applicable offers for specific lens and coating combination
     * @param {Object} filters - { lens_id, coating_id }
     */
    async getApplicableOffers(filters) {
        try {
            const { lens_id, coating_id } = filters;
            const now = new Date();

            const where = {
                deleteStatus: false,
                activeStatus: true,
                startDate: { lte: now },
                endDate: { gte: now },
                OR: [
                    // Global offers (no lens/coating filter)
                    { lens_id: null, coating_id: null },
                    // Lens-specific offers
                    ...(lens_id ? [{ lens_id: parseInt(lens_id), coating_id: null }] : []),
                    // Coating-specific offers
                    ...(coating_id ? [{ coating_id: parseInt(coating_id), lens_id: null }] : []),
                    // Lens + Coating specific offers
                    ...(lens_id && coating_id ? [{ 
                        lens_id: parseInt(lens_id), 
                        coating_id: parseInt(coating_id) 
                    }] : [])
                ]
            };

            const offers = await prisma.lensOffers.findMany({
                where,
                include: {
                    lensProduct: {
                        select: { id: true, lens_name: true, product_code: true }
                    },
                    coating: {
                        select: { id: true, name: true, short_name: true }
                    }
                },
                orderBy: { createdAt: 'desc' }
            });

            return offers;
        } catch (error) {
            console.error('Error fetching applicable offers:', error);
            throw new APIError('Failed to fetch applicable offers', 500, 'FETCH_APPLICABLE_OFFERS_ERROR');
        }
    }

    /**
     * Get offer dropdown list
     */
    async getOfferDropdown(filters = {}) {
        try {
            const now = new Date();
            const where = {
                deleteStatus: false,
                activeStatus: true,
                startDate: { lte: now },
                endDate: { gte: now }
            };

            if (filters.lens_id) {
                where.OR = [
                    { lens_id: null },
                    { lens_id: parseInt(filters.lens_id) }
                ];
            }

            if (filters.coating_id) {
                where.coating_id = {
                    in: [null, parseInt(filters.coating_id)]
                };
            }

            const offers = await prisma.lensOffers.findMany({
                where,
                select: { 
                    id: true, 
                    offerName: true, 
                    offerType: true,
                    discountValue: true,
                    discountPercentage: true,
                    offerPrice: true,
                    description: true 
                },
                orderBy: { offerName: 'asc' }
            });

            return offers.map(o => ({
                id: o.id,
                label: o.offerName,
                value: o.id,
                offerType: o.offerType,
                discountValue: o.discountValue,
                discountPercentage: o.discountPercentage,
                offerPrice: o.offerPrice,
                description: o.description
            }));
        } catch (error) {
            console.error('Error fetching offer dropdown:', error);
            throw new APIError('Failed to fetch offer dropdown', 500, 'FETCH_DROPDOWN_ERROR');
        }
    }

    /**
     * Get offer statistics
     */
    async getOfferStats() {
        try {
            const now = new Date();
            const [total, active, expired, upcoming] = await Promise.all([
                prisma.lensOffers.count({ where: { deleteStatus: false } }),
                prisma.lensOffers.count({ 
                    where: { 
                        deleteStatus: false, 
                        activeStatus: true,
                        startDate: { lte: now },
                        endDate: { gte: now }
                    } 
                }),
                prisma.lensOffers.count({ 
                    where: { 
                        deleteStatus: false,
                        endDate: { lt: now }
                    } 
                }),
                prisma.lensOffers.count({ 
                    where: { 
                        deleteStatus: false,
                        activeStatus: true,
                        startDate: { gt: now }
                    } 
                })
            ]);

            return { total, active, expired, upcoming };
        } catch (error) {
            console.error('Error fetching offer stats:', error);
            throw new APIError('Failed to fetch offer statistics', 500, 'FETCH_STATS_ERROR');
        }
    }

    /**
     * Validate offer type specific fields
     */
    validateOfferTypeFields(data) {
        const { offerType, discountValue, discountPercentage, offerPrice, exchange_coating_id } = data;

        if (offerType === 'VALUE') {
            if (!discountValue || discountValue <= 0) {
                throw new APIError('Discount value is required and must be greater than 0 for VALUE type', 400, 'INVALID_DISCOUNT_VALUE');
            }
        } else if (offerType === 'PERCENTAGE') {
            if (!discountPercentage || discountPercentage <= 0 || discountPercentage > 100) {
                throw new APIError('Discount percentage must be between 0 and 100 for PERCENTAGE type', 400, 'INVALID_DISCOUNT_PERCENTAGE');
            }
        } else if (offerType === 'EXCHANGE_PRODUCT') {
            if (!offerPrice || offerPrice <= 0) {
                throw new APIError('Offer price is required and must be greater than 0 for EXCHANGE_PRODUCT type', 400, 'INVALID_OFFER_PRICE');
            }
        } else if (offerType === 'EXCHANGE_COATING_PRICE') {
            if (!exchange_coating_id) {
                throw new APIError('Exchange coating is required for EXCHANGE_COATING_PRICE type', 400, 'INVALID_EXCHANGE_COATING');
            }
        }
    }
}

export default LensOffersService;
