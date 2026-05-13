import express from 'express';
import CheckSheetController from '../controllers/checkSheetController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();
const ctrl = new CheckSheetController();

router.use(authenticateToken);

// Specific routes BEFORE generic /:id to avoid Express matching conflicts
router.delete('/items/:itemId',         ctrl.deleteItem.bind(ctrl));

router.get('/',                          ctrl.list.bind(ctrl));
router.post('/',                         ctrl.create.bind(ctrl));
router.get('/:id',                       ctrl.getById.bind(ctrl));
router.put('/:id',                       ctrl.update.bind(ctrl));
router.delete('/:id',                    ctrl.softDelete.bind(ctrl));
router.post('/:id/items',               ctrl.saveItems.bind(ctrl));

export default router;
