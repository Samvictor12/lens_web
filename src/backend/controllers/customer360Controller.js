import customer360Service from '../services/customer360Service.js';

export class Customer360Controller {
  async getOverview(req, res, next) {
    try {
      res.json({
        success: true,
        data: await customer360Service.getOverview(req.params.customerId),
      });
    } catch (e) {
      next(e);
    }
  }

  async getCardList(req, res, next) {
    try {
      const { page, limit } = req.query;
      res.json({
        success: true,
        ...(await customer360Service.getCardList(req.params.customerId, req.params.cardKey, {
          page,
          limit,
        })),
      });
    } catch (e) {
      next(e);
    }
  }
}

export default new Customer360Controller();
