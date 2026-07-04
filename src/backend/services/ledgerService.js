import prisma from '../config/prisma.js';
import { APIError } from '../middleware/errorHandler.js';

export class LedgerService {

  async generateLedgerCode(ledgerType) {
    const prefixMap = { ASSET: 'AC-1', LIABILITY: 'AC-2', INCOME: 'AC-3', EXPENSE: 'AC-4', EQUITY: 'AC-5' };
    const prefix = prefixMap[ledgerType] || 'AC-9';
    const last = await prisma.ledger.findFirst({
      where: { ledgerCode: { startsWith: prefix } },
      orderBy: { ledgerCode: 'desc' },
    });
    const next = last ? parseInt(last.ledgerCode.replace(/\D/g, '').slice(-3)) + 1 : parseInt(prefix.replace('AC-', '') + '00') + 1;
    return `${prefix}${String(next).padStart(3, '0')}`;
  }

  async list({ type, parentId, search, page = 1, limit = 100 }) {
    const where = {
      delete_status: false,
      ...(type && { ledgerType: type }),
      ...(parentId !== undefined && { parentLedgerId: parentId === 'null' ? null : parseInt(parentId) }),
      ...(search && { ledgerName: { contains: search, mode: 'insensitive' } }),
    };
    const [data, total] = await Promise.all([
      prisma.ledger.findMany({
        where,
        include: {
          accountGroup: { select: { id: true, groupCode: true, groupName: true } },
          childLedgers: { where: { delete_status: false }, select: { id: true, ledgerCode: true, ledgerName: true, ledgerType: true } },
        },
        orderBy: [{ ledgerType: 'asc' }, { ledgerCode: 'asc' }],
        skip: (page - 1) * limit,
        take: parseInt(limit),
      }),
      prisma.ledger.count({ where }),
    ]);
    return { data, pagination: { page: parseInt(page), limit: parseInt(limit), total, totalPages: Math.ceil(total / limit) } };
  }

  async getById(id) {
    const ledger = await prisma.ledger.findFirst({
      where: { id, delete_status: false },
      include: {
        parentLedger: { select: { id: true, ledgerCode: true, ledgerName: true } },
        childLedgers: { where: { delete_status: false }, select: { id: true, ledgerCode: true, ledgerName: true, ledgerType: true } },
      },
    });
    if (!ledger) throw new APIError('Ledger not found', 404, 'LEDGER_NOT_FOUND');
    return ledger;
  }

  async create({ ledgerCode, ledgerName, ledgerType, parentLedgerId, accountGroupId, openingBalance = 0, description, bankDetails }, userId) {
    if (!ledgerName) throw new APIError('ledgerName is required', 400, 'VALIDATION_ERROR');

    let resolvedType = ledgerType;
    let resolvedGroupId = accountGroupId ? parseInt(accountGroupId) : null;

    if (resolvedGroupId) {
      const group = await prisma.accountGroup.findFirst({
        where: { id: resolvedGroupId, delete_status: false, active_status: true },
      });
      if (!group) throw new APIError('Account group not found', 404, 'NOT_FOUND');
      resolvedType = group.nature;
    } else if (!ledgerType) {
      throw new APIError('ledgerType or accountGroupId is required', 400, 'VALIDATION_ERROR');
    }

    const code = ledgerCode || await this.generateLedgerCode(resolvedType);
    const existing = await prisma.ledger.findFirst({ where: { ledgerCode: code } });
    if (existing) throw new APIError(`Ledger code ${code} already exists`, 409, 'DUPLICATE_CODE');
    return prisma.ledger.create({
      data: {
        ledgerCode: code,
        ledgerName,
        ledgerType: resolvedType,
        parentLedgerId: parentLedgerId || null,
        accountGroupId: resolvedGroupId,
        openingBalance: parseFloat(openingBalance),
        currentBalance: parseFloat(openingBalance),
        description: description || null,
        bankDetails: bankDetails || null,
        isSystemLedger: false,
        isGroupLedger: false,
        allowsDirectPosting: true,
        createdBy: userId,
      },
    });
  }

  async update(id, { ledgerName, parentLedgerId, description, bankDetails, openingBalance }, userId) {
    const ledger = await prisma.ledger.findFirst({ where: { id, delete_status: false } });
    if (!ledger) throw new APIError('Ledger not found', 404, 'LEDGER_NOT_FOUND');
    if (ledger.isSystemLedger && openingBalance !== undefined) {
      // Allow opening balance update on system ledgers
    }
    return prisma.ledger.update({
      where: { id },
      data: {
        ...(ledgerName && { ledgerName }),
        ...(parentLedgerId !== undefined && { parentLedgerId: parentLedgerId || null }),
        ...(description !== undefined && { description }),
        ...(bankDetails !== undefined && { bankDetails }),
        ...(openingBalance !== undefined && { openingBalance: parseFloat(openingBalance) }),
        updatedBy: userId,
      },
    });
  }

  async softDelete(id, userId) {
    const ledger = await prisma.ledger.findFirst({ where: { id, delete_status: false } });
    if (!ledger) throw new APIError('Ledger not found', 404, 'LEDGER_NOT_FOUND');
    if (ledger.isSystemLedger) throw new APIError('System ledgers cannot be deleted', 400, 'SYSTEM_LEDGER');
    const entryCount = await prisma.transactionEntry.count({ where: { ledgerId: id } });
    if (entryCount > 0) throw new APIError('Ledger has transactions and cannot be deleted', 409, 'LEDGER_HAS_TRANSACTIONS');
    return prisma.ledger.update({ where: { id }, data: { delete_status: true, updatedBy: userId } });
  }

  async getCashBankLedgers() {
    const groupFilter = {
      delete_status: false,
      active_status: true,
      allowsDirectPosting: true,
      isGroupLedger: false,
      OR: [
        { accountGroup: { groupCode: { in: ['GRP-CASH', 'GRP-BANK'] } } },
        { ledgerCode: { in: ['AC-1001', 'AC-1002'] }, accountGroupId: null },
      ],
    };
    return prisma.ledger.findMany({
      where: groupFilter,
      select: { id: true, ledgerCode: true, ledgerName: true, bankDetails: true, currentBalance: true },
      orderBy: { ledgerCode: 'asc' },
    });
  }
}
