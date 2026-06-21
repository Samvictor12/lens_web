import { DashboardService } from '../services/dashboardService.js';

const service = new DashboardService();

export class DashboardController {

  /** GET /api/dashboard/summary — today's sales summary (total, top 5, top product) */
  async getSummary(req, res, next) {
    try {
      const data = await service.getTodaySummary();
      res.status(200).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }
}
