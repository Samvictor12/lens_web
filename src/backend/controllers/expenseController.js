import { ExpenseService } from '../services/expenseService.js';

const service = new ExpenseService();

export class ExpenseController {
  async listCategories(req, res, next) {
    try { res.json({ success: true, data: await service.listCategories() }); } catch (e) { next(e); }
  }
  async createCategory(req, res, next) {
    try { res.status(201).json({ success: true, data: await service.createCategory(req.body, req.user.id), message: 'Category created' }); } catch (e) { next(e); }
  }
  async updateCategory(req, res, next) {
    try { res.json({ success: true, data: await service.updateCategory(parseInt(req.params.id), req.body, req.user.id) }); } catch (e) { next(e); }
  }
  async deleteCategory(req, res, next) {
    try { await service.deleteCategory(parseInt(req.params.id), req.user.id); res.json({ success: true, message: 'Category deleted' }); } catch (e) { next(e); }
  }

  async list(req, res, next) {
    try { res.json({ success: true, ...(await service.list(req.query)) }); } catch (e) { next(e); }
  }
  async getSummary(req, res, next) {
    try { res.json({ success: true, data: await service.getSummary(req.query) }); } catch (e) { next(e); }
  }
  async getById(req, res, next) {
    try { res.json({ success: true, data: await service.getById(parseInt(req.params.id)) }); } catch (e) { next(e); }
  }
  async create(req, res, next) {
    try { res.status(201).json({ success: true, data: await service.create(req.body, req.user.id), message: 'Expense recorded' }); } catch (e) { next(e); }
  }
  async update(req, res, next) {
    try { res.json({ success: true, data: await service.update(parseInt(req.params.id), req.body, req.user.id) }); } catch (e) { next(e); }
  }
  async remove(req, res, next) {
    try { await service.softDelete(parseInt(req.params.id), req.user.id); res.json({ success: true, message: 'Expense deleted' }); } catch (e) { next(e); }
  }
  async getLogs(req, res, next) {
    try { res.json({ success: true, data: await service.getLogs(parseInt(req.params.id)) }); } catch (e) { next(e); }
  }
}
