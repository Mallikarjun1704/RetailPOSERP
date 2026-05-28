import express from 'express';
import { getProducts, getProductById, createProduct, updateProduct, deleteProduct, searchProductsPOS } from '../controllers/productController.js';
import { protect, admin } from '../middleware/auth.js';

const router = express.Router();

router.route('/')
  .get(protect, getProducts)
  .post(protect, createProduct);

router.route('/pos/search')
  .get(protect, searchProductsPOS);

router.route('/:id')
  .get(protect, getProductById)
  .put(protect, updateProduct)
  .delete(protect, admin, deleteProduct);

export default router;
