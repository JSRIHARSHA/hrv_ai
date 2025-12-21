const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Product = sequelize.define('Product', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  productId: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    comment: 'Unique product identifier'
  },
  itemId: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Item ID from CSV'
  },
  itemName: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'Product/item name'
  },
  sku: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Stock Keeping Unit'
  },
  upc: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Universal Product Code'
  },
  hsnSac: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'HSN/SAC code'
  },
  categoryName: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Product category'
  },
  productType: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Type of product'
  },
  unitName: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Unit name (kg, g, etc.)'
  },
  defaultSalesUnitName: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Default sales unit'
  },
  defaultPurchaseUnitName: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Default purchase unit'
  },
  vendor: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Vendor name'
  },
  warehouseName: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Warehouse name'
  },
  status: {
    type: DataTypes.STRING,
    allowNull: true,
    defaultValue: 'Active',
    comment: 'Product status'
  },
  taxable: {
    type: DataTypes.BOOLEAN,
    allowNull: true,
    defaultValue: true,
    comment: 'Is product taxable'
  },
  intraStateTaxRate: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: true,
    comment: 'Intra-state tax rate percentage'
  },
  interStateTaxRate: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: true,
    comment: 'Inter-state tax rate percentage'
  },
  inventoryAccount: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Inventory account'
  },
  reorderPoint: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    comment: 'Reorder point quantity'
  },
  stockOnHand: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    defaultValue: 0,
    comment: 'Current stock on hand'
  },
  itemType: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Item type (Inventory, Purchases, etc.)'
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
    comment: 'Is product active'
  },
  createdAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  updatedAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'products',
  timestamps: true,
  indexes: [
    {
      unique: true,
      fields: ['productId']
    },
    {
      fields: ['itemName']
    },
    {
      fields: ['sku']
    },
    {
      fields: ['status']
    },
    {
      fields: ['isActive']
    }
  ]
});

module.exports = Product;


