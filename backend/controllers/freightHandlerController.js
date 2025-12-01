const FreightHandler = require('../models/FreightHandler');
const { Op } = require('sequelize');

// Get all freight handlers
exports.getAllFreightHandlers = async (req, res) => {
  try {
    const { search, country, isActive } = req.query;
    const where = {};

    if (isActive !== undefined) {
      where.isActive = isActive === 'true';
    }
    if (country) {
      where.country = country;
    }
    if (search) {
      where[Op.or] = [
        { name: { [Op.iLike]: `%${search}%` } },
        { company: { [Op.iLike]: `%${search}%` } },
        { address: { [Op.iLike]: `%${search}%` } },
        { phone: { [Op.iLike]: `%${search}%` } },
        { gstin: { [Op.iLike]: `%${search}%` } }
      ];
    }

    const freightHandlers = await FreightHandler.findAll({
      where,
      order: [['name', 'ASC']]
    });

    res.json({ freightHandlers });
  } catch (error) {
    console.error('Get all freight handlers error:', error);
    res.status(500).json({ error: 'Error fetching freight handlers' });
  }
};

// Get freight handler by ID
exports.getFreightHandlerById = async (req, res) => {
  try {
    const freightHandler = await FreightHandler.findOne({
      where: { freightHandlerId: req.params.freightHandlerId }
    });

    if (!freightHandler) {
      return res.status(404).json({ error: 'Freight handler not found' });
    }

    res.json({ freightHandler });
  } catch (error) {
    console.error('Get freight handler error:', error);
    res.status(500).json({ error: 'Error fetching freight handler' });
  }
};

// Create new freight handler
exports.createFreightHandler = async (req, res) => {
  try {
    const freightHandlerData = req.body;

    // Generate freightHandlerId if not provided
    if (!freightHandlerData.freightHandlerId) {
      const lastHandler = await FreightHandler.findOne({
        order: [['id', 'DESC']]
      });
      const lastId = lastHandler ? parseInt(lastHandler.freightHandlerId.replace('FH', '') || '0') : 0;
      freightHandlerData.freightHandlerId = `FH${String(lastId + 1).padStart(3, '0')}`;
    }

    // Check if freightHandlerId already exists
    const existingHandler = await FreightHandler.findOne({
      where: { freightHandlerId: freightHandlerData.freightHandlerId }
    });
    if (existingHandler) {
      return res.status(400).json({ error: 'Freight handler with this ID already exists' });
    }

    const freightHandler = await FreightHandler.create(freightHandlerData);

    res.status(201).json({ message: 'Freight handler created successfully', freightHandler });
  } catch (error) {
    console.error('Create freight handler error:', error);
    res.status(500).json({ error: 'Error creating freight handler', details: error.message });
  }
};

// Update freight handler
exports.updateFreightHandler = async (req, res) => {
  try {
    const { freightHandlerId } = req.params;
    const updates = req.body;

    // Don't allow updating freightHandlerId
    delete updates.freightHandlerId;

    const [updatedRowsCount] = await FreightHandler.update(updates, {
      where: { freightHandlerId },
      returning: true
    });

    if (updatedRowsCount === 0) {
      return res.status(404).json({ error: 'Freight handler not found' });
    }

    const updatedHandler = await FreightHandler.findOne({
      where: { freightHandlerId }
    });

    res.json({ message: 'Freight handler updated successfully', freightHandler: updatedHandler });
  } catch (error) {
    console.error('Update freight handler error:', error);
    res.status(500).json({ error: 'Error updating freight handler', details: error.message });
  }
};

// Delete freight handler
exports.deleteFreightHandler = async (req, res) => {
  try {
    const { freightHandlerId } = req.params;

    const deletedRowsCount = await FreightHandler.destroy({
      where: { freightHandlerId }
    });

    if (deletedRowsCount === 0) {
      return res.status(404).json({ error: 'Freight handler not found' });
    }

    res.json({ message: 'Freight handler deleted successfully' });
  } catch (error) {
    console.error('Delete freight handler error:', error);
    res.status(500).json({ error: 'Error deleting freight handler' });
  }
};

// Bulk create freight handlers
exports.bulkCreateFreightHandlers = async (req, res) => {
  try {
    const { freightHandlers } = req.body;

    if (!Array.isArray(freightHandlers) || freightHandlers.length === 0) {
      return res.status(400).json({ error: 'Freight handlers array is required' });
    }

    const createdHandlers = await FreightHandler.bulkCreate(freightHandlers, {
      ignoreDuplicates: true,
      returning: true
    });

    res.status(201).json({ 
      message: `${createdHandlers.length} freight handlers created successfully`, 
      freightHandlers: createdHandlers 
    });
  } catch (error) {
    console.error('Bulk create freight handlers error:', error);
    res.status(500).json({ error: 'Error creating freight handlers', details: error.message });
  }
};

