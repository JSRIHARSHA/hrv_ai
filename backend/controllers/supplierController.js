const Supplier = require('../models/Supplier');
const { Op } = require('sequelize');

// Get all suppliers
exports.getAllSuppliers = async (req, res) => {
  try {
    const { search, country, sourceOfSupply, isActive } = req.query;
    const where = {};

    if (isActive !== undefined) {
      where.isActive = isActive === 'true';
    }
    if (country) {
      where.country = country;
    }
    if (sourceOfSupply) {
      where.sourceOfSupply = sourceOfSupply;
    }
    if (search) {
      where[Op.or] = [
        { name: { [Op.iLike]: `%${search}%` } },
        { address: { [Op.iLike]: `%${search}%` } },
        { city: { [Op.iLike]: `%${search}%` } },
        { gstin: { [Op.iLike]: `%${search}%` } }
      ];
    }

    const suppliers = await Supplier.findAll({
      where,
      order: [['name', 'ASC']]
    });

    res.json({ suppliers });
  } catch (error) {
    console.error('Get all suppliers error:', error);
    res.status(500).json({ error: 'Error fetching suppliers' });
  }
};

// Get supplier by ID
exports.getSupplierById = async (req, res) => {
  try {
    const supplier = await Supplier.findOne({
      where: { supplierId: req.params.supplierId }
    });

    if (!supplier) {
      return res.status(404).json({ error: 'Supplier not found' });
    }

    res.json({ supplier });
  } catch (error) {
    console.error('Get supplier error:', error);
    res.status(500).json({ error: 'Error fetching supplier' });
  }
};

// Create new supplier
exports.createSupplier = async (req, res) => {
  try {
    const supplierData = req.body;

    // Generate supplierId if not provided
    if (!supplierData.supplierId) {
      const lastSupplier = await Supplier.findOne({
        order: [['id', 'DESC']]
      });
      const lastId = lastSupplier ? parseInt(lastSupplier.supplierId.replace('SUP', '') || '0') : 0;
      supplierData.supplierId = `SUP${String(lastId + 1).padStart(3, '0')}`;
    }

    // Check if supplierId already exists
    const existingSupplier = await Supplier.findOne({
      where: { supplierId: supplierData.supplierId }
    });
    if (existingSupplier) {
      return res.status(400).json({ error: 'Supplier with this ID already exists' });
    }

    const supplier = await Supplier.create(supplierData);

    res.status(201).json({ message: 'Supplier created successfully', supplier });
  } catch (error) {
    console.error('Create supplier error:', error);
    res.status(500).json({ error: 'Error creating supplier' });
  }
};

// Update supplier
exports.updateSupplier = async (req, res) => {
  try {
    const { supplierId } = req.params;
    const updates = req.body;

    // Don't allow updating supplierId
    delete updates.supplierId;

    const [updatedRowsCount] = await Supplier.update(updates, {
      where: { supplierId },
      returning: true
    });

    if (updatedRowsCount === 0) {
      return res.status(404).json({ error: 'Supplier not found' });
    }

    const supplier = await Supplier.findOne({ where: { supplierId } });

    res.json({ message: 'Supplier updated successfully', supplier });
  } catch (error) {
    console.error('Update supplier error:', error);
    res.status(500).json({ error: 'Error updating supplier' });
  }
};

// Delete supplier (soft delete by setting isActive to false)
exports.deleteSupplier = async (req, res) => {
  try {
    const { supplierId } = req.params;

    const supplier = await Supplier.findOne({ where: { supplierId } });
    if (!supplier) {
      return res.status(404).json({ error: 'Supplier not found' });
    }

    // Soft delete - set isActive to false
    supplier.isActive = false;
    await supplier.save();

    res.json({ message: 'Supplier deleted successfully' });
  } catch (error) {
    console.error('Delete supplier error:', error);
    res.status(500).json({ error: 'Error deleting supplier' });
  }
};

// Hard delete supplier (permanent)
exports.hardDeleteSupplier = async (req, res) => {
  try {
    const { supplierId } = req.params;

    const deletedRowsCount = await Supplier.destroy({ where: { supplierId } });

    if (deletedRowsCount === 0) {
      return res.status(404).json({ error: 'Supplier not found' });
    }

    res.json({ message: 'Supplier permanently deleted' });
  } catch (error) {
    console.error('Hard delete supplier error:', error);
    res.status(500).json({ error: 'Error deleting supplier' });
  }
};

// Search suppliers
exports.searchSuppliers = async (req, res) => {
  try {
    const { q } = req.query;

    if (!q || q.trim().length === 0) {
      const suppliers = await Supplier.findAll({
        where: { isActive: true },
        order: [['name', 'ASC']],
        limit: 50
      });
      return res.json({ suppliers });
    }

    const searchTerm = q.trim();
    const suppliers = await Supplier.findAll({
      where: {
        isActive: true,
        [Op.or]: [
          { name: { [Op.iLike]: `%${searchTerm}%` } },
          { address: { [Op.iLike]: `%${searchTerm}%` } },
          { city: { [Op.iLike]: `%${searchTerm}%` } },
          { country: { [Op.iLike]: `%${searchTerm}%` } },
          { gstin: { [Op.iLike]: `%${searchTerm}%` } }
        ]
      },
      order: [['name', 'ASC']],
      limit: 100
    });

    res.json({ suppliers });
  } catch (error) {
    console.error('Search suppliers error:', error);
    res.status(500).json({ error: 'Error searching suppliers' });
  }
};

// Get supplier statistics
exports.getSupplierStats = async (req, res) => {
  try {
    const totalSuppliers = await Supplier.count();
    const activeSuppliers = await Supplier.count({ where: { isActive: true } });
    const suppliersByCountry = await Supplier.findAll({
      attributes: [
        'country',
        [Supplier.sequelize.fn('COUNT', Supplier.sequelize.col('id')), 'count']
      ],
      group: ['country'],
      raw: true
    });

    res.json({
      total: totalSuppliers,
      active: activeSuppliers,
      inactive: totalSuppliers - activeSuppliers,
      byCountry: suppliersByCountry
    });
  } catch (error) {
    console.error('Get supplier stats error:', error);
    res.status(500).json({ error: 'Error fetching supplier statistics' });
  }
};


