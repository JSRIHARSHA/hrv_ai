const mongoose = require('mongoose');

const documentSchema = new mongoose.Schema({
  filename: String,
  uploadedAt: Date,
  uploadedBy: {
    userId: String,
    name: String,
  },
  fileSize: Number,
  mimeType: String,
  data: String, // Base64 encoded file data
}, { _id: false });

const materialItemSchema = new mongoose.Schema({
  id: String,
  name: String,
  sku: String,
  hsn: String,
  quantity: {
    value: Number,
    unit: String,
  },
  unitPrice: {
    amount: Number,
    currency: String,
  },
  totalPrice: {
    amount: Number,
    currency: String,
  },
  description: String,
}, { _id: false });

const contactInfoSchema = new mongoose.Schema({
  name: String,
  address: String,
  country: String,
  email: String,
  phone: String,
  gstin: String,
}, { _id: false });

const freightHandlerSchema = new mongoose.Schema({
  id: String,
  name: String,
  company: String,
  address: String,
  country: String,
  email: String,
  phone: String,
  contactPerson: String,
  gstin: String,
  trackingNumber: String,
  shippingMethod: String,
  estimatedDelivery: String,
  notes: String,
}, { _id: false });

const auditLogSchema = new mongoose.Schema({
  timestamp: String,
  userId: String,
  userName: String,
  fieldChanged: String,
  oldValue: mongoose.Schema.Types.Mixed,
  newValue: mongoose.Schema.Types.Mixed,
  note: String,
}, { _id: false });

const commentSchema = new mongoose.Schema({
  id: String,
  timestamp: String,
  userId: String,
  userName: String,
  message: String,
  isInternal: Boolean,
}, { _id: false });

const timelineEventSchema = new mongoose.Schema({
  id: String,
  timestamp: String,
  event: String,
  actor: {
    userId: String,
    name: String,
    role: String,
  },
  details: String,
  status: String,
}, { _id: false });

const orderSchema = new mongoose.Schema({
  orderId: {
    type: String,
    required: true,
    unique: true,
  },
  createdBy: {
    userId: String,
    name: String,
    role: String,
  },
  customer: contactInfoSchema,
  supplier: contactInfoSchema,
  materialName: String,
  materials: [materialItemSchema],
  quantity: {
    value: Number,
    unit: String,
  },
  priceToCustomer: {
    amount: Number,
    currency: String,
  },
  priceFromSupplier: {
    amount: Number,
    currency: String,
  },
  status: {
    type: String,
    enum: [
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
      'Completed'
    ],
    default: 'PO_Received_from_Client',
  },
  documents: {
    customerPO: documentSchema,
    supplierPO: documentSchema,
    quotation: documentSchema,
    proformaInvoice: documentSchema,
    coaPreShipment: documentSchema,
    paymentProof: documentSchema,
    signedPI: documentSchema,
  },
  advancePayment: {
    transactionId: String,
    date: String,
    amount: Number,
    currency: String,
    transactionType: String,
    madeBy: {
      userId: String,
      name: String,
    },
  },
  auditLogs: [auditLogSchema],
  comments: [commentSchema],
  assignedTo: {
    userId: String,
    name: String,
    role: String,
  },
  approvalRequests: [mongoose.Schema.Types.Mixed],
  timeline: [timelineEventSchema],
  poNumber: String,
  deliveryTerms: String,
  incoterms: String,
  eta: String,
  notes: String,
  freightHandler: freightHandlerSchema,
  hsnCode: String,
  enquiryNo: String,
  upc: String,
  ean: String,
  mpn: String,
  isbn: String,
  inventoryAccount: String,
  inventoryValuationMethod: String,
  supplierPOGenerated: Boolean,
  supplierPOSent: Boolean,
  paymentDetails: {
    paymentMethod: String,
    bankDetails: String,
    paymentTerms: String,
    dueDate: String,
    amount: Number,
    currency: String,
  },
  rfid: String,
  entity: {
    type: String,
    enum: ['HRV', 'NHG'],
  },
}, {
  timestamps: true,
});

// Indexes for better query performance
orderSchema.index({ orderId: 1 });
orderSchema.index({ status: 1 });
orderSchema.index({ 'assignedTo.userId': 1 });
orderSchema.index({ 'createdBy.userId': 1 });
orderSchema.index({ entity: 1 });
orderSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Order', orderSchema);

