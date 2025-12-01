const express = require('express');
const router = express.Router();
const freightHandlerController = require('../controllers/freightHandlerController');
const { auth } = require('../middleware/auth');

// All routes require authentication
router.use(auth);

// Get all freight handlers
router.get('/', freightHandlerController.getAllFreightHandlers);

// Get freight handler by ID
router.get('/:freightHandlerId', freightHandlerController.getFreightHandlerById);

// Create new freight handler
router.post('/', freightHandlerController.createFreightHandler);

// Update freight handler
router.put('/:freightHandlerId', freightHandlerController.updateFreightHandler);

// Delete freight handler
router.delete('/:freightHandlerId', freightHandlerController.deleteFreightHandler);

// Bulk create freight handlers
router.post('/bulk', freightHandlerController.bulkCreateFreightHandlers);

module.exports = router;

