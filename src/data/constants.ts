import { User, Order, OrderStatus, UserRole, StatusTransition, Permission, LogisticsSubStatus } from '../types';

// Mock Users
export const mockUsers: User[] = [
  {
    userId: 'user1',
    name: 'Test Employee 1',
    email: 'testemployee1@company.com',
    role: 'Employee',
    team: 'Business Development',
    department: 'CRM',
    isActive: true,
  },
  {
    userId: 'user2',
    name: 'Test Employee 2',
    email: 'testemployee2@company.com',
    role: 'Employee',
    team: 'Procurement Team 1',
    department: 'Finance',
    isActive: true,
  },
  {
    userId: 'user3',
    name: 'Test Employee 3',
    email: 'testemployee3@company.com',
    role: 'Employee',
    team: 'Procurement Team 2',
    department: 'Logistics',
    isActive: true,
  },
  {
    userId: 'user4',
    name: 'Test Employee 4',
    email: 'testemployee4@company.com',
    role: 'Employee',
    team: 'Finance & Compliance',
    department: 'Finance',
    isActive: true,
  },
  {
    userId: 'user5',
    name: 'Test Employee 5',
    email: 'testemployee5@company.com',
    role: 'Employee',
    team: 'Supply Chain Logistics',
    department: 'Logistics',
    isActive: true,
  },
  {
    userId: 'user6',
    name: 'Siva Nagaraju',
    email: 'siva.nagaraju@company.com',
    role: 'Manager',
    team: 'Operations Management',
    department: 'Management',
    isActive: true,
  },
  {
    userId: 'user7',
    name: 'Vedansh',
    email: 'vedansh@company.com',
    role: 'Manager',
    team: 'Operations Management',
    department: 'Management',
    isActive: true,
  },
  // Admin users
  {
    userId: 'admin001',
    name: 'Admin',
    email: 'sriharshajvs@gmail.com',
    role: 'Management',
    team: 'Executive Leadership',
    department: 'Management',
    isActive: true,
  },
  {
    userId: 'admin002',
    name: 'Admin 1',
    email: 'sriharsha@hrvpharma.com',
    role: 'Management',
    team: 'Executive Leadership',
    department: 'Management',
    isActive: true,
  },
  {
    userId: 'admin003',
    name: 'Sowjanya',
    email: 'sowjanya.kopperla@hrvpharma.com',
    role: 'Management',
    team: 'Executive Leadership',
    department: 'Management',
    isActive: true,
  },
];

// Status Transition Rules
export const statusTransitions: StatusTransition[] = [
  {
    from: 'PO_Received_from_Client',
    to: 'Drafting_PO_for_Supplier',
    requiredRole: 'Employee',
    description: 'Employee starts drafting PO for supplier',
  },
  {
    from: 'Drafting_PO_for_Supplier',
    to: 'Sent_PO_for_Approval',
    requiredRole: 'Employee',
    description: 'Employee sends PO for approval',
  },
  {
    from: 'Sent_PO_for_Approval',
    to: 'PO_Approved',
    requiredRole: 'Manager',
    description: 'Manager approves the PO',
  },
  {
    from: 'PO_Approved',
    to: 'PO_Sent_to_Supplier',
    requiredRole: 'Employee',
    description: 'Employee sends approved PO to supplier',
  },
  {
    from: 'PO_Sent_to_Supplier',
    to: 'Proforma_Invoice_Received',
    requiredRole: 'Employee',
    description: 'Supplier sends proforma invoice',
  },
  {
    from: 'Proforma_Invoice_Received',
    to: 'Awaiting_COA',
    requiredRole: 'Employee',
    description: 'Employee requests COA from supplier',
  },
  {
    from: 'Awaiting_COA',
    to: 'COA_Received',
    requiredRole: 'Employee',
    description: 'Supplier sends COA',
  },
  {
    from: 'COA_Received',
    to: 'COA_Revision',
    requiredRole: 'Employee',
    description: 'COA needs revision',
  },
  {
    from: 'COA_Received',
    to: 'COA_Accepted',
    requiredRole: 'Employee',
    description: 'Employee accepts COA',
  },
  {
    from: 'COA_Revision',
    to: 'COA_Received',
    requiredRole: 'Employee',
    description: 'Revised COA received',
  },
  {
    from: 'COA_Accepted',
    to: 'Awaiting_Approval',
    requiredRole: 'Manager',
    description: 'Manager reviews for approval',
  },
  {
    from: 'Awaiting_Approval',
    to: 'Approved',
    requiredRole: 'Manager',
    description: 'Manager approves order',
  },
  {
    from: 'Approved',
    to: 'Advance_Payment_Completed',
    requiredRole: 'Employee',
    description: 'Employee processes advance payment',
  },
  {
    from: 'Advance_Payment_Completed',
    to: 'Material_to_be_Dispatched',
    requiredRole: 'Employee',
    description: 'Employee prepares for dispatch',
  },
  {
    from: 'Material_to_be_Dispatched',
    to: 'Material_Dispatched',
    requiredRole: 'Employee',
    description: 'Material dispatched by supplier',
  },
  {
    from: 'Material_Dispatched',
    to: 'In_Transit',
    requiredRole: 'Employee',
    description: 'Material in transit',
  },
  {
    from: 'In_Transit',
    to: 'Completed',
    requiredRole: 'Employee',
    description: 'Order completed',
  },
];

// Permission Matrix
export const permissions: Permission[] = [
  {
    action: 'create_order',
    roles: ['Employee'],
  },
  {
    action: 'send_coa',
    roles: ['Employee'],
    conditions: {
      status: ['COA_Received'],
    },
  },
  {
    action: 'send_coa_awaitment',
    roles: ['Employee'],
    conditions: {
      status: ['Awaiting_COA'],
    },
  },
  {
    action: 'generate_supplier_po',
    roles: ['Employee'],
  },
  {
    action: 'send_supplier_po',
    roles: ['Employee'],
  },
  {
    action: 'send_payment_info',
    roles: ['Employee'],
  },
  {
    action: 'update_dispatch_status',
    roles: ['Employee'],
    conditions: {
      status: ['Material_to_be_Dispatched', 'Material_Dispatched', 'In_Transit'],
    },
  },
  {
    action: 'approve_request',
    roles: ['Manager', 'Management'],
  },
  {
    action: 'reassign_task',
    roles: ['Manager', 'Management'],
  },
  {
    action: 'view_all_orders',
    roles: ['Manager', 'Management'],
  },
];

// Status Display Names
export const statusDisplayNames: Record<OrderStatus, string> = {
  PO_Received_from_Client: 'PO Received from Client',
  Drafting_PO_for_Supplier: 'Drafting PO for Supplier',
  Sent_PO_for_Approval: 'Sent PO for Approval',
  PO_Rejected: 'PO Rejected',
  PO_Approved: 'PO Approved',
  PO_Sent_to_Supplier: 'PO Sent to Supplier',
  Proforma_Invoice_Received: 'Proforma Invoice Received',
  Awaiting_COA: 'Awaiting COA',
  COA_Received: 'COA Received',
  COA_Revision: 'COA Revision',
  COA_Accepted: 'COA Accepted',
  Awaiting_Approval: 'Awaiting Approval',
  Approved: 'Approved',
  Advance_Payment_Completed: 'Advance Payment Completed',
  Material_to_be_Dispatched: 'Material to be Dispatched',
  Material_Dispatched: 'Material Dispatched',
  In_Transit: 'In Transit',
  Completed: 'Completed',
};

// Role Display Names
export const roleDisplayNames: Record<UserRole, string> = {
  Employee: 'Employee',
  Manager: 'Manager',
  Management: 'Management',
  Admin: 'Admin',
};

// Logistics Sub-Status Display Names
export const logisticsSubStatusDisplayNames: Record<LogisticsSubStatus, string> = {
  Dispatch_Confirmation_Sent: 'Dispatch Confirmation Sent',
  Awaiting_Documents_from_Supplier: 'Awaiting Documents from Supplier',
  Drafting_Documents: 'Drafting Documents',
  Awaiting_Quotation_from_Freight_Handler: 'Awaiting Quotation from Freight Handler',
  Awaiting_ADC_Clearance: 'Awaiting ADC Clearance',
  ADC_Clearance_Done: 'ADC Clearance Done',
  Shipping_Bill_Filed: 'Shipping Bill Filed',
  Awaiting_Dispatch_Schedule: 'Awaiting Dispatch Schedule',
  Clearance_Completed: 'Clearance Completed',
  Received_Air_Way_Bill: 'Received Air Way Bill',
  Received_Bill_of_Lading: 'Received Bill of Lading',
  Sending_Documents_to_Customer: 'Sending Documents to Customer',
  Sent_Documents_to_Customer: 'Sent Documents to Customer',
};

// Helper Functions
export const getStatusDisplayName = (status: OrderStatus): string => {
  return statusDisplayNames[status] || status;
};

export const getRoleDisplayName = (role: UserRole): string => {
  return roleDisplayNames[role] || role;
};

export const getLogisticsSubStatusDisplayName = (subStatus: LogisticsSubStatus): string => {
  return logisticsSubStatusDisplayNames[subStatus] || subStatus;
};

// Status color mapping for UI chips
export const getStatusColor = (
  status: OrderStatus
): 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning' => {
  switch (status) {
    case 'Completed':
    case 'PO_Approved':
    case 'COA_Accepted':
    case 'Approved':
      return 'success';
    case 'COA_Revision':
    case 'PO_Rejected':
      return 'error';
    case 'Awaiting_COA':
    case 'Awaiting_Approval':
    case 'Material_to_be_Dispatched':
    case 'Sent_PO_for_Approval':
      return 'warning';
    case 'In_Transit':
    case 'Material_Dispatched':
    case 'Advance_Payment_Completed':
      return 'info';
    case 'Drafting_PO_for_Supplier':
    case 'PO_Sent_to_Supplier':
    case 'Proforma_Invoice_Received':
    case 'COA_Received':
    case 'PO_Received_from_Client':
      return 'primary';
    default:
      return 'default';
  }
};

export const canPerformAction = (
  userRole: UserRole,
  action: string,
  orderStatus?: OrderStatus,
  isAssignedToUser?: boolean
): boolean => {
  const permission = permissions.find(p => p.action === action);
  if (!permission) return false;

  if (!permission.roles.includes(userRole)) return false;

  if (permission.conditions) {
    if (permission.conditions.status && orderStatus) {
      if (!permission.conditions.status.includes(orderStatus)) return false;
    }
    if (permission.conditions.assignedTo !== undefined) {
      if (permission.conditions.assignedTo !== isAssignedToUser) return false;
    }
  }

  return true;
};

export const getAvailableStatusTransitions = (
  currentStatus: OrderStatus,
  userRole: UserRole
): StatusTransition[] => {
  return statusTransitions.filter(
    transition => 
      transition.from === currentStatus && 
      transition.requiredRole === userRole
  );
};

export const getNextStatus = (
  currentStatus: OrderStatus,
  userRole: UserRole
): OrderStatus | null => {
  const transition = statusTransitions.find(
    t => t.from === currentStatus && t.requiredRole === userRole
  );
  return transition ? transition.to : null;
};

// Helper functions for dashboard
export const getStatusCardColor = (status: OrderStatus, hover = false): string => {
  const colors: Record<OrderStatus, string> = {
    PO_Received_from_Client: '#1E3A8A',
    Drafting_PO_for_Supplier: '#1E40AF',
    Sent_PO_for_Approval: '#9333EA',
    PO_Rejected: '#EF4444',
    PO_Approved: '#A855F7',
    PO_Sent_to_Supplier: '#EF721F',
    Proforma_Invoice_Received: '#6B46C1',
    Awaiting_COA: '#F59E0B',
    COA_Received: '#D97706',
    COA_Revision: '#DC2626',
    COA_Accepted: '#059669',
    Awaiting_Approval: '#7C2D12',
    Approved: '#991B1B',
    Advance_Payment_Completed: '#0891B2',
    Material_to_be_Dispatched: '#0D9488',
    Material_Dispatched: '#047857',
    In_Transit: '#059669',
    Completed: '#16A34A',
  };
  
  const baseColor = colors[status] || '#6B7280';
  if (hover) {
    // Slightly lighter for hover effect
    return baseColor.replace(/^#/, '#80');
  }
  return baseColor;
};

export const getStatusChipLabel = (status: OrderStatus): string => {
  const labels: Record<OrderStatus, string> = {
    PO_Received_from_Client: 'New',
    Drafting_PO_for_Supplier: 'Draft',
    Sent_PO_for_Approval: 'For Approval',
    PO_Rejected: 'Rejected',
    PO_Approved: 'Approved',
    PO_Sent_to_Supplier: 'Sent',
    Proforma_Invoice_Received: 'Invoice',
    Awaiting_COA: 'COA',
    COA_Received: 'COA',
    COA_Revision: 'Revise',
    COA_Accepted: 'Accepted',
    Awaiting_Approval: 'Pending',
    Approved: 'Approved',
    Advance_Payment_Completed: 'Paid',
    Material_to_be_Dispatched: 'Ready',
    Material_Dispatched: 'Dispatched',
    In_Transit: 'Transit',
    Completed: 'Done',
  };
  
  return labels[status] || 'Unknown';
};
