import { LedgerService } from '../services/ledgerService.js';

const service = new LedgerService();

export class LedgerController {
  async list(req, res, next) {
    try {
      const result = await service.list(req.query);
      res.json({ success: true, ...result });
    } catch (e) { next(e); }
  }

  async getById(req, res, next) {
    try {
      const data = await service.getById(parseInt(req.params.id));
      res.json({ success: true, data });
    } catch (e) { next(e); }
  }

  async create(req, res, next) {
    try {
      const data = await service.create(req.body, req.user.id);
      res.status(201).json({ success: true, data, message: 'Ledger created' });
    } catch (e) { next(e); }
  }

  async update(req, res, next) {
    try {
      const data = await service.update(parseInt(req.params.id), req.body, req.user.id);
      res.json({ success: true, data, message: 'Ledger updated' });
    } catch (e) { next(e); }
  }

  async remove(req, res, next) {
    try {
      await service.softDelete(parseInt(req.params.id), req.user.id);
      res.json({ success: true, message: 'Ledger deleted' });
    } catch (e) { next(e); }
  }

  async getCashBankLedgers(req, res, next) {
    try {
      const data = await service.getCashBankLedgers();
      res.json({ success: true, data });
    } catch (e) { next(e); }
  }
}
