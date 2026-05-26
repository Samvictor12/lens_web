import { BankReconciliationService } from '../services/bankReconciliationService.js';

const service = new BankReconciliationService();

export class BankReconciliationController {
  async getStatement(req, res, next) {
    try { res.json({ success: true, data: await service.getStatement(req.query) }); } catch (e) { next(e); }
  }
  async markReconciled(req, res, next) {
    try { res.json({ success: true, data: await service.markReconciled(req.body, req.user.id), message: 'Transactions updated' }); } catch (e) { next(e); }
  }
}
