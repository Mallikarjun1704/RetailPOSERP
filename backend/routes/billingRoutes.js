import express from 'express';
import { checkout, getInvoices, getInvoiceById, updateInvoice, generateInvoicePDF } from '../controllers/billingController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.route('/checkout')
  .post(protect, checkout);

router.route('/invoices')
  .get(protect, getInvoices);

router.route('/invoices/:id')
  .get(protect, getInvoiceById)
  .put(protect, updateInvoice);

router.route('/invoices/:id/pdf')
  .get(protect, generateInvoicePDF);

export default router;
