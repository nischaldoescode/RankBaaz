/**
 * exposes the public visual study board without exposing media provider credentials
 *
 * @file backend/routes/mediadashboardroutes.js
 * @module backend/routes/mediadashboardroutes
 * @returns {import("express").Router} public media board routes
 */

import express from "express";
import { getMediaDashboard } from "../Controllers/mediaDashboardController.js";

const router = express.Router();

router.get("/", getMediaDashboard);

export default router;
