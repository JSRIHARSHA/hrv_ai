const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const { auth } = require('../middleware/auth');

// All routes require authentication
router.use(auth);

// Get all products
router.get('/', productController.getAllProducts);

// Get product by ID
router.get('/:productId', productController.getProductById);

// Create new product
router.post('/', productController.createProduct);

// Update product
router.put('/:productId', productController.updateProduct);

// Delete product
router.delete('/:productId', productController.deleteProduct);

// Bulk create products
router.post('/bulk', productController.bulkCreateProducts);

module.exports = router;

