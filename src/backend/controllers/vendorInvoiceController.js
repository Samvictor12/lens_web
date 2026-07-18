import vendorInvoiceService from '../services/vendorInvoiceService.js';

export class VendorInvoiceController {
  async list(req, res, next) {
    try { res.json({ success: true, ...(await vendorInvoiceService.list(req.query)) }); } catch (e) { next(e); }
  }
  async getById(req, res, next) {
    try { res.json({ success: true, data: await vendorInvoiceService.getById(req.params.id) }); } catch (e) { next(e); }
  }
  async getOutstanding(req, res, next) {
    try { res.json({ success: true, data: await vendorInvoiceService.listOutstanding(req.query.vendorId) }); } catch (e) { next(e); }
  }
  async create(req, res, next) {
    try {
      let payload = req.body;
      if (typeof payload.data === 'string') payload = JSON.parse(payload.data);
      res.status(201).json({
        success: true,
        data: await vendorInvoiceService.create(payload, req.user.id, req.file),
        message: 'Vendor invoice registered',
      });
    } catch (e) { next(e); }
  }
  async cancel(req, res, next) {
    try {
      res.json({ success: true, data: await vendorInvoiceService.cancel(req.params.id, req.user.id), message: 'Vendor invoice cancelled' });
    } catch (e) { next(e); }
  }
}

export default new VendorInvoiceController();
