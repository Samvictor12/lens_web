import incomeService from '../services/incomeService.js';

export class IncomeController {
  async listCategories(req, res, next) {
    try { res.json({ success: true, data: await incomeService.listCategories() }); } catch (e) { next(e); }
  }
  async getCategoryById(req, res, next) {
    try { res.json({ success: true, data: await incomeService.getCategoryById(parseInt(req.params.id)) }); } catch (e) { next(e); }
  }
  async createCategory(req, res, next) {
    try {
      res.status(201).json({
        success: true,
        data: await incomeService.createCategory(req.body, req.user.id),
        message: 'Income category created',
      });
    } catch (e) { next(e); }
  }
  async updateCategory(req, res, next) {
    try {
      res.json({
        success: true,
        data: await incomeService.updateCategory(parseInt(req.params.id), req.body, req.user.id),
        message: 'Income category updated',
      });
    } catch (e) { next(e); }
  }
  async deleteCategory(req, res, next) {
    try {
      res.json({
        success: true,
        data: await incomeService.deleteCategory(parseInt(req.params.id), req.user.id),
        message: 'Income category deleted',
      });
    } catch (e) { next(e); }
  }

  async list(req, res, next) {
    try { res.json({ success: true, ...(await incomeService.list(req.query)) }); } catch (e) { next(e); }
  }
  async getSummary(req, res, next) {
    try { res.json({ success: true, data: await incomeService.getSummary(req.query) }); } catch (e) { next(e); }
  }
  async getById(req, res, next) {
    try { res.json({ success: true, data: await incomeService.getById(parseInt(req.params.id)) }); } catch (e) { next(e); }
  }
  async getLogs(req, res, next) {
    try { res.json({ success: true, data: await incomeService.getLogs(parseInt(req.params.id)) }); } catch (e) { next(e); }
  }
  async create(req, res, next) {
    try {
      res.status(201).json({
        success: true,
        data: await incomeService.create(req.body, req.user.id),
        message: 'Income recorded',
      });
    } catch (e) { next(e); }
  }
  async remove(req, res, next) {
    try {
      res.json({
        success: true,
        data: await incomeService.softDelete(parseInt(req.params.id), req.user.id),
        message: 'Income deleted',
      });
    } catch (e) { next(e); }
  }
}

export default new IncomeController();
