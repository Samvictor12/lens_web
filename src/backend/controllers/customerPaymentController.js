import { CustomerPaymentService } from '../services/customerPaymentService.js';

const service = new CustomerPaymentService();

export class CustomerPaymentController {
  async list(req, res, next) {
    try { res.json({ success: true, ...(await service.list(req.query)) }); } catch (e) { next(e); }
  }
  async getById(req, res, next) {
    try { res.json({ success: true, data: await service.getById(parseInt(req.params.id)) }); } catch (e) { next(e); }
  }
  async getOutstanding(req, res, next) {
    try {
      res.json({ success: true, data: await service.getOutstanding({ groupBy: req.query.groupBy || 'customer' }) });
    } catch (e) { next(e); }
  }
  async create(req, res, next) {
    try {
      res.status(201).json({
        success: true,
        data: await service.create(req.body, req.user.id),
        message: 'Customer payment receipt created',
      });
    } catch (e) { next(e); }
  }
  async close(req, res, next) {
    try {
      res.json({
        success: true,
        data: await service.closeReceipt(parseInt(req.params.id), req.user.id),
        message: 'Receipt closed',
      });
    } catch (e) { next(e); }
  }
}
