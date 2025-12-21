import React, { useMemo } from 'react';
import {
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Box,
  Typography,
  Divider,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  Summarize,
  Inventory,
  Business,
  LocalShipping,
  Folder,
  Payment,
  Receipt,
  Warehouse,
} from '@mui/icons-material';
import { useTheme as useAppTheme } from '../contexts/ThemeContext';
import { Order } from '../types';

interface Section {
  id: string;
  label: string;
  icon: React.ReactNode;
}

interface OrderDetailSectionNavProps {
  selectedSection: string | null;
  onSectionSelect: (sectionId: string | null) => void;
  order: Order | null;
}

const DRAWER_WIDTH = 240;

const allSections: Section[] = [
  { id: 'orderSummary', label: 'Order Summary', icon: <Summarize /> },
  { id: 'itemTable', label: 'Material(s) Info', icon: <Inventory /> },
  { id: 'customerSupplierInformation', label: 'Customer & Supplier Information', icon: <Business /> },
  { id: 'freightHandlerInformation', label: 'Freight Handler Information', icon: <LocalShipping /> },
  { id: 'documents', label: 'Documents', icon: <Folder /> },
  { id: 'advancePaymentDetails', label: 'Advance Payment Details', icon: <Payment /> },
  { id: 'paymentDetails', label: 'Payment Details', icon: <Receipt /> },
  { id: 'logistics', label: 'Logistics', icon: <Warehouse /> },
];

const OrderDetailSectionNav: React.FC<OrderDetailSectionNavProps> = ({
  selectedSection,
  onSectionSelect,
  order,
}) => {
  const { mode } = useAppTheme();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  // Filter sections based on order status
  const visibleSections = useMemo(() => {
    if (!order) {
      // If no order, show all sections (fallback)
      return allSections;
    }

    return allSections.filter(section => {
      // Always visible sections
      if (['orderSummary', 'itemTable', 'customerSupplierInformation', 'freightHandlerInformation', 'documents'].includes(section.id)) {
        return true;
      }

      // Advance Payment Details - only if order has advancePayment
      if (section.id === 'advancePaymentDetails') {
        return !!order.advancePayment;
      }

      // Payment Details - only for specific statuses
      if (section.id === 'paymentDetails') {
        const status = order.status;
        return ['Approved', 'Advance_Payment_Completed', 'Material_to_be_Dispatched', 'Material_Dispatched', 'In_Transit'].includes(status);
      }

      // Logistics - visible from Material_to_be_Dispatched onwards
      if (section.id === 'logistics') {
        const status = order.status;
        const statusOrder: string[] = [
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
        const currentIndex = statusOrder.indexOf(status);
        const materialToBeDispatchedIndex = statusOrder.indexOf('Material_to_be_Dispatched');
        return currentIndex >= materialToBeDispatchedIndex && currentIndex !== -1;
      }

      return false;
    });
  }, [order]);

  return (
    <Drawer
      variant="permanent"
      anchor="left"
      sx={{
        width: DRAWER_WIDTH,
        flexShrink: 0,
        display: { xs: 'none', md: 'block' },
        '& .MuiDrawer-paper': {
          width: DRAWER_WIDTH,
          boxSizing: 'border-box',
          position: 'relative',
          height: '100%',
          borderRight: mode === 'dark' 
            ? '1px solid rgba(255,255,255,0.1)' 
            : '1px solid rgba(0,0,0,0.12)',
        },
      }}
    >
      <Box
        sx={{
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          bgcolor: mode === 'dark' ? '#111111' : '#FFFFFF', // Using --background-secondary from CSS
        }}
      >
        {/* Header */}
        <Box
          sx={{
            p: { xs: 1.5, md: 1.5 },
            px: { xs: 1.5, md: 1.5 },
            bgcolor: mode === 'dark' ? '#000000' : '#F8F9FA', // Using --background-primary from CSS
            borderBottom: mode === 'dark'
              ? '1px solid rgba(255,255,255,0.1)'
              : '1px solid rgba(0,0,0,0.08)',
          }}
        >
          <Typography
            variant="subtitle1"
            sx={{
              color: mode === 'dark' ? '#FFFFFF' : '#1a1a2e',
              fontWeight: 600,
            }}
          >
            Sections
          </Typography>
          <Typography
            variant="caption"
            sx={{
              color: mode === 'dark' ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)',
            }}
          >
            Navigate to sections
          </Typography>
        </Box>

        <Divider />

        {/* Navigation Items */}
        <Box sx={{ flex: 1, overflow: 'auto', py: 1 }}>
          <List sx={{ px: { xs: 0.5, md: 0.5 } }}>
            {/* Section Items */}
            {visibleSections.map((section) => {
              const isSelected = selectedSection === section.id;
              return (
                <ListItem key={section.id} disablePadding sx={{ mb: 0.5 }}>
                  <ListItemButton
                    onClick={() => onSectionSelect(section.id)}
                    selected={isSelected}
                    sx={{
                      borderRadius: 2,
                      minHeight: 44,
                      py: 1,
                      px: { xs: 1, md: 1.25 },
                      bgcolor: isSelected
                        ? mode === 'dark'
                          ? 'rgba(239, 114, 31,0.2)'
                          : 'rgba(239, 114, 31,0.1)'
                        : 'transparent',
                      color: isSelected
                        ? mode === 'dark' ? '#FFFFFF' : '#EF721F'
                        : mode === 'dark' ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.87)',
                      '&:hover': {
                        bgcolor: isSelected
                          ? mode === 'dark'
                            ? 'rgba(239, 114, 31,0.25)'
                            : 'rgba(239, 114, 31,0.15)'
                          : mode === 'dark'
                            ? 'rgba(255,255,255,0.08)'
                            : 'rgba(0,0,0,0.05)',
                      },
                      transition: 'all 0.2s ease-in-out',
                    }}
                  >
                    <ListItemIcon
                      sx={{
                        color: 'inherit',
                        minWidth: 40,
                        justifyContent: 'center',
                        mr: 1,
                      }}
                    >
                      {section.icon}
                    </ListItemIcon>
                    <ListItemText
                      primary={section.label}
                      primaryTypographyProps={{
                        variant: 'body2',
                        fontWeight: isSelected ? 600 : 500,
                      }}
                    />
                  </ListItemButton>
                </ListItem>
              );
            })}
          </List>
        </Box>
      </Box>
    </Drawer>
  );
};

export default OrderDetailSectionNav;

