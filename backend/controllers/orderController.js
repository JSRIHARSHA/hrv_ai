const Order = require('../models/Order');
const { Op } = require('sequelize');

// Get all orders
exports.getAllOrders = async (req, res) => {
  try {
    const { status, entity, assignedTo, createdBy } = req.query;
    const where = {};

    if (status) where.status = status;
    if (entity) where.entity = entity;
    // For JSONB fields, we'll filter in JavaScript after fetching
    // PostgreSQL JSONB queries are complex, so we fetch and filter

    console.log('Fetching orders with filters:', { status, entity, assignedTo, createdBy });

    let orders = await Order.findAll({
      where,
      order: [['createdAt', 'DESC']]
    });

    console.log(`Found ${orders.length} orders in database`);

    // Filter by assignedTo if provided
    if (assignedTo) {
      orders = orders.filter(order => {
        const assigned = order.assignedTo;
        return assigned && assigned.userId === assignedTo;
      });
    }

    // Filter by createdBy if provided
    if (createdBy) {
      orders = orders.filter(order => {
        const created = order.createdBy;
        return created && created.userId === createdBy;
      });
    }

    res.json({ orders });
  } catch (error) {
    console.error('Get all orders error:', error);
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    console.error('Error details:', error.errors || error.parent?.message || error);
    res.status(500).json({ 
      error: 'Error fetching orders',
      details: error.message,
      hint: error.parent?.code === '42P01' ? 'Database tables may not exist. Run syncDatabase.js script.' : undefined
    });
  }
};

// Get order by ID
exports.getOrderById = async (req, res) => {
  try {
    const order = await Order.findOne({ where: { orderId: req.params.orderId } });
    
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    res.json({ order });
  } catch (error) {
    console.error('Get order error:', error);
    res.status(500).json({ error: 'Error fetching order' });
  }
};

// Create new order
exports.createOrder = async (req, res) => {
  try {
    const orderData = req.body;
    
    console.log('Creating order with data:', JSON.stringify(orderData, null, 2));
    
    // Check if order already exists
    const existingOrder = await Order.findOne({ where: { orderId: orderData.orderId } });
    if (existingOrder) {
      return res.status(400).json({ error: 'Order with this ID already exists' });
    }

    // Ensure required fields have defaults
    const orderToCreate = {
      ...orderData,
      // Convert createdAt string to Date if provided
      createdAt: orderData.createdAt ? new Date(orderData.createdAt) : new Date(),
      // Ensure required JSONB fields are set (cannot be null)
      createdBy: orderData.createdBy || {
        userId: req.user?.userId || 'unknown',
        name: req.user?.name || 'Unknown User',
        role: req.user?.role || 'Employee'
      },
      assignedTo: orderData.assignedTo || {
        userId: req.user?.userId || 'unknown',
        name: req.user?.name || 'Unknown User',
        role: req.user?.role || 'Employee'
      },
      customer: orderData.customer || {
        name: '',
        address: '',
        country: '',
        email: '',
        phone: '',
        gstin: ''
      },
      // Ensure arrays are arrays
      materials: Array.isArray(orderData.materials) ? orderData.materials : [],
      auditLogs: Array.isArray(orderData.auditLogs) ? orderData.auditLogs : [],
      comments: Array.isArray(orderData.comments) ? orderData.comments : [],
      approvalRequests: Array.isArray(orderData.approvalRequests) ? orderData.approvalRequests : [],
      timeline: Array.isArray(orderData.timeline) ? orderData.timeline : [],
      // Ensure objects are objects
      documents: orderData.documents || {},
      // Ensure supplier is null if not provided
      supplier: orderData.supplier || null,
      // Ensure required fields have defaults
      materialName: orderData.materialName || '',
      quantity: orderData.quantity || { value: 1, unit: 'kg' },
      priceToCustomer: orderData.priceToCustomer || { amount: 0, currency: 'USD' },
      priceFromSupplier: orderData.priceFromSupplier || { amount: 0, currency: 'USD' },
    };

    console.log('Order data prepared for creation');
    const order = await Order.create(orderToCreate);
    console.log('Order created successfully:', order.orderId);

    res.status(201).json({ message: 'Order created successfully', order });
  } catch (error) {
    console.error('Create order error:', error);
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    console.error('Error details:', error.errors || error.parent?.message || error);
    res.status(500).json({ 
      error: 'Error creating order',
      details: error.message,
      fieldErrors: error.errors ? error.errors.map(e => ({ field: e.path, message: e.message })) : undefined
    });
  }
};

// Update order
exports.updateOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    const updates = req.body;

    const [updatedRowsCount] = await Order.update(updates, {
      where: { orderId },
      returning: true
    });

    if (updatedRowsCount === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const order = await Order.findOne({ where: { orderId } });

    res.json({ message: 'Order updated successfully', order });
  } catch (error) {
    console.error('Update order error:', error);
    res.status(500).json({ error: 'Error updating order' });
  }
};

// Update order status
exports.updateOrderStatus = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { newStatus, note } = req.body;

    const order = await Order.findOne({ where: { orderId } });
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const oldStatus = order.status;
    order.status = newStatus;

    // Add audit log
    const auditLog = {
      timestamp: new Date().toISOString(),
      userId: req.user.userId,
      userName: req.user.name,
      fieldChanged: 'status',
      oldValue: oldStatus,
      newValue: newStatus,
      note: note || `Status changed to ${newStatus}`,
    };
    
    const auditLogs = Array.isArray(order.auditLogs) ? [...order.auditLogs] : [];
    auditLogs.push(auditLog);
    order.auditLogs = auditLogs;

    // Add timeline event
    const timelineEvent = {
      id: `timeline-${Date.now()}`,
      timestamp: new Date().toISOString(),
      event: 'Status Updated',
      actor: {
        userId: req.user.userId,
        name: req.user.name,
        role: req.user.role,
      },
      details: note || `Status changed from ${oldStatus} to ${newStatus}`,
      status: newStatus,
    };
    
    const timeline = Array.isArray(order.timeline) ? [...order.timeline] : [];
    timeline.push(timelineEvent);
    order.timeline = timeline;

    await order.save();

    res.json({ message: 'Order status updated successfully', order });
  } catch (error) {
    console.error('Update order status error:', error);
    res.status(500).json({ error: 'Error updating order status' });
  }
};

// Add comment to order
exports.addComment = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { message, isInternal } = req.body;

    const order = await Order.findOne({ where: { orderId } });
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const comment = {
      id: `comment-${Date.now()}`,
      timestamp: new Date().toISOString(),
      userId: req.user.userId,
      userName: req.user.name,
      message,
      isInternal: isInternal !== undefined ? isInternal : true,
    };

    const comments = Array.isArray(order.comments) ? [...order.comments] : [];
    comments.push(comment);
    order.comments = comments;
    await order.save();

    res.json({ message: 'Comment added successfully', comment });
  } catch (error) {
    console.error('Add comment error:', error);
    res.status(500).json({ error: 'Error adding comment' });
  }
};

// Add timeline event
exports.addTimelineEvent = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { event, details, status } = req.body;

    const order = await Order.findOne({ where: { orderId } });
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const timelineEvent = {
      id: `timeline-${Date.now()}`,
      timestamp: new Date().toISOString(),
      event,
      actor: {
        userId: req.user.userId,
        name: req.user.name,
        role: req.user.role,
      },
      details,
      status: status || order.status,
    };

    const timeline = Array.isArray(order.timeline) ? [...order.timeline] : [];
    timeline.push(timelineEvent);
    order.timeline = timeline;
    await order.save();

    res.json({ message: 'Timeline event added successfully', timelineEvent });
  } catch (error) {
    console.error('Add timeline event error:', error);
    res.status(500).json({ error: 'Error adding timeline event' });
  }
};

// Attach document to order
exports.attachDocument = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { documentType, documentData, filename } = req.body;

    const order = await Order.findOne({ where: { orderId } });
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const document = {
      id: `doc_${Date.now()}`,
      filename,
      uploadedAt: new Date().toISOString(),
      uploadedBy: {
        userId: req.user.userId,
        name: req.user.name,
      },
      fileSize: documentData.length,
      mimeType: 'application/pdf',
      data: documentData,
    };

    const documents = order.documents || {};
    documents[documentType] = document;
    order.documents = documents;
    await order.save();

    res.json({ message: 'Document attached successfully', document });
  } catch (error) {
    console.error('Attach document error:', error);
    res.status(500).json({ error: 'Error attaching document' });
  }
};

// Delete order
exports.deleteOrder = async (req, res) => {
  try {
    const { orderId } = req.params;

    const deletedRowsCount = await Order.destroy({ where: { orderId } });
    
    if (deletedRowsCount === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    res.json({ message: 'Order deleted successfully' });
  } catch (error) {
    console.error('Delete order error:', error);
    res.status(500).json({ error: 'Error deleting order' });
  }
};

// Get user's orders
exports.getUserOrders = async (req, res) => {
  try {
    const userId = req.user.userId;
    console.log('Getting orders for user:', userId);

    // Fetch all orders and filter by userId in JSONB fields
    const allOrders = await Order.findAll({
      order: [['createdAt', 'DESC']]
    });

    console.log(`Found ${allOrders.length} total orders in database`);

    const orders = allOrders.filter(order => {
      const created = order.createdBy;
      const assigned = order.assignedTo;
      const matches = (created && created.userId === userId) || 
                      (assigned && assigned.userId === userId);
      return matches;
    });

    console.log(`Filtered to ${orders.length} orders for user ${userId}`);
    res.json({ orders });
  } catch (error) {
    console.error('Get user orders error:', error);
    res.status(500).json({ error: 'Error fetching user orders' });
  }
};

// Get team orders (for managers)
exports.getTeamOrders = async (req, res) => {
  try {
    const { team } = req.user;

    if (!team) {
      return res.status(400).json({ error: 'User not assigned to a team' });
    }

    // This would require fetching all users in the team first
    // For now, we'll return orders where assignedTo or createdBy matches the team
    const orders = await Order.findAll({
      order: [['createdAt', 'DESC']]
    });
    
    // Filter by team on the application level
    // In a production system, you'd want to optimize this with better queries
    res.json({ orders });
  } catch (error) {
    console.error('Get team orders error:', error);
    res.status(500).json({ error: 'Error fetching team orders' });
  }
};
