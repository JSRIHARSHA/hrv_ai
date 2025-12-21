import React, { useState, useEffect } from 'react';
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
  Divider,
} from '@mui/material';
import { Order, PDFGenerationData } from '../types';
import { generateSupplierPO, downloadSupplierPO, previewSupplierPO } from '../utils/pdfGenerator';
import { canPerformAction } from '../data/constants';
import { useAuth } from '../contexts/AuthContext';
import { useOrders } from '../contexts/OrderContext';
import toast from 'react-hot-toast';

interface PDFGenerationModalProps {
  open: boolean;
  onClose: () => void;
  order: Order;
}

const PDFGenerationModal: React.FC<PDFGenerationModalProps> = ({ open, onClose, order }) => {
  const { user } = useAuth();
  const { addTimelineEvent, addAuditLog } = useOrders();
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [pdfDataURL, setPdfDataURL] = useState<string>('');
  
  const [formData, setFormData] = useState<Partial<PDFGenerationData>>({
    poNumber: order.poNumber || `AUTO-${order.orderId}-001`,
    date: new Date().toLocaleDateString(),
    deliveryTerms: order.deliveryTerms || 'FOB',
    terms: 'Payment: 30% advance, 70% on delivery',
  });

  useEffect(() => {
    if (open) {
      setFormData({
        poNumber: order.poNumber || `AUTO-${order.orderId}-001`,
        date: new Date().toLocaleDateString(),
        deliveryTerms: order.deliveryTerms || 'FOB',
        terms: 'Payment: 30% advance, 70% on delivery',
      });
    }
  }, [open, order]);

  const handleInputChange = (field: keyof PDFGenerationData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleGeneratePreview = async () => {
    setIsPreviewing(true);
    try {
      const dataURL = previewSupplierPO(order, formData);
      setPdfDataURL(dataURL);
    } catch (error) {
      toast.error('Error generating preview');
    } finally {
      setIsPreviewing(false);
    }
  };

  const handleDownload = async () => {
    setIsGenerating(true);
    try {
      downloadSupplierPO(order, formData);
      
      // Log the action
      addTimelineEvent(
        order.orderId,
        'Supplier PO Generated',
        `Supplier PO generated with number ${formData.poNumber}`,
        'PO_Sent_to_Supplier'
      );
      
      addAuditLog(
        order.orderId,
        'supplierPO',
        null,
        `Generated PO: ${formData.poNumber}`,
        'Supplier PO generated and downloaded'
      );
      
      toast.success('Supplier PO generated successfully');
      onClose();
    } catch (error) {
      toast.error('Error generating PDF');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSendPO = async () => {
    setIsGenerating(true);
    try {
      // Validate supplier exists
      if (!order.supplier) {
        toast.error('Please select a supplier before generating the PDF');
        return;
      }
      
      // Generate PDF first
      downloadSupplierPO(order, formData);
      
      // Log the action
      addTimelineEvent(
        order.orderId,
        'Supplier PO Sent',
        `Supplier PO sent to ${order.supplier?.name || 'supplier'}`,
        'PO_Sent_to_Supplier'
      );
      
      addAuditLog(
        order.orderId,
        'status',
        order.status,
        'PO_Sent_to_Supplier',
        'Supplier PO generated and sent via email'
      );
      
      toast.success('Supplier PO sent successfully');
      onClose();
    } catch (error) {
      toast.error('Error sending PO');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle>Generate Supplier PO</DialogTitle>
      <DialogContent>
        <Grid container spacing={3}>
          {/* Form Fields */}
          <Grid item xs={12} md={6}>
            <Typography variant="h6" gutterBottom>
              PO Details
            </Typography>
            
            <TextField
              fullWidth
              label="PO Number"
              value={formData.poNumber}
              onChange={(e) => handleInputChange('poNumber', e.target.value)}
              margin="normal"
              required
            />
            
            <TextField
              fullWidth
              label="Date"
              value={formData.date}
              onChange={(e) => handleInputChange('date', e.target.value)}
              margin="normal"
              required
            />
            
            <FormControl fullWidth margin="normal">
              <InputLabel>Delivery Terms</InputLabel>
              <Select
                value={formData.deliveryTerms}
                onChange={(e) => handleInputChange('deliveryTerms', e.target.value)}
                label="Delivery Terms"
              >
                <MenuItem value="FOB">FOB (Free on Board)</MenuItem>
                <MenuItem value="CIF">CIF (Cost, Insurance, Freight)</MenuItem>
                <MenuItem value="DDP">DDP (Delivered Duty Paid)</MenuItem>
                <MenuItem value="EXW">EXW (Ex Works)</MenuItem>
                <MenuItem value="FCA">FCA (Free Carrier)</MenuItem>
              </Select>
            </FormControl>
            
            <TextField
              fullWidth
              label="Terms & Conditions"
              multiline
              rows={4}
              value={formData.terms}
              onChange={(e) => handleInputChange('terms', e.target.value)}
              margin="normal"
            />
          </Grid>

          {/* Order Summary */}
          <Grid item xs={12} md={6}>
            <Typography variant="h6" gutterBottom>
              Order Summary
            </Typography>
            
            <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
              <Typography variant="body2" gutterBottom>
                <strong>Order ID:</strong> {order.orderId}
              </Typography>
              <Typography variant="body2" gutterBottom>
                <strong>Customer:</strong> {order.customer.name}
              </Typography>
              <Typography variant="body2" gutterBottom>
                <strong>Supplier:</strong> {order.supplier?.name || 'Not selected'}
              </Typography>
              <Typography variant="body2" gutterBottom>
                <strong>Material:</strong> {order.materialName}
              </Typography>
              <Typography variant="body2" gutterBottom>
                <strong>Quantity:</strong> {order.quantity.value} {order.quantity.unit}
              </Typography>
              <Typography variant="body2" gutterBottom>
                <strong>Total Amount:</strong> {order.priceFromSupplier.currency} {order.priceFromSupplier.amount.toFixed(2)}
              </Typography>
            </Box>

            <Divider sx={{ my: 2 }} />

            <Typography variant="h6" gutterBottom>
              Materials
            </Typography>
            {order.materials.map((material, index) => (
              <Box key={material.id} sx={{ p: 1, bgcolor: 'grey.50', borderRadius: 1, mb: 1 }}>
                <Typography variant="body2">
                  {index + 1}. {material.name}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  SKU: {material.sku} | Qty: {material.quantity.value} {material.quantity.unit} | 
                  Price: {material.unitPrice.currency} {material.unitPrice.amount.toFixed(2)}
                </Typography>
              </Box>
            ))}
          </Grid>

          {/* PDF Preview */}
          {pdfDataURL && (
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom>
                PDF Preview
              </Typography>
              <Box sx={{ border: 1, borderColor: 'grey.300', p: 1 }}>
                <iframe
                  src={pdfDataURL}
                  width="100%"
                  height="600"
                  style={{ border: 'none' }}
                />
              </Box>
            </Grid>
          )}
        </Grid>
      </DialogContent>
      
      <DialogActions>
        <Button onClick={onClose} disabled={isGenerating}>
          Cancel
        </Button>
        <Button
          onClick={handleGeneratePreview}
          disabled={isPreviewing || isGenerating}
          startIcon={isPreviewing ? <CircularProgress size={20} /> : undefined}
        >
          {isPreviewing ? 'Generating...' : 'Preview'}
        </Button>
        <Button
          onClick={handleDownload}
          variant="outlined"
          disabled={isGenerating}
          startIcon={isGenerating ? <CircularProgress size={20} /> : undefined}
        >
          {isGenerating ? 'Generating...' : 'Download PDF'}
        </Button>
        {canPerformAction(user?.role || 'Employee', 'send_supplier_po', order.status) && (
          <Button
            onClick={handleSendPO}
            variant="contained"
            disabled={isGenerating}
            startIcon={isGenerating ? <CircularProgress size={20} /> : undefined}
          >
            {isGenerating ? 'Sending...' : 'Generate & Send PO'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default PDFGenerationModal;
