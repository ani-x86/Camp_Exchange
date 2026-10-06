import express from 'express';
import {
  getProducts,
  getProductById,
  createProduct,
  getMyProducts,
  deleteProduct,
} from '../controllers/product.controller.js';
import authenticate from '../middleware/authenticate.js';
import requireVerified from '../middleware/requireVerified.js';

const router = express.Router();

// Public routes (auth not required to browse)
router.get('/', getProducts);
router.get('/:id', getProductById);

// Protected routes
router.use(authenticate);

router.get('/me/listings', getMyProducts);

// Highly protected routes (requires verified ID)
router.post('/', requireVerified, createProduct);
router.delete('/:id', requireVerified, deleteProduct);

export default router;
