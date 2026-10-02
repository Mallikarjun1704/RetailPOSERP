import express from 'express';
import { 
  getSuppliers, 
  createSupplier, 
  getSupplierById, 
  updateSupplier, 
  deleteSupplier, 
  createPurchaseRecord, 
  getPurchaseRecords,
  updatePurchaseRecord,
  recordBillPayment
} from '../controllers/supplierController.js';
import { protect, admin } from '../middleware/auth.js';

const router = express.Router();

router.route('/')
  .get(protect, getSuppliers)
  .post(protect, createSupplier);

router.route('/purchases')
  .post(protect, createPurchaseRecord)
  .get(protect, getPurchaseRecords);

router.route('/purchases/:id')
  .put(protect, updatePurchaseRecord);

router.route('/purchases/:id/payment')
  .post(protect, recordBillPayment);

router.route('/:id')
  .get(protect, getSupplierById)
  .put(protect, updateSupplier)
  .delete(protect, admin, deleteSupplier);

export default router;
