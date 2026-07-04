import { AccountGroupService } from '../services/accountGroupService.js';

const service = new AccountGroupService();

export class AccountGroupController {
  async listTree(req, res, next) {
    try {
      res.json({ success: true, data: await service.listTree() });
    } catch (e) {
      next(e);
    }
  }

  async getById(req, res, next) {
    try {
      res.json({ success: true, data: await service.getById(req.params.id) });
    } catch (e) {
      next(e);
    }
  }

  async getSummary(req, res, next) {
    try {
      res.json({
        success: true,
        data: await service.getSummary({ groupId: req.params.id, asOf: req.query.asOf }),
      });
    } catch (e) {
      next(e);
    }
  }

  async create(req, res, next) {
    try {
      const data = await service.create(req.body, req.user.id);
      res.status(201).json({ success: true, data, message: 'Account group created' });
    } catch (e) {
      next(e);
    }
  }
}
