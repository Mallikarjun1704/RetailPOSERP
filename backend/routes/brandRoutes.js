import express from 'express';
import { getBrands, createBrand, updateBrand, deleteBrand } from '../controllers/brandController.js';
import { protect, admin } from '../middleware/auth.js';

const router = express.Router();

router.route('/')
  .get(protect, getBrands)
  .post(protect, createBrand);

router.route('/:id')
  .put(protect, updateBrand)
  .delete(protect, admin, deleteBrand);

export default router;
