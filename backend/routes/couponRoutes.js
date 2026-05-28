import express from 'express';
import { getCoupons, createCoupon, updateCoupon, deleteCoupon, validateCoupon } from '../controllers/couponController.js';
import { protect, admin } from '../middleware/auth.js';

const router = express.Router();

router.route('/')
  .get(protect, getCoupons)
  .post(protect, createCoupon);

router.route('/validate')
  .post(protect, validateCoupon);

router.route('/:id')
  .put(protect, updateCoupon)
  .delete(protect, admin, deleteCoupon);

export default router;
