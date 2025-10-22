import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  Button,
  Grid,
  Card,
  CardContent,
  Chip,
  TextField,
  InputAdornment,
  Fab,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Alert,
  CircularProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import {
  ArrowBack,
  AttachFile,
  Comment,
  Timeline,
  History,
  Download,
  Visibility,
  Save,
  Search,
  Clear,
  CloudUpload,
  ExpandMore,
} from '@mui/icons-material';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useOrders } from '../contexts/OrderContext';
import { Order, FreightHandler, Documents } from '../types';
import { 
  statusDisplayNames
} from '../data/constants';
import { mockFreightHandlers, searchFreightHandlers } from '../data/freightHandlers';
import toast from 'react-hot-toast';
import AppBanner from '../components/AppBanner';
import AIPDFGenerationModal from '../components/AIPDFGenerationModal';
import { convertCurrency, getSupportedCurrencies, formatCurrency } from '../utils/currencyConverter';
import { generateSupplierPO, downloadSupplierPO } from '../utils/pdfGenerator';
import { generateHRVPO, previewHRVPO } from '../utils/hrvPdfGenerator';
import { previewHRVPOFromOrder } from '../utils/hrvPdfLibGenerator';
import { previewNHGPOFromOrder } from '../utils/nhgPdfLibGenerator';
import { getHRVPDFConfig } from '../config/hrvPdfConfig';
import { getTemplateUrl } from '../config/hrvPdfTemplateConfig';

const OrderDetailPage: React.FC = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { getOrderById, updateOrderStatus, addComment, addTimelineEvent, attachDocument, updateOrder, isLoading } = useOrders();
  
  const [order, setOrder] = useState<Order | null>(null);
  const [newComment, setNewComment] = useState('');
  const [commentDialogOpen, setCommentDialogOpen] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [aiPdfModalOpen, setAiPdfModalOpen] = useState(false);
  
  // Editable fields state
  const [editableOrder, setEditableOrder] = useState<Order | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [isConverting, setIsConverting] = useState(false);
  const [supportedCurrencies] = useState<string[]>(getSupportedCurrencies());
  const [conversionRate, setConversionRate] = useState<number | null>(null);
  const [isEditingRate, setIsEditingRate] = useState(false);
  const [customRate, setCustomRate] = useState<string>('');
  
  // PDF generation state
  const [generatedPDF, setGeneratedPDF] = useState<string | null>(null);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [taxRateDialogOpen, setTaxRateDialogOpen] = useState(false);
  const [selectedTaxRate, setSelectedTaxRate] = useState<number>(0.1);
  
  // Document viewing state
  const [viewingDocument, setViewingDocument] = useState<{ name: string; data: string } | null>(null);
  
  // Freight handler state
  const [freightHandlerSearch, setFreightHandlerSearch] = useState('');
  const [filteredFreightHandlers, setFilteredFreightHandlers] = useState<FreightHandler[]>([]);
  const [showFreightHandlerDropdown, setShowFreightHandlerDropdown] = useState(false);
  
  // Accordion state for collapsible sections
  const [expandedSections, setExpandedSections] = useState<{ [key: string]: boolean }>({
    orderSummary: true,
    customerInformation: true,
    supplierInformation: true,
    freightHandlerInformation: false,
    documents: true,
    advancePaymentDetails: false,
  });
  
  // Build status options from constants
  const statusOptions = statusDisplayNames;

  // Handle accordion expansion
  const handleAccordionChange = (section: string) => (event: React.SyntheticEvent, isExpanded: boolean) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: isExpanded
    }));
  };

  useEffect(() => {
    if (orderId) {
      const foundOrder = getOrderById(orderId);
      setOrder(foundOrder || null);
      setEditableOrder(foundOrder || null);
      setHasChanges(false); // Reset changes when loading order
      
      // Debug: Log documents
      if (foundOrder) {
        console.log('Order documents:', foundOrder.documents);
        console.log('Order ID:', foundOrder.orderId);
      }
      
      // Initialize freight handler search if freight handler exists
      if (foundOrder?.freightHandler) {
        setFreightHandlerSearch(foundOrder.freightHandler.name);
      }
    }
  }, [orderId, getOrderById]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (showFreightHandlerDropdown && !target.closest('[data-freight-handler-dropdown]')) {
        setShowFreightHandlerDropdown(false);
      }
    };

    if (showFreightHandlerDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showFreightHandlerDropdown]);

  useEffect(() => {
    const action = searchParams.get('action');
    const created = searchParams.get('created');
    
    if (action === 'generate-po' && order) {
      // Handle PDF generation
      handleGeneratePOAI();
    } else if (action === 'send-coa' && order) {
      // Handle COA sending
      handleSendCOA();
    } else if (created === 'true' && order) {
      // Show success message for newly created order
      toast.success(`Order ${order.orderId} created successfully from PDF upload!`);
      // Remove the created parameter from URL
      navigate(`/order/${orderId}`, { replace: true });
    }
  }, [searchParams, order, orderId, navigate]);

  const handleGeneratePOAI = () => {
    setAiPdfModalOpen(true);
    // Navigate back to order detail without action parameter
    navigate(`/order/${orderId}`, { replace: true });
  };

  const handleSendCOA = () => {
    toast.success('COA sending functionality would be implemented here');
    // Navigate back to order detail without action parameter
    navigate(`/order/${orderId}`, { replace: true });
  };

  const handleSendCOAToCustomer = () => {
    if (!editableOrder) return;

    console.log('Current order:', editableOrder.orderId);
    console.log('Order documents:', editableOrder.documents);
    
    // Check if COA document exists
    let coaDocument = editableOrder.documents.coaPreShipment;
    console.log('COA document:', coaDocument);
    
    // If no COA document exists, create a sample one for testing
    if (!coaDocument) {
      console.log('No COA document found, creating sample document for testing...');
      coaDocument = {
        id: 'sample_coa_doc',
        filename: 'sample_coa_document.pdf',
        uploadedAt: new Date().toISOString(),
        uploadedBy: {
          userId: 'user1',
          name: 'System',
        },
        fileSize: 50000,
        mimeType: 'application/pdf',
        data: 'data:application/pdf;base64,JVBERi0xLjQKMSAwIG9iago8PAovVHlwZSAvQ2F0YWxvZwovUGFnZXMgMiAwIFIKPj4KZW5kb2JqCjIgMCBvYmoKPDwKL1R5cGUgL1BhZ2VzCi9LaWRzIFszIDAgUl0KL0NvdW50IDEKL01lZGlhQm94IFswIDAgNTk1IDg0Ml0KPj4KZW5kb2JqCjMgMCBvYmoKPDwKL1R5cGUgL1BhZ2UKL1BhcmVudCAyIDAgUgovUmVzb3VyY2VzIDw8Ci9Gb250IDw8Ci9GMSAKPDwKL1R5cGUgL0ZvbnQKL1N1YnR5cGUgL1R5cGUxCi9CYXNlRm9udCAvSGVsdmV0aWNhCj4+Cj4+Cj4+Ci9Db250ZW50cyA0IDAgUgo+PgplbmRvYmoKNCAwIG9iago8PAovTGVuZ3RoIDQ0Cj4+CnN0cmVhbQpCVAoxMiAwIFRmCjcyIDcwMCAgVGQKKFRlc3QgQ09BIGRvY3VtZW50IGZvciB0ZXN0aW5nKSBUagoKRVQKZW5kc3RyZWFtCmVuZG9iagp4cmVmCjAgNQowMDAwMDAwMDAwIDY1NTM1IGYKMDAwMDAwMDAwOSAwMDAwMCBuCjAwMDAwMDAwNTggMDAwMDAgbgowMDAwMDAwMTE1IDAwMDAwIG4KMDAwMDAwMDI2NSAwMDAwMCBuCnRyYWlsZXIKPDwKL1NpemUgNQovUm9vdCAxIDAgUgo+PgpzdGFydHhyZWYKMzU2CiUlRU9G'
      };
      toast.success('Using sample COA document for testing. Please upload a real COA document for production use.');
    }

    try {
      // Download the COA document first
      if (coaDocument.data) {
        console.log('Downloading COA document...');
        const downloadLink = document.createElement('a');
        downloadLink.href = coaDocument.data;
        downloadLink.download = coaDocument.filename;
        downloadLink.style.display = 'none';
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
        console.log('COA document downloaded successfully');
      }

      // Create email subject and body
      const subject = `COA Document - Order ${editableOrder.orderId}`;
      const body = `Dear ${editableOrder.customer.name},

Please find attached the Certificate of Analysis (COA) document for your order ${editableOrder.orderId}.

Order Details:
- Material: ${editableOrder.materialName}
- Quantity: ${editableOrder.quantity.value} ${editableOrder.quantity.unit}
- Order ID: ${editableOrder.orderId}
- COA Document: ${coaDocument.filename}

Please review the attached COA document and let us know if you have any questions.

Best regards,
${editableOrder.assignedTo?.name || 'Order Management Team'}`;

      // Create mailto link (works with default email client)
      const mailtoLink = `mailto:${editableOrder.customer.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      
      // Open email client with instructions
      setTimeout(() => {
        try {
          window.location.href = mailtoLink;
          
          // Update the order status
          handleFieldChange('status', 'COA_Accepted');
          
          // Add timeline event
          addTimelineEvent(
            editableOrder.orderId,
            'COA Email Prepared',
            `Email prepared for customer with COA document: ${coaDocument?.filename || 'Unknown'}`,
            'COA_Accepted'
          );
          
          toast.success(`COA document downloaded. Email opened. Please manually attach "${coaDocument?.filename || 'the COA file'}" from your Downloads folder before sending.`, {
            duration: 6000,
          });
        } catch (error) {
          console.error('Error opening email client:', error);
          // Copy to clipboard as fallback
          const emailContent = `To: ${editableOrder.customer.email}\nSubject: ${subject}\n\n${body}`;
          navigator.clipboard.writeText(emailContent);
          toast.success('Email content copied to clipboard. Please paste into your email client and attach the downloaded file.');
        }
      }, 500); // Small delay to ensure download completes first
      
    } catch (error) {
      console.error('Error preparing COA email:', error);
      toast.error('Error preparing COA email. Please try again.');
    }
  };

  const handleFileUpload = async (file: File, documentType: 'customerPO' | 'supplierPO' | 'quotation' | 'proformaInvoice' | 'coaPreShipment') => {
    if (!editableOrder || !file) return;

    try {
      // Convert file to base64 data URL for storage
      const reader = new FileReader();
      reader.onload = () => {
        const fileData = reader.result as string;
        
        // Attach the document to the order
        attachDocument(editableOrder.orderId, documentType, fileData, file.name);
        
        toast.success(`${file.name} uploaded successfully`);
      };
      reader.onerror = () => {
        toast.error('Error reading file');
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('File upload error:', error);
      toast.error('Error uploading file');
    }
  };

  const handleAddComment = () => {
    if (newComment.trim() && order) {
      addComment(order.orderId, newComment.trim());
      setNewComment('');
      setCommentDialogOpen(false);
      toast.success('Comment added successfully');
    }
  };

  const handleStatusChange = (status?: string) => {
    const statusToUpdate = status || newStatus;
    if (statusToUpdate && order && statusToUpdate !== order.status) {
      updateOrderStatus(order.orderId, statusToUpdate);
      setNewStatus('');
      toast.success('Status updated successfully');
    }
  };

  const handleGeneratePO = () => {
    if (!editableOrder) return;
    // Open tax rate selection dialog
    setTaxRateDialogOpen(true);
  };

  const handleGeneratePOWithTax = async (taxRate: number) => {
    if (!editableOrder) return;
    
    setTaxRateDialogOpen(false);
    setIsGeneratingPDF(true);
    try {
      // Generate PDF based on entity with selected tax rate
      const entity = editableOrder.entity || 'HRV';
      let pdfDataURL: string;
      
      if (entity === 'HRV') {
        // Use pdf-lib generator that replicates the Python code
        const templateUrl = getTemplateUrl();
        pdfDataURL = await previewHRVPOFromOrder(templateUrl, editableOrder, taxRate);
      } else {
        // Use NHG pdf-lib generator
        pdfDataURL = await previewNHGPOFromOrder(editableOrder, taxRate);
      }
      
      setGeneratedPDF(pdfDataURL);
      
      // Add timeline event
      addTimelineEvent(
        editableOrder.orderId,
        'Supplier PO Generated',
        `Supplier PO generated for ${entity} entity with ${taxRate}% tax`,
        'PO_Sent_to_Supplier'
      );
      
      toast.success(`Supplier PO generated successfully for ${entity} with ${taxRate}% tax`);
    } catch (error) {
      toast.error('Error generating Supplier PO');
      console.error('PDF generation error:', error);
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const handleAttachPDF = async () => {
    if (!editableOrder || !generatedPDF) return;
    
    try {
      const entity = editableOrder.entity || 'HRV';
      const filename = `${entity}_Supplier_PO_${editableOrder.orderId}.pdf`;
      
      // Attach the generated PDF to the order documents
      attachDocument(editableOrder.orderId, 'supplierPO', generatedPDF, filename);
      
      // Clear the generated PDF preview
      setGeneratedPDF(null);
      
      toast.success(`Supplier PO attached successfully to order ${editableOrder.orderId}`);
    } catch (error) {
      toast.error('Error attaching Supplier PO');
      console.error('PDF attachment error:', error);
    }
  };

  // Field change handlers
  const handleFieldChange = (field: string, value: any) => {
    if (editableOrder) {
      const updatedOrder = { ...editableOrder };
      
      if (field.includes('.')) {
        const [parent, child] = field.split('.');
        (updatedOrder as any)[parent] = {
          ...(updatedOrder as any)[parent],
          [child]: value
        };
      } else {
        (updatedOrder as any)[field] = value;
      }
      
      setEditableOrder(updatedOrder);
      setHasChanges(true);
    }
  };

  const handleCurrencyConversion = async (fromField: 'priceToCustomer' | 'priceFromSupplier', toField: 'priceToCustomer' | 'priceFromSupplier') => {
    if (!editableOrder || isConverting) return;

    setIsConverting(true);
    try {
      const fromPrice = editableOrder[fromField];
      const toPrice = editableOrder[toField];
      
      if (fromPrice.currency === toPrice.currency) {
        toast.success('Both prices are already in the same currency');
        return;
      }

      const result = await convertCurrency(
        fromPrice.amount,
        fromPrice.currency,
        toPrice.currency
      );

      const updatedOrder = { ...editableOrder };
      updatedOrder[toField] = {
        ...toPrice,
        amount: result.convertedAmount
      };

      setEditableOrder(updatedOrder);
      setHasChanges(true);
      setConversionRate(result.rate);
      toast.success(`Converted ${formatCurrency(fromPrice.amount, fromPrice.currency)} to ${formatCurrency(result.convertedAmount, toPrice.currency)} (Rate: ${result.rate.toFixed(4)})`);
    } catch (error) {
      toast.error('Failed to convert currency. Please try again.');
      console.error('Currency conversion error:', error);
    } finally {
      setIsConverting(false);
    }
  };

  const handleCustomRateConversion = () => {
    if (!editableOrder || !customRate) return;

    const rate = parseFloat(customRate);
    if (isNaN(rate) || rate <= 0) {
      toast.error('Please enter a valid conversion rate');
      return;
    }

    const customerPrice = editableOrder.priceToCustomer;
    const supplierPrice = editableOrder.priceFromSupplier;

    if (customerPrice.currency !== supplierPrice.currency) {
      // Convert supplier price to customer currency using custom rate
      const convertedAmount = supplierPrice.amount * rate;
      
      const updatedOrder = { ...editableOrder };
      updatedOrder.priceFromSupplier = {
        ...supplierPrice,
        amount: convertedAmount
      };

      setEditableOrder(updatedOrder);
      setHasChanges(true);
      setConversionRate(rate);
      toast.success(`Applied custom rate ${rate.toFixed(4)} for conversion`);
    }
  };

  const calculateCustomerRate = () => {
    if (!editableOrder || !editableOrder.quantity.value) return 0;
    return editableOrder.priceToCustomer.amount / editableOrder.quantity.value;
  };

  const calculateSupplierRate = () => {
    if (!editableOrder || !editableOrder.quantity.value) return 0;
    return editableOrder.priceFromSupplier.amount / editableOrder.quantity.value;
  };

  const handleSaveChanges = () => {
    if (editableOrder && order) {
      // Update the order with changes using OrderContext
      updateOrder(editableOrder.orderId, editableOrder);
      
      // Update local state
      setOrder(editableOrder);
      setHasChanges(false);
      toast.success('Order updated successfully');
    }
  };

  // Freight handler functions
  const handleFreightHandlerSearch = (query: string) => {
    setFreightHandlerSearch(query);
    const filtered = searchFreightHandlers(query);
    setFilteredFreightHandlers(filtered);
    setShowFreightHandlerDropdown(true);
  };

  const handleFreightHandlerSelect = (handler: FreightHandler) => {
    if (editableOrder) {
      const updatedOrder = { ...editableOrder };
      updatedOrder.freightHandler = handler;
      setEditableOrder(updatedOrder);
      setHasChanges(true);
      setFreightHandlerSearch(handler.name);
      setShowFreightHandlerDropdown(false);
      toast.success(`Freight handler ${handler.name} selected`);
    }
  };

  const handleFreightHandlerFieldChange = (field: keyof FreightHandler, value: any) => {
    if (editableOrder && editableOrder.freightHandler) {
      const updatedOrder = { ...editableOrder };
      updatedOrder.freightHandler = {
        ...updatedOrder.freightHandler,
        [field]: value
      } as FreightHandler;
      setEditableOrder(updatedOrder);
      setHasChanges(true);
    }
  };

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!order) {
    return (
      <Container maxWidth="lg" sx={{ mt: 3 }}>
        <Alert severity="error">
          Order not found
        </Alert>
      </Container>
    );
  }

  return (
    <Box sx={{ flexGrow: 1, bgcolor: '#0F0F23', minHeight: '100vh' }}>
      <AppBanner />

      <Container maxWidth="lg" sx={{ mt: 3, mb: 3 }}>
        <Box sx={{ mb: 3 }}>
          <Button
            startIcon={<ArrowBack />}
            onClick={() => navigate('/dashboard')}
            sx={{ 
              mb: 2,
              color: '#FFFFFF',
              borderColor: 'rgba(255,255,255,0.3)',
              '&:hover': { borderColor: 'rgba(255,255,255,0.5)' },
            }}
            variant="outlined"
          >
            Back to Dashboard
          </Button>
          <Typography variant="h3" sx={{ color: '#FFFFFF', fontWeight: 700, mb: 1 }}>
            Order Details - {order.orderId}
          </Typography>
          <Typography variant="h6" sx={{ color: 'rgba(255,255,255,0.7)' }}>
            Pharmaceutical Sourcing Order Management
          </Typography>
        </Box>
        <Grid container spacing={3}>
          {/* Main Content */}
          <Grid item xs={12} md={8}>
            {/* Order Summary */}
            <Accordion 
              expanded={expandedSections.orderSummary}
              onChange={handleAccordionChange('orderSummary')}
              sx={{
              mb: 3, 
              bgcolor: 'rgba(255,255,255,0.05)', 
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 2,
                '&:before': { display: 'none' },
                '&.Mui-expanded': {
                  bgcolor: 'rgba(255,255,255,0.08)',
                },
              }}
            >
              <AccordionSummary
                expandIcon={<ExpandMore sx={{ color: '#FFFFFF' }} />}
                sx={{
                  '& .MuiAccordionSummary-content': {
                    alignItems: 'center',
                  },
                }}
              >
                <Typography variant="h5" sx={{ color: '#FFFFFF', fontWeight: 600 }}>
                  Order Summary
                </Typography>
              </AccordionSummary>
              <AccordionDetails sx={{ pt: 0 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                <Box sx={{ display: 'flex', gap: 2 }}>
                  <FormControl size="small" sx={{ minWidth: 120 }}>
                    <InputLabel sx={{ color: '#FFFFFF' }}>Entity</InputLabel>
                    <Select
                      label="Entity"
                      value={editableOrder?.entity || ''}
                      onChange={(e) => handleFieldChange('entity', e.target.value)}
                      sx={{
                        color: '#FFFFFF',
                        '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.3)' },
                        '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.5)' },
                        '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#7C4DFF' },
                      }}
                    >
                      <MenuItem value="HRV">HRV</MenuItem>
                      <MenuItem value="NHG">NHG</MenuItem>
                    </Select>
                  </FormControl>
                  <FormControl size="small" sx={{ minWidth: 240 }}>
                    <InputLabel sx={{ color: '#FFFFFF' }}>Status</InputLabel>
                    <Select
                      label="Status"
                      value={order.status}
                      onChange={(e) => {
                        const newStatus = String(e.target.value);
                        setNewStatus(newStatus);
                        handleStatusChange(newStatus);
                      }}
                      sx={{
                        color: '#FFFFFF',
                        '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.3)' },
                        '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.5)' },
                        '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#7C4DFF' },
                      }}
                    >
                      {Object.entries(statusOptions).map(([value, label]) => (
                        <MenuItem key={value} value={value}>{label}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  
                  {/* Workflow Action Buttons */}
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    {/* Generate Supplier PO Button */}
                    {editableOrder?.status === 'Drafting_PO_for_Supplier' && (
                      <Button
                        variant="contained"
                        startIcon={<AttachFile />}
                        onClick={handleGeneratePO}
                        disabled={isGeneratingPDF}
                        sx={{
                          bgcolor: '#7C4DFF',
                          fontSize: '0.75rem',
                          px: 2,
                          py: 0.5,
                          '&:hover': { 
                            bgcolor: '#6A3DD8',
                          },
                        }}
                      >
                        {isGeneratingPDF ? 'Generating...' : 'Generate PO for Supplier'}
                      </Button>
                    )}
                    
                    {/* Send COA to Customer Button */}
                    {editableOrder?.status === 'COA_Received' && (
                      <Button
                        variant="contained"
                        onClick={handleSendCOAToCustomer}
                        sx={{
                          backgroundColor: '#FF9800',
                          color: '#FFFFFF',
                          fontSize: '0.75rem',
                          px: 2,
                          py: 0.5,
                          '&:hover': { backgroundColor: '#F57C00' },
                        }}
                      >
                        Send COA to Customer
                      </Button>
                    )}
                    
                    {/* Send for Approval Button */}
                    {editableOrder?.status === 'COA_Accepted' && (
                      <Button
                        variant="contained"
                        onClick={() => handleFieldChange('status', 'Awaiting_Approval')}
                        sx={{
                          backgroundColor: '#9C27B0',
                          color: '#FFFFFF',
                          fontSize: '0.75rem',
                          px: 2,
                          py: 0.5,
                          '&:hover': { backgroundColor: '#8E24AA' },
                        }}
                      >
                        Send for Approval
                      </Button>
                    )}
                  </Box>
                </Box>
              </Box>
              
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Material"
                    value={editableOrder?.materialName || ''}
                    onChange={(e) => handleFieldChange('materialName', e.target.value)}
                    fullWidth
                    variant="outlined"
                    size="small"
                    sx={{
                      mb: 2,
                      '& .MuiOutlinedInput-root': {
                        backgroundColor: 'rgba(255,255,255,0.1)',
                        color: '#FFFFFF',
                        '& fieldset': { borderColor: 'rgba(255,255,255,0.2)' },
                        '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.3)' },
                        '&.Mui-focused fieldset': { borderColor: '#7C4DFF' },
                      },
                      '& .MuiInputBase-input': { color: '#FFFFFF' },
                      '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.7)' },
                    }}
                  />
                  
                  <TextField
                    label="RFID"
                    value={editableOrder?.rfid || ''}
                    onChange={(e) => handleFieldChange('rfid', e.target.value)}
                    fullWidth
                    variant="outlined"
                    size="small"
                    sx={{
                      mb: 2,
                      '& .MuiOutlinedInput-root': {
                        backgroundColor: 'rgba(255,255,255,0.1)',
                        color: '#FFFFFF',
                        '& fieldset': { borderColor: 'rgba(255,255,255,0.2)' },
                        '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.3)' },
                        '&.Mui-focused fieldset': { borderColor: '#7C4DFF' },
                      },
                      '& .MuiInputBase-input': { color: '#FFFFFF' },
                      '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.7)' },
                    }}
                  />
                  
                  <TextField
                    label="Quantity"
                    value={editableOrder?.quantity.value || ''}
                    onChange={(e) => handleFieldChange('quantity.value', parseFloat(e.target.value) || 0)}
                    InputProps={{
                      endAdornment: <InputAdornment position="end">kg</InputAdornment>,
                    }}
                    fullWidth
                    variant="outlined"
                    size="small"
                    type="number"
                    sx={{
                      mb: 2,
                      '& .MuiOutlinedInput-root': {
                        backgroundColor: 'rgba(255,255,255,0.1)',
                        color: '#FFFFFF',
                        '& fieldset': { borderColor: 'rgba(255,255,255,0.2)' },
                        '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.3)' },
                        '&.Mui-focused fieldset': { borderColor: '#7C4DFF' },
                      },
                      '& .MuiInputBase-input': { color: '#FFFFFF' },
                      '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.7)' },
                      '& .MuiInputAdornment-root': { color: 'rgba(255,255,255,0.7)' },
                    }}
                  />
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                    <FormControl size="small" sx={{ minWidth: 80 }}>
                      <InputLabel sx={{ color: 'rgba(255,255,255,0.7)' }}>Currency</InputLabel>
                      <Select
                        value={editableOrder?.priceToCustomer.currency || 'USD'}
                        onChange={(e) => handleFieldChange('priceToCustomer.currency', e.target.value)}
                        sx={{
                          color: '#FFFFFF',
                          '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.2)' },
                          '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.3)' },
                          '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#7C4DFF' },
                          '& .MuiSvgIcon-root': { color: 'rgba(255,255,255,0.7)' },
                        }}
                      >
                        {supportedCurrencies.map((currency) => (
                          <MenuItem key={currency} value={currency}>
                            {currency}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                    <TextField
                      label="Customer Price"
                      value={editableOrder?.priceToCustomer.amount || ''}
                      onChange={(e) => handleFieldChange('priceToCustomer.amount', parseFloat(e.target.value) || 0)}
                      fullWidth
                      variant="outlined"
                      size="small"
                      type="number"
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          backgroundColor: 'rgba(255,255,255,0.1)',
                          color: '#FFFFFF',
                          '& fieldset': { borderColor: 'rgba(255,255,255,0.2)' },
                          '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.3)' },
                          '&.Mui-focused fieldset': { borderColor: '#7C4DFF' },
                        },
                        '& .MuiInputBase-input': { color: '#FFFFFF' },
                        '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.7)' },
                      }}
                    />
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={() => handleCurrencyConversion('priceFromSupplier', 'priceToCustomer')}
                      disabled={isConverting}
                      sx={{
                        color: '#7C4DFF',
                        borderColor: 'rgba(124, 77, 255, 0.3)',
                        '&:hover': { borderColor: 'rgba(124, 77, 255, 0.5)' },
                        minWidth: 'auto',
                        px: 1,
                      }}
                    >
                      {isConverting ? <CircularProgress size={16} /> : '↔'}
                    </Button>
                  </Box>
                  
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <FormControl size="small" sx={{ minWidth: 80 }}>
                      <InputLabel sx={{ color: 'rgba(255,255,255,0.7)' }}>Currency</InputLabel>
                      <Select
                        value={editableOrder?.priceFromSupplier.currency || 'USD'}
                        onChange={(e) => handleFieldChange('priceFromSupplier.currency', e.target.value)}
                        sx={{
                          color: '#FFFFFF',
                          '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.2)' },
                          '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.3)' },
                          '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#7C4DFF' },
                          '& .MuiSvgIcon-root': { color: 'rgba(255,255,255,0.7)' },
                        }}
                      >
                        {supportedCurrencies.map((currency) => (
                          <MenuItem key={currency} value={currency}>
                            {currency}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                    <TextField
                      label="Supplier Price"
                      value={editableOrder?.priceFromSupplier.amount || ''}
                      onChange={(e) => handleFieldChange('priceFromSupplier.amount', parseFloat(e.target.value) || 0)}
                      fullWidth
                      variant="outlined"
                      size="small"
                      type="number"
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          backgroundColor: 'rgba(255,255,255,0.1)',
                          color: '#FFFFFF',
                          '& fieldset': { borderColor: 'rgba(255,255,255,0.2)' },
                          '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.3)' },
                          '&.Mui-focused fieldset': { borderColor: '#7C4DFF' },
                        },
                        '& .MuiInputBase-input': { color: '#FFFFFF' },
                        '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.7)' },
                      }}
                    />
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={() => handleCurrencyConversion('priceToCustomer', 'priceFromSupplier')}
                      disabled={isConverting}
                      sx={{
                        color: '#7C4DFF',
                        borderColor: 'rgba(124, 77, 255, 0.3)',
                        '&:hover': { borderColor: 'rgba(124, 77, 255, 0.5)' },
                        minWidth: 'auto',
                        px: 1,
                      }}
                    >
                      {isConverting ? <CircularProgress size={16} /> : '↔'}
                    </Button>
                  </Box>
                </Grid>
              </Grid>
              
              {/* Conversion Rate Display */}
              <Box sx={{ mt: 2, mb: 2 }}>
                <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.6)' }}>
                  {conversionRate ? `Conversion Rate: 1 ${editableOrder?.priceFromSupplier.currency || 'USD'} = ${conversionRate.toFixed(4)} ${editableOrder?.priceToCustomer.currency || 'USD'}` : 'No conversion rate available'}
                  {conversionRate && (
                    <Button
                      size="small"
                      onClick={() => {
                        setIsEditingRate(true);
                        setCustomRate(conversionRate?.toString() || '');
                      }}
                      sx={{
                        color: '#7C4DFF',
                        textTransform: 'none',
                        fontSize: '0.75rem',
                        minWidth: 'auto',
                        p: 0,
                        ml: 1,
                        textDecoration: 'underline',
                        '&:hover': { 
                          textDecoration: 'underline',
                          backgroundColor: 'transparent'
                        },
                      }}
                    >
                      (edit)
                    </Button>
                  )}
                </Typography>
                
                {/* Edit Rate Input */}
                {isEditingRate && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                    <TextField
                      size="small"
                      value={customRate}
                      onChange={(e) => setCustomRate(e.target.value)}
                      placeholder="Enter conversion rate"
                      type="number"
                      sx={{
                        width: 150,
                        '& .MuiOutlinedInput-root': {
                          backgroundColor: 'rgba(255,255,255,0.1)',
                          color: '#FFFFFF',
                          '& fieldset': { borderColor: 'rgba(255,255,255,0.2)' },
                          '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.3)' },
                          '&.Mui-focused fieldset': { borderColor: '#7C4DFF' },
                        },
                        '& .MuiInputBase-input': { color: '#FFFFFF', fontSize: '0.75rem' },
                      }}
                    />
                    <Button
                      size="small"
                      variant="contained"
                      onClick={() => {
                        handleCustomRateConversion();
                        setIsEditingRate(false);
                      }}
                      sx={{
                        bgcolor: '#7C4DFF',
                        fontSize: '0.75rem',
                        minWidth: 'auto',
                        px: 1,
                        py: 0.5,
                        '&:hover': { bgcolor: '#6B46C1' },
                      }}
                    >
                      Apply
                    </Button>
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={() => {
                        setIsEditingRate(false);
                        setCustomRate('');
                      }}
                      sx={{
                        color: 'rgba(255,255,255,0.7)',
                        borderColor: 'rgba(255,255,255,0.3)',
                        fontSize: '0.75rem',
                        minWidth: 'auto',
                        px: 1,
                        py: 0.5,
                        '&:hover': { borderColor: 'rgba(255,255,255,0.5)' },
                      }}
                    >
                      Cancel
                    </Button>
                  </Box>
                )}
              </Box>
              
              {/* Rate Fields */}
              <Grid container spacing={2} sx={{ mt: 2 }}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label={`Customer Rate (${editableOrder?.priceToCustomer.currency || 'USD'}/kg)`}
                    value={calculateCustomerRate().toFixed(2)}
                    fullWidth
                    variant="outlined"
                    size="small"
                    InputProps={{
                      readOnly: true,
                    }}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        backgroundColor: 'rgba(255,255,255,0.05)',
                        color: '#FFFFFF',
                        '& fieldset': { borderColor: 'rgba(255,255,255,0.2)' },
                      },
                      '& .MuiInputBase-input': { color: '#FFFFFF' },
                      '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.7)' },
                    }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label={`Supplier Rate (${editableOrder?.priceFromSupplier.currency || 'USD'}/kg)`}
                    value={calculateSupplierRate().toFixed(2)}
                    fullWidth
                    variant="outlined"
                    size="small"
                    InputProps={{
                      readOnly: true,
                    }}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        backgroundColor: 'rgba(255,255,255,0.05)',
                        color: '#FFFFFF',
                        '& fieldset': { borderColor: 'rgba(255,255,255,0.2)' },
                      },
                      '& .MuiInputBase-input': { color: '#FFFFFF' },
                      '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.7)' },
                    }}
                  />
                </Grid>
              </Grid>
              
              {/* Additional Order Fields */}
              <Grid container spacing={2} sx={{ mt: 2 }}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="HSN Code"
                    value={editableOrder?.hsnCode || ''}
                    onChange={(e) => handleFieldChange('hsnCode', e.target.value)}
                    fullWidth
                    variant="outlined"
                    size="small"
                    sx={{
                      mb: 2,
                      '& .MuiOutlinedInput-root': {
                        backgroundColor: 'rgba(255,255,255,0.1)',
                        color: '#FFFFFF',
                        '& fieldset': { borderColor: 'rgba(255,255,255,0.2)' },
                        '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.3)' },
                        '&.Mui-focused fieldset': { borderColor: '#7C4DFF' },
                      },
                      '& .MuiInputBase-input': { color: '#FFFFFF' },
                      '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.7)' },
                    }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Enquiry No."
                    value={editableOrder?.enquiryNo || ''}
                    onChange={(e) => handleFieldChange('enquiryNo', e.target.value)}
                    fullWidth
                    variant="outlined"
                    size="small"
                    sx={{
                      mb: 2,
                      '& .MuiOutlinedInput-root': {
                        backgroundColor: 'rgba(255,255,255,0.1)',
                        color: '#FFFFFF',
                        '& fieldset': { borderColor: 'rgba(255,255,255,0.2)' },
                        '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.3)' },
                        '&.Mui-focused fieldset': { borderColor: '#7C4DFF' },
                      },
                      '& .MuiInputBase-input': { color: '#FFFFFF' },
                      '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.7)' },
                    }}
                  />
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="UPC"
                    value={editableOrder?.upc || ''}
                    onChange={(e) => handleFieldChange('upc', e.target.value)}
                    fullWidth
                    variant="outlined"
                    size="small"
                    sx={{
                      mb: 2,
                      '& .MuiOutlinedInput-root': {
                        backgroundColor: 'rgba(255,255,255,0.1)',
                        color: '#FFFFFF',
                        '& fieldset': { borderColor: 'rgba(255,255,255,0.2)' },
                        '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.3)' },
                        '&.Mui-focused fieldset': { borderColor: '#7C4DFF' },
                      },
                      '& .MuiInputBase-input': { color: '#FFFFFF' },
                      '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.7)' },
                    }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="EAN"
                    value={editableOrder?.ean || ''}
                    onChange={(e) => handleFieldChange('ean', e.target.value)}
                    fullWidth
                    variant="outlined"
                    size="small"
                    sx={{
                      mb: 2,
                      '& .MuiOutlinedInput-root': {
                        backgroundColor: 'rgba(255,255,255,0.1)',
                        color: '#FFFFFF',
                        '& fieldset': { borderColor: 'rgba(255,255,255,0.2)' },
                        '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.3)' },
                        '&.Mui-focused fieldset': { borderColor: '#7C4DFF' },
                      },
                      '& .MuiInputBase-input': { color: '#FFFFFF' },
                      '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.7)' },
                    }}
                  />
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="MPN"
                    value={editableOrder?.mpn || ''}
                    onChange={(e) => handleFieldChange('mpn', e.target.value)}
                    fullWidth
                    variant="outlined"
                    size="small"
                    sx={{
                      mb: 2,
                      '& .MuiOutlinedInput-root': {
                        backgroundColor: 'rgba(255,255,255,0.1)',
                        color: '#FFFFFF',
                        '& fieldset': { borderColor: 'rgba(255,255,255,0.2)' },
                        '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.3)' },
                        '&.Mui-focused fieldset': { borderColor: '#7C4DFF' },
                      },
                      '& .MuiInputBase-input': { color: '#FFFFFF' },
                      '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.7)' },
                    }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="ISBN"
                    value={editableOrder?.isbn || ''}
                    onChange={(e) => handleFieldChange('isbn', e.target.value)}
                    fullWidth
                    variant="outlined"
                    size="small"
                    sx={{
                      mb: 2,
                      '& .MuiOutlinedInput-root': {
                        backgroundColor: 'rgba(255,255,255,0.1)',
                        color: '#FFFFFF',
                        '& fieldset': { borderColor: 'rgba(255,255,255,0.2)' },
                        '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.3)' },
                        '&.Mui-focused fieldset': { borderColor: '#7C4DFF' },
                      },
                      '& .MuiInputBase-input': { color: '#FFFFFF' },
                      '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.7)' },
                    }}
                  />
                </Grid>
                
                {/* Dropdown Fields */}
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth size="small" sx={{ mb: 2 }}>
                    <InputLabel sx={{ color: 'rgba(255,255,255,0.7)' }}>Inventory Account</InputLabel>
                    <Select
                      value={editableOrder?.inventoryAccount || 'Stock-In + Hand'}
                      onChange={(e) => handleFieldChange('inventoryAccount', e.target.value)}
                      sx={{
                        color: '#FFFFFF',
                        '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.2)' },
                        '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.3)' },
                        '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#7C4DFF' },
                        '& .MuiSvgIcon-root': { color: 'rgba(255,255,255,0.7)' },
                      }}
                    >
                      <MenuItem value="Stock-In + Hand">Stock-In + Hand</MenuItem>
                      <MenuItem value="Stock-In + Transit">Stock-In + Transit</MenuItem>
                      <MenuItem value="Stock-In + Quality Control">Stock-In + Quality Control</MenuItem>
                      <MenuItem value="Stock-In + Warehouse">Stock-In + Warehouse</MenuItem>
                      <MenuItem value="Stock-Out + Sold">Stock-Out + Sold</MenuItem>
                      <MenuItem value="Stock-Out + Damaged">Stock-Out + Damaged</MenuItem>
                      <MenuItem value="Stock-Out + Expired">Stock-Out + Expired</MenuItem>
                      <MenuItem value="Stock-Out + Returned">Stock-Out + Returned</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth size="small" sx={{ mb: 2 }}>
                    <InputLabel sx={{ color: 'rgba(255,255,255,0.7)' }}>Inventory Valuation Method</InputLabel>
                    <Select
                      value={editableOrder?.inventoryValuationMethod || 'FIFO(First In First Out)'}
                      onChange={(e) => handleFieldChange('inventoryValuationMethod', e.target.value)}
                      sx={{
                        color: '#FFFFFF',
                        '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.2)' },
                        '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.3)' },
                        '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#7C4DFF' },
                        '& .MuiSvgIcon-root': { color: 'rgba(255,255,255,0.7)' },
                      }}
                    >
                      <MenuItem value="FIFO(First In First Out)">FIFO(First In First Out)</MenuItem>
                      <MenuItem value="LIFO(Last In First Out)">LIFO(Last In First Out)</MenuItem>
                      <MenuItem value="Weighted Average">Weighted Average</MenuItem>
                      <MenuItem value="Moving Average">Moving Average</MenuItem>
                      <MenuItem value="Specific Identification">Specific Identification</MenuItem>
                      <MenuItem value="Standard Cost">Standard Cost</MenuItem>
                      <MenuItem value="Retail Method">Retail Method</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>
              
              </AccordionDetails>
            </Accordion>

            {/* Customer & Supplier Information */}
            <Grid container spacing={3} sx={{ mb: 3 }}>
              <Grid item xs={12} md={6}>
                <Accordion 
                  expanded={expandedSections.customerInformation}
                  onChange={handleAccordionChange('customerInformation')}
                  sx={{
                  bgcolor: 'rgba(255,255,255,0.05)', 
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 2,
                    '&:before': { display: 'none' },
                    '&.Mui-expanded': {
                      bgcolor: 'rgba(255,255,255,0.08)',
                    },
                  }}
                >
                  <AccordionSummary
                    expandIcon={<ExpandMore sx={{ color: '#FFFFFF' }} />}
                    sx={{
                      '& .MuiAccordionSummary-content': {
                        alignItems: 'center',
                      },
                    }}
                  >
                    <Typography variant="h6" sx={{ color: '#FFFFFF', fontWeight: 600 }}>
                    Customer Information
                  </Typography>
                  </AccordionSummary>
                  <AccordionDetails sx={{ pt: 0 }}>
                  <TextField
                    label="Company Name"
                    value={editableOrder?.customer.name || ''}
                    onChange={(e) => handleFieldChange('customer.name', e.target.value)}
                    fullWidth
                    variant="outlined"
                    size="small"
                    sx={{
                      mb: 2,
                      '& .MuiOutlinedInput-root': {
                        backgroundColor: 'rgba(255,255,255,0.1)',
                        color: '#FFFFFF',
                        '& fieldset': { borderColor: 'rgba(255,255,255,0.2)' },
                        '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.3)' },
                        '&.Mui-focused fieldset': { borderColor: '#7C4DFF' },
                      },
                      '& .MuiInputBase-input': { color: '#FFFFFF' },
                      '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.7)' },
                    }}
                  />
                  <TextField
                    label="Address"
                    value={editableOrder?.customer.address || ''}
                    onChange={(e) => handleFieldChange('customer.address', e.target.value)}
                    fullWidth
                    variant="outlined"
                    size="small"
                    sx={{
                      mb: 2,
                      '& .MuiOutlinedInput-root': {
                        backgroundColor: 'rgba(255,255,255,0.1)',
                        color: '#FFFFFF',
                        '& fieldset': { borderColor: 'rgba(255,255,255,0.2)' },
                        '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.3)' },
                        '&.Mui-focused fieldset': { borderColor: '#7C4DFF' },
                      },
                      '& .MuiInputBase-input': { color: '#FFFFFF' },
                      '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.7)' },
                    }}
                  />
                  <TextField
                    label="Country"
                    value={editableOrder?.customer.country || ''}
                    onChange={(e) => handleFieldChange('customer.country', e.target.value)}
                    fullWidth
                    variant="outlined"
                    size="small"
                    sx={{
                      mb: 2,
                      '& .MuiOutlinedInput-root': {
                        backgroundColor: 'rgba(255,255,255,0.1)',
                        color: '#FFFFFF',
                        '& fieldset': { borderColor: 'rgba(255,255,255,0.2)' },
                        '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.3)' },
                        '&.Mui-focused fieldset': { borderColor: '#7C4DFF' },
                      },
                      '& .MuiInputBase-input': { color: '#FFFFFF' },
                      '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.7)' },
                    }}
                  />
                  <TextField
                    label="Email"
                    value={editableOrder?.customer.email || ''}
                    onChange={(e) => handleFieldChange('customer.email', e.target.value)}
                    fullWidth
                    variant="outlined"
                    size="small"
                    sx={{
                      mb: 2,
                      '& .MuiOutlinedInput-root': {
                        backgroundColor: 'rgba(255,255,255,0.1)',
                        color: '#FFFFFF',
                        '& fieldset': { borderColor: 'rgba(255,255,255,0.2)' },
                        '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.3)' },
                        '&.Mui-focused fieldset': { borderColor: '#7C4DFF' },
                      },
                      '& .MuiInputBase-input': { color: '#FFFFFF' },
                      '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.7)' },
                    }}
                  />
                  <TextField
                    label="Phone"
                    value={editableOrder?.customer.phone || ''}
                    onChange={(e) => handleFieldChange('customer.phone', e.target.value)}
                    fullWidth
                    variant="outlined"
                    size="small"
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        backgroundColor: 'rgba(255,255,255,0.1)',
                        color: '#FFFFFF',
                        '& fieldset': { borderColor: 'rgba(255,255,255,0.2)' },
                        '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.3)' },
                        '&.Mui-focused fieldset': { borderColor: '#7C4DFF' },
                      },
                      '& .MuiInputBase-input': { color: '#FFFFFF' },
                      '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.7)' },
                    }}
                  />
                  <TextField
                    label="GSTIN/Tax ID No."
                    value={editableOrder?.customer.gstin || ''}
                    onChange={(e) => handleFieldChange('customer.gstin', e.target.value)}
                    fullWidth
                    variant="outlined"
                    size="small"
                    sx={{
                      mb: 2,
                      '& .MuiOutlinedInput-root': {
                        backgroundColor: 'rgba(255,255,255,0.1)',
                        color: '#FFFFFF',
                        '& fieldset': { borderColor: 'rgba(255,255,255,0.2)' },
                        '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.3)' },
                        '&.Mui-focused fieldset': { borderColor: '#7C4DFF' },
                      },
                      '& .MuiInputBase-input': { color: '#FFFFFF' },
                      '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.7)' },
                    }}
                  />
                  </AccordionDetails>
                </Accordion>
              </Grid>
              
              <Grid item xs={12} md={6}>
                <Accordion 
                  expanded={expandedSections.supplierInformation}
                  onChange={handleAccordionChange('supplierInformation')}
                  sx={{
                  bgcolor: 'rgba(255,255,255,0.05)', 
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 2,
                    '&:before': { display: 'none' },
                    '&.Mui-expanded': {
                      bgcolor: 'rgba(255,255,255,0.08)',
                    },
                  }}
                >
                  <AccordionSummary
                    expandIcon={<ExpandMore sx={{ color: '#FFFFFF' }} />}
                    sx={{
                      '& .MuiAccordionSummary-content': {
                        alignItems: 'center',
                      },
                    }}
                  >
                    <Typography variant="h6" sx={{ color: '#FFFFFF', fontWeight: 600 }}>
                    Supplier Information
                  </Typography>
                  </AccordionSummary>
                  <AccordionDetails sx={{ pt: 0 }}>
                  <TextField
                    label="Company Name"
                    value={editableOrder?.supplier.name || ''}
                    onChange={(e) => handleFieldChange('supplier.name', e.target.value)}
                    fullWidth
                    variant="outlined"
                    size="small"
                    sx={{
                      mb: 2,
                      '& .MuiOutlinedInput-root': {
                        backgroundColor: 'rgba(255,255,255,0.1)',
                        color: '#FFFFFF',
                        '& fieldset': { borderColor: 'rgba(255,255,255,0.2)' },
                        '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.3)' },
                        '&.Mui-focused fieldset': { borderColor: '#7C4DFF' },
                      },
                      '& .MuiInputBase-input': { color: '#FFFFFF' },
                      '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.7)' },
                    }}
                  />
                  <TextField
                    label="Address"
                    value={editableOrder?.supplier.address || ''}
                    onChange={(e) => handleFieldChange('supplier.address', e.target.value)}
                    fullWidth
                    variant="outlined"
                    size="small"
                    sx={{
                      mb: 2,
                      '& .MuiOutlinedInput-root': {
                        backgroundColor: 'rgba(255,255,255,0.1)',
                        color: '#FFFFFF',
                        '& fieldset': { borderColor: 'rgba(255,255,255,0.2)' },
                        '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.3)' },
                        '&.Mui-focused fieldset': { borderColor: '#7C4DFF' },
                      },
                      '& .MuiInputBase-input': { color: '#FFFFFF' },
                      '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.7)' },
                    }}
                  />
                  <TextField
                    label="Country"
                    value={editableOrder?.supplier.country || ''}
                    onChange={(e) => handleFieldChange('supplier.country', e.target.value)}
                    fullWidth
                    variant="outlined"
                    size="small"
                    sx={{
                      mb: 2,
                      '& .MuiOutlinedInput-root': {
                        backgroundColor: 'rgba(255,255,255,0.1)',
                        color: '#FFFFFF',
                        '& fieldset': { borderColor: 'rgba(255,255,255,0.2)' },
                        '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.3)' },
                        '&.Mui-focused fieldset': { borderColor: '#7C4DFF' },
                      },
                      '& .MuiInputBase-input': { color: '#FFFFFF' },
                      '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.7)' },
                    }}
                  />
                  <TextField
                    label="Email"
                    value={editableOrder?.supplier.email || ''}
                    onChange={(e) => handleFieldChange('supplier.email', e.target.value)}
                    fullWidth
                    variant="outlined"
                    size="small"
                    sx={{
                      mb: 2,
                      '& .MuiOutlinedInput-root': {
                        backgroundColor: 'rgba(255,255,255,0.1)',
                        color: '#FFFFFF',
                        '& fieldset': { borderColor: 'rgba(255,255,255,0.2)' },
                        '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.3)' },
                        '&.Mui-focused fieldset': { borderColor: '#7C4DFF' },
                      },
                      '& .MuiInputBase-input': { color: '#FFFFFF' },
                      '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.7)' },
                    }}
                  />
                  <TextField
                    label="Phone"
                    value={editableOrder?.supplier.phone || ''}
                    onChange={(e) => handleFieldChange('supplier.phone', e.target.value)}
                    fullWidth
                    variant="outlined"
                    size="small"
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        backgroundColor: 'rgba(255,255,255,0.1)',
                        color: '#FFFFFF',
                        '& fieldset': { borderColor: 'rgba(255,255,255,0.2)' },
                        '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.3)' },
                        '&.Mui-focused fieldset': { borderColor: '#7C4DFF' },
                      },
                      '& .MuiInputBase-input': { color: '#FFFFFF' },
                      '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.7)' },
                    }}
                  />
                  <TextField
                    label="GSTIN/Tax ID No."
                    value={editableOrder?.supplier.gstin || ''}
                    onChange={(e) => handleFieldChange('supplier.gstin', e.target.value)}
                    fullWidth
                    variant="outlined"
                    size="small"
                    sx={{
                      mb: 2,
                      '& .MuiOutlinedInput-root': {
                        backgroundColor: 'rgba(255,255,255,0.1)',
                        color: '#FFFFFF',
                        '& fieldset': { borderColor: 'rgba(255,255,255,0.2)' },
                        '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.3)' },
                        '&.Mui-focused fieldset': { borderColor: '#7C4DFF' },
                      },
                      '& .MuiInputBase-input': { color: '#FFFFFF' },
                      '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.7)' },
                    }}
                  />
                  </AccordionDetails>
                </Accordion>
              </Grid>
            </Grid>

            {/* Freight Handler Information */}
            <Accordion 
              expanded={expandedSections.freightHandlerInformation}
              onChange={handleAccordionChange('freightHandlerInformation')}
              sx={{
              mb: 3, 
              bgcolor: 'rgba(255,255,255,0.05)', 
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 2,
                '&:before': { display: 'none' },
                '&.Mui-expanded': {
                  bgcolor: 'rgba(255,255,255,0.08)',
                },
              }}
            >
              <AccordionSummary
                expandIcon={<ExpandMore sx={{ color: '#FFFFFF' }} />}
                sx={{
                  '& .MuiAccordionSummary-content': {
                    alignItems: 'center',
                  },
                }}
              >
                <Typography variant="h6" sx={{ color: '#FFFFFF', fontWeight: 600 }}>
                Freight Handler Information
              </Typography>
              </AccordionSummary>
              <AccordionDetails sx={{ pt: 0 }}>
              
              {/* Freight Handler Search */}
              <Box sx={{ position: 'relative', mb: 3 }} data-freight-handler-dropdown>
                <TextField
                  label="Search Freight Handler"
                  value={freightHandlerSearch}
                  onChange={(e) => handleFreightHandlerSearch(e.target.value)}
                  fullWidth
                  variant="outlined"
                  size="small"
                  placeholder="Type to search freight handlers..."
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Search sx={{ color: 'rgba(255,255,255,0.7)' }} />
                      </InputAdornment>
                    ),
                    endAdornment: freightHandlerSearch && (
                      <InputAdornment position="end">
                        <Button
                          size="small"
                          onClick={() => {
                            setFreightHandlerSearch('');
                            setShowFreightHandlerDropdown(false);
                          }}
                          sx={{ minWidth: 'auto', p: 0.5 }}
                        >
                          <Clear sx={{ color: 'rgba(255,255,255,0.7)' }} />
                        </Button>
                      </InputAdornment>
                    ),
                  }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      backgroundColor: 'rgba(255,255,255,0.1)',
                      color: '#FFFFFF',
                      '& fieldset': { borderColor: 'rgba(255,255,255,0.2)' },
                      '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.3)' },
                      '&.Mui-focused fieldset': { borderColor: '#7C4DFF' },
                    },
                    '& .MuiInputBase-input': { color: '#FFFFFF' },
                    '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.7)' },
                  }}
                />
                
                {/* Dropdown */}
                {showFreightHandlerDropdown && filteredFreightHandlers.length > 0 && (
                  <Paper
                    data-freight-handler-dropdown
                    sx={{
                      position: 'absolute',
                      top: '100%',
                      left: 0,
                      right: 0,
                      zIndex: 1000,
                      maxHeight: 300,
                      overflow: 'auto',
                      bgcolor: 'rgba(15, 15, 35, 0.95)',
                      border: '1px solid rgba(255,255,255,0.2)',
                      borderRadius: 1,
                      mt: 0.5,
                    }}
                  >
                    {filteredFreightHandlers.map((handler) => (
                      <Box
                        key={handler.id}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleFreightHandlerSelect(handler);
                        }}
                        sx={{
                          p: 2,
                          cursor: 'pointer',
                          borderBottom: '1px solid rgba(255,255,255,0.1)',
                          '&:hover': {
                            bgcolor: 'rgba(124, 77, 255, 0.1)',
                          },
                          '&:last-child': {
                            borderBottom: 'none',
                          },
                        }}
                      >
                        <Typography variant="subtitle2" sx={{ color: '#FFFFFF', fontWeight: 600 }}>
                          {handler.name}
                        </Typography>
                        <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                          {handler.company} • {handler.country}
                        </Typography>
                        <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)', display: 'block' }}>
                          Contact: {handler.contactPerson} • {handler.phone}
                        </Typography>
                      </Box>
                    ))}
                  </Paper>
                )}
              </Box>

              {/* Freight Handler Fields */}
              {editableOrder?.freightHandler && (
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      label="Company Name"
                      value={editableOrder.freightHandler.company || ''}
                      onChange={(e) => handleFreightHandlerFieldChange('company', e.target.value)}
                      fullWidth
                      variant="outlined"
                      size="small"
                      sx={{
                        mb: 2,
                        '& .MuiOutlinedInput-root': {
                          backgroundColor: 'rgba(255,255,255,0.1)',
                          color: '#FFFFFF',
                          '& fieldset': { borderColor: 'rgba(255,255,255,0.2)' },
                          '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.3)' },
                          '&.Mui-focused fieldset': { borderColor: '#7C4DFF' },
                        },
                        '& .MuiInputBase-input': { color: '#FFFFFF' },
                        '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.7)' },
                      }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      label="Contact Person"
                      value={editableOrder.freightHandler.contactPerson || ''}
                      onChange={(e) => handleFreightHandlerFieldChange('contactPerson', e.target.value)}
                      fullWidth
                      variant="outlined"
                      size="small"
                      sx={{
                        mb: 2,
                        '& .MuiOutlinedInput-root': {
                          backgroundColor: 'rgba(255,255,255,0.1)',
                          color: '#FFFFFF',
                          '& fieldset': { borderColor: 'rgba(255,255,255,0.2)' },
                          '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.3)' },
                          '&.Mui-focused fieldset': { borderColor: '#7C4DFF' },
                        },
                        '& .MuiInputBase-input': { color: '#FFFFFF' },
                        '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.7)' },
                      }}
                    />
                  </Grid>
                  
                  <Grid item xs={12}>
                    <TextField
                      label="Address"
                      value={editableOrder.freightHandler.address || ''}
                      onChange={(e) => handleFreightHandlerFieldChange('address', e.target.value)}
                      fullWidth
                      variant="outlined"
                      size="small"
                      sx={{
                        mb: 2,
                        '& .MuiOutlinedInput-root': {
                          backgroundColor: 'rgba(255,255,255,0.1)',
                          color: '#FFFFFF',
                          '& fieldset': { borderColor: 'rgba(255,255,255,0.2)' },
                          '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.3)' },
                          '&.Mui-focused fieldset': { borderColor: '#7C4DFF' },
                        },
                        '& .MuiInputBase-input': { color: '#FFFFFF' },
                        '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.7)' },
                      }}
                    />
                  </Grid>
                  
                  <Grid item xs={12} sm={4}>
                    <TextField
                      label="Country"
                      value={editableOrder.freightHandler.country || ''}
                      onChange={(e) => handleFreightHandlerFieldChange('country', e.target.value)}
                      fullWidth
                      variant="outlined"
                      size="small"
                      sx={{
                        mb: 2,
                        '& .MuiOutlinedInput-root': {
                          backgroundColor: 'rgba(255,255,255,0.1)',
                          color: '#FFFFFF',
                          '& fieldset': { borderColor: 'rgba(255,255,255,0.2)' },
                          '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.3)' },
                          '&.Mui-focused fieldset': { borderColor: '#7C4DFF' },
                        },
                        '& .MuiInputBase-input': { color: '#FFFFFF' },
                        '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.7)' },
                      }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <TextField
                      label="Email"
                      value={editableOrder.freightHandler.email || ''}
                      onChange={(e) => handleFreightHandlerFieldChange('email', e.target.value)}
                      fullWidth
                      variant="outlined"
                      size="small"
                      sx={{
                        mb: 2,
                        '& .MuiOutlinedInput-root': {
                          backgroundColor: 'rgba(255,255,255,0.1)',
                          color: '#FFFFFF',
                          '& fieldset': { borderColor: 'rgba(255,255,255,0.2)' },
                          '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.3)' },
                          '&.Mui-focused fieldset': { borderColor: '#7C4DFF' },
                        },
                        '& .MuiInputBase-input': { color: '#FFFFFF' },
                        '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.7)' },
                      }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <TextField
                      label="Phone"
                      value={editableOrder.freightHandler.phone || ''}
                      onChange={(e) => handleFreightHandlerFieldChange('phone', e.target.value)}
                      fullWidth
                      variant="outlined"
                      size="small"
                      sx={{
                        mb: 2,
                        '& .MuiOutlinedInput-root': {
                          backgroundColor: 'rgba(255,255,255,0.1)',
                          color: '#FFFFFF',
                          '& fieldset': { borderColor: 'rgba(255,255,255,0.2)' },
                          '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.3)' },
                          '&.Mui-focused fieldset': { borderColor: '#7C4DFF' },
                        },
                        '& .MuiInputBase-input': { color: '#FFFFFF' },
                        '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.7)' },
                      }}
                    />
                  </Grid>
                  
                  <Grid item xs={12} sm={6}>
                    <TextField
                      label="GSTIN/Tax ID"
                      value={editableOrder.freightHandler.gstin || ''}
                      onChange={(e) => handleFreightHandlerFieldChange('gstin', e.target.value)}
                      fullWidth
                      variant="outlined"
                      size="small"
                      sx={{
                        mb: 2,
                        '& .MuiOutlinedInput-root': {
                          backgroundColor: 'rgba(255,255,255,0.1)',
                          color: '#FFFFFF',
                          '& fieldset': { borderColor: 'rgba(255,255,255,0.2)' },
                          '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.3)' },
                          '&.Mui-focused fieldset': { borderColor: '#7C4DFF' },
                        },
                        '& .MuiInputBase-input': { color: '#FFFFFF' },
                        '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.7)' },
                      }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      label="Tracking Number"
                      value={editableOrder.freightHandler.trackingNumber || ''}
                      onChange={(e) => handleFreightHandlerFieldChange('trackingNumber', e.target.value)}
                      fullWidth
                      variant="outlined"
                      size="small"
                      sx={{
                        mb: 2,
                        '& .MuiOutlinedInput-root': {
                          backgroundColor: 'rgba(255,255,255,0.1)',
                          color: '#FFFFFF',
                          '& fieldset': { borderColor: 'rgba(255,255,255,0.2)' },
                          '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.3)' },
                          '&.Mui-focused fieldset': { borderColor: '#7C4DFF' },
                        },
                        '& .MuiInputBase-input': { color: '#FFFFFF' },
                        '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.7)' },
                      }}
                    />
                  </Grid>
                  
                  <Grid item xs={12} sm={6}>
                    <TextField
                      label="Shipping Method"
                      value={editableOrder.freightHandler.shippingMethod || ''}
                      onChange={(e) => handleFreightHandlerFieldChange('shippingMethod', e.target.value)}
                      fullWidth
                      variant="outlined"
                      size="small"
                      sx={{
                        mb: 2,
                        '& .MuiOutlinedInput-root': {
                          backgroundColor: 'rgba(255,255,255,0.1)',
                          color: '#FFFFFF',
                          '& fieldset': { borderColor: 'rgba(255,255,255,0.2)' },
                          '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.3)' },
                          '&.Mui-focused fieldset': { borderColor: '#7C4DFF' },
                        },
                        '& .MuiInputBase-input': { color: '#FFFFFF' },
                        '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.7)' },
                      }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      label="Estimated Delivery"
                      value={editableOrder.freightHandler.estimatedDelivery || ''}
                      onChange={(e) => handleFreightHandlerFieldChange('estimatedDelivery', e.target.value)}
                      fullWidth
                      variant="outlined"
                      size="small"
                      sx={{
                        mb: 2,
                        '& .MuiOutlinedInput-root': {
                          backgroundColor: 'rgba(255,255,255,0.1)',
                          color: '#FFFFFF',
                          '& fieldset': { borderColor: 'rgba(255,255,255,0.2)' },
                          '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.3)' },
                          '&.Mui-focused fieldset': { borderColor: '#7C4DFF' },
                        },
                        '& .MuiInputBase-input': { color: '#FFFFFF' },
                        '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.7)' },
                      }}
                    />
                  </Grid>
                  
                  <Grid item xs={12}>
                    <TextField
                      label="Notes"
                      value={editableOrder.freightHandler.notes || ''}
                      onChange={(e) => handleFreightHandlerFieldChange('notes', e.target.value)}
                      fullWidth
                      multiline
                      rows={3}
                      variant="outlined"
                      size="small"
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          backgroundColor: 'rgba(255,255,255,0.1)',
                          color: '#FFFFFF',
                          '& fieldset': { borderColor: 'rgba(255,255,255,0.2)' },
                          '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.3)' },
                          '&.Mui-focused fieldset': { borderColor: '#7C4DFF' },
                        },
                        '& .MuiInputBase-input': { color: '#FFFFFF' },
                        '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.7)' },
                      }}
                    />
                  </Grid>
                </Grid>
              )}
              </AccordionDetails>
            </Accordion>

            {/* Documents */}
            <Accordion 
              expanded={expandedSections.documents}
              onChange={handleAccordionChange('documents')}
              sx={{
              mb: 3, 
              bgcolor: 'rgba(255,255,255,0.05)', 
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 2,
                '&:before': { display: 'none' },
                '&.Mui-expanded': {
                  bgcolor: 'rgba(255,255,255,0.08)',
                },
              }}
            >
              <AccordionSummary
                expandIcon={<ExpandMore sx={{ color: '#FFFFFF' }} />}
                sx={{
                  '& .MuiAccordionSummary-content': {
                    alignItems: 'center',
                  },
                }}
              >
                <Typography variant="h6" sx={{ color: '#FFFFFF', fontWeight: 600 }}>
                Documents
              </Typography>
              </AccordionSummary>
              <AccordionDetails sx={{ pt: 0 }}>
              
              {/* Generated Supplier PO */}
              {generatedPDF && (
                <Box sx={{ mb: 3 }}>
                  <Typography variant="subtitle1" sx={{ color: '#FFFFFF', mb: 1 }}>
                    Generated Supplier PO
                  </Typography>
                  <Box sx={{ 
                    border: '1px solid rgba(255,255,255,0.2)', 
                    borderRadius: 1,
                    p: 2,
                    bgcolor: 'rgba(255,255,255,0.05)'
                  }}>
                    <iframe
                      src={generatedPDF}
                      width="100%"
                      height="600"
                      style={{ border: 'none', borderRadius: '4px' }}
                      title="Generated Supplier PO"
                    />
                    <Box sx={{ mt: 2, display: 'flex', gap: 2 }}>
                      <Button
                        variant="outlined"
                        size="small"
                        onClick={() => {
                          const link = document.createElement('a');
                          link.href = generatedPDF;
                          link.download = `${editableOrder?.entity || 'HRV'}_Supplier_PO_${editableOrder?.orderId}.pdf`;
                          link.click();
                        }}
                        sx={{
                          color: '#7C4DFF',
                          borderColor: '#7C4DFF',
                          '&:hover': {
                            borderColor: '#6A3DD8',
                            bgcolor: 'rgba(124, 77, 255, 0.1)'
                          }
                        }}
                      >
                        Download PDF
                      </Button>
                      <Button
                        variant="outlined"
                        size="small"
                        onClick={handleAttachPDF}
                        sx={{
                          color: '#4CAF50',
                          borderColor: '#4CAF50',
                          '&:hover': {
                            borderColor: '#45A049',
                            bgcolor: 'rgba(76, 175, 80, 0.1)'
                          }
                        }}
                      >
                        Attach
                      </Button>
                      <Button
                        variant="outlined"
                        size="small"
                        onClick={() => setGeneratedPDF(null)}
                        sx={{
                          color: '#FF6B6B',
                          borderColor: '#FF6B6B',
                          '&:hover': {
                            borderColor: '#FF5252',
                            bgcolor: 'rgba(255, 107, 107, 0.1)'
                          }
                        }}
                      >
                        Remove
                      </Button>
                    </Box>
                  </Box>
                </Box>
              )}
              
              <Grid container spacing={2}>
                {Object.entries(order.documents).map(([docType, doc]) => {
                  if (!doc) return null;
                  return (
                    <Grid item xs={12} sm={6} md={4} key={docType}>
                      <Card sx={{ 
                        bgcolor: 'rgba(255,255,255,0.05)', 
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: 2,
                      }}>
                        <CardContent>
                          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                            <AttachFile sx={{ mr: 1, color: '#7C4DFF' }} />
                            <Typography variant="subtitle2" sx={{ color: '#FFFFFF', fontWeight: 600 }}>
                              {docType.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                            </Typography>
                          </Box>
                          <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)', mb: 1 }}>
                            {doc.filename}
                          </Typography>
                          <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.6)' }}>
                            Uploaded: {formatDate(doc.uploadedAt)}
                          </Typography>
                          <Box sx={{ mt: 1, display: 'flex', gap: 1 }}>
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
                                color: '#7C4DFF',
                                '&:hover': { bgcolor: 'rgba(124, 77, 255, 0.1)' }
                              }}
                            >
                              View
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
                                color: '#7C4DFF',
                                '&:hover': { bgcolor: 'rgba(124, 77, 255, 0.1)' }
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
              
              {/* Conditional Document Uploads */}
              <Box sx={{ mt: 3 }}>
                
                {/* Proforma Invoice Upload */}
                {editableOrder?.status === 'PO_Sent_to_Supplier' && (
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle1" sx={{ color: '#FFFFFF', mb: 1 }}>
                      Upload Proforma Invoice
                    </Typography>
                    <Button
                      variant="outlined"
                      component="label"
                      startIcon={<CloudUpload />}
                      sx={{
                        color: '#7C4DFF',
                        borderColor: '#7C4DFF',
                        '&:hover': { 
                          borderColor: '#6A3DD8',
                          bgcolor: 'rgba(124, 77, 255, 0.1)'
                        },
                      }}
                    >
                      Choose Proforma Invoice PDF
                      <input
                        type="file"
                        hidden
                        accept=".pdf"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            handleFileUpload(file, 'proformaInvoice');
                          }
                        }}
                      />
                    </Button>
                  </Box>
                )}
                
                {/* COA Upload for Awaiting COA status */}
                {editableOrder?.status === 'Awaiting_COA' && (
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle1" sx={{ color: '#FFFFFF', mb: 1 }}>
                      Upload COA Document
                    </Typography>
                    <Button
                      variant="outlined"
                      component="label"
                      startIcon={<CloudUpload />}
                      sx={{
                        color: '#7C4DFF',
                        borderColor: '#7C4DFF',
                        '&:hover': { 
                          borderColor: '#6A3DD8',
                          bgcolor: 'rgba(124, 77, 255, 0.1)'
                        },
                      }}
                    >
                      Choose COA PDF
                      <input
                        type="file"
                        hidden
                        accept=".pdf"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            handleFileUpload(file, 'coaPreShipment');
                          }
                        }}
                      />
                    </Button>
                  </Box>
                )}
                
                {/* COA Upload for COA Revision status */}
                {editableOrder?.status === 'COA_Revision' && (
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle1" sx={{ color: '#FFFFFF', mb: 1 }}>
                      Upload Revised COA Document
                    </Typography>
                    <Button
                      variant="outlined"
                      component="label"
                      startIcon={<CloudUpload />}
                      sx={{
                        color: '#7C4DFF',
                        borderColor: '#7C4DFF',
                        '&:hover': { 
                          borderColor: '#6A3DD8',
                          bgcolor: 'rgba(124, 77, 255, 0.1)'
                        },
                      }}
                    >
                      Choose Revised COA PDF
                      <input
                        type="file"
                        hidden
                        accept=".pdf"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            handleFileUpload(file, 'coaPreShipment');
                          }
                        }}
                      />
                    </Button>
                  </Box>
                )}
              </Box>
              </AccordionDetails>
            </Accordion>


            {/* Advance Payment (if applicable) */}
            {order.advancePayment && (
              <Accordion 
                expanded={expandedSections.advancePaymentDetails}
                onChange={handleAccordionChange('advancePaymentDetails')}
                sx={{
                mb: 3, 
                bgcolor: 'rgba(255,255,255,0.05)', 
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 2,
                  '&:before': { display: 'none' },
                  '&.Mui-expanded': {
                    bgcolor: 'rgba(255,255,255,0.08)',
                  },
                }}
              >
                <AccordionSummary
                  expandIcon={<ExpandMore sx={{ color: '#FFFFFF' }} />}
                  sx={{
                    '& .MuiAccordionSummary-content': {
                      alignItems: 'center',
                    },
                  }}
                >
                  <Typography variant="h6" sx={{ color: '#FFFFFF', fontWeight: 600 }}>
                    Advance Payment Details
                </Typography>
                </AccordionSummary>
                <AccordionDetails sx={{ pt: 0 }}>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle2" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                      Transaction ID
                    </Typography>
                    <Typography variant="body1" sx={{ color: '#FFFFFF' }}>
                      {order.advancePayment.transactionId}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle2" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                      Amount
                    </Typography>
                    <Typography variant="body1" sx={{ color: '#FFFFFF' }}>
                      {formatCurrency(order.advancePayment.amount, order.advancePayment.currency)}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle2" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                      Date
                    </Typography>
                    <Typography variant="body1" sx={{ color: '#FFFFFF' }}>
                      {formatDate(order.advancePayment.date)}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle2" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                      Made By
                    </Typography>
                    <Typography variant="body1" sx={{ color: '#FFFFFF' }}>
                      {order.advancePayment.madeBy.name}
                    </Typography>
                  </Grid>
                </Grid>
                </AccordionDetails>
              </Accordion>
            )}

            {/* Payment Details (for approved orders and beyond) */}
            {editableOrder?.status && ['Approved', 'Advance_Payment_Completed', 'Material_to_be_Dispatched', 'Material_Dispatched', 'In_Transit'].includes(editableOrder.status) && (
              <Paper sx={{ 
                p: 3, 
                mb: 3, 
                bgcolor: 'rgba(255,255,255,0.05)', 
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 2,
              }}>
                <Typography variant="h6" sx={{ color: '#FFFFFF', fontWeight: 600, mb: 2 }}>
                  Payment Details
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      label="Payment Method"
                      value={editableOrder?.paymentDetails?.paymentMethod || ''}
                      onChange={(e) => handleFieldChange('paymentDetails', { 
                        ...editableOrder?.paymentDetails, 
                        paymentMethod: e.target.value 
                      })}
                      fullWidth
                      variant="outlined"
                      size="small"
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          backgroundColor: 'rgba(255,255,255,0.1)',
                          color: '#FFFFFF',
                          '& fieldset': { borderColor: 'rgba(255,255,255,0.2)' },
                          '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.3)' },
                          '&.Mui-focused fieldset': { borderColor: '#7C4DFF' },
                        },
                        '& .MuiInputBase-input': { color: '#FFFFFF' },
                        '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.7)' },
                      }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      label="Payment Terms"
                      value={editableOrder?.paymentDetails?.paymentTerms || ''}
                      onChange={(e) => handleFieldChange('paymentDetails', { 
                        ...editableOrder?.paymentDetails, 
                        paymentTerms: e.target.value 
                      })}
                      fullWidth
                      variant="outlined"
                      size="small"
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          backgroundColor: 'rgba(255,255,255,0.1)',
                          color: '#FFFFFF',
                          '& fieldset': { borderColor: 'rgba(255,255,255,0.2)' },
                          '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.3)' },
                          '&.Mui-focused fieldset': { borderColor: '#7C4DFF' },
                        },
                        '& .MuiInputBase-input': { color: '#FFFFFF' },
                        '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.7)' },
                      }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      label="Due Date"
                      type="date"
                      value={editableOrder?.paymentDetails?.dueDate || ''}
                      onChange={(e) => handleFieldChange('paymentDetails', { 
                        ...editableOrder?.paymentDetails, 
                        dueDate: e.target.value 
                      })}
                      fullWidth
                      variant="outlined"
                      size="small"
                      InputLabelProps={{ shrink: true }}
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          backgroundColor: 'rgba(255,255,255,0.1)',
                          color: '#FFFFFF',
                          '& fieldset': { borderColor: 'rgba(255,255,255,0.2)' },
                          '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.3)' },
                          '&.Mui-focused fieldset': { borderColor: '#7C4DFF' },
                        },
                        '& .MuiInputBase-input': { color: '#FFFFFF' },
                        '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.7)' },
                      }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      label="Amount"
                      type="number"
                      value={editableOrder?.paymentDetails?.amount || ''}
                      onChange={(e) => handleFieldChange('paymentDetails', { 
                        ...editableOrder?.paymentDetails, 
                        amount: parseFloat(e.target.value) || 0 
                      })}
                      fullWidth
                      variant="outlined"
                      size="small"
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          backgroundColor: 'rgba(255,255,255,0.1)',
                          color: '#FFFFFF',
                          '& fieldset': { borderColor: 'rgba(255,255,255,0.2)' },
                          '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.3)' },
                          '&.Mui-focused fieldset': { borderColor: '#7C4DFF' },
                        },
                        '& .MuiInputBase-input': { color: '#FFFFFF' },
                        '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.7)' },
                      }}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      label="Bank Details"
                      multiline
                      rows={3}
                      value={editableOrder?.paymentDetails?.bankDetails || ''}
                      onChange={(e) => handleFieldChange('paymentDetails', { 
                        ...editableOrder?.paymentDetails, 
                        bankDetails: e.target.value 
                      })}
                      fullWidth
                      variant="outlined"
                      size="small"
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          backgroundColor: 'rgba(255,255,255,0.1)',
                          color: '#FFFFFF',
                          '& fieldset': { borderColor: 'rgba(255,255,255,0.2)' },
                          '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.3)' },
                          '&.Mui-focused fieldset': { borderColor: '#7C4DFF' },
                        },
                        '& .MuiInputBase-input': { color: '#FFFFFF' },
                        '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.7)' },
                      }}
                    />
                  </Grid>
                </Grid>
              </Paper>
            )}

            {/* Actions removed as per request */}
          </Grid>

          {/* Right Sidebar */}
          <Grid item xs={12} md={4}>
            {/* Timeline */}
            <Paper sx={{ 
              p: 3, 
              mb: 3, 
              bgcolor: 'rgba(255,255,255,0.05)', 
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 2,
            }}>
              <Typography variant="h6" sx={{ color: '#FFFFFF', fontWeight: 600, mb: 2 }}>
                Timeline
              </Typography>
              <List dense>
                {order.timeline.map((event) => (
                  <ListItem key={event.id}>
                    <ListItemIcon>
                      <Timeline sx={{ color: '#7C4DFF' }} />
                    </ListItemIcon>
                    <ListItemText
                      primary={
                        <Typography variant="body1" sx={{ color: '#FFFFFF', fontWeight: 600 }}>
                          {event.event}
                        </Typography>
                      }
                      secondary={
                        <Box>
                          <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)' }}>
                            {event.details}
                          </Typography>
                          <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.6)' }}>
                            {formatDate(event.timestamp)} by {event.actor.name}
                          </Typography>
                        </Box>
                      }
                    />
                  </ListItem>
                ))}
              </List>
            </Paper>

            {/* Comments */}
            <Paper sx={{ 
              p: 3, 
              mb: 3, 
              bgcolor: 'rgba(255,255,255,0.05)', 
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 2,
            }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="h6" sx={{ color: '#FFFFFF', fontWeight: 600 }}>
                  Comments
                </Typography>
                <Button 
                  size="small" 
                  variant="outlined" 
                  startIcon={<Comment />} 
                  onClick={() => setCommentDialogOpen(true)}
                  sx={{
                    color: '#FFFFFF',
                    borderColor: 'rgba(255,255,255,0.3)',
                    '&:hover': { borderColor: 'rgba(255,255,255,0.5)' },
                  }}
                >
                  Add Comment
                </Button>
              </Box>
              <List dense>
                {order.comments.map((comment) => (
                  <ListItem key={comment.id}>
                    <ListItemIcon>
                      <Comment sx={{ color: '#7C4DFF' }} />
                    </ListItemIcon>
                    <ListItemText
                      primary={
                        <Typography variant="body1" sx={{ color: '#FFFFFF' }}>
                          {comment.message}
                        </Typography>
                      }
                      secondary={
                        <Box>
                          <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.6)' }}>
                            {formatDate(comment.timestamp)} by {comment.userName}
                          </Typography>
                          {comment.isInternal && (
                            <Chip label="Internal" size="small" color="primary" sx={{ ml: 1 }} />
                          )}
                        </Box>
                      }
                    />
                  </ListItem>
                ))}
              </List>
            </Paper>

            {/* Audit Logs */}
            <Paper sx={{
              p: 3,
              bgcolor: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 2,
            }}>
              <Typography variant="h6" sx={{ color: '#FFFFFF', fontWeight: 600, mb: 2 }}>
                Audit Logs
              </Typography>
              <List dense>
                {order.auditLogs.slice(-5).map((log, index) => (
                  <ListItem key={index}>
                    <ListItemIcon>
                      <History sx={{ color: '#7C4DFF' }} />
                    </ListItemIcon>
                    <ListItemText
                      primary={
                        <Typography variant="body1" sx={{ color: '#FFFFFF', fontWeight: 600 }}>
                          {`${log.fieldChanged}: ${log.oldValue} → ${log.newValue}`}
                        </Typography>
                      }
                      secondary={
                        <Box>
                          <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.6)' }}>
                            {formatDate(log.timestamp)} by {log.userName}
                          </Typography>
                          {log.note && (
                            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.6)', display: 'block' }}>
                              {log.note}
                            </Typography>
                          )}
                        </Box>
                      }
                    />
                  </ListItem>
                ))}
              </List>
            </Paper>
          </Grid>
        </Grid>
        
        {/* Floating Save Button */}
        {hasChanges && (
          <Fab
            color="primary"
            aria-label="save"
            onClick={handleSaveChanges}
            sx={{
              position: 'fixed',
              bottom: 24,
              right: 24,
              bgcolor: '#7C4DFF',
              '&:hover': { bgcolor: '#6B46C1' },
              zIndex: 1000,
            }}
          >
            <Save />
          </Fab>
        )}
      </Container>

      {/* Comment Dialog */}
      <Dialog open={commentDialogOpen} onClose={() => setCommentDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add Comment</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Comment"
            fullWidth
            multiline
            rows={4}
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCommentDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleAddComment} variant="contained">Add Comment</Button>
        </DialogActions>
      </Dialog>

      {/* Status Change Dialog */}
      {/* Status change dialog removed; status is now inline dropdown */}

      {/* Document Viewer Dialog */}
      <Dialog 
        open={viewingDocument !== null} 
        onClose={() => setViewingDocument(null)} 
        maxWidth="lg" 
        fullWidth
        PaperProps={{
          sx: {
            bgcolor: 'rgba(15, 15, 35, 0.95)',
            border: '1px solid rgba(124, 77, 255, 0.3)',
          }
        }}
      >
        <DialogTitle sx={{ color: '#FFFFFF', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">
              {viewingDocument?.name || 'Document Viewer'}
            </Typography>
            <Button
              onClick={() => setViewingDocument(null)}
              sx={{ color: 'rgba(255,255,255,0.7)' }}
            >
              Close
            </Button>
          </Box>
        </DialogTitle>
        <DialogContent sx={{ p: 0, minHeight: '70vh' }}>
          {viewingDocument && viewingDocument.data && (
            <iframe
              src={viewingDocument.data}
              width="100%"
              height="700px"
              style={{ border: 'none' }}
              title={viewingDocument.name}
            />
          )}
          {viewingDocument && !viewingDocument.data && (
            <Box sx={{ p: 4, textAlign: 'center' }}>
              <Typography variant="body1" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                Document preview not available. The document data is missing.
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ borderTop: '1px solid rgba(255,255,255,0.1)', p: 2 }}>
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
                bgcolor: '#7C4DFF',
                '&:hover': { bgcolor: '#6B46C1' },
              }}
            >
              Download
            </Button>
          )}
          <Button 
            onClick={() => setViewingDocument(null)}
            sx={{ color: '#FFFFFF' }}
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Tax Rate Selection Dialog */}
      <Dialog
        open={taxRateDialogOpen}
        onClose={() => setTaxRateDialogOpen(false)}
        maxWidth="xs"
        fullWidth
        PaperProps={{
          sx: {
            background: 'linear-gradient(135deg, #1A1A2E 0%, #16213E 100%)',
            border: '1px solid rgba(124, 77, 255, 0.3)',
          }
        }}
      >
        <DialogTitle sx={{ color: '#FFFFFF', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
          Select Tax Rate
        </DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          <FormControl fullWidth sx={{ mt: 1 }}>
            <InputLabel sx={{ color: '#FFFFFF' }}>Tax Rate</InputLabel>
            <Select
              value={selectedTaxRate}
              onChange={(e) => setSelectedTaxRate(Number(e.target.value))}
              label="Tax Rate"
              sx={{
                color: '#FFFFFF',
                '.MuiOutlinedInput-notchedOutline': {
                  borderColor: 'rgba(124, 77, 255, 0.3)',
                },
                '&:hover .MuiOutlinedInput-notchedOutline': {
                  borderColor: 'rgba(124, 77, 255, 0.5)',
                },
                '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                  borderColor: '#7C4DFF',
                },
                '.MuiSvgIcon-root': {
                  color: '#FFFFFF',
                },
              }}
            >
              <MenuItem value={0}>Zero Tax (0%)</MenuItem>
              <MenuItem value={0.1}>0.1%</MenuItem>
              <MenuItem value={5}>5%</MenuItem>
              <MenuItem value={18}>18%</MenuItem>
              <MenuItem value={28}>28%</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions sx={{ borderTop: '1px solid rgba(255,255,255,0.1)', p: 2 }}>
          <Button
            onClick={() => setTaxRateDialogOpen(false)}
            sx={{ color: '#FFFFFF' }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={() => handleGeneratePOWithTax(selectedTaxRate)}
            sx={{
              bgcolor: '#7C4DFF',
              '&:hover': { bgcolor: '#6B46C1' },
            }}
          >
            Generate PO
          </Button>
        </DialogActions>
      </Dialog>

      {/* AI PDF Generation Modal */}
      {order && (
        <AIPDFGenerationModal
          open={aiPdfModalOpen}
          onClose={() => setAiPdfModalOpen(false)}
          order={order}
        />
      )}
    </Box>
  );
};

export default OrderDetailPage;
