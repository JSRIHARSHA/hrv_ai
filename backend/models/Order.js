const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Order = sequelize.define('Order', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  orderId: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  createdAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  createdBy: {
    type: DataTypes.JSONB,
    allowNull: false
  },
  customer: {
    type: DataTypes.JSONB,
    allowNull: false
  },
  supplier: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: null
  },
  materialName: {
    type: DataTypes.STRING,
    allowNull: false
  },
  materials: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: []
  },
  quantity: {
    type: DataTypes.JSONB,
    allowNull: false
  },
  priceToCustomer: {
    type: DataTypes.JSONB,
    allowNull: false
  },
  priceFromSupplier: {
    type: DataTypes.JSONB,
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM(
      'PO_Received_from_Client',
      'Drafting_PO_for_Supplier',
      'PO_Sent_to_Supplier',
      'Proforma_Invoice_Received',
      'Awaiting_COA',
      'COA_Received',
      'COA_Revision',
      'COA_Accepted',
      'Awaiting_Approval',
      'Approved',
      'Advance_Payment_Completed',
      'Material_to_be_Dispatched',
      'Material_Dispatched',
      'In_Transit',
      'Completed',
      'Sent_PO_for_Approval',
      'PO_Rejected',
      'PO_Approved'
    ),
    defaultValue: 'PO_Received_from_Client',
    allowNull: false
  },
  documents: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: {}
  },
  advancePayment: {
    type: DataTypes.JSONB,
    allowNull: true
  },
  auditLogs: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: []
  },
  comments: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: []
  },
  assignedTo: {
    type: DataTypes.JSONB,
    allowNull: false
  },
  approvalRequests: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: []
  },
  timeline: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: []
  },
  poNumber: {
    type: DataTypes.STRING,
    allowNull: true
  },
  deliveryTerms: {
    type: DataTypes.STRING,
    allowNull: true
  },
  incoterms: {
    type: DataTypes.STRING,
    allowNull: true
  },
  eta: {
    type: DataTypes.STRING,
    allowNull: true
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  freightHandler: {
    type: DataTypes.JSONB,
    allowNull: true
  },
  hsnCode: {
    type: DataTypes.STRING,
    allowNull: true
  },
  enquiryNo: {
    type: DataTypes.STRING,
    allowNull: true
  },
  upc: {
    type: DataTypes.STRING,
    allowNull: true
  },
  ean: {
    type: DataTypes.STRING,
    allowNull: true
  },
  mpn: {
    type: DataTypes.STRING,
    allowNull: true
  },
  isbn: {
    type: DataTypes.STRING,
    allowNull: true
  },
  inventoryAccount: {
    type: DataTypes.STRING,
    allowNull: true
  },
  inventoryValuationMethod: {
    type: DataTypes.STRING,
    allowNull: true
  },
  supplierPOGenerated: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  supplierPOSent: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  paymentDetails: {
    type: DataTypes.JSONB,
    allowNull: true
  },
  rfid: {
    type: DataTypes.STRING,
    allowNull: true
  },
  entity: {
    type: DataTypes.ENUM('HRV', 'NHG'),
    allowNull: true
  },
  orderType: {
    type: DataTypes.ENUM('Direct PO', 'Sample PO', 'Service PO'),
    allowNull: true
  },
  logisticsSubStatus: {
    type: DataTypes.STRING,
    allowNull: true
  },
  logisticsDocuments: {
    type: DataTypes.JSONB,
    allowNull: true
  },
  discount: {
    type: DataTypes.JSONB,
    allowNull: true
  },
  tds: {
    type: DataTypes.JSONB,
    allowNull: true
  },
  tcs: {
    type: DataTypes.JSONB,
    allowNull: true
  },
  adjustment: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true
  }
}, {
  tableName: 'orders',
  timestamps: true,
  underscored: false,
  indexes: [
    {
      unique: true,
      fields: ['orderId']
    },
    {
      fields: ['status']
    },
    {
      fields: ['entity']
    },
    {
      fields: ['createdAt']
    }
    // Note: GIN indexes for JSONB fields can be added via raw SQL migrations
    // CREATE INDEX idx_orders_assigned_to ON orders USING gin ("assignedTo");
    // CREATE INDEX idx_orders_created_by ON orders USING gin ("createdBy");
  ]
});

module.exports = Order;
