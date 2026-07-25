import bankAccountService from '../services/bankAccountService.js';

export class BankAccountController {
  async list(req, res, next) {
    try { res.json({ success: true, data: await bankAccountService.list() }); } catch (e) { next(e); }
  }
  async getById(req, res, next) {
    try { res.json({ success: true, data: await bankAccountService.getById(parseInt(req.params.id)) }); } catch (e) { next(e); }
  }
  async create(req, res, next) {
    try {
      res.status(201).json({
        success: true,
        data: await bankAccountService.create(req.body, req.user.id),
        message: 'Bank account created',
      });
    } catch (e) { next(e); }
  }
  async update(req, res, next) {
    try {
      res.json({
        success: true,
        data: await bankAccountService.update(parseInt(req.params.id), req.body, req.user.id),
        message: 'Bank account updated',
      });
    } catch (e) { next(e); }
  }
}

export default new BankAccountController();
