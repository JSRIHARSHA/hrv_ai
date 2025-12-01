const express = require('express');
const router = express.Router();
const supplierController = require('../controllers/supplierController');
const { auth, authorize } = require('../middleware/auth');

// All routes require authentication
router.use(auth);

// Public supplier routes (authenticated users can view)
router.get('/', supplierController.getAllSuppliers);
router.get('/search', supplierController.searchSuppliers);
router.get('/stats', authorize('Manager', 'Higher_Management', 'Admin'), supplierController.getSupplierStats);
router.get('/:supplierId', supplierController.getSupplierById);

// Protected routes (Manager+ only for create/update/delete)
router.post('/', authorize('Manager', 'Higher_Management', 'Admin'), supplierController.createSupplier);
router.put('/:supplierId', authorize('Manager', 'Higher_Management', 'Admin'), supplierController.updateSupplier);
router.delete('/:supplierId', authorize('Manager', 'Higher_Management', 'Admin'), supplierController.deleteSupplier);
router.delete('/:supplierId/hard', authorize('Admin'), supplierController.hardDeleteSupplier);

module.exports = router;


