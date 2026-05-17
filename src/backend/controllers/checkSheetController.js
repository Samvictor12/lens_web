import CheckSheetService from '../services/checkSheetService.js';

const service = new CheckSheetService();

export class CheckSheetController {

  // GET /api/check-sheets
  async list(req, res, next) {
    try {
      const result = await service.getAll(req.query);
      res.json({ success: true, data: result.data, pagination: result.pagination });
    } catch (err) { next(err); }
  }

  // GET /api/check-sheets/:id
  async getById(req, res, next) {
    try {
      const data = await service.getById(parseInt(req.params.id));
      res.json({ success: true, data });
    } catch (err) { next(err); }
  }

  // POST /api/check-sheets
  async create(req, res, next) {
    try {
      const data = await service.create(req.body, req.user.id);
      res.status(201).json({ success: true, data, message: 'Check sheet created.' });
    } catch (err) { next(err); }
  }

  // PUT /api/check-sheets/:id
  async update(req, res, next) {
    try {
      const data = await service.update(parseInt(req.params.id), req.body, req.user.id);
      res.json({ success: true, data, message: 'Check sheet updated.' });
    } catch (err) { next(err); }
  }

  // DELETE /api/check-sheets/:id
  async softDelete(req, res, next) {
    try {
      await service.softDelete(parseInt(req.params.id), req.user.id);
      res.json({ success: true, message: 'Check sheet deleted.' });
    } catch (err) { next(err); }
  }

  // POST /api/check-sheets/:id/items  — bulk save (upsert) items
  async saveItems(req, res, next) {
    try {
      const items = req.body.items || [];
      const data = await service.saveItems(parseInt(req.params.id), items, req.user.id);
      res.json({ success: true, data });
    } catch (err) { next(err); }
  }

  // DELETE /api/check-sheets/items/:itemId
  async deleteItem(req, res, next) {
    try {
      await service.deleteItem(parseInt(req.params.itemId));
      res.json({ success: true, message: 'Item deleted.' });
    } catch (err) { next(err); }
  }
}

export default CheckSheetController;
