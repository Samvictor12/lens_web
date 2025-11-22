/**
 * Location Master Routes
 * Defines all routes for location management
 */

import express from "express";
import * as locationController from "../controllers/locationMasterController.js";
import { authenticateToken } from "../middleware/auth.js";

const router = express.Router();

// Dropdown route must come before /:id route
router.get("/dropdown", 
    authenticateToken, 
    locationController.getLocationsDropdown);

// CRUD routes
router.post("/", 
    authenticateToken, 
    locationController.createLocation);

router.get("/", 
    authenticateToken, 
    locationController.getAllLocations);

router.get("/:id", 
    authenticateToken, 
    locationController.getLocationById);

router.put("/:id", 
    authenticateToken, 
    locationController.updateLocation);

router.delete("/:id", 
    authenticateToken, 
    locationController.deleteLocation);

export default router;
