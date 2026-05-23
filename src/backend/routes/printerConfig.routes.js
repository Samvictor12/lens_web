import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.js';
import PrinterConfigController from '../controllers/printerConfigController.js';

const router = Router();
const ctrl   = new PrinterConfigController();

router.get('/',  authenticateToken, (req, res, next) => ctrl.getAll(req, res, next));
router.put('/',  authenticateToken, (req, res, next) => ctrl.upsert(req, res, next));

export default router;
