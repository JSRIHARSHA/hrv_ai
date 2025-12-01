const express = require('express');
const router = express.Router();
const materialController = require('../controllers/materialController');
const { auth } = require('../middleware/auth');

// All routes require authentication
router.use(auth);

// Get all materials with optional filters
router.get('/', materialController.getAllMaterials);

// Get categories
router.get('/categories', materialController.getCategories);

// Get material by ID
router.get('/:id', materialController.getMaterialById);

// Get material by itemId
router.get('/item/:itemId', materialController.getMaterialByItemId);

// Create new material
router.post('/', materialController.createMaterial);

// Update material
router.put('/:id', materialController.updateMaterial);

// Delete material
router.delete('/:id', materialController.deleteMaterial);

module.exports = router;

