/**
 * Tray Master Routes
 * Defines all routes for tray management
 */

import express from "express";
import * as trayController from "../controllers/trayMasterController.js";
import { authenticateToken } from "../middleware/auth.js";

const router = express.Router();

// Dropdown route must come before /:id route
router.get("/dropdown", 
    authenticateToken, 
    trayController.getTraysDropdown);

// CRUD routes
router.post("/", 
    authenticateToken, 
    trayController.createTray);

router.get("/", 
    authenticateToken, 
    trayController.getAllTrays);

router.get("/:id", 
    authenticateToken, 
    trayController.getTrayById);

router.put("/:id", 
    authenticateToken, 
    trayController.updateTray);

router.delete("/:id", 
    authenticateToken, 
    trayController.deleteTray);

export default router;
