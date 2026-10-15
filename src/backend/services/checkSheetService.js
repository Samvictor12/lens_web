import prisma from '../config/prisma.js';
import { APIError } from '../middleware/errorHandler.js';

export class CheckSheetService {

  // ─── Master ────────────────────────────────────────────────────────────────

  async getAll(queryParams) {
    const {
      page = 1, limit = 10,
      sortBy = 'createdAt', sortOrder = 'desc',
      search, activeStatus,
    } = queryParams;

    const where = { deleteStatus: false };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { check_key: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (activeStatus !== undefined && activeStatus !== 'all') {
      where.activeStatus = activeStatus === 'true' || activeStatus === true;
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const total = await prisma.checkSheetMaster.count({ where });

    const records = await prisma.checkSheetMaster.findMany({
      where,
      skip: offset,
      take: parseInt(limit),
      orderBy: { [sortBy]: sortOrder },
      include: {
        _count: { select: { items: { where: { deleteStatus: false } } } },
      },
    });

    return {
      data: records,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    };
  }

  async getById(id) {
    const record = await prisma.checkSheetMaster.findFirst({
      where: { id, deleteStatus: false },
      include: {
        items: {
          where: { deleteStatus: false },
          orderBy: { sequence: 'asc' },
        },
      },
    });
    if (!record) throw new APIError('Check sheet not found', 404, 'NOT_FOUND');
    return record;
  }

  async create(data, userId) {
    if (!data.name || typeof data.name !== 'string' || !data.name.trim()) {
      throw new APIError('Check sheet name is required', 400, 'VALIDATION_ERROR');
    }
    if (!data.check_key || typeof data.check_key !== 'string' || !data.check_key.trim()) {
      throw new APIError('Check sheet key is required', 400, 'VALIDATION_ERROR');
    }

    const trimmedName = data.name.trim();
    const trimmedKey = data.check_key.trim().toUpperCase();

    // Duplicate check on name and check_key
    const existing = await prisma.checkSheetMaster.findFirst({
      where: {
        deleteStatus: false,
        OR: [
          { name: { equals: trimmedName, mode: 'insensitive' } },
          { check_key: { equals: trimmedKey, mode: 'insensitive' } },
        ],
      },
    });
    if (existing) {
      const field = existing.name.toLowerCase() === trimmedName.toLowerCase() ? 'name' : 'check_key';
      throw new APIError(`A check sheet with this ${field} already exists`, 409, 'DUPLICATE');
    }

    return prisma.checkSheetMaster.create({
      data: {
        name: trimmedName,
        check_key: trimmedKey,
        description: data.description || null,
        primary_colour: data.primary_colour || null,
        class: data.class || 'General',
        type: data.type || null,
        activeStatus: data.activeStatus ?? true,
        createdBy: userId,
        updatedBy: userId,
      },
    });
  }

  async update(id, data, userId) {
    const current = await this.getById(id); // throws 404 if not found

    const updatedName = data.name !== undefined ? (typeof data.name === 'string' ? data.name.trim() : current.name) : current.name;
    const updatedKey = data.check_key !== undefined ? (typeof data.check_key === 'string' ? data.check_key.trim().toUpperCase() : current.check_key) : current.check_key;

    // Duplicate check — exclude self
    const existing = await prisma.checkSheetMaster.findFirst({
      where: {
        deleteStatus: false,
        id: { not: id },
        OR: [
          { name: { equals: updatedName, mode: 'insensitive' } },
          { check_key: { equals: updatedKey, mode: 'insensitive' } },
        ],
      },
    });
    if (existing) {
      const field = existing.name.toLowerCase() === updatedName.toLowerCase() ? 'name' : 'check_key';
      throw new APIError(`A check sheet with this ${field} already exists`, 409, 'DUPLICATE');
    }

    return prisma.checkSheetMaster.update({
      where: { id },
      data: {
        name: updatedName,
        check_key: updatedKey,
        description: data.description !== undefined ? (data.description || null) : current.description,
        primary_colour: data.primary_colour !== undefined ? (data.primary_colour || null) : current.primary_colour,
        class: data.class !== undefined ? (data.class || 'General') : current.class,
        type: data.type !== undefined ? (data.type || null) : current.type,
        activeStatus: data.activeStatus !== undefined ? (data.activeStatus ?? true) : current.activeStatus,
        updatedBy: userId,
      },
    });
  }

  async softDelete(id, userId) {
    await this.getById(id);
    return prisma.checkSheetMaster.update({
      where: { id },
      data: { deleteStatus: true, updatedBy: userId },
    });
  }

  // ─── Items (inline) ───────────────────────────────────────────────────────

  async saveItems(masterId, items, userId) {
    // Verify master exists
    await this.getById(masterId);

    // Duplicate item_name check within same master (case-insensitive)
    const names = items.map((i) => i.item_name.trim().toLowerCase());
    const uniqueNames = new Set(names);
    if (uniqueNames.size !== names.length) {
      throw new APIError('Duplicate item names are not allowed within the same check sheet', 400, 'DUPLICATE_ITEM');
    }

    // Upsert each item — items sent have optional `id` (existing) or no `id` (new)
    const results = [];
    for (const item of items) {
      if (item.id) {
        // Update existing
        const updated = await prisma.checkSheetItem.update({
          where: { id: item.id },
          data: {
            item_name: item.item_name.trim(),
            item_code: item.item_code?.trim() || null,
            description: item.description || null,
            sequence: item.sequence ?? 0,
            activeStatus: item.activeStatus ?? true,
          },
        });
        results.push(updated);
      } else {
        // Check duplicate against DB for this master
        const dbExisting = await prisma.checkSheetItem.findFirst({
          where: {
            checkSheetMasterId: masterId,
            item_name: { equals: item.item_name.trim(), mode: 'insensitive' },
            deleteStatus: false,
          },
        });
        if (dbExisting) {
          throw new APIError(`Item "${item.item_name}" already exists in this check sheet`, 409, 'DUPLICATE_ITEM');
        }
        const created = await prisma.checkSheetItem.create({
          data: {
            checkSheetMasterId: masterId,
            item_name: item.item_name.trim(),
            item_code: item.item_code?.trim() || null,
            description: item.description || null,
            sequence: item.sequence ?? 0,
            activeStatus: item.activeStatus ?? true,
          },
        });
        results.push(created);
      }
    }
    return results;
  }

  async deleteItem(itemId) {
    const item = await prisma.checkSheetItem.findUnique({ where: { id: itemId } });
    if (!item) throw new APIError('Check sheet item not found', 404, 'NOT_FOUND');
    return prisma.checkSheetItem.update({
      where: { id: itemId },
      data: { deleteStatus: true },
    });
  }
}

export default CheckSheetService;
