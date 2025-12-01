const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const { auth, authorize } = require('../middleware/auth');

// All routes require authentication
router.use(auth);

// Order CRUD operations
router.get('/', orderController.getAllOrders);
router.get('/my-orders', orderController.getUserOrders);
router.get('/team-orders', authorize('Manager', 'Management'), orderController.getTeamOrders);
router.get('/:orderId', orderController.getOrderById);
router.post('/', orderController.createOrder);
router.put('/:orderId', orderController.updateOrder);
router.delete('/:orderId', authorize('Manager', 'Management', 'Admin'), orderController.deleteOrder);

// Order-specific actions
router.patch('/:orderId/status', orderController.updateOrderStatus);
router.post('/:orderId/comments', orderController.addComment);
router.post('/:orderId/timeline', orderController.addTimelineEvent);
router.post('/:orderId/documents', orderController.attachDocument);

module.exports = router;

