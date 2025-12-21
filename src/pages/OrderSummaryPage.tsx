import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  Chip,
  Button,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  IconButton,
} from '@mui/material';
import { ArrowBack, CheckCircle, Close, AttachFile, Visibility, Download } from '@mui/icons-material';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useOrders } from '../contexts/OrderContext';
import { Order, OrderStatus } from '../types';
import { statusDisplayNames } from '../data/constants';
import AppBanner from '../components/AppBanner';
import toast from 'react-hot-toast';

// Helper function to format amounts
const formatAmount = (amount: number | null | undefined, currency: string = 'USD'): string => {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return '0.00';
  }
  if (currency === 'INR') {
    return amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  return amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const OrderSummaryPage: React.FC = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { mode } = useTheme();
  const { orders, getOrderById, updateOrderStatus, updateOrder, addTimelineEvent, addAuditLog } = useOrders();
  const [order, setOrder] = useState<Order | null>(null);
  const [rejectionDialogOpen, setRejectionDialogOpen] = useState(false);
  const [rejectionComments, setRejectionComments] = useState<string>('');
  const [viewingDocument, setViewingDocument] = useState<{ name: string; data: string } | null>(null);

  useEffect(() => {
    if (orderId) {
      const foundOrder = getOrderById(orderId);
      if (foundOrder) {
        setOrder(foundOrder);
      }
    }
  }, [orderId, getOrderById, orders]);

  const handleAcceptPO = () => {
    if (!order) return;
    // Update local state immediately for instant UI feedback
    const updatedOrder = { ...order, status: 'PO_Approved' as OrderStatus };
    setOrder(updatedOrder);
    
    updateOrderStatus(order.orderId, 'PO_Approved');
    toast.success('PO Approved successfully');
  };

  const handleRejectPO = () => {
    if (!order) return;
    // Open rejection dialog to collect comments
    setRejectionDialogOpen(true);
  };

  const handleConfirmRejection = () => {
    if (!order) return;
    // Update local state immediately for instant UI feedback
    const updatedOrder = { ...order, status: 'PO_Rejected' as OrderStatus };
    setOrder(updatedOrder);
    
    // Reject changes status to PO Rejected with comments
    updateOrderStatus(order.orderId, 'PO_Rejected', rejectionComments);
    setRejectionDialogOpen(false);
    setRejectionComments('');
    toast.error('PO Rejected');
  };

  // Handle approval of pending field changes
  const handleApproveFieldChanges = async () => {
    if (!order || !user || (user.role !== 'Management' && user.role !== 'Admin')) {
      toast.error('Only Management or Admin role users can approve field changes');
      return;
    }
    
    if (!order.pendingFieldChanges || order.pendingFieldChanges.status !== 'Pending') {
      toast.error('No pending field changes to approve');
      return;
    }
    
    try {
      // Approve the changes
      const updatedOrder = {
        ...order,
        pendingFieldChanges: {
          ...order.pendingFieldChanges,
          status: 'Approved' as const,
          approvedBy: {
            userId: user.userId,
            name: user.name,
          },
          approvedAt: new Date().toISOString(),
        },
        isLocked: false,
      };
      
      // Add timeline event
      addTimelineEvent(
        order.orderId,
        'Field Changes Approved',
        `Field changes approved by ${user.name}`,
        order.status
      );
      
      // Add audit log
      order.pendingFieldChanges.fields.forEach((field: any) => {
        addAuditLog(
          order.orderId,
          field.field,
          field.oldValue,
          field.newValue,
          `Approved by ${user.name}`
        );
      });
      
      // Update the order
      await updateOrder(order.orderId, updatedOrder);
      
      // Update local state
      setOrder(updatedOrder);
      
      toast.success('Field changes approved successfully. Order is now unlocked.');
    } catch (error) {
      console.error('Error approving field changes:', error);
      toast.error('Failed to approve field changes');
    }
  };

  // Handle rejection of pending field changes
  const handleRejectFieldChanges = async () => {
    if (!order || !user || (user.role !== 'Management' && user.role !== 'Admin')) {
      toast.error('Only Management or Admin role users can reject field changes');
      return;
    }
    
    if (!order.pendingFieldChanges || order.pendingFieldChanges.status !== 'Pending') {
      toast.error('No pending field changes to reject');
      return;
    }
    
    try {
      // Reject the changes
      const updatedOrder = {
        ...order,
        pendingFieldChanges: {
          ...order.pendingFieldChanges,
          status: 'Rejected' as const,
          rejectedBy: {
            userId: user.userId,
            name: user.name,
          },
          rejectedAt: new Date().toISOString(),
        },
        isLocked: false,
      };
      
      // Add timeline event
      addTimelineEvent(
        order.orderId,
        'Field Changes Rejected',
        `Field changes rejected by ${user.name}`,
        order.status
      );
      
      // Update the order
      await updateOrder(order.orderId, updatedOrder);
      
      // Update local state
      setOrder(updatedOrder);
      
      toast.success('Field changes rejected. Order is now unlocked.');
    } catch (error) {
      console.error('Error rejecting field changes:', error);
      toast.error('Failed to reject field changes');
    }
  };

  const getBackgroundColor = () => mode === 'dark' ? '#0F172A' : '#F8FAFC';
  const getTextColor = () => mode === 'dark' ? '#FFFFFF' : '#1A1A1A';
  const getSecondaryTextColor = () => mode === 'dark' ? '#94A3B8' : '#64748B';
  const getCardBgColor = () => mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.8)';
  const getBorderColor = () => mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';

  if (!order) {
    return (
      <Box sx={{ flexGrow: 1, bgcolor: getBackgroundColor(), minHeight: '100vh' }}>
        <AppBanner />
        <Container maxWidth="xl" sx={{ mt: 3, p: 3 }}>
          <Typography variant="h6" sx={{ color: getTextColor() }}>
            Order not found
          </Typography>
        </Container>
      </Box>
    );
  }

  // Calculate totals
  const calculateSubtotal = () => {
    if (!order.materials || order.materials.length === 0) return 0;
    return order.materials.reduce((sum, item) => {
      const amount = item.supplierTotalPrice?.amount || item.totalPrice?.amount || 0;
      return sum + amount;
    }, 0);
  };

  const calculateSupplierTotal = () => {
    if (!order.materials || order.materials.length === 0) return 0;
    return order.materials.reduce((sum, item) => {
      return sum + (item.supplierTotalPrice?.amount || 0);
    }, 0);
  };

  const calculateTaxes = () => {
    if (!order.materials || order.materials.length === 0) return { sgst: 0, cgst: 0, igst: 0 };
    
    const supplierGSTIN = order.supplier?.gstin || '';
    const isTelanganaSupplier = supplierGSTIN.startsWith('36');
    
    let totalSGST = 0;
    let totalCGST = 0;
    let totalIGST = 0;

    order.materials.forEach((item) => {
      const taxRate = (item as any).supplierTaxRate;
      if (taxRate !== undefined && taxRate !== null && taxRate !== 0) {
        const itemSubtotal = item.supplierTotalPrice?.amount || 0;
        
        if (isTelanganaSupplier) {
          const halfTaxRate = taxRate / 2;
          totalSGST += (itemSubtotal * halfTaxRate) / 100;
          totalCGST += (itemSubtotal * halfTaxRate) / 100;
        } else {
          totalIGST += (itemSubtotal * taxRate) / 100;
        }
      }
    });

    return { sgst: totalSGST, cgst: totalCGST, igst: totalIGST };
  };

  const subtotal = calculateSubtotal();
  const supplierTotal = calculateSupplierTotal();
  const taxes = calculateTaxes();
  const currency = order.materials?.[0]?.supplierUnitPrice?.currency || order.priceFromSupplier?.currency || 'USD';
  const grandTotal = subtotal + taxes.sgst + taxes.cgst + taxes.igst;

  return (
    <Box sx={{ flexGrow: 1, bgcolor: getBackgroundColor(), minHeight: '100vh' }}>
      <AppBanner />
      
      <Container maxWidth="xl" sx={{ mt: 3, mb: 3, px: { xs: 2, sm: 3, md: 4 } }}>
        <Box sx={{ mb: 3 }}>
          <Button
            startIcon={<ArrowBack />}
            onClick={() => navigate('/dashboard')}
            sx={{ 
              mb: 2,
              color: getTextColor(),
              borderColor: getBorderColor(),
              '&:hover': { borderColor: '#EF721F' },
            }}
            variant="outlined"
          >
            Back to Dashboard
          </Button>
          
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 2, mb: 2 }}>
            <Box>
              <Typography variant="h3" sx={{ color: getTextColor(), fontWeight: 700, mb: 1, fontSize: { xs: '1.5rem', sm: '2rem', md: '2.5rem' } }}>
                Order Summary - {order.orderId}
              </Typography>
              <Typography variant="h6" sx={{ color: getSecondaryTextColor(), fontSize: { xs: '0.875rem', sm: '1rem', md: '1.25rem' } }}>
                Complete Order Overview
              </Typography>
            </Box>
            
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
              <Chip
                label={statusDisplayNames[order.status] || order.status}
                sx={{
                  bgcolor: order.status === 'PO_Approved' ? '#4CAF50' : order.status === 'PO_Rejected' ? '#f44336' : '#EF721F',
                  color: '#FFFFFF',
                  fontWeight: 600,
                  fontSize: '0.875rem',
                  px: 1,
                }}
              />
              {/* Accept/Reject buttons - Only visible for Management and Admin roles when status is Sent_PO_for_Approval */}
              {(user?.role === 'Management' || user?.role === 'Admin') && order.status === 'Sent_PO_for_Approval' && (
                <>
                  <Button
                    variant="contained"
                    size="small"
                    startIcon={<CheckCircle />}
                    onClick={handleAcceptPO}
                    sx={{
                      bgcolor: '#10B981',
                      fontSize: '0.75rem',
                      px: 2,
                      py: 0.5,
                      whiteSpace: 'nowrap',
                      height: '40px',
                      '&:hover': { bgcolor: '#059669' },
                    }}
                  >
                    Accept PO
                  </Button>
                  <Button
                    variant="contained"
                    size="small"
                    startIcon={<Close />}
                    onClick={handleRejectPO}
                    sx={{
                      bgcolor: '#EF4444',
                      fontSize: '0.75rem',
                      px: 2,
                      py: 0.5,
                      whiteSpace: 'nowrap',
                      height: '40px',
                      '&:hover': { bgcolor: '#DC2626' },
                    }}
                  >
                    Reject PO
                  </Button>
                </>
              )}
              {/* Approve/Reject Field Changes buttons - Only visible for Management and Admin roles when order is locked with pending changes */}
              {order.pendingFieldChanges?.status === 'Pending' && (user?.role === 'Management' || user?.role === 'Admin') && (
                <>
                  <Button
                    variant="contained"
                    size="small"
                    startIcon={<CheckCircle />}
                    onClick={handleApproveFieldChanges}
                    sx={{
                      bgcolor: '#10B981',
                      fontSize: '0.75rem',
                      px: 2,
                      py: 0.5,
                      whiteSpace: 'nowrap',
                      height: '40px',
                      '&:hover': { bgcolor: '#059669' },
                    }}
                  >
                    Approve Changes
                  </Button>
                  <Button
                    variant="contained"
                    size="small"
                    startIcon={<Close />}
                    onClick={handleRejectFieldChanges}
                    sx={{
                      bgcolor: '#EF4444',
                      fontSize: '0.75rem',
                      px: 2,
                      py: 0.5,
                      whiteSpace: 'nowrap',
                      height: '40px',
                      '&:hover': { bgcolor: '#DC2626' },
                    }}
                  >
                    Reject Changes
                  </Button>
                </>
              )}
            </Box>
          </Box>
        </Box>

        {/* Pending Field Changes Display */}
        {order.pendingFieldChanges?.status === 'Pending' && (
          <Box sx={{ 
            mb: 3, 
            p: 2, 
            bgcolor: mode === 'dark' ? 'rgba(255, 152, 0, 0.15)' : 'rgba(255, 152, 0, 0.08)',
            border: `2px solid ${mode === 'dark' ? 'rgba(255, 152, 0, 0.5)' : 'rgba(255, 152, 0, 0.3)'}`,
            borderRadius: 2,
          }}>
            <Typography variant="h6" sx={{ color: getTextColor(), fontWeight: 600, mb: 2 }}>
              ⚠️ Pending Field Changes Awaiting Approval
            </Typography>
            <Typography variant="body2" sx={{ color: getSecondaryTextColor(), mb: 2 }}>
              The following fields have been changed and require your approval:
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              {order.pendingFieldChanges.fields.map((field: any, index: number) => (
                <Box 
                  key={index}
                  sx={{ 
                    p: 1.5, 
                    bgcolor: mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
                    borderRadius: 1,
                    border: `1px solid ${mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
                  }}
                >
                  <Typography variant="body2" sx={{ color: getTextColor(), fontWeight: 600, mb: 0.5 }}>
                    {field.field}
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
                    <Typography variant="body2" sx={{ color: getSecondaryTextColor(), fontSize: '0.875rem' }}>
                      <strong>From:</strong> {String(field.oldValue)}
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#EF721F', fontSize: '0.875rem' }}>
                      →
                    </Typography>
                    <Typography variant="body2" sx={{ color: getTextColor(), fontSize: '0.875rem', fontWeight: 600 }}>
                      <strong>To:</strong> {String(field.newValue)}
                    </Typography>
                  </Box>
                </Box>
              ))}
            </Box>
            <Typography variant="caption" sx={{ color: getSecondaryTextColor(), mt: 2, display: 'block' }}>
              Requested by: {order.pendingFieldChanges.requestedBy?.name || 'N/A'} on{' '}
              {new Date(order.pendingFieldChanges.requestedAt).toLocaleString()}
            </Typography>
          </Box>
        )}

        <Grid container spacing={3} sx={{ alignItems: 'stretch' }}>
          {/* Order Information */}
          <Grid item xs={12} md={6}>
            <Card sx={{ bgcolor: getCardBgColor(), border: `1px solid ${getBorderColor()}`, borderRadius: 2, p: 3, height: '100%', display: 'flex', flexDirection: 'column' }}>
              <Typography variant="h6" sx={{ color: getTextColor(), fontWeight: 600, mb: 2 }}>
                Order Information
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                <Box>
                  <Typography variant="body2" sx={{ color: getSecondaryTextColor(), mb: 0.5 }}>
                    Order ID
                  </Typography>
                  <Typography variant="body1" sx={{ color: getTextColor(), fontWeight: 500 }}>
                    {order.orderId}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="body2" sx={{ color: getSecondaryTextColor(), mb: 0.5 }}>
                    Created Date
                  </Typography>
                  <Typography variant="body1" sx={{ color: getTextColor(), fontWeight: 500 }}>
                    {new Date(order.createdAt).toLocaleDateString('en-US', { 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </Typography>
                </Box>
                {order.entity && (
                  <Box>
                    <Typography variant="body2" sx={{ color: getSecondaryTextColor(), mb: 0.5 }}>
                      Entity
                    </Typography>
                    <Typography variant="body1" sx={{ color: getTextColor(), fontWeight: 500 }}>
                      {order.entity}
                    </Typography>
                  </Box>
                )}
                {order.orderType && (
                  <Box>
                    <Typography variant="body2" sx={{ color: getSecondaryTextColor(), mb: 0.5 }}>
                      Order Type
                    </Typography>
                    <Typography variant="body1" sx={{ color: getTextColor(), fontWeight: 500 }}>
                      {order.orderType}
                    </Typography>
                  </Box>
                )}
                <Box>
                  <Typography variant="body2" sx={{ color: getSecondaryTextColor(), mb: 0.5 }}>
                    Created By
                  </Typography>
                  <Typography variant="body1" sx={{ color: getTextColor(), fontWeight: 500 }}>
                    {order.createdBy.name} ({order.createdBy.role})
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="body2" sx={{ color: getSecondaryTextColor(), mb: 0.5 }}>
                    Assigned To
                  </Typography>
                  <Typography variant="body1" sx={{ color: getTextColor(), fontWeight: 500 }}>
                    {order.assignedTo.name} ({order.assignedTo.role})
                  </Typography>
                </Box>
                {order.enquiryNo && (
                  <Box>
                    <Typography variant="body2" sx={{ color: getSecondaryTextColor(), mb: 0.5 }}>
                      Enquiry Number
                    </Typography>
                    <Typography variant="body1" sx={{ color: getTextColor(), fontWeight: 500 }}>
                      {order.enquiryNo}
                    </Typography>
                  </Box>
                )}
                {order.hsnCode && (
                  <Box>
                    <Typography variant="body2" sx={{ color: getSecondaryTextColor(), mb: 0.5 }}>
                      HSN Code
                    </Typography>
                    <Typography variant="body1" sx={{ color: getTextColor(), fontWeight: 500 }}>
                      {order.hsnCode}
                    </Typography>
                  </Box>
                )}
              </Box>
            </Card>
          </Grid>

          {/* Customer Information */}
          <Grid item xs={12} md={6}>
            <Card sx={{ bgcolor: getCardBgColor(), border: `1px solid ${getBorderColor()}`, borderRadius: 2, p: 3, height: '100%', display: 'flex', flexDirection: 'column' }}>
              <Typography variant="h6" sx={{ color: getTextColor(), fontWeight: 600, mb: 2 }}>
                Customer Information
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                <Box>
                  <Typography variant="body2" sx={{ color: getSecondaryTextColor(), mb: 0.5 }}>
                    Company Name
                  </Typography>
                  <Typography variant="body1" sx={{ color: getTextColor(), fontWeight: 500 }}>
                    {order.customer.name || 'N/A'}
                  </Typography>
                </Box>
                {order.customer.address && (
                  <Box>
                    <Typography variant="body2" sx={{ color: getSecondaryTextColor(), mb: 0.5 }}>
                      Address
                    </Typography>
                    <Typography variant="body1" sx={{ color: getTextColor(), fontWeight: 500 }}>
                      {order.customer.address}
                    </Typography>
                  </Box>
                )}
                {order.customer.email && (
                  <Box>
                    <Typography variant="body2" sx={{ color: getSecondaryTextColor(), mb: 0.5 }}>
                      Email
                    </Typography>
                    <Typography variant="body1" sx={{ color: getTextColor(), fontWeight: 500 }}>
                      {order.customer.email}
                    </Typography>
                  </Box>
                )}
                {order.customer.gstin && (
                  <Box>
                    <Typography variant="body2" sx={{ color: getSecondaryTextColor(), mb: 0.5 }}>
                      GSTIN
                    </Typography>
                    <Typography variant="body1" sx={{ color: getTextColor(), fontWeight: 500 }}>
                      {order.customer.gstin}
                    </Typography>
                  </Box>
                )}
                {order.customer.phone && (
                  <Box>
                    <Typography variant="body2" sx={{ color: getSecondaryTextColor(), mb: 0.5 }}>
                      Phone
                    </Typography>
                    <Typography variant="body1" sx={{ color: getTextColor(), fontWeight: 500 }}>
                      {order.customer.phone}
                    </Typography>
                  </Box>
                )}
                {order.customer.country && (
                  <Box>
                    <Typography variant="body2" sx={{ color: getSecondaryTextColor(), mb: 0.5 }}>
                      Country
                    </Typography>
                    <Typography variant="body1" sx={{ color: getTextColor(), fontWeight: 500 }}>
                      {order.customer.country}
                    </Typography>
                  </Box>
                )}
              </Box>
            </Card>
          </Grid>

          {/* Supplier Information */}
          {order.supplier && (
            <Grid item xs={12} md={6}>
              <Card sx={{ bgcolor: getCardBgColor(), border: `1px solid ${getBorderColor()}`, borderRadius: 2, p: 3, height: '100%', display: 'flex', flexDirection: 'column' }}>
                <Typography variant="h6" sx={{ color: getTextColor(), fontWeight: 600, mb: 2 }}>
                  Supplier Information
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                  <Box>
                    <Typography variant="body2" sx={{ color: getSecondaryTextColor(), mb: 0.5 }}>
                      Company Name
                    </Typography>
                    <Typography variant="body1" sx={{ color: getTextColor(), fontWeight: 500 }}>
                      {order.supplier.name || 'N/A'}
                    </Typography>
                  </Box>
                  {order.supplier.address && (
                    <Box>
                      <Typography variant="body2" sx={{ color: getSecondaryTextColor(), mb: 0.5 }}>
                        Address
                      </Typography>
                      <Typography variant="body1" sx={{ color: getTextColor(), fontWeight: 500 }}>
                        {order.supplier.address}
                      </Typography>
                    </Box>
                  )}
                  {order.supplier.email && (
                    <Box>
                      <Typography variant="body2" sx={{ color: getSecondaryTextColor(), mb: 0.5 }}>
                        Email
                      </Typography>
                      <Typography variant="body1" sx={{ color: getTextColor(), fontWeight: 500 }}>
                        {order.supplier.email}
                      </Typography>
                    </Box>
                  )}
                  {order.supplier.gstin && (
                    <Box>
                      <Typography variant="body2" sx={{ color: getSecondaryTextColor(), mb: 0.5 }}>
                        GSTIN
                      </Typography>
                      <Typography variant="body1" sx={{ color: getTextColor(), fontWeight: 500 }}>
                        {order.supplier.gstin}
                      </Typography>
                    </Box>
                  )}
                  {order.supplier.phone && (
                    <Box>
                      <Typography variant="body2" sx={{ color: getSecondaryTextColor(), mb: 0.5 }}>
                        Phone
                      </Typography>
                      <Typography variant="body1" sx={{ color: getTextColor(), fontWeight: 500 }}>
                        {order.supplier.phone}
                      </Typography>
                    </Box>
                  )}
                  {order.supplier.country && (
                    <Box>
                      <Typography variant="body2" sx={{ color: getSecondaryTextColor(), mb: 0.5 }}>
                        Country
                      </Typography>
                      <Typography variant="body1" sx={{ color: getTextColor(), fontWeight: 500 }}>
                        {order.supplier.country}
                      </Typography>
                    </Box>
                  )}
                </Box>
              </Card>
            </Grid>
          )}

          {/* Financial Summary */}
          <Grid item xs={12} md={6}>
            <Card sx={{ bgcolor: getCardBgColor(), border: `1px solid ${getBorderColor()}`, borderRadius: 2, p: 3, height: '100%', display: 'flex', flexDirection: 'column' }}>
              <Typography variant="h6" sx={{ color: getTextColor(), fontWeight: 600, mb: 2 }}>
                Financial Summary
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                {/* Customer Pricing */}
                <Box>
                  <Typography variant="body2" sx={{ color: getSecondaryTextColor(), mb: 1, fontWeight: 600 }}>
                    Customer Pricing
                  </Typography>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', ml: 2 }}>
                    <Typography variant="body2" sx={{ color: getSecondaryTextColor() }}>
                      Price to Customer
                    </Typography>
                    <Typography variant="body1" sx={{ color: getTextColor(), fontWeight: 600 }}>
                      {order.priceToCustomer.currency} {formatAmount(order.priceToCustomer.amount, order.priceToCustomer.currency)}
                    </Typography>
                  </Box>
                </Box>
                
                {/* Supplier Pricing */}
                <Box>
                  <Typography variant="body2" sx={{ color: getSecondaryTextColor(), mb: 1, fontWeight: 600 }}>
                    Supplier Pricing
                  </Typography>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', ml: 2 }}>
                    <Typography variant="body2" sx={{ color: getSecondaryTextColor() }}>
                      Price from Supplier
                    </Typography>
                    <Typography variant="body1" sx={{ color: getTextColor(), fontWeight: 600 }}>
                      {currency} {formatAmount(supplierTotal || order.priceFromSupplier?.amount || 0, currency)}
                    </Typography>
                  </Box>
                </Box>
                
                <Divider sx={{ my: 1 }} />
                
                {/* Supplier View Totals */}
                <Box>
                  <Typography variant="body2" sx={{ color: getSecondaryTextColor(), mb: 1, fontWeight: 600 }}>
                    Supplier View Totals
                  </Typography>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', ml: 2 }}>
                    <Typography variant="body2" sx={{ color: getSecondaryTextColor() }}>
                      Subtotal
                    </Typography>
                    <Typography variant="body1" sx={{ color: getTextColor(), fontWeight: 600 }}>
                      {currency} {formatAmount(subtotal, currency)}
                    </Typography>
                  </Box>
                  {taxes.sgst > 0 && (
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', ml: 2 }}>
                      <Typography variant="body2" sx={{ color: getSecondaryTextColor() }}>
                        SGST
                      </Typography>
                      <Typography variant="body1" sx={{ color: getTextColor(), fontWeight: 600 }}>
                        {currency} {formatAmount(taxes.sgst, currency)}
                      </Typography>
                    </Box>
                  )}
                  {taxes.cgst > 0 && (
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', ml: 2 }}>
                      <Typography variant="body2" sx={{ color: getSecondaryTextColor() }}>
                        CGST
                      </Typography>
                      <Typography variant="body1" sx={{ color: getTextColor(), fontWeight: 600 }}>
                        {currency} {formatAmount(taxes.cgst, currency)}
                      </Typography>
                    </Box>
                  )}
                  {taxes.igst > 0 && (
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', ml: 2 }}>
                      <Typography variant="body2" sx={{ color: getSecondaryTextColor() }}>
                        IGST
                      </Typography>
                      <Typography variant="body1" sx={{ color: getTextColor(), fontWeight: 600 }}>
                        {currency} {formatAmount(taxes.igst, currency)}
                      </Typography>
                    </Box>
                  )}
                  {order.adjustment !== undefined && order.adjustment !== 0 && (
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', ml: 2 }}>
                      <Typography variant="body2" sx={{ color: getSecondaryTextColor() }}>
                        Adjustment
                      </Typography>
                      <Typography variant="body1" sx={{ color: getTextColor(), fontWeight: 600 }}>
                        {currency} {formatAmount(order.adjustment, currency)}
                      </Typography>
                    </Box>
                  )}
                  {order.discount && (
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', ml: 2 }}>
                      <Typography variant="body2" sx={{ color: getSecondaryTextColor() }}>
                        Discount ({order.discount.type === 'percentage' ? `${order.discount.value}%` : 'Fixed'})
                      </Typography>
                      <Typography variant="body1" sx={{ color: getTextColor(), fontWeight: 600 }}>
                        {currency} {formatAmount(order.discount.amount, currency)}
                      </Typography>
                    </Box>
                  )}
                </Box>
                
                <Divider sx={{ my: 1 }} />
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body1" sx={{ color: getTextColor(), fontWeight: 700 }}>
                    Grand Total
                  </Typography>
                  <Typography variant="h6" sx={{ color: '#EF721F', fontWeight: 700 }}>
                    {currency} {formatAmount(grandTotal, currency)}
                  </Typography>
                </Box>
              </Box>
            </Card>
          </Grid>

          {/* Delivery & Logistics Information */}
          {(order.deliveryTerms || order.incoterms || order.eta || order.transitType || order.freightHandler) && (
            <Grid item xs={12} md={6}>
              <Card sx={{ bgcolor: getCardBgColor(), border: `1px solid ${getBorderColor()}`, borderRadius: 2, p: 3, height: '100%', display: 'flex', flexDirection: 'column' }}>
                <Typography variant="h6" sx={{ color: getTextColor(), fontWeight: 600, mb: 2 }}>
                  Delivery & Logistics
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                  {order.deliveryTerms && (
                    <Box>
                      <Typography variant="body2" sx={{ color: getSecondaryTextColor(), mb: 0.5 }}>
                        Delivery Terms
                      </Typography>
                      <Typography variant="body1" sx={{ color: getTextColor(), fontWeight: 500 }}>
                        {order.deliveryTerms}
                      </Typography>
                    </Box>
                  )}
                  {order.incoterms && (
                    <Box>
                      <Typography variant="body2" sx={{ color: getSecondaryTextColor(), mb: 0.5 }}>
                        Incoterms
                      </Typography>
                      <Typography variant="body1" sx={{ color: getTextColor(), fontWeight: 500 }}>
                        {order.incoterms}
                      </Typography>
                    </Box>
                  )}
                  {order.eta && (
                    <Box>
                      <Typography variant="body2" sx={{ color: getSecondaryTextColor(), mb: 0.5 }}>
                        ETA (Estimated Time of Arrival)
                      </Typography>
                      <Typography variant="body1" sx={{ color: getTextColor(), fontWeight: 500 }}>
                        {order.eta}
                      </Typography>
                    </Box>
                  )}
                  {order.transitType && (
                    <Box>
                      <Typography variant="body2" sx={{ color: getSecondaryTextColor(), mb: 0.5 }}>
                        Transit Type
                      </Typography>
                      <Typography variant="body1" sx={{ color: getTextColor(), fontWeight: 500 }}>
                        {order.transitType}
                      </Typography>
                    </Box>
                  )}
                  {order.freightHandler && (
                    <Box>
                      <Typography variant="body2" sx={{ color: getSecondaryTextColor(), mb: 0.5 }}>
                        Freight Handler
                      </Typography>
                      <Typography variant="body1" sx={{ color: getTextColor(), fontWeight: 500 }}>
                        {order.freightHandler.name}
                      </Typography>
                      {order.freightHandler.address && (
                        <Typography variant="body2" sx={{ color: getSecondaryTextColor(), mt: 0.5 }}>
                          {order.freightHandler.address}
                        </Typography>
                      )}
                      {order.freightHandler.gstin && (
                        <Typography variant="body2" sx={{ color: getSecondaryTextColor(), mt: 0.5 }}>
                          GSTIN: {order.freightHandler.gstin}
                        </Typography>
                      )}
                    </Box>
                  )}
                </Box>
              </Card>
            </Grid>
          )}

          {/* Payment Details */}
          {order.paymentDetails && (
            <Grid item xs={12} md={6}>
              <Card sx={{ bgcolor: getCardBgColor(), border: `1px solid ${getBorderColor()}`, borderRadius: 2, p: 3, height: '100%', display: 'flex', flexDirection: 'column' }}>
                <Typography variant="h6" sx={{ color: getTextColor(), fontWeight: 600, mb: 2 }}>
                  Payment Details
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                  {order.paymentDetails.paymentMethod && (
                    <Box>
                      <Typography variant="body2" sx={{ color: getSecondaryTextColor(), mb: 0.5 }}>
                        Payment Method
                      </Typography>
                      <Typography variant="body1" sx={{ color: getTextColor(), fontWeight: 500 }}>
                        {order.paymentDetails.paymentMethod}
                      </Typography>
                    </Box>
                  )}
                  {order.paymentDetails.paymentTerms && (
                    <Box>
                      <Typography variant="body2" sx={{ color: getSecondaryTextColor(), mb: 0.5 }}>
                        Payment Terms
                      </Typography>
                      <Typography variant="body1" sx={{ color: getTextColor(), fontWeight: 500 }}>
                        {order.paymentDetails.paymentTerms}
                      </Typography>
                    </Box>
                  )}
                  {order.paymentDetails.dueDate && (
                    <Box>
                      <Typography variant="body2" sx={{ color: getSecondaryTextColor(), mb: 0.5 }}>
                        Due Date
                      </Typography>
                      <Typography variant="body1" sx={{ color: getTextColor(), fontWeight: 500 }}>
                        {order.paymentDetails.dueDate}
                      </Typography>
                    </Box>
                  )}
                  {order.paymentDetails.amount !== undefined && (
                    <Box>
                      <Typography variant="body2" sx={{ color: getSecondaryTextColor(), mb: 0.5 }}>
                        Payment Amount
                      </Typography>
                      <Typography variant="body1" sx={{ color: getTextColor(), fontWeight: 500 }}>
                        {order.paymentDetails.currency || 'USD'} {formatAmount(order.paymentDetails.amount, order.paymentDetails.currency || 'USD')}
                      </Typography>
                    </Box>
                  )}
                  {order.paymentDetails.bankDetails && (
                    <Box>
                      <Typography variant="body2" sx={{ color: getSecondaryTextColor(), mb: 0.5 }}>
                        Bank Details
                      </Typography>
                      <Typography variant="body1" sx={{ color: getTextColor(), fontWeight: 500 }}>
                        {order.paymentDetails.bankDetails}
                      </Typography>
                    </Box>
                  )}
                </Box>
              </Card>
            </Grid>
          )}

          {/* Advance Payment */}
          {order.advancePayment && (
            <Grid item xs={12} md={6}>
              <Card sx={{ bgcolor: getCardBgColor(), border: `1px solid ${getBorderColor()}`, borderRadius: 2, p: 3, height: '100%', display: 'flex', flexDirection: 'column' }}>
                <Typography variant="h6" sx={{ color: getTextColor(), fontWeight: 600, mb: 2 }}>
                  Advance Payment
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                  <Box>
                    <Typography variant="body2" sx={{ color: getSecondaryTextColor(), mb: 0.5 }}>
                      Amount
                    </Typography>
                    <Typography variant="body1" sx={{ color: getTextColor(), fontWeight: 500 }}>
                      {order.advancePayment.currency || 'USD'} {formatAmount(order.advancePayment.amount, order.advancePayment.currency || 'USD')}
                    </Typography>
                  </Box>
                  {order.advancePayment.date && (
                    <Box>
                      <Typography variant="body2" sx={{ color: getSecondaryTextColor(), mb: 0.5 }}>
                        Payment Date
                      </Typography>
                      <Typography variant="body1" sx={{ color: getTextColor(), fontWeight: 500 }}>
                        {order.advancePayment.date}
                      </Typography>
                    </Box>
                  )}
                  {order.advancePayment.transactionType && (
                    <Box>
                      <Typography variant="body2" sx={{ color: getSecondaryTextColor(), mb: 0.5 }}>
                        Transaction Type
                      </Typography>
                      <Typography variant="body1" sx={{ color: getTextColor(), fontWeight: 500 }}>
                        {order.advancePayment.transactionType}
                      </Typography>
                    </Box>
                  )}
                  {order.advancePayment.transactionId && (
                    <Box>
                      <Typography variant="body2" sx={{ color: getSecondaryTextColor(), mb: 0.5 }}>
                        Transaction ID
                      </Typography>
                      <Typography variant="body1" sx={{ color: getTextColor(), fontWeight: 500 }}>
                        {order.advancePayment.transactionId}
                      </Typography>
                    </Box>
                  )}
                  {order.advancePayment.madeBy && (
                    <Box>
                      <Typography variant="body2" sx={{ color: getSecondaryTextColor(), mb: 0.5 }}>
                        Made By
                      </Typography>
                      <Typography variant="body1" sx={{ color: getTextColor(), fontWeight: 500 }}>
                        {order.advancePayment.madeBy.name}
                      </Typography>
                    </Box>
                  )}
                </Box>
              </Card>
            </Grid>
          )}

          {/* Additional Order Details */}
          {(order.upc || order.ean || order.mpn || order.isbn || order.rfid || order.inventoryAccount) && (
            <Grid item xs={12} md={6}>
              <Card sx={{ bgcolor: getCardBgColor(), border: `1px solid ${getBorderColor()}`, borderRadius: 2, p: 3, height: '100%', display: 'flex', flexDirection: 'column' }}>
                <Typography variant="h6" sx={{ color: getTextColor(), fontWeight: 600, mb: 2 }}>
                  Additional Details
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                  {order.upc && (
                    <Box>
                      <Typography variant="body2" sx={{ color: getSecondaryTextColor(), mb: 0.5 }}>
                        UPC
                      </Typography>
                      <Typography variant="body1" sx={{ color: getTextColor(), fontWeight: 500 }}>
                        {order.upc}
                      </Typography>
                    </Box>
                  )}
                  {order.ean && (
                    <Box>
                      <Typography variant="body2" sx={{ color: getSecondaryTextColor(), mb: 0.5 }}>
                        EAN
                      </Typography>
                      <Typography variant="body1" sx={{ color: getTextColor(), fontWeight: 500 }}>
                        {order.ean}
                      </Typography>
                    </Box>
                  )}
                  {order.mpn && (
                    <Box>
                      <Typography variant="body2" sx={{ color: getSecondaryTextColor(), mb: 0.5 }}>
                        MPN
                      </Typography>
                      <Typography variant="body1" sx={{ color: getTextColor(), fontWeight: 500 }}>
                        {order.mpn}
                      </Typography>
                    </Box>
                  )}
                  {order.isbn && (
                    <Box>
                      <Typography variant="body2" sx={{ color: getSecondaryTextColor(), mb: 0.5 }}>
                        ISBN
                      </Typography>
                      <Typography variant="body1" sx={{ color: getTextColor(), fontWeight: 500 }}>
                        {order.isbn}
                      </Typography>
                    </Box>
                  )}
                  {order.rfid && (
                    <Box>
                      <Typography variant="body2" sx={{ color: getSecondaryTextColor(), mb: 0.5 }}>
                        RFID
                      </Typography>
                      <Typography variant="body1" sx={{ color: getTextColor(), fontWeight: 500 }}>
                        {order.rfid}
                      </Typography>
                    </Box>
                  )}
                  {order.inventoryAccount && (
                    <Box>
                      <Typography variant="body2" sx={{ color: getSecondaryTextColor(), mb: 0.5 }}>
                        Inventory Account
                      </Typography>
                      <Typography variant="body1" sx={{ color: getTextColor(), fontWeight: 500 }}>
                        {order.inventoryAccount}
                      </Typography>
                    </Box>
                  )}
                  {order.inventoryValuationMethod && (
                    <Box>
                      <Typography variant="body2" sx={{ color: getSecondaryTextColor(), mb: 0.5 }}>
                        Inventory Valuation Method
                      </Typography>
                      <Typography variant="body1" sx={{ color: getTextColor(), fontWeight: 500 }}>
                        {order.inventoryValuationMethod}
                      </Typography>
                    </Box>
                  )}
                </Box>
              </Card>
            </Grid>
          )}

          {/* Logistics Sub Status */}
          {order.logisticsSubStatus && (
            <Grid item xs={12} md={6}>
              <Card sx={{ bgcolor: getCardBgColor(), border: `1px solid ${getBorderColor()}`, borderRadius: 2, p: 3, height: '100%', display: 'flex', flexDirection: 'column' }}>
                <Typography variant="h6" sx={{ color: getTextColor(), fontWeight: 600, mb: 2 }}>
                  Logistics Status
                </Typography>
                <Box>
                  <Chip
                    label={order.logisticsSubStatus.replace(/_/g, ' ')}
                    size="small"
                    sx={{
                      bgcolor: '#EF721F',
                      color: '#FFFFFF',
                      fontWeight: 600,
                    }}
                  />
                </Box>
              </Card>
            </Grid>
          )}

          {/* Notes */}
          {order.notes && (
            <Grid item xs={12}>
              <Card sx={{ bgcolor: getCardBgColor(), border: `1px solid ${getBorderColor()}`, borderRadius: 2, p: 3 }}>
                <Typography variant="h6" sx={{ color: getTextColor(), fontWeight: 600, mb: 2 }}>
                  Notes
                </Typography>
                <Typography variant="body1" sx={{ color: getTextColor(), whiteSpace: 'pre-wrap' }}>
                  {order.notes}
                </Typography>
              </Card>
            </Grid>
          )}

          {/* Materials Summary */}
          <Grid item xs={12}>
            <Card sx={{ bgcolor: getCardBgColor(), border: `1px solid ${getBorderColor()}`, borderRadius: 2, p: 3 }}>
              <Typography variant="h6" sx={{ color: getTextColor(), fontWeight: 600, mb: 2 }}>
                Materials Summary
              </Typography>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ color: getTextColor(), fontWeight: 600, borderBottom: `1px solid ${getBorderColor()}` }}>
                        Item Name
                      </TableCell>
                      <TableCell sx={{ color: getTextColor(), fontWeight: 600, borderBottom: `1px solid ${getBorderColor()}` }}>
                        Description
                      </TableCell>
                      <TableCell sx={{ color: getTextColor(), fontWeight: 600, borderBottom: `1px solid ${getBorderColor()}` }}>
                        Quantity
                      </TableCell>
                      <TableCell sx={{ color: getTextColor(), fontWeight: 600, borderBottom: `1px solid ${getBorderColor()}` }}>
                        Customer Rate
                      </TableCell>
                      <TableCell sx={{ color: getTextColor(), fontWeight: 600, borderBottom: `1px solid ${getBorderColor()}` }}>
                        Customer Amount
                      </TableCell>
                      <TableCell sx={{ color: getTextColor(), fontWeight: 600, borderBottom: `1px solid ${getBorderColor()}` }}>
                        Supplier Rate
                      </TableCell>
                      <TableCell sx={{ color: getTextColor(), fontWeight: 600, borderBottom: `1px solid ${getBorderColor()}` }}>
                        Supplier Amount
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {order.materials && order.materials.length > 0 ? (
                      order.materials.map((item) => {
                        const customerCurrency = item.unitPrice?.currency || 'USD';
                        const supplierCurrency = item.supplierUnitPrice?.currency || item.unitPrice?.currency || 'USD';
                        return (
                          <TableRow key={item.id}>
                            <TableCell sx={{ color: getTextColor(), borderBottom: `1px solid ${getBorderColor()}` }}>
                              {item.name || 'N/A'}
                            </TableCell>
                            <TableCell sx={{ color: getTextColor(), borderBottom: `1px solid ${getBorderColor()}` }}>
                              {item.itemDescription || item.description || 'N/A'}
                            </TableCell>
                            <TableCell sx={{ color: getTextColor(), borderBottom: `1px solid ${getBorderColor()}` }}>
                              {item.quantity.value} {item.quantity.unit}
                            </TableCell>
                            <TableCell sx={{ color: getTextColor(), borderBottom: `1px solid ${getBorderColor()}` }}>
                              {customerCurrency} {formatAmount(item.unitPrice?.amount || 0, customerCurrency)}
                            </TableCell>
                            <TableCell sx={{ color: getTextColor(), borderBottom: `1px solid ${getBorderColor()}` }}>
                              {customerCurrency} {formatAmount(item.totalPrice?.amount || 0, customerCurrency)}
                            </TableCell>
                            <TableCell sx={{ color: getTextColor(), borderBottom: `1px solid ${getBorderColor()}` }}>
                              {supplierCurrency} {formatAmount(item.supplierUnitPrice?.amount || 0, supplierCurrency)}
                            </TableCell>
                            <TableCell sx={{ color: getTextColor(), borderBottom: `1px solid ${getBorderColor()}` }}>
                              {supplierCurrency} {formatAmount(item.supplierTotalPrice?.amount || 0, supplierCurrency)}
                            </TableCell>
                          </TableRow>
                        );
                      })
                    ) : (
                      <TableRow>
                        <TableCell colSpan={7} sx={{ color: getSecondaryTextColor(), textAlign: 'center', borderBottom: `1px solid ${getBorderColor()}` }}>
                          No materials found
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </Card>
          </Grid>

          {/* Timeline Summary */}
          {order.timeline && order.timeline.length > 0 && (
            <Grid item xs={12}>
              <Card sx={{ bgcolor: getCardBgColor(), border: `1px solid ${getBorderColor()}`, borderRadius: 2, p: 3 }}>
                <Typography variant="h6" sx={{ color: getTextColor(), fontWeight: 600, mb: 2 }}>
                  Status Timeline
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                  {order.timeline.slice(-5).reverse().map((event) => (
                    <Box key={event.id} sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
                      <Box sx={{ minWidth: 120 }}>
                        <Typography variant="body2" sx={{ color: getSecondaryTextColor() }}>
                          {new Date(event.timestamp).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </Typography>
                      </Box>
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="body1" sx={{ color: getTextColor(), fontWeight: 500, mb: 0.5 }}>
                          {event.event}
                        </Typography>
                        <Typography variant="body2" sx={{ color: getSecondaryTextColor() }}>
                          {event.details}
                        </Typography>
                        <Typography variant="caption" sx={{ color: getSecondaryTextColor(), mt: 0.5, display: 'block' }}>
                          by {event.actor.name} ({event.actor.role})
                        </Typography>
                      </Box>
                    </Box>
                  ))}
                </Box>
              </Card>
            </Grid>
          )}

          {/* Documents Section */}
          <Grid item xs={12}>
            <Card sx={{ bgcolor: getCardBgColor(), border: `1px solid ${getBorderColor()}`, borderRadius: 2, p: 3 }}>
              <Typography variant="h6" sx={{ color: getTextColor(), fontWeight: 600, mb: 2 }}>
                Documents
              </Typography>
              {order.documents && Object.keys(order.documents).length > 0 ? (
                <Grid container spacing={2}>
                  {Object.entries(order.documents).map(([docType, doc]) => {
                    if (!doc) return null;
                    const formatDate = (dateString: string) => {
                      return new Date(dateString).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      });
                    };
                    return (
                      <Grid item xs={12} sm={6} md={4} key={docType}>
                        <Card sx={{ 
                          bgcolor: mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.8)', 
                          border: '1px solid rgba(255,255,255,0.1)',
                          borderRadius: 2,
                        }}>
                          <CardContent>
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                <AttachFile sx={{ mr: 1, color: '#EF721F' }} />
                                <Typography variant="subtitle2" sx={{ color: getTextColor(), fontWeight: 600 }}>
                                  {docType.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                                </Typography>
                              </Box>
                            </Box>
                            <Typography variant="body2" sx={{ color: getSecondaryTextColor(), mb: 1 }}>
                              {doc.filename}
                            </Typography>
                            <Typography variant="caption" sx={{ color: getSecondaryTextColor(), display: 'block', mb: 1 }}>
                              Uploaded: {formatDate(doc.uploadedAt)}
                            </Typography>
                            <Typography variant="caption" sx={{ color: getSecondaryTextColor(), display: 'block', mb: 1 }}>
                              By: {doc.uploadedBy.name}
                            </Typography>
                            <Box sx={{ mt: 1, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                              <Button 
                                size="small" 
                                startIcon={<Visibility />}
                                onClick={() => {
                                  if (doc.data) {
                                    setViewingDocument({ name: doc.filename, data: doc.data });
                                  } else {
                                    toast.error('Document preview not available. Document data is missing.');
                                  }
                                }}
                                sx={{ 
                                  color: '#EF721F',
                                  '&:hover': { bgcolor: 'rgba(239, 114, 31, 0.1)' }
                                }}
                              >
                                Preview
                              </Button>
                              <Button 
                                size="small" 
                                startIcon={<Download />}
                                onClick={() => {
                                  if (doc.data) {
                                    const downloadLink = document.createElement('a');
                                    downloadLink.href = doc.data;
                                    downloadLink.download = doc.filename;
                                    downloadLink.style.display = 'none';
                                    document.body.appendChild(downloadLink);
                                    downloadLink.click();
                                    document.body.removeChild(downloadLink);
                                    toast.success(`${doc.filename} downloaded successfully`);
                                  } else {
                                    toast.error('Document data not available for download');
                                  }
                                }}
                                sx={{ 
                                  color: '#EF721F',
                                  '&:hover': { bgcolor: 'rgba(239, 114, 31, 0.1)' }
                                }}
                              >
                                Download
                              </Button>
                            </Box>
                          </CardContent>
                        </Card>
                      </Grid>
                    );
                  })}
                </Grid>
              ) : (
                <Typography variant="body2" sx={{ color: getSecondaryTextColor(), textAlign: 'center', py: 3 }}>
                  No documents attached to this order
                </Typography>
              )}
            </Card>
          </Grid>

          {/* Comments Section */}
          {order.comments && order.comments.length > 0 && (
            <Grid item xs={12}>
              <Card sx={{ bgcolor: getCardBgColor(), border: `1px solid ${getBorderColor()}`, borderRadius: 2, p: 3 }}>
                <Typography variant="h6" sx={{ color: getTextColor(), fontWeight: 600, mb: 2 }}>
                  Comments ({order.comments.length})
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {order.comments.map((comment) => (
                    <Box key={comment.id} sx={{ 
                      p: 2, 
                      bgcolor: mode === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
                      borderRadius: 1,
                      borderLeft: `3px solid #EF721F`
                    }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                        <Box>
                          <Typography variant="body1" sx={{ color: getTextColor(), fontWeight: 600 }}>
                            {comment.userName}
                          </Typography>
                          <Typography variant="caption" sx={{ color: getSecondaryTextColor() }}>
                            {new Date(comment.timestamp).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                            {comment.isInternal && ' • Internal'}
                          </Typography>
                        </Box>
                      </Box>
                      <Typography variant="body2" sx={{ color: getTextColor(), mt: 1, whiteSpace: 'pre-wrap' }}>
                        {comment.message}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              </Card>
            </Grid>
          )}

          {/* Audit Logs Section */}
          {order.auditLogs && order.auditLogs.length > 0 && (
            <Grid item xs={12}>
              <Card sx={{ bgcolor: getCardBgColor(), border: `1px solid ${getBorderColor()}`, borderRadius: 2, p: 3 }}>
                <Typography variant="h6" sx={{ color: getTextColor(), fontWeight: 600, mb: 2 }}>
                  Audit Logs ({order.auditLogs.length})
                </Typography>
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ color: getTextColor(), fontWeight: 600, borderBottom: `1px solid ${getBorderColor()}` }}>
                          Timestamp
                        </TableCell>
                        <TableCell sx={{ color: getTextColor(), fontWeight: 600, borderBottom: `1px solid ${getBorderColor()}` }}>
                          Action
                        </TableCell>
                        <TableCell sx={{ color: getTextColor(), fontWeight: 600, borderBottom: `1px solid ${getBorderColor()}` }}>
                          User
                        </TableCell>
                        <TableCell sx={{ color: getTextColor(), fontWeight: 600, borderBottom: `1px solid ${getBorderColor()}` }}>
                          Details
                        </TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {order.auditLogs.slice(-20).reverse().map((log, index) => (
                        <TableRow key={`${log.timestamp}-${log.userId}-${index}`}>
                          <TableCell sx={{ color: getTextColor(), borderBottom: `1px solid ${getBorderColor()}` }}>
                            {new Date(log.timestamp).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </TableCell>
                          <TableCell sx={{ color: getTextColor(), borderBottom: `1px solid ${getBorderColor()}` }}>
                            {log.fieldChanged || 'N/A'}
                          </TableCell>
                          <TableCell sx={{ color: getTextColor(), borderBottom: `1px solid ${getBorderColor()}` }}>
                            {log.userName}
                          </TableCell>
                          <TableCell sx={{ color: getSecondaryTextColor(), borderBottom: `1px solid ${getBorderColor()}` }}>
                            {log.note || (log.oldValue !== undefined && log.newValue !== undefined 
                              ? `Changed from "${log.oldValue}" to "${log.newValue}"`
                              : 'N/A')}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Card>
            </Grid>
          )}
        </Grid>
      </Container>

      {/* Rejection Dialog */}
      <Dialog
        open={rejectionDialogOpen}
        onClose={() => {
          setRejectionDialogOpen(false);
          setRejectionComments('');
        }}
        PaperProps={{
          sx: {
            bgcolor: mode === 'dark' ? '#1A202C' : '#FFFFFF',
            color: getTextColor(),
          }
        }}
      >
        <DialogTitle sx={{ color: getTextColor() }}>
          Reject PO
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ color: getSecondaryTextColor(), mb: 2 }}>
            Please provide a reason for rejecting this PO:
          </Typography>
          <TextField
            autoFocus
            fullWidth
            multiline
            rows={4}
            value={rejectionComments}
            onChange={(e) => setRejectionComments(e.target.value)}
            placeholder="Enter rejection reason..."
            variant="outlined"
            sx={{
              '& .MuiOutlinedInput-root': {
                backgroundColor: mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.9)',
                color: getTextColor(),
                '& fieldset': { borderColor: getBorderColor() },
                '&:hover fieldset': { borderColor: '#EF721F' },
                '&.Mui-focused fieldset': { borderColor: '#EF721F' },
              },
              '& .MuiInputBase-input': { color: getTextColor() },
            }}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button
            onClick={() => {
              setRejectionDialogOpen(false);
              setRejectionComments('');
            }}
            sx={{ color: getTextColor() }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirmRejection}
            variant="contained"
            disabled={!rejectionComments.trim()}
            sx={{
              bgcolor: '#EF4444',
              '&:hover': { bgcolor: '#DC2626' },
              '&:disabled': { bgcolor: 'rgba(239, 68, 68, 0.5)' },
            }}
          >
            Confirm Rejection
          </Button>
        </DialogActions>
      </Dialog>

      {/* Document Viewer Dialog */}
      <Dialog
        fullWidth
        maxWidth="lg"
        open={viewingDocument !== null} 
        onClose={() => setViewingDocument(null)} 
        PaperProps={{
          sx: {
            bgcolor: mode === 'dark' ? '#1A202C' : '#FFFFFF',
            height: '90vh',
            display: 'flex',
            flexDirection: 'column',
          }
        }}
      >
        <DialogTitle sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          borderBottom: `1px solid ${getBorderColor()}`,
          color: getTextColor()
        }}>
          <Typography variant="h6" sx={{ color: getTextColor() }}>
            {viewingDocument?.name || 'Document Viewer'}
          </Typography>
          <IconButton
            onClick={() => setViewingDocument(null)}
            sx={{ color: getTextColor() }}
          >
            <Close />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ p: 0, height: '100%', display: 'flex', flexDirection: 'column', flex: 1 }}>
          {viewingDocument && viewingDocument.data && (
            <iframe
              src={viewingDocument.data}
              width="100%"
              style={{ border: 'none', flex: 1, minHeight: 0 }}
              title={viewingDocument.name}
            />
          )}
          {viewingDocument && !viewingDocument.data && (
            <Box sx={{ p: 4, textAlign: 'center' }}>
              <Typography variant="body1" sx={{ color: getSecondaryTextColor() }}>
                Document preview not available. The document data is missing.
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ borderTop: `1px solid ${getBorderColor()}`, p: 2 }}>
          {viewingDocument && viewingDocument.data && (
            <Button
              variant="contained"
              startIcon={<Download />}
              onClick={() => {
                if (viewingDocument.data) {
                  const downloadLink = document.createElement('a');
                  downloadLink.href = viewingDocument.data;
                  downloadLink.download = viewingDocument.name;
                  downloadLink.style.display = 'none';
                  document.body.appendChild(downloadLink);
                  downloadLink.click();
                  document.body.removeChild(downloadLink);
                  toast.success(`${viewingDocument.name} downloaded successfully`);
                }
              }}
              sx={{
                bgcolor: '#EF721F',
                '&:hover': { bgcolor: '#6A3DD8' },
              }}
            >
              Download
            </Button>
          )}
          <Button 
            onClick={() => setViewingDocument(null)}
            sx={{ color: getTextColor() }}
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default OrderSummaryPage;

