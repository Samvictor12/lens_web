import { VendorPaymentService } from '../services/vendorPaymentService.js';

const service = new VendorPaymentService();

export class VendorPaymentController {
  async list(req, res, next) {
    try { res.json({ success: true, ...(await service.list(req.query)) }); } catch (e) { next(e); }
  }
  async getById(req, res, next) {
    try { res.json({ success: true, data: await service.getById(parseInt(req.params.id)) }); } catch (e) { next(e); }
  }
  async getOutstanding(req, res, next) {
    try {
      if (req.query.vendorId) {
        res.json({ success: true, data: await service.getOutstanding(req.query.vendorId) });
      } else {
        res.json({ success: true, data: await service.listOutstandingGrouped() });
      }
    } catch (e) { next(e); }
  }
  async create(req, res, next) {
    try {
      let payload = req.body;
      if (typeof payload.data === 'string') {
        payload = JSON.parse(payload.data);
      }
      res.status(201).json({
        success: true,
        data: await service.create(payload, req.user.id, req.file),
        message: 'Payment voucher created',
      });
    } catch (e) { next(e); }
  }
  async close(req, res, next) {
    try { res.json({ success: true, data: await service.closeVoucher(parseInt(req.params.id), req.user.id), message: 'Voucher closed' }); } catch (e) { next(e); }
  }
}
