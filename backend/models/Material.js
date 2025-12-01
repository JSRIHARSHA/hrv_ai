const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Material = sequelize.define('Material', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  itemId: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    comment: 'Item ID from CSV (e.g., 2.34877E+18)'
  },
  itemName: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'Item Name'
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
  isReturnableItem: {
    type: DataTypes.BOOLEAN,
    allowNull: true,
    defaultValue: false
  },
  hsnSac: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'HSN/SAC Code'
  },
  dimensionUnit: {
    type: DataTypes.STRING,
    allowNull: true,
    defaultValue: 'cm'
  },
  weightUnit: {
    type: DataTypes.STRING,
    allowNull: true,
    defaultValue: 'kg'
  },
  isReceivableService: {
    type: DataTypes.BOOLEAN,
    allowNull: true,
    defaultValue: false
  },
  taxable: {
    type: DataTypes.BOOLEAN,
    allowNull: true,
    defaultValue: true
  },
  taxabilityType: {
    type: DataTypes.STRING,
    allowNull: true
  },
  productType: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Product Type (e.g., goods)'
  },
  categoryName: {
    type: DataTypes.STRING,
    allowNull: true
  },
  parentCategory: {
    type: DataTypes.STRING,
    allowNull: true
  },
  intraStateTaxName: {
    type: DataTypes.STRING,
    allowNull: true
  },
  intraStateTaxRate: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: true
  },
  intraStateTaxType: {
    type: DataTypes.STRING,
    allowNull: true
  },
  interStateTaxName: {
    type: DataTypes.STRING,
    allowNull: true
  },
  interStateTaxRate: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: true
  },
  interStateTaxType: {
    type: DataTypes.STRING,
    allowNull: true
  },
  source: {
    type: DataTypes.STRING,
    allowNull: true
  },
  referenceId: {
    type: DataTypes.STRING,
    allowNull: true
  },
  lastSyncTime: {
    type: DataTypes.DATE,
    allowNull: true
  },
  status: {
    type: DataTypes.STRING,
    allowNull: true,
    defaultValue: 'Active'
  },
  usageUnit: {
    type: DataTypes.STRING,
    allowNull: true
  },
  unitName: {
    type: DataTypes.STRING,
    allowNull: true
  },
  defaultSalesUnitName: {
    type: DataTypes.STRING,
    allowNull: true
  },
  defaultSalesUnitSymbol: {
    type: DataTypes.STRING,
    allowNull: true
  },
  defaultPurchaseUnitName: {
    type: DataTypes.STRING,
    allowNull: true
  },
  defaultPurchaseUnitSymbol: {
    type: DataTypes.STRING,
    allowNull: true
  },
  inventoryAccount: {
    type: DataTypes.STRING,
    allowNull: true
  },
  inventoryAccountCode: {
    type: DataTypes.STRING,
    allowNull: true
  },
  inventoryValuationMethod: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'e.g., fifo, lifo'
  },
  reorderPoint: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  vendor: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Supplier/Vendor name from CSV'
  },
  supplierId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Foreign key to suppliers table'
  },
  warehouseName: {
    type: DataTypes.STRING,
    allowNull: true
  },
  openingStock: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  openingStockValue: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true
  },
  stockOnHand: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 0
  },
  itemType: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'e.g., Purchases, Inventory'
  }
}, {
  tableName: 'materials',
  timestamps: true,
  underscored: false,
  indexes: [
    {
      unique: true,
      fields: ['itemId']
    },
    {
      fields: ['itemName']
    },
    {
      fields: ['sku']
    },
    {
      fields: ['hsnSac']
    },
    {
      fields: ['supplierId']
    },
    {
      fields: ['vendor']
    },
    {
      fields: ['status']
    },
    {
      fields: ['categoryName']
    }
  ]
});

module.exports = Material;

