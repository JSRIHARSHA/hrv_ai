import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Grid,
  Typography,
  Box,
  Alert,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
} from '@mui/material';
import {
  Email,
  AttachFile,
  Send,
  Preview,
  CheckCircle,
  Warning,
} from '@mui/icons-material';
import { Order, EmailTemplate } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { useOrders } from '../contexts/OrderContext';
import toast from 'react-hot-toast';

interface EmailModalProps {
  open: boolean;
  onClose: () => void;
  order: Order;
  emailType: 'send-po' | 'send-coa' | 'send-coa-awaitment' | 'send-payment-info';
}

const EmailModal: React.FC<EmailModalProps> = ({ open, onClose, order, emailType }) => {
  const { user } = useAuth();
  const { addTimelineEvent, addAuditLog } = useOrders();
  const [isSending, setIsSending] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);
  
  const [emailData, setEmailData] = useState({
    to: '',
    cc: '',
    subject: '',
    body: '',
    attachments: [] as string[],
  });

  // Email templates based on type
  const getEmailTemplate = (): EmailTemplate => {
    const templates = {
      'send-po': {
        id: 'send-po',
        name: 'Send Supplier PO',
        subject: `PO from ${user?.name || 'Company'} — Order ${order.orderId} — ${order.materialName}`,
        body: `Dear ${order.supplier.name},

Please find attached the Purchase Order for the following pharmaceutical materials:

Order ID: ${order.orderId}
Material: ${order.materialName}
Quantity: ${order.quantity.value} ${order.quantity.unit}
Total Amount: ${order.priceFromSupplier.currency} ${order.priceFromSupplier.amount.toFixed(2)}

Please confirm receipt and provide your expected delivery timeline. Please ensure all materials comply with FDA regulations and include Certificate of Analysis (COA).

Best regards,
${user?.name || 'PharmaSource Pro'}`,
        recipients: [order.supplier.email],
        cc: [order.customer.email],
        attachments: ['supplier-po'],
      },
      'send-coa': {
        id: 'send-coa',
        name: 'Send COA to Customer',
        subject: `Pre-Shipment COA — Order ${order.orderId} — ${order.materialName}`,
        body: `Dear ${order.customer.name},

Please find attached the Pre-Shipment Certificate of Analysis (COA) for your pharmaceutical order:

Order ID: ${order.orderId}
Material: ${order.materialName}
Quantity: ${order.quantity.value} ${order.quantity.unit}

Please review the COA for compliance with your specifications and reply with your approval or any requested changes. The COA includes all required pharmaceutical testing parameters.

Best regards,
${user?.name || 'PharmaSource Pro'}`,
        recipients: [order.customer.email],
        cc: [],
        attachments: ['coa-pre-shipment'],
      },
      'send-coa-awaitment': {
        id: 'send-coa-awaitment',
        name: 'Send COA Awaitment',
        subject: `COA ETA — Order ${order.orderId}`,
        body: `Dear ${order.customer.name},

We would like to inform you about the status of your order:

Order ID: ${order.orderId}
Material: ${order.materialName}
Quantity: ${order.quantity.value} ${order.quantity.unit}

The Certificate of Analysis (COA) is currently being prepared by our supplier. Expected timeline: [Please specify ETA]

We will send the COA as soon as it becomes available.

Best regards,
${user?.name || 'Company'}`,
        recipients: [order.customer.email],
        cc: [],
        attachments: [],
      },
      'send-payment-info': {
        id: 'send-payment-info',
        name: 'Send Payment Information',
        subject: `Payment confirmation — Order ${order.orderId} — Txn ${order.advancePayment?.transactionId || 'N/A'}`,
        body: `Dear Team,

Payment has been processed for the following order:

Order ID: ${order.orderId}
Material: ${order.materialName}
Transaction ID: ${order.advancePayment?.transactionId || 'N/A'}
Amount: ${order.advancePayment?.currency || order.priceFromSupplier.currency} ${order.advancePayment?.amount || order.priceFromSupplier.amount}
Date: ${order.advancePayment?.date ? new Date(order.advancePayment.date).toLocaleDateString() : 'N/A'}

Please proceed with the dispatch process.

Best regards,
Finance Team`,
        recipients: [order.supplier.email],
        cc: [order.customer.email],
        attachments: order.advancePayment?.paymentProof ? ['payment-proof'] : [],
      },
    };

    return templates[emailType];
  };

  const template = getEmailTemplate();

  React.useEffect(() => {
    if (open) {
      setEmailData({
        to: template.recipients.join(', '),
        cc: (template.cc || []).join(', '),
        subject: template.subject,
        body: template.body,
        attachments: template.attachments || [],
      });
    }
  }, [open, template]);

  const handleInputChange = (field: keyof typeof emailData, value: string | string[]) => {
    setEmailData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSendEmail = async () => {
    setIsSending(true);
    try {
      // Simulate email sending delay
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Log the action
      const eventDetails = {
        'send-po': `Supplier PO sent to ${order.supplier.name}`,
        'send-coa': `COA sent to ${order.customer.name}`,
        'send-coa-awaitment': `COA awaitment notification sent to ${order.customer.name}`,
        'send-payment-info': `Payment information sent to ${order.supplier.name}`,
      };

      addTimelineEvent(
        order.orderId,
        `Email Sent - ${template.name}`,
        eventDetails[emailType],
        emailType === 'send-po' ? 'PO_Sent_to_Supplier' : undefined
      );
      
      addAuditLog(
        order.orderId,
        'email_sent',
        null,
        emailData.subject,
        `Email sent to: ${emailData.to}`
      );
      
      toast.success('Email sent successfully');
      onClose();
    } catch (error) {
      toast.error('Error sending email');
    } finally {
      setIsSending(false);
    }
  };

  const getEmailTypeDisplayName = () => {
    const names = {
      'send-po': 'Send Supplier PO',
      'send-coa': 'Send COA to Customer',
      'send-coa-awaitment': 'Send COA Awaitment',
      'send-payment-info': 'Send Payment Information',
    };
    return names[emailType];
  };

  const getEmailTypeIcon = () => {
    const icons = {
      'send-po': <AttachFile />,
      'send-coa': <Email />,
      'send-coa-awaitment': <Warning />,
      'send-payment-info': <CheckCircle />,
    };
    return icons[emailType];
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {getEmailTypeIcon()}
          {getEmailTypeDisplayName()}
        </Box>
      </DialogTitle>
      
      <DialogContent>
        <Grid container spacing={3}>
          {/* Email Details */}
          <Grid item xs={12}>
            <Typography variant="h6" gutterBottom>
              Email Details
            </Typography>
            
            <TextField
              fullWidth
              label="To"
              value={emailData.to}
              onChange={(e) => handleInputChange('to', e.target.value)}
              margin="normal"
              required
            />
            
            <TextField
              fullWidth
              label="CC"
              value={emailData.cc}
              onChange={(e) => handleInputChange('cc', e.target.value)}
              margin="normal"
            />
            
            <TextField
              fullWidth
              label="Subject"
              value={emailData.subject}
              onChange={(e) => handleInputChange('subject', e.target.value)}
              margin="normal"
              required
            />
            
            <TextField
              fullWidth
              label="Message Body"
              multiline
              rows={8}
              value={emailData.body}
              onChange={(e) => handleInputChange('body', e.target.value)}
              margin="normal"
              required
            />
          </Grid>

          {/* Attachments */}
          <Grid item xs={12}>
            <Typography variant="h6" gutterBottom>
              Attachments
            </Typography>
            
            {emailData.attachments.length > 0 ? (
              <List dense>
                {emailData.attachments.map((attachment, index) => (
                  <ListItem key={index}>
                    <ListItemIcon>
                      <AttachFile />
                    </ListItemIcon>
                    <ListItemText
                      primary={attachment.replace('-', ' ').toUpperCase()}
                      secondary="Will be attached automatically"
                    />
                  </ListItem>
                ))}
              </List>
            ) : (
              <Typography variant="body2" color="text.secondary">
                No attachments for this email type
              </Typography>
            )}
          </Grid>

          {/* Order Summary */}
          <Grid item xs={12}>
            <Divider sx={{ my: 2 }} />
            <Typography variant="h6" gutterBottom>
              Order Summary
            </Typography>
            
            <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2">
                    <strong>Order ID:</strong> {order.orderId}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Customer:</strong> {order.customer.name}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Supplier:</strong> {order.supplier.name}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2">
                    <strong>Material:</strong> {order.materialName}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Quantity:</strong> {order.quantity.value} {order.quantity.unit}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Status:</strong> {order.status}
                  </Typography>
                </Grid>
              </Grid>
            </Box>
          </Grid>

          {/* Email Preview */}
          <Grid item xs={12}>
            <Divider sx={{ my: 2 }} />
            <Typography variant="h6" gutterBottom>
              Email Preview
            </Typography>
            
            <Box sx={{ p: 2, border: 1, borderColor: 'grey.300', borderRadius: 1 }}>
              <Typography variant="subtitle2" gutterBottom>
                <strong>To:</strong> {emailData.to}
              </Typography>
              {emailData.cc && (
                <Typography variant="subtitle2" gutterBottom>
                  <strong>CC:</strong> {emailData.cc}
                </Typography>
              )}
              <Typography variant="subtitle2" gutterBottom>
                <strong>Subject:</strong> {emailData.subject}
              </Typography>
              <Divider sx={{ my: 1 }} />
              <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                {emailData.body}
              </Typography>
            </Box>
          </Grid>
        </Grid>
      </DialogContent>
      
      <DialogActions>
        <Button onClick={onClose} disabled={isSending}>
          Cancel
        </Button>
        <Button
          onClick={handleSendEmail}
          variant="contained"
          disabled={isSending}
          startIcon={isSending ? <CircularProgress size={20} /> : <Send />}
        >
          {isSending ? 'Sending...' : 'Send Email'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default EmailModal;
