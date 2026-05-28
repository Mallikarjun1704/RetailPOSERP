import express from 'express';
import { checkout, getInvoices, getInvoiceById, generateInvoicePDF } from '../controllers/billingController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.route('/checkout')
  .post(protect, checkout);

router.route('/invoices')
  .get(protect, getInvoices);

router.route('/invoices/:id')
  .get(protect, getInvoiceById);

router.route('/invoices/:id/pdf')
  .get(protect, generateInvoicePDF);

export default router;
