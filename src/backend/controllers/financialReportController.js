import { FinancialReportService } from '../services/financialReportService.js';

const service = new FinancialReportService();

export class FinancialReportController {
  async getSummary(req, res, next) {
    try { res.json({ success: true, data: await service.getSummary(req.query) }); } catch (e) { next(e); }
  }
  async getProfitLoss(req, res, next) {
    try { res.json({ success: true, data: await service.getProfitLoss(req.query) }); } catch (e) { next(e); }
  }
  async getLedgerStatement(req, res, next) {
    try { res.json({ success: true, data: await service.getLedgerStatement(req.query) }); } catch (e) { next(e); }
  }
  async getTrialBalance(req, res, next) {
    try { res.json({ success: true, data: await service.getTrialBalance(req.query) }); } catch (e) { next(e); }
  }
  async getDayBook(req, res, next) {
    try { res.json({ success: true, data: await service.getDayBook(req.query) }); } catch (e) { next(e); }
  }
  async getCashBankBook(req, res, next) {
    try { res.json({ success: true, data: await service.getCashBankBook(req.query) }); } catch (e) { next(e); }
  }
}
