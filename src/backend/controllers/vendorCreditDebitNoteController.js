import vendorCreditDebitNoteService from '../services/vendorCreditDebitNoteService.js';

export class VendorCreditDebitNoteController {
  async list(req, res, next) {
    try { res.json({ success: true, ...(await vendorCreditDebitNoteService.list(req.query)) }); } catch (e) { next(e); }
  }
  async getById(req, res, next) {
    try {
      const type = req.query.type === 'debit' ? 'debit' : 'credit';
      res.json({ success: true, data: await vendorCreditDebitNoteService.getById(type, req.params.id) });
    } catch (e) { next(e); }
  }
  async createCredit(req, res, next) {
    try {
      res.status(201).json({ success: true, data: await vendorCreditDebitNoteService.createCreditNote(req.body, req.user.id), message: 'Vendor credit note created' });
    } catch (e) { next(e); }
  }
  async createDebit(req, res, next) {
    try {
      res.status(201).json({ success: true, data: await vendorCreditDebitNoteService.createDebitNote(req.body, req.user.id), message: 'Vendor debit note created' });
    } catch (e) { next(e); }
  }
  async cancel(req, res, next) {
    try {
      const type = req.query.type === 'debit' ? 'debit' : 'credit';
      res.json({ success: true, data: await vendorCreditDebitNoteService.cancel(type, req.params.id, req.user.id), message: 'Note cancelled' });
    } catch (e) { next(e); }
  }
}

export default new VendorCreditDebitNoteController();
