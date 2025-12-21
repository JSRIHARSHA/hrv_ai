const Product = require('../models/Product');
const { Op } = require('sequelize');

// Get all products
exports.getAllProducts = async (req, res) => {
  try {
    const { search, status, categoryName, isActive } = req.query;
    const where = {};

    if (isActive !== undefined) {
      where.isActive = isActive === 'true';
    }
    if (status) {
      where.status = status;
    }
    if (categoryName) {
      where.categoryName = categoryName;
    }
    if (search) {
      where[Op.or] = [
        { itemName: { [Op.iLike]: `%${search}%` } },
        { sku: { [Op.iLike]: `%${search}%` } },
        { itemId: { [Op.iLike]: `%${search}%` } },
        { hsnSac: { [Op.iLike]: `%${search}%` } },
        { categoryName: { [Op.iLike]: `%${search}%` } },
        { vendor: { [Op.iLike]: `%${search}%` } }
      ];
    }

    const products = await Product.findAll({
      where,
      order: [['itemName', 'ASC']]
    });

    res.json({ products });
  } catch (error) {
    console.error('Get all products error:', error);
    res.status(500).json({ error: 'Error fetching products' });
  }
};

// Get product by ID
exports.getProductById = async (req, res) => {
  try {
    const product = await Product.findOne({
      where: { productId: req.params.productId }
    });

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.json({ product });
  } catch (error) {
    console.error('Get product error:', error);
    res.status(500).json({ error: 'Error fetching product' });
  }
};

// Create new product
exports.createProduct = async (req, res) => {
  try {
    const productData = req.body;

    // Generate productId if not provided
    if (!productData.productId) {
      const lastProduct = await Product.findOne({
        order: [['id', 'DESC']]
      });
      const lastId = lastProduct ? parseInt(lastProduct.productId.replace('PROD', '') || '0') : 0;
      productData.productId = `PROD${String(lastId + 1).padStart(6, '0')}`;
    }

    // Check if productId already exists
    const existingProduct = await Product.findOne({
      where: { productId: productData.productId }
    });
    if (existingProduct) {
      return res.status(400).json({ error: 'Product with this ID already exists' });
    }

    const product = await Product.create(productData);

    res.status(201).json({ message: 'Product created successfully', product });
  } catch (error) {
    console.error('Create product error:', error);
    res.status(500).json({ error: 'Error creating product', details: error.message });
  }
};

// Update product
exports.updateProduct = async (req, res) => {
  try {
    const { productId } = req.params;
    const updates = req.body;

    // Don't allow updating productId
    delete updates.productId;

    const [updatedRowsCount] = await Product.update(updates, {
      where: { productId },
      returning: true
    });

    if (updatedRowsCount === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const updatedProduct = await Product.findOne({
      where: { productId }
    });

    res.json({ message: 'Product updated successfully', product: updatedProduct });
  } catch (error) {
    console.error('Update product error:', error);
    res.status(500).json({ error: 'Error updating product', details: error.message });
  }
};

// Delete product
exports.deleteProduct = async (req, res) => {
  try {
    const { productId } = req.params;

    const deletedRowsCount = await Product.destroy({
      where: { productId }
    });

    if (deletedRowsCount === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    console.error('Delete product error:', error);
    res.status(500).json({ error: 'Error deleting product' });
  }
};

// Bulk create products
exports.bulkCreateProducts = async (req, res) => {
  try {
    const { products } = req.body;

    if (!Array.isArray(products) || products.length === 0) {
      return res.status(400).json({ error: 'Products array is required' });
    }

    const createdProducts = await Product.bulkCreate(products, {
      ignoreDuplicates: true,
      returning: true
    });

    res.status(201).json({ 
      message: `${createdProducts.length} products created successfully`, 
      products: createdProducts 
    });
  } catch (error) {
    console.error('Bulk create products error:', error);
    res.status(500).json({ error: 'Error creating products', details: error.message });
  }
};


