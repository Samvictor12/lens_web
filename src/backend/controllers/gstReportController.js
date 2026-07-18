import gstReportService from '../services/gstReportService.js';

export class GstReportController {
  async getMonthlySales(req, res, next) {
    try {
      res.json({ success: true, data: await gstReportService.getMonthlySalesReport(req.query) });
    } catch (e) { next(e); }
  }
  async getGstCollection(req, res, next) {
    try {
      res.json({ success: true, data: await gstReportService.getGstCollectionReport(req.query) });
    } catch (e) { next(e); }
  }
}

export default new GstReportController();
