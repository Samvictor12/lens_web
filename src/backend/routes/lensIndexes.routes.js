import express from 'express';
import * as lensIndexController from '../controllers/lensIndexMasterController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

router.post('/', authenticateToken, lensIndexController.createLensIndex);
router.get('/', authenticateToken, lensIndexController.getAllLensIndexes);
router.get('/dropdown', authenticateToken, lensIndexController.getLensIndexesDropdown);
router.get('/statistics', authenticateToken, lensIndexController.getLensIndexStatistics);
router.get('/:id', authenticateToken, lensIndexController.getLensIndexById);
router.put('/:id', authenticateToken, lensIndexController.updateLensIndex);
router.delete('/:id', authenticateToken, lensIndexController.deleteLensIndex);

export default router;
