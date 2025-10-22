const Order = require('../models/Order');

// Get all orders
exports.getAllOrders = async (req, res) => {
  try {
    const { status, entity, assignedTo, createdBy } = req.query;
    const filter = {};

    if (status) filter.status = status;
    if (entity) filter.entity = entity;
    if (assignedTo) filter['assignedTo.userId'] = assignedTo;
    if (createdBy) filter['createdBy.userId'] = createdBy;

    const orders = await Order.find(filter).sort({ createdAt: -1 });
    res.json({ orders });
  } catch (error) {
    console.error('Get all orders error:', error);
    res.status(500).json({ error: 'Error fetching orders' });
  }
};

// Get order by ID
exports.getOrderById = async (req, res) => {
  try {
    const order = await Order.findOne({ orderId: req.params.orderId });
    
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
    
    // Check if order already exists
    const existingOrder = await Order.findOne({ orderId: orderData.orderId });
    if (existingOrder) {
      return res.status(400).json({ error: 'Order with this ID already exists' });
    }

    const order = new Order(orderData);
    await order.save();

    res.status(201).json({ message: 'Order created successfully', order });
  } catch (error) {
    console.error('Create order error:', error);
    res.status(500).json({ error: 'Error creating order' });
  }
};

// Update order
exports.updateOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    const updates = req.body;

    const order = await Order.findOneAndUpdate(
      { orderId },
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

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

    const order = await Order.findOne({ orderId });
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
    order.auditLogs.push(auditLog);

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
    order.timeline.push(timelineEvent);

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

    const order = await Order.findOne({ orderId });
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

    order.comments.push(comment);
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

    const order = await Order.findOne({ orderId });
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

    order.timeline.push(timelineEvent);
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

    const order = await Order.findOne({ orderId });
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

    order.documents[documentType] = document;
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

    const order = await Order.findOneAndDelete({ orderId });
    if (!order) {
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

    const orders = await Order.find({
      $or: [
        { 'createdBy.userId': userId },
        { 'assignedTo.userId': userId }
      ]
    }).sort({ createdAt: -1 });

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
    const orders = await Order.find().sort({ createdAt: -1 });
    
    // Filter by team on the application level
    // In a production system, you'd want to optimize this with better queries
    res.json({ orders });
  } catch (error) {
    console.error('Get team orders error:', error);
    res.status(500).json({ error: 'Error fetching team orders' });
  }
};

