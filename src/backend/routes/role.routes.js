// src/backend/routes/role.routes.js
import { Router } from 'express';
import * as roleController from '../controllers/roleController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = Router();

// Secure all role endpoints with JWT token validation
router.use(authenticateToken);

router.post('/create', roleController.createRole);
router.put('/update/:id', roleController.updateRole);
router.delete('/delete', roleController.deleteRoles);
router.get('/list', roleController.listRoles);
router.get('/dropdown', roleController.getRolesDropdown);
router.get('/:id/permissions', roleController.getRolePermissions);
router.get('/:id', roleController.getRole);

export default router;
