import express from 'express';
import { getDashboardStats, getDashboardChartData, getSalesReport, exportToExcel } from '../controllers/reportController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.get('/dashboard-stats', protect, getDashboardStats);
router.get('/chart-data', protect, getDashboardChartData);
router.post('/sales-report', protect, getSalesReport);
router.post('/export-excel', protect, exportToExcel);

export default router;
