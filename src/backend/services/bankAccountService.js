import prisma from '../config/prisma.js';
import { APIError } from '../middleware/errorHandler.js';
import { LedgerService } from './ledgerService.js';

const ledgerService = new LedgerService();

const CASH_BANK_CODES = ['GRP-CASH', 'GRP-BANK'];

/**
 * Dedicated Bank Account manage API — cash/bank posting ledgers only.
 * Reuses ledgerService create/update; no parallel shadow bank master.
 */
export class BankAccountService {
  async _resolveGroupId(groupCode) {
    const group = await prisma.accountGroup.findFirst({
      where: { groupCode, delete_status: false, active_status: true },
    });
    if (!group) {
      throw new APIError(`Account group ${groupCode} not found. Run account-groups seed.`, 500, 'GROUP_NOT_FOUND');
    }
    return group.id;
  }

  async list() {
    return ledgerService.getCashBankLedgers();
  }

  async getById(id) {
    const ledger = await prisma.ledger.findFirst({
      where: { id, delete_status: false },
      include: {
        accountGroup: { select: { id: true, groupCode: true, groupName: true } },
        parentLedger: { select: { id: true, ledgerCode: true, ledgerName: true } },
        childLedgers: { where: { delete_status: false }, select: { id: true, ledgerCode: true, ledgerName: true, ledgerType: true } },
      },
    });
    if (!ledger) throw new APIError('Ledger not found', 404, 'NOT_FOUND');
    const code = ledger.accountGroup?.groupCode;
    const isCashBank =
      CASH_BANK_CODES.includes(code) ||
      ['AC-1001', 'AC-1002'].includes(ledger.ledgerCode);
    if (!isCashBank) {
      throw new APIError('Not a cash/bank account ledger', 400, 'NOT_BANK_ACCOUNT');
    }
    return ledger;
  }

  async create({ ledgerName, accountType = 'BANK', openingBalance = 0, description, bankDetails }, userId) {
    if (!ledgerName) throw new APIError('ledgerName is required', 400, 'VALIDATION_ERROR');
    const type = String(accountType || 'BANK').toUpperCase();
    const groupCode = type === 'CASH' ? 'GRP-CASH' : 'GRP-BANK';
    const accountGroupId = await this._resolveGroupId(groupCode);

    return ledgerService.create({
      ledgerName,
      accountGroupId,
      openingBalance,
      description: description || null,
      bankDetails: type === 'CASH' ? null : (bankDetails || null),
    }, userId);
  }

  async update(id, { ledgerName, description, bankDetails, openingBalance }, userId) {
    await this.getById(id);
    return ledgerService.update(id, { ledgerName, description, bankDetails, openingBalance }, userId);
  }
}

export default new BankAccountService();
