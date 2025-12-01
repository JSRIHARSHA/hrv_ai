const Material = require('../models/Material');
const Supplier = require('../models/Supplier');
const { Op } = require('sequelize');

// Get all materials with optional filters
const getAllMaterials = async (req, res) => {
  try {
    const {
      search,
      supplierId,
      categoryName,
      status,
      itemType,
      page = 1,
      limit = 50
    } = req.query;

    const where = {};
    
    if (search) {
      where[Op.or] = [
        { itemName: { [Op.iLike]: `%${search}%` } },
        { sku: { [Op.iLike]: `%${search}%` } },
        { hsnSac: { [Op.iLike]: `%${search}%` } },
        { itemId: { [Op.iLike]: `%${search}%` } }
      ];
    }

    if (supplierId) {
      where.supplierId = supplierId;
    }

    if (categoryName) {
      where.categoryName = categoryName;
    }

    if (status) {
      where.status = status;
    }

    if (itemType) {
      where.itemType = itemType;
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);

    const { count, rows } = await Material.findAndCountAll({
      where,
      include: [
        {
          model: Supplier,
          as: 'supplier',
          attributes: ['supplierId', 'name', 'country', 'gstin']
        }
      ],
      limit: parseInt(limit),
      offset: offset,
      order: [['itemName', 'ASC']]
    });

    res.json({
      success: true,
      data: rows,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(count / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error fetching materials:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching materials',
      error: error.message
    });
  }
};

// Get material by ID
const getMaterialById = async (req, res) => {
  try {
    const { id } = req.params;

    const material = await Material.findByPk(id, {
      include: [
        {
          model: Supplier,
          as: 'supplier',
          attributes: ['supplierId', 'name', 'address', 'country', 'email', 'phone', 'gstin']
        }
      ]
    });

    if (!material) {
      return res.status(404).json({
        success: false,
        message: 'Material not found'
      });
    }

    res.json({
      success: true,
      data: material
    });
  } catch (error) {
    console.error('Error fetching material:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching material',
      error: error.message
    });
  }
};

// Get material by itemId
const getMaterialByItemId = async (req, res) => {
  try {
    const { itemId } = req.params;

    const material = await Material.findOne({
      where: { itemId },
      include: [
        {
          model: Supplier,
          as: 'supplier',
          attributes: ['supplierId', 'name', 'address', 'country', 'email', 'phone', 'gstin']
        }
      ]
    });

    if (!material) {
      return res.status(404).json({
        success: false,
        message: 'Material not found'
      });
    }

    res.json({
      success: true,
      data: material
    });
  } catch (error) {
    console.error('Error fetching material:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching material',
      error: error.message
    });
  }
};

// Create new material
const createMaterial = async (req, res) => {
  try {
    const materialData = req.body;

    // If vendor name is provided, try to find supplier
    if (materialData.vendor && !materialData.supplierId) {
      const supplier = await Supplier.findOne({
        where: { name: { [Op.iLike]: materialData.vendor } }
      });
      if (supplier) {
        materialData.supplierId = supplier.id;
      }
    }

    const material = await Material.create(materialData);

    const materialWithSupplier = await Material.findByPk(material.id, {
      include: [
        {
          model: Supplier,
          as: 'supplier',
          attributes: ['supplierId', 'name', 'country', 'gstin']
        }
      ]
    });

    res.status(201).json({
      success: true,
      message: 'Material created successfully',
      data: materialWithSupplier
    });
  } catch (error) {
    console.error('Error creating material:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating material',
      error: error.message
    });
  }
};

// Update material
const updateMaterial = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const material = await Material.findByPk(id);
    if (!material) {
      return res.status(404).json({
        success: false,
        message: 'Material not found'
      });
    }

    // If vendor name is provided, try to find supplier
    if (updateData.vendor && !updateData.supplierId) {
      const supplier = await Supplier.findOne({
        where: { name: { [Op.iLike]: updateData.vendor } }
      });
      if (supplier) {
        updateData.supplierId = supplier.id;
      }
    }

    await material.update(updateData);

    const updatedMaterial = await Material.findByPk(id, {
      include: [
        {
          model: Supplier,
          as: 'supplier',
          attributes: ['supplierId', 'name', 'country', 'gstin']
        }
      ]
    });

    res.json({
      success: true,
      message: 'Material updated successfully',
      data: updatedMaterial
    });
  } catch (error) {
    console.error('Error updating material:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating material',
      error: error.message
    });
  }
};

// Delete material
const deleteMaterial = async (req, res) => {
  try {
    const { id } = req.params;

    const material = await Material.findByPk(id);
    if (!material) {
      return res.status(404).json({
        success: false,
        message: 'Material not found'
      });
    }

    await material.destroy();

    res.json({
      success: true,
      message: 'Material deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting material:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting material',
      error: error.message
    });
  }
};

// Get categories
const getCategories = async (req, res) => {
  try {
    const categories = await Material.findAll({
      attributes: ['categoryName'],
      where: {
        categoryName: { [Op.ne]: null }
      },
      group: ['categoryName'],
      order: [['categoryName', 'ASC']]
    });

    const categoryList = categories.map(c => c.categoryName).filter(Boolean);

    res.json({
      success: true,
      data: categoryList
    });
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching categories',
      error: error.message
    });
  }
};

module.exports = {
  getAllMaterials,
  getMaterialById,
  getMaterialByItemId,
  createMaterial,
  updateMaterial,
  deleteMaterial,
  getCategories
};

