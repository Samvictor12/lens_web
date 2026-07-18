import creditDebitNoteService from '../services/creditDebitNoteService.js';

/**
 * Customer Credit Note / Debit Note controller (M4).
 */
export class CreditDebitNoteController {
  async list(req, res, next) {
    try {
      const result = await creditDebitNoteService.list(req.query);
      res.status(200).json({ success: true, ...result });
    } catch (error) {
      next(error);
    }
  }

  async getById(req, res, next) {
    try {
      const type = req.query.type === 'debit' ? 'debit' : 'credit';
      const note = await creditDebitNoteService.getById(type, req.params.id);
      res.status(200).json({ success: true, data: note });
    } catch (error) {
      next(error);
    }
  }

  async createCredit(req, res, next) {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });
      const note = await creditDebitNoteService.createCreditNote(req.body, userId);
      res.status(201).json({ success: true, message: 'Credit note created', data: note });
    } catch (error) {
      next(error);
    }
  }

  async createDebit(req, res, next) {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });
      const note = await creditDebitNoteService.createDebitNote(req.body, userId);
      res.status(201).json({ success: true, message: 'Debit note created', data: note });
    } catch (error) {
      next(error);
    }
  }

  async cancel(req, res, next) {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });
      const type = req.query.type === 'debit' ? 'debit' : 'credit';
      const note = await creditDebitNoteService.cancel(type, req.params.id, userId);
      res.status(200).json({ success: true, message: 'Note cancelled', data: note });
    } catch (error) {
      next(error);
    }
  }
}

export default new CreditDebitNoteController();
