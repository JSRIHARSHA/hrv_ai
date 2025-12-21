const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const FreightHandler = sequelize.define('FreightHandler', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  freightHandlerId: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    comment: 'Unique freight handler identifier'
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'Contact person name'
  },
  company: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'Company name'
  },
  address: {
    type: DataTypes.TEXT,
    allowNull: false,
    comment: 'Full address'
  },
  country: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'India',
    comment: 'Country'
  },
  phone: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'Phone number'
  },
  gstin: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'GSTIN number'
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Additional notes'
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
    comment: 'Is freight handler active'
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
  tableName: 'freight_handlers',
  timestamps: true,
  indexes: [
    {
      unique: true,
      fields: ['freightHandlerId']
    },
    {
      fields: ['name']
    },
    {
      fields: ['company']
    },
    {
      fields: ['isActive']
    }
  ]
});

module.exports = FreightHandler;


