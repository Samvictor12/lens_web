import { VendorIndirectExpenseService } from '../services/vendorIndirectExpenseService.js';

const service = new VendorIndirectExpenseService();

export class VendorIndirectExpenseController {
  async list(req, res, next) {
    try {
      res.json({ success: true, ...(await service.list(req.query)) });
    } catch (e) {
      next(e);
    }
  }

  async create(req, res, next) {
    try {
      res.status(201).json({
        success: true,
        data: await service.create(req.body, req.user.id),
        message: 'Indirect expense marked',
      });
    } catch (e) {
      next(e);
    }
  }
}
