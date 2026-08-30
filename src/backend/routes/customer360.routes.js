import { Router } from 'express';
import customer360Controller from '../controllers/customer360Controller.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = Router();
const guard = [authenticateToken, requireRole(['Accounts', 'Admin'])];

router.get('/:customerId/overview', ...guard, customer360Controller.getOverview.bind(customer360Controller));
router.get(
  '/:customerId/cards/:cardKey',
  ...guard,
  customer360Controller.getCardList.bind(customer360Controller)
);

export default router;
