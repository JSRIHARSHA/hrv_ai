// User and Role Types
export type UserRole = 
  | 'Employee' 
  | 'Manager' 
  | 'Higher_Management' 
  | 'Admin';

export interface User {
  userId: string;
  name: string;
  email: string;
  role: UserRole;
  team?: string;
  isActive: boolean;
}

// Order Status Types
export type OrderStatus = 
  | 'PO_Received_from_Client'
  | 'Drafting_PO_for_Supplier'
  | 'PO_Sent_to_Supplier'
  | 'Proforma_Invoice_Received'
  | 'Awaiting_COA'
  | 'COA_Received'
  | 'COA_Revision'
  | 'COA_Accepted'
  | 'Awaiting_Approval'
  | 'Approved'
  | 'Advance_Payment_Completed'
  | 'Material_to_be_Dispatched'
  | 'Material_Dispatched'
  | 'In_Transit'
  | 'Completed';

// Document Types
export interface Document {
  id: string;
  filename: string;
  uploadedAt: string;
  uploadedBy: {
    userId: string;
    name: string;
  };
  fileSize?: number;
  mimeType?: string;
  data?: string; // Base64 data URL for the document content
}

export interface Documents {
  customerPO?: Document;
  supplierPO?: Document;
  quotation?: Document;
  proformaInvoice?: Document;
  coaPreShipment?: Document;
  paymentProof?: Document;
  signedPI?: Document;
}

// Financial Information
export interface Price {
  amount: number;
  currency: string;
}

export interface Quantity {
  value: number;
  unit: string;
}

export interface AdvancePayment {
  transactionId: string;
  date: string;
  amount: number;
  currency: string;
  transactionType: string;
  madeBy: {
    userId: string;
    name: string;
  };
  paymentProof?: Document;
}

// Contact Information
export interface ContactInfo {
  name: string;
  address: string;
  country: string;
  email: string;
  phone: string;
  gstin?: string;
}

// Freight Handler Information
export interface FreightHandler {
  id: string;
  name: string;
  company: string;
  address: string;
  country: string;
  email: string;
  phone: string;
  contactPerson: string;
  gstin?: string;
  trackingNumber?: string;
  shippingMethod?: string;
  estimatedDelivery?: string;
  notes?: string;
}

// Audit and Comments
export interface AuditLog {
  timestamp: string;
  userId: string;
  userName: string;
  fieldChanged: string;
  oldValue: any;
  newValue: any;
  note?: string;
}

export interface Comment {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  message: string;
  isInternal?: boolean;
}

// Approval System
export interface ApprovalRequest {
  id: string;
  step: string;
  sentToRole: UserRole;
  status: 'Pending' | 'Approved' | 'Declined';
  requestedAt: string;
  respondedAt?: string;
  responderId?: string;
  responderName?: string;
  comment?: string;
}

// Timeline Events
export interface TimelineEvent {
  id: string;
  timestamp: string;
  event: string;
  actor: {
    userId: string;
    name: string;
    role: UserRole;
  };
  details: string;
  status?: OrderStatus;
}

// Material Items
export interface MaterialItem {
  id: string;
  name: string;
  sku?: string;
  hsn?: string;
  quantity: Quantity;
  unitPrice: Price;
  totalPrice: Price;
  description?: string;
}

// Main Order Interface
export interface Order {
  orderId: string;
  createdAt: string;
  createdBy: {
    userId: string;
    name: string;
    role: UserRole;
  };
  customer: ContactInfo;
  supplier: ContactInfo;
  materialName: string;
  materials: MaterialItem[];
  quantity: Quantity;
  priceToCustomer: Price;
  priceFromSupplier: Price;
  status: OrderStatus;
  documents: Documents;
  advancePayment?: AdvancePayment;
  auditLogs: AuditLog[];
  comments: Comment[];
  assignedTo: {
    userId: string;
    name: string;
    role: UserRole;
  };
  approvalRequests: ApprovalRequest[];
  timeline: TimelineEvent[];
  poNumber?: string;
  deliveryTerms?: string;
  incoterms?: string;
  eta?: string;
  notes?: string;
  freightHandler?: FreightHandler;
  hsnCode?: string;
  enquiryNo?: string;
  upc?: string;
  ean?: string;
  mpn?: string;
  isbn?: string;
  inventoryAccount?: string;
  inventoryValuationMethod?: string;
  supplierPOGenerated?: boolean;
  supplierPOSent?: boolean;
  paymentDetails?: {
    paymentMethod?: string;
    bankDetails?: string;
    paymentTerms?: string;
    dueDate?: string;
    amount?: number;
    currency?: string;
  };
  rfid?: string;
  entity?: 'HRV' | 'NHG';
}

// Email Templates
export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
  recipients: string[];
  cc?: string[];
  attachments?: string[];
}

// Purchase Order (for Gemini AI extraction)
export interface PurchaseOrderItem {
  materialName: string;
  materialGrade?: string | null;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface PurchaseOrder {
  poNumber?: string | null;
  issueDate?: string | null;
  customerName?: string | null;
  customerAddress?: string | null;
  customerEmail?: string | null;
  customerContact?: string | null;
  customerGstin?: string | null;
  shipmentDetails?: string | null;
  items: PurchaseOrderItem[];
  subtotal?: number | null;
  tax?: number | null;
  totalAmount?: number | null;
  currency?: string | null;
}

// PDF Generation Data
export interface PDFGenerationData {
  orderId: string;
  supplierInfo: ContactInfo;
  customerInfo: ContactInfo;
  materials: MaterialItem[];
  poNumber: string;
  date: string;
  deliveryTerms: string;
  totalAmount: Price;
  terms?: string;
}

// PDF Parsing Types
export interface ParsedDocument {
  text: string;
  metadata: {
    title?: string;
    author?: string;
    subject?: string;
    creator?: string;
    producer?: string;
    creationDate?: Date;
    modificationDate?: Date;
    pages: number;
    info?: any;
  };
  images?: string[]; // Base64 encoded images for OCR
  confidence: number;
  documentType: 'pdf' | 'docx' | 'doc' | 'image' | 'unknown';
}

export interface OCRResult {
  text: string;
  confidence: number;
  words: Array<{
    text: string;
    confidence: number;
    bbox: {
      x0: number;
      y0: number;
      x1: number;
      y1: number;
    };
  }>;
}

// Dashboard Data
export interface DashboardData {
  myTasks: Order[];
  teamTasks: Order[];
  pendingApprovals: ApprovalRequest[];
  recentActivity: TimelineEvent[];
}

// Status Transition Rules
export interface StatusTransition {
  from: OrderStatus;
  to: OrderStatus;
  requiredRole: UserRole;
  requiredDocuments?: string[];
  description: string;
}

// Permission Matrix
export interface Permission {
  action: string;
  roles: UserRole[];
  conditions?: {
    status?: OrderStatus[];
    assignedTo?: boolean;
  };
}
