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
  Card,
  CardContent,
  CardHeader,
  Switch,
  FormControlLabel,
  Slider,
  Chip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  ExpandMore,
  Visibility,
  Download,
  Send,
  AutoAwesome,
  Settings,
  Preview,
  SmartToy,
} from '@mui/icons-material';
import { Order, PDFGenerationData } from '../types';
import { generateAISupplierPO, downloadAISupplierPO, previewAISupplierPO, AIGeneratedPDFOptions } from '../services/aiPdfGenerator';
import { useAuth } from '../contexts/AuthContext';
import { useOrders } from '../contexts/OrderContext';
import toast from 'react-hot-toast';

interface AIPDFGenerationModalProps {
  open: boolean;
  onClose: () => void;
  order: Order;
}

const AIPDFGenerationModal: React.FC<AIPDFGenerationModalProps> = ({ open, onClose, order }) => {
  const { user } = useAuth();
  const { addTimelineEvent, addAuditLog } = useOrders();
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [pdfDataURL, setPdfDataURL] = useState<string>('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [aiInsights, setAiInsights] = useState<string>('');
  
  const [formData, setFormData] = useState<Partial<PDFGenerationData>>({
    poNumber: order.poNumber || `AUTO-${order.orderId}-001`,
    date: new Date().toLocaleDateString(),
    deliveryTerms: order.deliveryTerms || 'FOB',
    terms: 'Payment: 30% advance, 70% on delivery',
  });

  const [aiOptions, setAiOptions] = useState<AIGeneratedPDFOptions>({
    template: 'professional',
    includeComplianceInfo: true,
    includeInsights: true,
    language: 'en',
    branding: {
      companyName: 'HRVNHG Pharmaceuticals',
      companyAddress: '123 Pharma Street, Healthcare City, HC 12345',
      colors: {
        primary: '#7C4DFF',
        secondary: '#6B46C1',
      },
    },
  });

  useEffect(() => {
    if (open) {
      setFormData({
        poNumber: order.poNumber || `AUTO-${order.orderId}-001`,
        date: new Date().toLocaleDateString(),
        deliveryTerms: order.deliveryTerms || 'FOB',
        terms: 'Payment: 30% advance, 70% on delivery',
      });
      
      // Generate AI insights on modal open
      generateOrderInsights();
    }
  }, [open, order]);

  const generateOrderInsights = async () => {
    try {
      const insights = `Order Analysis for ${order.orderId}

Key Insights:
- Order Value: ${order.priceFromSupplier.amount} ${order.priceFromSupplier.currency}
- Material Count: ${order.materials.length}
- Supplier: ${order.supplier.name}
- Customer: ${order.customer.name}

This analysis provides insights for pharmaceutical procurement optimization.`;
      setAiInsights(insights);
    } catch (error) {
      console.error('Failed to generate insights:', error);
    }
  };

  const handleInputChange = (field: keyof PDFGenerationData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleAIOptionChange = (field: keyof AIGeneratedPDFOptions, value: any) => {
    setAiOptions(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleGeneratePreview = async () => {
    setIsPreviewing(true);
    try {
      const dataURL = await previewAISupplierPO(order, aiOptions, formData);
      setPdfDataURL(dataURL);
      toast.success('AI-generated PDF preview created!');
    } catch (error) {
      toast.error('Error generating preview');
    } finally {
      setIsPreviewing(false);
    }
  };

  const handleDownload = async () => {
    setIsGenerating(true);
    try {
      await downloadAISupplierPO(order, aiOptions, formData);
      
      // Log the action
      addTimelineEvent(
        order.orderId,
        'AI-Generated Supplier PO Created',
        `AI-generated Supplier PO created with template: ${aiOptions.template}`,
        'PO_Sent_to_Supplier'
      );
      
      addAuditLog(
        order.orderId,
        'aiGeneratedPO',
        null,
        `AI-Generated PO: ${formData.poNumber} (${aiOptions.template} template)`,
        'AI-generated Supplier PO created and downloaded'
      );
      
      toast.success('AI-generated Supplier PO downloaded successfully!');
      onClose();
    } catch (error) {
      toast.error('Error generating AI PDF');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSendPO = async () => {
    setIsGenerating(true);
    try {
      // Generate PDF first
      await downloadAISupplierPO(order, aiOptions, formData);
      
      // Log the action
      addTimelineEvent(
        order.orderId,
        'AI-Generated Supplier PO Sent',
        `AI-generated Supplier PO sent to ${order.supplier.name}`,
        'PO_Sent_to_Supplier'
      );
      
      addAuditLog(
        order.orderId,
        'status',
        order.status,
        'PO_Sent_to_Supplier',
        'AI-generated Supplier PO sent via email'
      );
      
      toast.success('AI-generated Supplier PO sent successfully!');
      onClose();
    } catch (error) {
      toast.error('Error sending AI-generated PO');
    } finally {
      setIsGenerating(false);
    }
  };

  const templates = [
    { value: 'professional', label: 'Professional', description: 'Clean, formal business style' },
    { value: 'minimal', label: 'Minimal', description: 'Simple, essential information only' },
    { value: 'detailed', label: 'Detailed', description: 'Comprehensive with full details' },
    { value: 'compliance_focused', label: 'Compliance Focused', description: 'Emphasizes regulatory requirements' },
  ];

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xl" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <SmartToy sx={{ color: 'primary.main' }} />
          <Typography variant="h6">AI-Powered PDF Generation</Typography>
          <Chip 
            icon={<AutoAwesome />} 
            label="AI Enhanced" 
            color="primary" 
            variant="outlined" 
            size="small"
          />
        </Box>
      </DialogTitle>

      <DialogContent>
        <Grid container spacing={3}>
          {/* AI Settings */}
          <Grid item xs={12} md={4}>
            <Card>
              <CardHeader 
                title="AI Configuration" 
                action={
                  <IconButton onClick={() => setShowAdvanced(!showAdvanced)}>
                    <Settings />
                  </IconButton>
                }
              />
              <CardContent>
                <FormControl fullWidth margin="normal">
                  <InputLabel>Template Style</InputLabel>
                  <Select
                    value={aiOptions.template}
                    onChange={(e) => handleAIOptionChange('template', e.target.value)}
                    label="Template Style"
                  >
                    {templates.map((template) => (
                      <MenuItem key={template.value} value={template.value}>
                        <Box>
                          <Typography variant="body2">{template.label}</Typography>
                          <Typography variant="caption" color="text.secondary">
                            {template.description}
                          </Typography>
                        </Box>
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <FormControl fullWidth margin="normal">
                  <InputLabel>Language</InputLabel>
                  <Select
                    value={aiOptions.language}
                    onChange={(e) => handleAIOptionChange('language', e.target.value)}
                    label="Language"
                  >
                    <MenuItem value="en">English</MenuItem>
                    <MenuItem value="es">Spanish</MenuItem>
                    <MenuItem value="fr">French</MenuItem>
                    <MenuItem value="de">German</MenuItem>
                  </Select>
                </FormControl>

                <FormControlLabel
                  control={
                    <Switch
                      checked={aiOptions.includeComplianceInfo}
                      onChange={(e) => handleAIOptionChange('includeComplianceInfo', e.target.checked)}
                    />
                  }
                  label="Include Compliance Info"
                />

                <FormControlLabel
                  control={
                    <Switch
                      checked={aiOptions.includeInsights}
                      onChange={(e) => handleAIOptionChange('includeInsights', e.target.checked)}
                    />
                  }
                  label="Include AI Insights"
                />

                {showAdvanced && (
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="subtitle2" gutterBottom>
                      Branding
                    </Typography>
                    <TextField
                      fullWidth
                      label="Company Name"
                      value={aiOptions.branding?.companyName}
                      onChange={(e) => handleAIOptionChange('branding', {
                        ...aiOptions.branding,
                        companyName: e.target.value
                      })}
                      size="small"
                      margin="dense"
                    />
                    <TextField
                      fullWidth
                      label="Company Address"
                      value={aiOptions.branding?.companyAddress}
                      onChange={(e) => handleAIOptionChange('branding', {
                        ...aiOptions.branding,
                        companyAddress: e.target.value
                      })}
                      size="small"
                      margin="dense"
                      multiline
                      rows={2}
                    />
                  </Box>
                )}
              </CardContent>
            </Card>

            {/* AI Insights Preview */}
            {aiInsights && (
              <Card sx={{ mt: 2 }}>
                <CardHeader title="AI Insights" />
                <CardContent>
                  <Box
                    sx={{
                      maxHeight: 200,
                      overflow: 'auto',
                      bgcolor: 'grey.50',
                      p: 2,
                      borderRadius: 1,
                      border: '1px solid',
                      borderColor: 'grey.200',
                    }}
                  >
                    <Typography variant="body2">
                      {aiInsights.substring(0, 300)}
                      {aiInsights.length > 300 && '...'}
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            )}
          </Grid>

          {/* Form Fields */}
          <Grid item xs={12} md={4}>
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
              helperText="AI will enhance these terms based on the template selected"
            />
          </Grid>

          {/* Order Summary */}
          <Grid item xs={12} md={4}>
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
                <strong>Supplier:</strong> {order.supplier.name}
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
                AI-Generated PDF Preview
              </Typography>
              <Box sx={{ border: 1, borderColor: 'grey.300', p: 1 }}>
                <iframe
                  src={pdfDataURL}
                  width="100%"
                  height="600"
                  style={{ border: 'none' }}
                  title="AI Generated PDF Preview"
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
          startIcon={isPreviewing ? <CircularProgress size={20} /> : <Preview />}
          variant="outlined"
        >
          {isPreviewing ? 'Generating...' : 'Preview AI PDF'}
        </Button>
        <Button
          onClick={handleDownload}
          variant="outlined"
          disabled={isGenerating}
          startIcon={isGenerating ? <CircularProgress size={20} /> : <Download />}
        >
          {isGenerating ? 'Generating...' : 'Download AI PDF'}
        </Button>
        <Button
          onClick={handleSendPO}
          variant="contained"
          disabled={isGenerating}
          startIcon={isGenerating ? <CircularProgress size={20} /> : <Send />}
        >
          {isGenerating ? 'Sending...' : 'Generate & Send AI PO'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AIPDFGenerationModal;
