const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Supplier = sequelize.define('Supplier', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  supplierId: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    comment: 'Unique supplier identifier (e.g., SUP001)'
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'Company name'
  },
  address: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Full address'
  },
  city: {
    type: DataTypes.STRING,
    allowNull: true
  },
  state: {
    type: DataTypes.STRING,
    allowNull: true
  },
  country: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'India'
  },
  email: {
    type: DataTypes.STRING,
    allowNull: true,
    validate: {
      isEmail: true
    }
  },
  phone: {
    type: DataTypes.STRING,
    allowNull: true
  },
  gstin: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'GST Identification Number'
  },
  sourceOfSupply: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Source of supply (e.g., TS, GJ, MH)'
  },
  billingAddress: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  billingStreet2: {
    type: DataTypes.STRING,
    allowNull: true
  },
  billingCity: {
    type: DataTypes.STRING,
    allowNull: true
  },
  billingState: {
    type: DataTypes.STRING,
    allowNull: true
  },
  billingCountry: {
    type: DataTypes.STRING,
    allowNull: true
  },
  shippingAddress: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  shippingStreet2: {
    type: DataTypes.STRING,
    allowNull: true
  },
  shippingCity: {
    type: DataTypes.STRING,
    allowNull: true
  },
  shippingState: {
    type: DataTypes.STRING,
    allowNull: true
  },
  shippingCountry: {
    type: DataTypes.STRING,
    allowNull: true
  },
  specialties: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: [],
    comment: 'Array of supplier specialties'
  },
  rating: {
    type: DataTypes.DECIMAL(3, 2),
    allowNull: false,
    defaultValue: 0,
    comment: 'Supplier rating (0-5)'
  },
  lastOrderDate: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Date of last order placed with this supplier'
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Additional notes about the supplier'
  }
}, {
  tableName: 'suppliers',
  timestamps: true,
  underscored: false,
  indexes: [
    {
      unique: true,
      fields: ['supplierId']
    },
    {
      fields: ['name']
    },
    {
      fields: ['gstin']
    },
    {
      fields: ['country']
    },
    {
      fields: ['isActive']
    },
    {
      fields: ['sourceOfSupply']
    }
  ]
});

module.exports = Supplier;


