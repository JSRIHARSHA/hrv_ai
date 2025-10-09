import { User, Order, OrderStatus, UserRole, StatusTransition, Permission } from '../types';

// Mock Users
export const mockUsers: User[] = [
  {
    userId: 'user1',
    name: 'Dr. Sarah Chen',
    email: 'sarah.chen@company.com',
    role: 'Employee',
    team: 'Business Development',
    isActive: true,
  },
  {
    userId: 'user2',
    name: 'Michael Rodriguez',
    email: 'michael.rodriguez@company.com',
    role: 'Employee',
    team: 'Procurement Team 1',
    isActive: true,
  },
  {
    userId: 'user3',
    name: 'Dr. Priya Sharma',
    email: 'priya.sharma@company.com',
    role: 'Employee',
    team: 'Procurement Team 2',
    isActive: true,
  },
  {
    userId: 'user4',
    name: 'Jennifer Kim',
    email: 'jennifer.kim@company.com',
    role: 'Employee',
    team: 'Finance & Compliance',
    isActive: true,
  },
  {
    userId: 'user5',
    name: 'David Thompson',
    email: 'david.thompson@company.com',
    role: 'Employee',
    team: 'Supply Chain Logistics',
    isActive: true,
  },
  {
    userId: 'user6',
    name: 'Dr. Robert Martinez',
    email: 'robert.martinez@company.com',
    role: 'Manager',
    team: 'Operations Management',
    isActive: true,
  },
  {
    userId: 'user7',
    name: 'Dr. Elizabeth Johnson',
    email: 'elizabeth.johnson@company.com',
    role: 'Higher_Management',
    team: 'Executive Leadership',
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
    to: 'PO_Sent_to_Supplier',
    requiredRole: 'Employee',
    description: 'Employee sends PO to supplier',
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
    roles: ['Manager', 'Higher_Management'],
  },
  {
    action: 'reassign_task',
    roles: ['Manager'],
  },
  {
    action: 'view_all_orders',
    roles: ['Manager', 'Higher_Management', 'Admin'],
  },
];

// Status Display Names
export const statusDisplayNames: Record<OrderStatus, string> = {
  PO_Received_from_Client: 'PO Received from Client',
  Drafting_PO_for_Supplier: 'Drafting PO for Supplier',
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
  Manager: 'Operations Manager',
  Higher_Management: 'Executive Leadership',
  Admin: 'System Administrator',
};

// Helper Functions
export const getStatusDisplayName = (status: OrderStatus): string => {
  return statusDisplayNames[status] || status;
};

export const getRoleDisplayName = (role: UserRole): string => {
  return roleDisplayNames[role] || role;
};

// Status color mapping for UI chips
export const getStatusColor = (
  status: OrderStatus
): 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning' => {
  switch (status) {
    case 'Completed':
      return 'success';
    case 'COA_Revision':
      return 'error';
    case 'Awaiting_COA':
    case 'Awaiting_Approval':
    case 'Material_to_be_Dispatched':
      return 'warning';
    case 'In_Transit':
    case 'Material_Dispatched':
    case 'Advance_Payment_Completed':
      return 'info';
    case 'Drafting_PO_for_Supplier':
    case 'PO_Sent_to_Supplier':
    case 'Proforma_Invoice_Received':
    case 'COA_Received':
    case 'COA_Accepted':
    case 'Approved':
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
    PO_Sent_to_Supplier: '#7C4DFF',
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
