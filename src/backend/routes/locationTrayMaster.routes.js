import express from 'express';
import * as locationTrayController from '../controllers/locationTrayMasterController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

router.get('/dropdown', authenticateToken, locationTrayController.getLocationTraysDropdown);
router.post('/', authenticateToken, locationTrayController.createLocationTray);
router.get('/', authenticateToken, locationTrayController.getAllLocationTrays);
router.get('/:id', authenticateToken, locationTrayController.getLocationTrayById);
router.put('/:id', authenticateToken, locationTrayController.updateLocationTray);
router.delete('/:id', authenticateToken, locationTrayController.deleteLocationTray);

export default router;
