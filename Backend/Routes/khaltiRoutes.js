/**
 * mounts khalti routes api endpoints and keeps middleware order explicit for each request path
 *
 * @file backend/routes/khaltiroutes.js
 * @module backend/routes/khaltiroutes
 * @exports express router mounted by the api server
 */

import express from "express";
import {
  initiateKhaltiPayment,
  verifyKhaltiPayment,
  khaltiCallback,
} from "../Controllers/khaltiController.js";
import { authenticateUser } from "../Middleware/auth.js";
import { verifyRequestSignature } from "../Middleware/requestSignature.js";

const router = express.Router();

// public callback from khalti portal
router.get("/callback", khaltiCallback);

// authenticated
router.use(authenticateUser);
router.post("/initiate", verifyRequestSignature, initiateKhaltiPayment);
router.post("/verify", verifyRequestSignature, verifyKhaltiPayment);

export default router;