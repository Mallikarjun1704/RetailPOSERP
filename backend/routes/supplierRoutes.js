import express from 'express';
import { getSuppliers, createSupplier, updateSupplier, deleteSupplier, createPurchaseRecord, getPurchaseRecords } from '../controllers/supplierController.js';
import { protect, admin } from '../middleware/auth.js';

const router = express.Router();

router.route('/')
  .get(protect, getSuppliers)
  .post(protect, createSupplier);

router.route('/purchases')
  .post(protect, createPurchaseRecord)
  .get(protect, getPurchaseRecords);

router.route('/:id')
  .put(protect, updateSupplier)
  .delete(protect, admin, deleteSupplier);

export default router;
