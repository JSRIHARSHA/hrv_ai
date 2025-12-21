import { Order, OrderStatus, MaterialItem, TimelineEvent, AuditLog, Comment } from '../types';

// All order statuses
const allStatuses: OrderStatus[] = [
  'PO_Received_from_Client',
  'Drafting_PO_for_Supplier',
  'Sent_PO_for_Approval',
  'PO_Rejected',
  'PO_Approved',
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
];

// Sample materials
const sampleMaterials: MaterialItem[][] = [
  [
    {
      id: 'mat-1',
      name: 'Active Pharmaceutical Ingredient (API) - Paracetamol',
      sku: 'API-PAR-001',
      quantity: { value: 1000, unit: 'kg' },
      unitPrice: { amount: 45.50, currency: 'USD' },
      totalPrice: { amount: 45500, currency: 'USD' },
      description: 'High-purity Paracetamol API, USP grade',
      taxRate: 18,
      taxAmount: 8190,
    },
  ],
  [
    {
      id: 'mat-2',
      name: 'Excipient - Microcrystalline Cellulose',
      sku: 'EXC-MCC-002',
      quantity: { value: 500, unit: 'kg' },
      unitPrice: { amount: 12.00, currency: 'USD' },
      totalPrice: { amount: 6000, currency: 'USD' },
      description: 'Pharmaceutical grade MCC, NF grade',
      taxRate: 18,
      taxAmount: 1080,
    },
  ],
];

// Sample customers
const sampleCustomers = [
  {
    name: 'MediPharm Solutions Inc',
    address: '789 Pharmaceutical Drive, Suite 200',
    country: 'USA',
    email: 'procurement@medipharm.com',
    phone: '+1-555-0123',
    gstin: 'US123456789',
  },
  {
    name: 'BioPharma Therapeutics',
    address: '321 Research Boulevard, Lab Complex A',
    country: 'Germany',
    email: 'procurement@biopharma.de',
    phone: '+49-30-9876-5432',
    gstin: 'DE987654321',
  },
  {
    name: 'Global Health Pharmaceuticals',
    address: '456 Medical Park, Building 5',
    country: 'UK',
    email: 'orders@globalhealth.co.uk',
    phone: '+44-20-1234-5678',
    gstin: 'GB456789123',
  },
  {
    name: 'Asia Pacific Pharma Ltd',
    address: '123 Industrial Zone, Block C',
    country: 'Singapore',
    email: 'procurement@appl.com.sg',
    phone: '+65-6123-4567',
    gstin: 'SG789123456',
  },
];

// Sample suppliers
const sampleSuppliers = [
  {
    name: 'PureChem API Manufacturing Ltd',
    address: '456 Chemical Industrial Zone, Building 15',
    country: 'India',
    email: 'sales@purechemapi.com',
    phone: '+91-22-1234-5678',
    gstin: '27AABCU9603R1ZX',
  },
  {
    name: 'Excipient Solutions GmbH',
    address: '789 Pharmaceutical Park, Building C',
    country: 'Germany',
    email: 'orders@excipientsolutions.de',
    phone: '+49-30-1234-5678',
    gstin: 'DE123456789',
  },
  {
    name: 'Pharma Ingredients Co',
    address: '321 Manufacturing Street',
    country: 'China',
    email: 'sales@pharmaingredients.cn',
    phone: '+86-10-8765-4321',
    gstin: 'CN987654321',
  },
  {
    name: 'Quality Chemicals Inc',
    address: '654 Production Avenue',
    country: 'USA',
    email: 'info@qualitychemicals.com',
    phone: '+1-555-9876',
    gstin: 'US987654321',
  },
];

// Generate a sample order for a given status
const generateOrder = (
  status: OrderStatus,
  index: number,
  orderNumber: number,
  currentUserId?: string,
  currentUserName?: string,
  currentUserRole?: 'Employee' | 'Manager' | 'Management'
): Order => {
  // Use current user if provided, otherwise use defaults
  const userId = currentUserId || 'user1';
  const userName = currentUserName || 'John Smith';
  const userRole = currentUserRole || 'Employee';
  const customerIndex = orderNumber % sampleCustomers.length;
  const supplierIndex = orderNumber % sampleSuppliers.length;
  const materialIndex = orderNumber % sampleMaterials.length;
  
  const customer = sampleCustomers[customerIndex];
  const supplier = sampleSuppliers[supplierIndex];
  const materials = sampleMaterials[materialIndex];
  
  const baseDate = new Date('2024-01-01');
  baseDate.setDate(baseDate.getDate() + orderNumber);
  const createdAt = baseDate.toISOString();
  
  const orderId = `ORD-2024-${String(orderNumber).padStart(3, '0')}`;
  const poNumber = `PO-2024-${String(orderNumber).padStart(3, '0')}`;
  
  // Calculate prices
  const totalAmount = materials.reduce((sum, mat) => sum + mat.totalPrice.amount, 0);
  const supplierTotal = totalAmount * 0.85; // Supplier price is 85% of customer price
  
  // Create timeline based on status
  const timeline: TimelineEvent[] = [
    {
      id: `timeline-${orderId}-1`,
      timestamp: createdAt,
      event: 'Order Created',
      actor: {
        userId: userId,
        name: userName,
        role: userRole,
      },
      details: 'Customer PO received and order created',
      status: 'PO_Received_from_Client',
    },
  ];
  
  // Add status-specific timeline events
  if (status !== 'PO_Received_from_Client') {
    timeline.push({
      id: `timeline-${orderId}-2`,
      timestamp: new Date(baseDate.getTime() + 3600000).toISOString(),
      event: `Status Changed to ${status}`,
      actor: {
        userId: userId,
        name: userName,
        role: userRole,
      },
      details: `Order status updated to ${status}`,
      status,
    });
  }
  
  // Create audit logs
  const auditLogs: AuditLog[] = [
    {
      timestamp: createdAt,
      userId: userId,
      userName: userName,
      fieldChanged: 'status',
      oldValue: '',
      newValue: 'PO_Received_from_Client',
      note: 'Order created from customer PO',
    },
  ];
  
  if (status !== 'PO_Received_from_Client') {
    auditLogs.push({
      timestamp: new Date(baseDate.getTime() + 3600000).toISOString(),
      userId: userId,
      userName: userName,
      fieldChanged: 'status',
      oldValue: 'PO_Received_from_Client',
      newValue: status,
      note: `Status updated to ${status}`,
    });
  }
  
  // Create comments
  const comments: Comment[] = [
    {
      id: `comment-${orderId}-1`,
      timestamp: createdAt,
      userId: userId,
      userName: userName,
      message: `Order ${orderId} created for ${customer.name}. Status: ${status}`,
      isInternal: false,
    },
  ];
  
  // Base order structure
  const order: Order = {
    orderId,
    createdAt,
    createdBy: {
      userId: userId,
      name: userName,
      role: userRole,
    },
    customer: {
      name: customer.name,
      address: customer.address,
      country: customer.country,
      email: customer.email,
      phone: customer.phone,
      gstin: customer.gstin,
      destination: 'Manufacturing Plant A - Gujarat',
    },
    supplier: {
      name: supplier.name,
      address: supplier.address,
      country: supplier.country,
      email: supplier.email,
      phone: supplier.phone,
      gstin: supplier.gstin,
      origin: 'Manufacturing Plant A - Gujarat',
    },
    materialName: materials[0].name,
    materials,
    quantity: {
      value: materials.reduce((sum, mat) => sum + mat.quantity.value, 0),
      unit: materials[0].quantity.unit,
    },
    priceToCustomer: {
      amount: totalAmount,
      currency: 'USD',
    },
    priceFromSupplier: {
      amount: supplierTotal,
      currency: 'USD',
    },
    status,
    documents: {
      customerPO: {
        id: `doc-${orderId}-customer-po`,
        filename: `customer_po_${orderId}.pdf`,
        uploadedAt: createdAt,
        uploadedBy: {
          userId: userId,
          name: userName,
        },
        fileSize: 245760,
        mimeType: 'application/pdf',
      },
    },
    auditLogs,
    comments,
    assignedTo: {
      userId: userId,
      name: userName,
      role: userRole,
      email: `${userName.toLowerCase().replace(' ', '.')}@company.com`,
    },
    approvalRequests: [],
    timeline,
    poNumber,
    deliveryTerms: 'FOB',
    incoterms: 'FOB Mumbai',
    eta: new Date(baseDate.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    notes: `Sample order for testing status: ${status}`,
    hsnCode: '3004.90.90',
    enquiryNo: `ENQ-2024-${String(orderNumber).padStart(3, '0')}`,
    entity: orderNumber % 2 === 0 ? 'HRV' : 'NHG',
    orderType: 'Direct PO',
    supplierPOGenerated: ['PO_Sent_to_Supplier', 'Proforma_Invoice_Received', 'Awaiting_COA', 'COA_Received', 'COA_Revision', 'COA_Accepted', 'Awaiting_Approval', 'Approved', 'Advance_Payment_Completed', 'Material_to_be_Dispatched', 'Material_Dispatched', 'In_Transit', 'Completed'].includes(status),
    supplierPOSent: ['PO_Sent_to_Supplier', 'Proforma_Invoice_Received', 'Awaiting_COA', 'COA_Received', 'COA_Revision', 'COA_Accepted', 'Awaiting_Approval', 'Approved', 'Advance_Payment_Completed', 'Material_to_be_Dispatched', 'Material_Dispatched', 'In_Transit', 'Completed'].includes(status),
  };
  
  // Add status-specific fields
  if (status === 'Proforma_Invoice_Received' || ['COA_Received', 'COA_Revision', 'COA_Accepted', 'Awaiting_Approval', 'Approved'].includes(status)) {
    order.documents.proformaInvoice = {
      id: `doc-${orderId}-proforma`,
      filename: `proforma_invoice_${orderId}.pdf`,
      uploadedAt: new Date(baseDate.getTime() + 2 * 24 * 60 * 60 * 1000).toISOString(),
      uploadedBy: {
        userId: 'user2',
        name: 'Sarah Johnson',
      },
      fileSize: 189440,
      mimeType: 'application/pdf',
    };
  }
  
  if (['COA_Received', 'COA_Revision', 'COA_Accepted', 'Awaiting_Approval', 'Approved'].includes(status)) {
    order.documents.coaPreShipment = {
      id: `doc-${orderId}-coa`,
      filename: `coa_${orderId}.pdf`,
      uploadedAt: new Date(baseDate.getTime() + 5 * 24 * 60 * 60 * 1000).toISOString(),
      uploadedBy: {
        userId: 'user2',
        name: 'Sarah Johnson',
      },
      fileSize: 156672,
      mimeType: 'application/pdf',
    };
  }
  
  // Add advance payment for relevant statuses
  if (['Advance_Payment_Completed', 'Material_to_be_Dispatched', 'Material_Dispatched', 'In_Transit', 'Completed'].includes(status)) {
    order.advancePayment = {
      transactionId: `TXN-${orderId}-ADV`,
      date: new Date(baseDate.getTime() + 10 * 24 * 60 * 60 * 1000).toISOString(),
      amount: totalAmount * 0.3, // 30% advance
      currency: 'USD',
      transactionType: 'Bank Transfer',
      madeBy: {
        userId: userId,
        name: userName,
      },
    };
  }
  
  // Add payment details for approved and beyond
  if (['Approved', 'Advance_Payment_Completed', 'Material_to_be_Dispatched', 'Material_Dispatched', 'In_Transit'].includes(status)) {
    order.paymentDetails = {
      paymentMethod: 'Bank Transfer',
      paymentTerms: '90 days credit from the date of GRN',
      dueDate: new Date(baseDate.getTime() + 120 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      amount: totalAmount,
      currency: 'USD',
      bankDetails: 'Account: 1234567890, IFSC: BANK0001234, Bank Name: Sample Bank',
    };
  }
  
  // Add freight handler for dispatch-related statuses
  if (['Material_to_be_Dispatched', 'Material_Dispatched', 'In_Transit', 'Completed'].includes(status)) {
    order.freightHandler = {
      id: 'fh-1',
      name: 'Blue Dart Express',
      company: 'Blue Dart Express Ltd',
      address: '123 Logistics Park, Mumbai',
      country: 'India',
      phone: '+91-9876543210',
      gstin: '27AABCU9603R1ZX',
      notes: 'Express delivery service',
    };
    order.transitType = 'Air';
  }
  
  // Add logistics sub-status for Material_to_be_Dispatched
  if (status === 'Material_to_be_Dispatched') {
    order.logisticsSubStatus = 'Dispatch_Confirmation_Sent';
  }
  
  return order;
};

// Generate all sample orders
export const generateSampleOrders = (
  currentUserId?: string,
  currentUserName?: string,
  currentUserRole?: 'Employee' | 'Manager' | 'Management'
): Order[] => {
  const orders: Order[] = [];
  let orderNumber = 1;
  
  // Generate 2 orders per status
  allStatuses.forEach((status, statusIndex) => {
    for (let i = 0; i < 2; i++) {
      const order = generateOrder(status, i, orderNumber, currentUserId, currentUserName, currentUserRole);
      orders.push(order);
      orderNumber++;
    }
  });
  
  return orders;
};

// Save orders to localStorage
export const saveSampleOrdersToLocalStorage = (): void => {
  const orders = generateSampleOrders();
  try {
    localStorage.setItem('orders_backup', JSON.stringify(orders));
    console.log(`✅ Successfully saved ${orders.length} sample orders to localStorage`);
    console.log(`   Orders per status: 2`);
    console.log(`   Total statuses: ${allStatuses.length}`);
    console.log(`   Total orders: ${orders.length}`);
  } catch (error) {
    console.error('❌ Error saving orders to localStorage:', error);
  }
};

// Load and display summary
export const displaySampleOrdersSummary = (): void => {
  const orders = generateSampleOrders();
  const statusCounts: Record<string, number> = {};
  
  orders.forEach(order => {
    statusCounts[order.status] = (statusCounts[order.status] || 0) + 1;
  });
  
  console.log('\n📊 Sample Orders Summary:');
  console.log('='.repeat(50));
  Object.entries(statusCounts).forEach(([status, count]) => {
    console.log(`  ${status}: ${count} orders`);
  });
  console.log('='.repeat(50));
  console.log(`Total: ${orders.length} orders\n`);
};

