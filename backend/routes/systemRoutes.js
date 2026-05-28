import express from 'express';
import { backupSystem, restoreSystem } from '../controllers/systemController.js';
import { protect, admin } from '../middleware/auth.js';

const router = express.Router();

router.get('/backup', protect, admin, backupSystem);
router.post('/restore', protect, admin, restoreSystem);

export default router;
