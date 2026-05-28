import express from 'express';
import { getCustomers, getCustomerByMobile, createCustomer, updateCustomer, getCustomerHistory } from '../controllers/customerController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.route('/')
  .get(protect, getCustomers)
  .post(protect, createCustomer);

router.route('/mobile/:mobile')
  .get(protect, getCustomerByMobile);

router.route('/:id')
  .put(protect, updateCustomer);

router.route('/:id/history')
  .get(protect, getCustomerHistory);

export default router;
