import PrinterConfigService from '../services/printerConfigService.js';

const service = new PrinterConfigService();

export class PrinterConfigController {

  // GET /api/printer-config
  async getAll(req, res, next) {
    try {
      const data = await service.getAll();
      res.json({ success: true, data });
    } catch (err) { next(err); }
  }

  // PUT /api/printer-config
  async upsert(req, res, next) {
    try {
      const data = await service.upsert(req.body, req.user.id);
      res.json({ success: true, data, message: 'Printer config saved.' });
    } catch (err) { next(err); }
  }
}

export default PrinterConfigController;
