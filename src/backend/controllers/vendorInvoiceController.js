import vendorInvoiceService from '../services/vendorInvoiceService.js';

export class VendorInvoiceController {
  async list(req, res, next) {
    try { res.json({ success: true, ...(await vendorInvoiceService.list(req.query)) }); } catch (e) { next(e); }
  }
  async summary(req, res, next) {
    try { res.json({ success: true, data: await vendorInvoiceService.summary(req.query) }); } catch (e) { next(e); }
  }
  async getById(req, res, next) {
    try { res.json({ success: true, data: await vendorInvoiceService.getById(req.params.id) }); } catch (e) { next(e); }
  }
  async getOutstanding(req, res, next) {
    try { res.json({ success: true, data: await vendorInvoiceService.listOutstanding(req.query) }); } catch (e) { next(e); }
  }
  async getAwaitingBills(req, res, next) {
    try {
      res.json({ success: true, data: await vendorInvoiceService.listAwaitingBills(req.query) });
    } catch (e) { next(e); }
  }
  async getEligiblePOs(req, res, next) {
    try {
      res.json({
        success: true,
        data: await vendorInvoiceService.listEligiblePOs(req.query.vendorId, req.query),
      });
    } catch (e) {
      next(e);
    }
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
  async update(req, res, next) {
    try {
      let payload = req.body;
      if (typeof payload.data === 'string') payload = JSON.parse(payload.data);
      res.json({
        success: true,
        data: await vendorInvoiceService.update(req.params.id, payload, req.user.id, req.file),
        message: 'Vendor invoice updated',
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
