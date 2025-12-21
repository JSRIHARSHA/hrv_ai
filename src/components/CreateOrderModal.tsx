import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
  Autocomplete,
  Paper,
  IconButton,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import {
  Close,
  Upload,
  Save,
  SmartToy,
  Edit,
  Create,
} from '@mui/icons-material';
import { ContactInfo, MaterialItem } from '../types';
import { Supplier, searchSuppliers, getSuppliers, initializeSuppliers, clearSuppliersCache } from '../data/suppliers';
import { PDFExtractorService, PDFExtractionResult } from '../services/pdfExtractorService';
import { GeminiPDFExtractorService } from '../services/geminiPdfExtractor';
import type { PurchaseOrder } from '../types';
import { useDropzone } from 'react-dropzone';
import toast from 'react-hot-toast';
import AssignConsignmentsModal from './AssignConsignmentsModal';

interface CreateOrderModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (orderData: CreateOrderData) => void;
}

export interface Consignment {
  id: string;
  name: string;
  materials: MaterialItem[];
}

interface CreateOrderData {
  pdfFile: File | null;
  supplier: ContactInfo;
  extractedData?: PDFExtractionResult;
  geminiData?: PurchaseOrder;
  entity?: 'HRV' | 'NHG';
  poType?: 'Direct PO' | 'Sample PO' | 'Service PO';
  consignments?: Consignment[];
  // Manual entry fields
  manualEntry?: {
    materialName: string;
    quantity: { value: number; unit: string };
    customer: ContactInfo;
    priceToCustomer: { amount: number; currency: string };
    priceFromSupplier: { amount: number; currency: string };
  };
}

const CreateOrderModal: React.FC<CreateOrderModalProps> = ({ open, onClose, onSubmit }) => {
  const pdfExtractor = PDFExtractorService.getInstance();
  const geminiExtractor = GeminiPDFExtractorService.getInstance();
  
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [supplier, setSupplier] = useState<ContactInfo | null>(null);
  const [supplierSearch, setSupplierSearch] = useState('');
  const [supplierOptions, setSupplierOptions] = useState<Supplier[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pdfExtractionResult, setPdfExtractionResult] = useState<PDFExtractionResult | null>(null);
  const [geminiExtractionResult, setGeminiExtractionResult] = useState<PurchaseOrder | null>(null);
  const [isExtractingPDF, setIsExtractingPDF] = useState(false);
  const [useGemini, setUseGemini] = useState(true); // Default to using Gemini
  const [entity, setEntity] = useState<'HRV' | 'NHG' | ''>('');
  const [poType, setPoType] = useState<'Direct PO' | 'Sample PO' | 'Service PO' | ''>('');
  const [showConsignmentsModal, setShowConsignmentsModal] = useState(false);
  const [extractedMaterials, setExtractedMaterials] = useState<MaterialItem[]>([]);
  const [manualMode, setManualMode] = useState(false);
  
  // Manual entry fields
  const [materialName, setMaterialName] = useState('');
  const [quantityValue, setQuantityValue] = useState<number>(0);
  const [quantityUnit, setQuantityUnit] = useState<string>('g');
  const [customer, setCustomer] = useState<ContactInfo>({
    name: '',
    address: '',
    country: 'India',
    email: '',
    phone: '',
    gstin: '',
  });
  const [priceToCustomer, setPriceToCustomer] = useState({ amount: 0, currency: 'USD' });
  const [priceFromSupplier, setPriceFromSupplier] = useState({ amount: 0, currency: 'USD' });

  useEffect(() => {
    const updateSupplierOptions = async () => {
      try {
        // Ensure suppliers are loaded first
        const suppliers = await getSuppliers();
        
        if (supplierSearch.trim()) {
          const filteredSuppliers = searchSuppliers(supplierSearch, suppliers);
          setSupplierOptions(filteredSuppliers);
        } else {
          // Show all suppliers when search is empty (for dropdown to work)
          const allSuppliers = searchSuppliers('', suppliers);
          setSupplierOptions(allSuppliers);
        }
      } catch (error) {
        console.error('Error loading suppliers:', error);
        // Fallback to sync method
        if (supplierSearch.trim()) {
          const filteredSuppliers = searchSuppliers(supplierSearch);
          setSupplierOptions(filteredSuppliers);
        } else {
          const allSuppliers = searchSuppliers('');
          setSupplierOptions(allSuppliers);
        }
      }
    };
    updateSupplierOptions();
  }, [supplierSearch]);

  // Load suppliers when manual mode is activated
  useEffect(() => {
    const loadSuppliers = async () => {
      if (manualMode) {
        try {
          // Load suppliers from API or CSV
          const suppliers = await getSuppliers();
          // Load all suppliers for dropdown
          const allSuppliers = searchSuppliers('', suppliers);
          setSupplierOptions(allSuppliers);
          console.log('Suppliers loaded for manual mode:', allSuppliers.length);
        } catch (error) {
          console.error('Error loading suppliers:', error);
          // Fallback to sync method
          const allSuppliers = searchSuppliers('');
          setSupplierOptions(allSuppliers);
        }
      }
    };
    loadSuppliers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [manualMode]);

  // Auto-extract PDF data when file is uploaded
  useEffect(() => {
    if (pdfFile && pdfFile.type === 'application/pdf' && !isExtractingPDF) {
      handlePDFExtraction();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pdfFile]);

  // Load suppliers when modal opens (force fresh load from Supabase)
  useEffect(() => {
    const loadSuppliersOnOpen = async () => {
      if (open) {
        try {
          // Clear cache to ensure fresh data from Supabase/API
          clearSuppliersCache();
          // Pre-load suppliers when modal opens
          const freshSuppliers = await getSuppliers();
          // Update supplier options immediately
          const allSuppliers = searchSuppliers('', freshSuppliers);
          setSupplierOptions(allSuppliers);
          console.log('✅ Loaded suppliers for Create Order modal:', freshSuppliers.length);
        } catch (error) {
          console.error('Error pre-loading suppliers:', error);
        }
      }
    };
    loadSuppliersOnOpen();
  }, [open]);

  // Reset form when modal closes
  useEffect(() => {
    if (!open) {
      setPdfFile(null);
      setSupplier(null);
      setSupplierSearch('');
      setSupplierOptions([]);
      setEntity('');
      setPoType('');
      setManualMode(false);
      setMaterialName('');
      setQuantityValue(0);
      setQuantityUnit('g');
      setCustomer({
        name: '',
        address: '',
        country: 'India',
        email: '',
        phone: '',
        gstin: '',
      });
      setPriceToCustomer({ amount: 0, currency: 'USD' });
      setPriceFromSupplier({ amount: 0, currency: 'USD' });
    }
  }, [open]);

  const onDrop = React.useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      setPdfFile(file);
      toast.success('Document uploaded successfully');
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/msword': ['.doc'],
      'image/*': ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.tiff'],
    },
    maxFiles: 1,
  });

  const handleSupplierSelect = (selectedSupplier: Supplier | string | null) => {
    if (selectedSupplier) {
      if (typeof selectedSupplier === 'string') {
        // User typed a free-form string
        setSupplier({
          name: selectedSupplier,
          address: '',
          country: 'India',
          email: '',
          phone: '',
          gstin: '',
        });
        setSupplierSearch(selectedSupplier);
      } else {
        // User selected from dropdown
        setSupplier({
          name: selectedSupplier.name,
          address: selectedSupplier.address,
          country: selectedSupplier.country,
          email: selectedSupplier.email,
          phone: selectedSupplier.phone,
          gstin: selectedSupplier.gstin,
        });
        setSupplierSearch(selectedSupplier.name);
      }
    } else {
      setSupplier(null);
      setSupplierSearch('');
    }
  };

  const handlePDFExtraction = async () => {
    if (!pdfFile) return;

    try {
      setIsExtractingPDF(true);
      
      // Try HRV AI extraction first
      try {
        console.log('🤖 Using HRV AI for PDF extraction...');
        toast.loading('HRV AI at work', { id: 'hrv-ai-extraction' });
        
        const groqResult = await geminiExtractor.extractFromPDF(pdfFile);
        setGeminiExtractionResult(groqResult);
        
        toast.success('✨ PO data extracted successfully with HRV AI!', { id: 'hrv-ai-extraction' });
        
        // Auto-populate supplier if customer name is extracted
        if (groqResult.customerName) {
          // Note: In HRV AI extraction, customer is the one issuing the PO
          // So we might need to adjust this logic based on your business flow
          console.log('HRV AI extracted customer:', groqResult.customerName);
        }
        
      } catch (groqError: any) {
        console.log('⚠️  HRV AI extraction failed, falling back to Python extractor:', groqError);
        toast.error('HRV AI not configured. Falling back to Python extractor...', { id: 'hrv-ai-extraction' });
        
        // Fallback to Python PDF extractor
        const result = await pdfExtractor.extractFromPDF(pdfFile);
        setPdfExtractionResult(result);
        
        if (result.success) {
          toast.success('PDF data extracted successfully with Python extractor!');
          
          // Auto-populate supplier if extracted
          if (result.data.PO_ISSUER_NAME) {
            const extractedSupplier: ContactInfo = {
              name: result.data.PO_ISSUER_NAME,
              address: result.data.PO_ISSUER_ADDRESS || '',
              country: 'India',
              email: 'supplier@example.com',
              phone: result.data.CONTACT_NUMBER || '',
              gstin: result.data.GSTIN || undefined
            };
            setSupplier(extractedSupplier);
          }
        } else {
          toast.error('Failed to extract data from PDF');
        }
      }
    } catch (error) {
      console.error('PDF extraction error:', error);
      toast.error('Error extracting PDF data');
    } finally {
      setIsExtractingPDF(false);
    }
  };

  const handleManualSubmit = () => {
    // Validate mandatory fields for manual entry
    if (!entity) {
      toast.error('Please select an Entity (HRV or NHG)');
      return;
    }
    if (!materialName.trim()) {
      toast.error('Please enter Material Name');
      return;
    }
    if (!quantityValue || quantityValue <= 0) {
      toast.error('Please enter a valid Quantity');
      return;
    }
    if (!customer.name.trim()) {
      toast.error('Please enter Customer Name');
      return;
    }
    if (!customer.address.trim()) {
      toast.error('Please enter Customer Address');
      return;
    }
    if (!customer.email.trim()) {
      toast.error('Please enter Customer Email');
      return;
    }
    // Handle manual supplier entry - if supplierSearch has value but supplier is null, create supplier from search
    let finalSupplier = supplier;
    if (!finalSupplier && supplierSearch.trim()) {
      finalSupplier = {
        name: supplierSearch.trim(),
        address: '',
        country: 'India',
        email: '',
        phone: '',
        gstin: '',
      };
    }
    
    if (!finalSupplier || !finalSupplier.name.trim()) {
      toast.error('Please select or enter Supplier Name');
      return;
    }
    if (!priceToCustomer.amount || priceToCustomer.amount <= 0) {
      toast.error('Please enter Rate to Customer');
      return;
    }
    if (!priceFromSupplier.amount || priceFromSupplier.amount <= 0) {
      toast.error('Please enter Rate from Supplier');
      return;
    }

    setIsSubmitting(true);
    try {
      onSubmit({
        pdfFile: null,
        supplier: finalSupplier,
        entity: entity as 'HRV' | 'NHG',
        poType: poType || undefined,
        manualEntry: {
          materialName: materialName.trim(),
          quantity: {
            value: quantityValue,
            unit: quantityUnit,
          },
          customer: customer,
          priceToCustomer: priceToCustomer,
          priceFromSupplier: priceFromSupplier,
        },
      });
      toast.success('Order created successfully!');
      onClose();
    } catch (error) {
      console.error('Error creating order:', error);
      toast.error('Failed to create order');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async () => {
    if (!entity) {
      toast.error('Please select an Entity (HRV or NHG)');
      return;
    }
    if (manualMode) {
      handleManualSubmit();
      return;
    }
    if (!pdfFile) {
      toast.error('Please upload a document');
      return;
    }

    setIsSubmitting(true);
    try {
      // Use HRV AI extraction result if available
      if (geminiExtractionResult) {
        // Check if there are multiple materials
        if (geminiExtractionResult.items && geminiExtractionResult.items.length > 1) {
          // Extract materials from HRV AI data
          const materials: MaterialItem[] = geminiExtractionResult.items.map((item, index) => ({
            id: `material_${Date.now()}_${index}`,
            name: item.materialName,
            description: item.materialGrade || undefined,
            sku: '',
            hsn: '',
            quantity: {
              value: item.quantity,
              unit: 'Kg'
            },
            unitPrice: {
              amount: item.unitPrice,
              currency: geminiExtractionResult.currency || 'USD'
            },
            totalPrice: {
              amount: item.totalPrice,
              currency: geminiExtractionResult.currency || 'USD'
            },
            supplierUnitPrice: {
              amount: 0,
              currency: geminiExtractionResult.currency || 'USD'
            },
            supplierTotalPrice: {
              amount: 0,
              currency: geminiExtractionResult.currency || 'USD'
            },
            account: '',
            taxRate: 18,
            taxAmount: (item.totalPrice * 0.18)
          }));
          
          setExtractedMaterials(materials);
          setShowConsignmentsModal(true);
          setIsSubmitting(false);
          return;
        }
        
        // Single material - create order directly
        onSubmit({
          pdfFile,
          supplier: supplier || {
            name: 'Supplier Name',
            address: 'Supplier Address',
            country: 'India',
            email: 'supplier@example.com',
            phone: 'N/A',
          },
          geminiData: geminiExtractionResult,
          entity: entity as 'HRV' | 'NHG',
          poType: poType || undefined,
        });
        toast.success('✨ Order created successfully with HRV AI extraction!', { id: 'ai-processing' });
        onClose();
      } 
      // Fallback to Python extraction result if available
      else if (pdfExtractionResult && pdfExtractionResult.success) {
        onSubmit({
          pdfFile,
          supplier: supplier || {
            name: 'Supplier Name',
            address: 'Supplier Address',
            country: 'India',
            email: 'supplier@example.com',
            phone: 'N/A',
          },
          extractedData: pdfExtractionResult,
          entity: entity as 'HRV' | 'NHG',
          poType: poType || undefined,
        });
        toast.success('Order created successfully with Python extraction!', { id: 'ai-processing' });
        onClose();
      } 
      // No extraction result available
      else {
        toast.error('Please wait for PDF extraction to complete or try uploading a different PDF');
      }
    } catch (error) {
      console.error('Error processing document:', error);
      toast.error('Failed to process document or create order', { id: 'ai-processing' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConsignmentsConfirm = (consignments: Consignment[]) => {
    // Submit order data with consignments
    onSubmit({
      pdfFile,
      supplier: supplier || {
        name: 'Supplier Name',
        address: 'Supplier Address',
        country: 'India',
        email: 'supplier@example.com',
        phone: 'N/A',
      },
      geminiData: geminiExtractionResult!,
      entity: entity as 'HRV' | 'NHG',
      poType: poType || undefined,
      consignments,
    });
    
    setShowConsignmentsModal(false);
    toast.success(`✨ Creating ${consignments.length} consignment orders...`);
    onClose();
  };

  return (
    <>
      <AssignConsignmentsModal
        open={showConsignmentsModal}
        materials={extractedMaterials}
        onClose={() => setShowConsignmentsModal(false)}
        onConfirm={handleConsignmentsConfirm}
      />
      
      <Dialog
        open={open}
        onClose={onClose}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            bgcolor: 'rgba(30, 30, 30, 0.95)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 2,
          },
        }}
      >
        <DialogTitle sx={{ color: '#FFFFFF', fontWeight: 600, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          Create New Order
          <IconButton onClick={onClose} sx={{ color: 'rgba(255,255,255,0.7)' }}>
            <Close />
          </IconButton>
        </DialogTitle>
        
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mt: 1 }}>
            {/* Entity and PO Type Selection */}
            <Box>
              <Typography variant="h6" sx={{ color: '#FFFFFF', fontWeight: 600, mb: 2 }}>
                Order Details
              </Typography>
              <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', sm: 'row' } }}>
                <FormControl size="small" sx={{ minWidth: 200, flex: 1 }} required>
                  <InputLabel sx={{ color: 'rgba(255,255,255,0.7)' }}>Entity</InputLabel>
                  <Select
                    label="Entity"
                    value={entity}
                    onChange={(e) => setEntity(e.target.value as 'HRV' | 'NHG')}
                    sx={{
                      bgcolor: 'rgba(255,255,255,0.1)',
                      color: '#FFFFFF',
                      '& .MuiOutlinedInput-notchedOutline': {
                        borderColor: 'rgba(255,255,255,0.2)',
                      },
                      '&:hover .MuiOutlinedInput-notchedOutline': {
                        borderColor: 'rgba(255,255,255,0.3)',
                      },
                      '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                        borderColor: '#9CA3AF',
                      },
                      '& .MuiSelect-icon': {
                        color: 'rgba(255,255,255,0.7)',
                      },
                    }}
                  >
                    <MenuItem value="HRV">HRV</MenuItem>
                    <MenuItem value="NHG">NHG</MenuItem>
                  </Select>
                </FormControl>
                <FormControl size="small" sx={{ minWidth: 200, flex: 1 }}>
                  <InputLabel sx={{ color: 'rgba(255,255,255,0.7)' }}>PO Type</InputLabel>
                  <Select
                    label="PO Type"
                    value={poType}
                    onChange={(e) => setPoType(e.target.value as 'Direct PO' | 'Sample PO' | 'Service PO')}
                    sx={{
                      bgcolor: 'rgba(255,255,255,0.1)',
                      color: '#FFFFFF',
                      '& .MuiOutlinedInput-notchedOutline': {
                        borderColor: 'rgba(255,255,255,0.2)',
                      },
                      '&:hover .MuiOutlinedInput-notchedOutline': {
                        borderColor: 'rgba(255,255,255,0.3)',
                      },
                      '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                        borderColor: '#9CA3AF',
                      },
                      '& .MuiSelect-icon': {
                        color: 'rgba(255,255,255,0.7)',
                      },
                    }}
                  >
                    <MenuItem value="Direct PO">Direct PO</MenuItem>
                    <MenuItem value="Sample PO">Sample PO</MenuItem>
                    <MenuItem value="Service PO">Service PO</MenuItem>
                  </Select>
                </FormControl>
              </Box>
            </Box>

            {/* Supplier Selection - Always visible */}
            <Box>
              <Typography variant="h6" sx={{ color: '#FFFFFF', fontWeight: 600, mb: 2 }}>
                Supplier Selection
              </Typography>
              <Autocomplete
                freeSolo
                options={supplierOptions}
                getOptionLabel={(option) => typeof option === 'string' ? option : option.name}
                isOptionEqualToValue={(option, value) => {
                  if (typeof value === 'string') {
                    return option.name === value;
                  }
                  return option.name === value?.name;
                }}
                value={supplier 
                  ? (supplierOptions.find(s => s.name === supplier.name) || null)
                  : null
                }
                onChange={(_, newValue) => {
                  handleSupplierSelect(newValue);
                }}
                onOpen={async () => {
                  // Load all suppliers when dropdown opens if search is empty
                  if (!supplierSearch.trim() && supplierOptions.length === 0) {
                    try {
                      const suppliers = await getSuppliers();
                      const allSuppliers = searchSuppliers('', suppliers);
                      setSupplierOptions(allSuppliers);
                    } catch (error) {
                      console.error('Error loading suppliers on dropdown open:', error);
                      const allSuppliers = searchSuppliers('');
                      setSupplierOptions(allSuppliers);
                    }
                  }
                }}
                inputValue={supplierSearch}
                onInputChange={(_, newInputValue, reason) => {
                  setSupplierSearch(newInputValue);
                  if (reason === 'clear') {
                    setSupplier(null);
                  }
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    placeholder="Search or enter supplier name"
                    size="small"
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        bgcolor: 'rgba(255,255,255,0.1)',
                        color: '#FFFFFF',
                        '& fieldset': {
                          borderColor: 'rgba(255,255,255,0.2)',
                        },
                        '&:hover fieldset': {
                          borderColor: 'rgba(255,255,255,0.3)',
                        },
                        '&.Mui-focused fieldset': {
                          borderColor: '#9CA3AF',
                        },
                      },
                      '& .MuiInputBase-input': {
                        color: '#FFFFFF',
                      },
                      '& .MuiInputBase-input::placeholder': {
                        color: 'rgba(255,255,255,0.5)',
                      },
                    }}
                  />
                )}
                PaperComponent={(props) => (
                  <Paper {...props} sx={{ bgcolor: 'rgba(30, 30, 30, 0.95)', color: '#FFFFFF' }} />
                )}
              />
              {supplier && (
                <Box sx={{ mt: 2, p: 2, bgcolor: 'rgba(76, 175, 80, 0.1)', borderRadius: 1, border: '1px solid rgba(76, 175, 80, 0.3)' }}>
                  <Typography variant="body2" sx={{ color: '#FFFFFF', fontWeight: 600, mb: 0.5 }}>
                    {supplier.name}
                  </Typography>
                  {supplier.address && (
                    <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)', display: 'block' }}>
                      {supplier.address}
                    </Typography>
                  )}
                  {supplier.email && (
                    <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)', display: 'block' }}>
                      Email: {supplier.email}
                    </Typography>
                  )}
                  {supplier.phone && (
                    <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)', display: 'block' }}>
                      Phone: {supplier.phone}
                    </Typography>
                  )}
                </Box>
              )}
            </Box>

            {/* PDF Upload Section - Hide in manual mode */}
            {!manualMode && (
              <Box>
                <Typography variant="h6" sx={{ color: '#FFFFFF', fontWeight: 600, mb: 2 }}>
                  Upload Customer PO Document
                </Typography>
                <Box
                  {...getRootProps()}
                  sx={{
                    border: '2px dashed',
                    borderColor: isDragActive ? 'primary.main' : 'rgba(255,255,255,0.3)',
                    borderRadius: 2,
                    p: 3,
                    textAlign: 'center',
                    cursor: 'pointer',
                    bgcolor: isDragActive ? 'action.hover' : 'rgba(255,255,255,0.05)',
                    transition: 'all 0.2s ease',
                    '&:hover': {
                      borderColor: 'primary.main',
                      bgcolor: 'rgba(255,255,255,0.1)',
                    },
                  }}
                >
                  <input {...getInputProps()} />
                  <Upload sx={{ fontSize: 48, color: '#9CA3AF', mb: 1 }} />
                  <Typography variant="body1" sx={{ color: '#FFFFFF', mb: 1 }}>
                    {isDragActive ? 'Drop the file here' : (pdfFile ? pdfFile.name : 'Click to upload or drag & drop')}
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.6)' }}>
                    Supported formats: PDF, DOC, DOCX, JPG, PNG, TIFF
                  </Typography>
                </Box>
                
                {/* Show extraction status */}
                {isExtractingPDF && (
                  <Box sx={{ mt: 2, p: 2, bgcolor: 'rgba(124, 77, 255, 0.1)', borderRadius: 1, border: '1px solid rgba(124, 77, 255, 0.3)' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <CircularProgress size={20} />
                      <Typography variant="body2" sx={{ color: '#9CA3AF' }}>
                        Extracting data from PDF...
                      </Typography>
                    </Box>
                  </Box>
                )}
                
                {/* Show extracted data if available */}
                {pdfExtractionResult && (
                  <Box sx={{ mt: 2, p: 2, bgcolor: 'rgba(76, 175, 80, 0.1)', borderRadius: 1, border: '1px solid rgba(76, 175, 80, 0.3)' }}>
                    <Typography variant="subtitle2" sx={{ color: '#4CAF50', fontWeight: 600, mb: 1 }}>
                      ✅ Data Extracted ({Math.round(pdfExtractionResult.confidence * 100)}% confidence)
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#FFFFFF' }}>
                      <strong>PO:</strong> {pdfExtractionResult.data.PO_NUMBER || 'N/A'} | 
                      <strong> Company:</strong> {pdfExtractionResult.data.PO_ISSUER_NAME || 'N/A'} | 
                      <strong> Material:</strong> {pdfExtractionResult.data.MATERIAL || 'N/A'} | 
                      <strong> Qty:</strong> {pdfExtractionResult.data.QUANTITY || 'N/A'} Kg
                    </Typography>
                  </Box>
                )}
              </Box>
            )}

            {/* Manual Entry Form - Show in manual mode */}
            {manualMode && (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <Typography variant="h6" sx={{ color: '#FFFFFF', fontWeight: 600, mb: 2 }}>
                  Manual Order Entry
                </Typography>

                {/* Material Information */}
                <Box>
                  <Typography variant="subtitle2" sx={{ color: '#FFFFFF', mb: 1, fontWeight: 600 }}>
                    Material Information *
                  </Typography>
                  <TextField
                    fullWidth
                    label="Material Name"
                    value={materialName}
                    onChange={(e) => setMaterialName(e.target.value)}
                    required
                    size="small"
                    margin="normal"
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        bgcolor: 'rgba(255,255,255,0.1)',
                        color: '#FFFFFF',
                        '& fieldset': { borderColor: 'rgba(255,255,255,0.2)' },
                      },
                      '& .MuiInputBase-input': { color: '#FFFFFF' },
                      '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.7)' },
                    }}
                  />
                  <Box sx={{ display: 'flex', gap: 2, mt: 1 }}>
                    <TextField
                      fullWidth
                      label="Quantity"
                      type="number"
                      value={quantityValue || ''}
                      onChange={(e) => setQuantityValue(parseFloat(e.target.value) || 0)}
                      required
                      size="small"
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          bgcolor: 'rgba(255,255,255,0.1)',
                          color: '#FFFFFF',
                          '& fieldset': { borderColor: 'rgba(255,255,255,0.2)' },
                        },
                        '& .MuiInputBase-input': { color: '#FFFFFF' },
                        '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.7)' },
                      }}
                    />
                    <FormControl size="small" sx={{ minWidth: 120 }}>
                      <InputLabel sx={{ color: 'rgba(255,255,255,0.7)' }}>Unit</InputLabel>
                      <Select
                        value={quantityUnit}
                        onChange={(e) => setQuantityUnit(e.target.value)}
                        label="Unit"
                        sx={{
                          bgcolor: 'rgba(255,255,255,0.1)',
                          color: '#FFFFFF',
                          '& .MuiOutlinedInput-notchedOutline': {
                            borderColor: 'rgba(255,255,255,0.2)',
                          },
                          '& .MuiSelect-icon': {
                            color: 'rgba(255,255,255,0.7)',
                          },
                        }}
                      >
                        <MenuItem value="g">Grams (g)</MenuItem>
                        <MenuItem value="Kg">Kilo Grams (Kg)</MenuItem>
                        <MenuItem value="T">Tonne (T)</MenuItem>
                        <MenuItem value="pcs">Pieces (pcs)</MenuItem>
                        <MenuItem value="nos">Numbers (nos)</MenuItem>
                        <MenuItem value="pac">Packs (pac)</MenuItem>
                      </Select>
                    </FormControl>
                  </Box>
                </Box>

                {/* Customer Information */}
                <Box>
                  <Typography variant="subtitle2" sx={{ color: '#FFFFFF', mb: 1, fontWeight: 600 }}>
                    Customer Information *
                  </Typography>
                  <TextField
                    fullWidth
                    label="Customer Name"
                    value={customer.name}
                    onChange={(e) => setCustomer({ ...customer, name: e.target.value })}
                    required
                    size="small"
                    margin="normal"
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        bgcolor: 'rgba(255,255,255,0.1)',
                        color: '#FFFFFF',
                        '& fieldset': { borderColor: 'rgba(255,255,255,0.2)' },
                      },
                      '& .MuiInputBase-input': { color: '#FFFFFF' },
                      '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.7)' },
                    }}
                  />
                  <TextField
                    fullWidth
                    label="Customer Address"
                    value={customer.address}
                    onChange={(e) => setCustomer({ ...customer, address: e.target.value })}
                    required
                    multiline
                    rows={2}
                    size="small"
                    margin="normal"
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        bgcolor: 'rgba(255,255,255,0.1)',
                        color: '#FFFFFF',
                        '& fieldset': { borderColor: 'rgba(255,255,255,0.2)' },
                      },
                      '& .MuiInputBase-input': { color: '#FFFFFF' },
                      '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.7)' },
                    }}
                  />
                  <TextField
                    fullWidth
                    label="Customer Email"
                    value={customer.email}
                    onChange={(e) => setCustomer({ ...customer, email: e.target.value })}
                    required
                    type="email"
                    size="small"
                    margin="normal"
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        bgcolor: 'rgba(255,255,255,0.1)',
                        color: '#FFFFFF',
                        '& fieldset': { borderColor: 'rgba(255,255,255,0.2)' },
                      },
                      '& .MuiInputBase-input': { color: '#FFFFFF' },
                      '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.7)' },
                    }}
                  />
                  <TextField
                    fullWidth
                    label="Customer Phone"
                    value={customer.phone}
                    onChange={(e) => setCustomer({ ...customer, phone: e.target.value })}
                    size="small"
                    margin="normal"
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        bgcolor: 'rgba(255,255,255,0.1)',
                        color: '#FFFFFF',
                        '& fieldset': { borderColor: 'rgba(255,255,255,0.2)' },
                      },
                      '& .MuiInputBase-input': { color: '#FFFFFF' },
                      '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.7)' },
                    }}
                  />
                  <TextField
                    fullWidth
                    label="Customer GSTIN"
                    value={customer.gstin || ''}
                    onChange={(e) => setCustomer({ ...customer, gstin: e.target.value })}
                    size="small"
                    margin="normal"
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        bgcolor: 'rgba(255,255,255,0.1)',
                        color: '#FFFFFF',
                        '& fieldset': { borderColor: 'rgba(255,255,255,0.2)' },
                      },
                      '& .MuiInputBase-input': { color: '#FFFFFF' },
                      '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.7)' },
                    }}
                  />
                </Box>

                {/* Pricing Information */}
                <Box>
                  <Typography variant="subtitle2" sx={{ color: '#FFFFFF', mb: 1, fontWeight: 600 }}>
                    Pricing Information (Rate per Unit) *
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 2 }}>
                    <TextField
                      fullWidth
                      label="Rate to Customer"
                      type="number"
                      value={priceToCustomer.amount || ''}
                      onChange={(e) => setPriceToCustomer({ ...priceToCustomer, amount: parseFloat(e.target.value) || 0 })}
                      required
                      size="small"
                      margin="normal"
                      helperText={`Total: ${((priceToCustomer.amount || 0) * (quantityValue || 0)).toFixed(2)} ${priceToCustomer.currency}`}
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          bgcolor: 'rgba(255,255,255,0.1)',
                          color: '#FFFFFF',
                          '& fieldset': { borderColor: 'rgba(255,255,255,0.2)' },
                        },
                        '& .MuiInputBase-input': { color: '#FFFFFF' },
                        '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.7)' },
                        '& .MuiFormHelperText-root': { color: 'rgba(255,255,255,0.5)' },
                      }}
                    />
                    <FormControl size="small" sx={{ minWidth: 120, mt: 1 }}>
                      <InputLabel sx={{ color: 'rgba(255,255,255,0.7)' }}>Currency</InputLabel>
                      <Select
                        value={priceToCustomer.currency}
                        onChange={(e) => setPriceToCustomer({ ...priceToCustomer, currency: e.target.value })}
                        label="Currency"
                        sx={{
                          bgcolor: 'rgba(255,255,255,0.1)',
                          color: '#FFFFFF',
                          '& .MuiOutlinedInput-notchedOutline': {
                            borderColor: 'rgba(255,255,255,0.2)',
                          },
                          '& .MuiSelect-icon': {
                            color: 'rgba(255,255,255,0.7)',
                          },
                        }}
                      >
                        <MenuItem value="USD">USD</MenuItem>
                        <MenuItem value="INR">INR</MenuItem>
                        <MenuItem value="EUR">EUR</MenuItem>
                        <MenuItem value="GBP">GBP</MenuItem>
                      </Select>
                    </FormControl>
                  </Box>
                  <Box sx={{ display: 'flex', gap: 2 }}>
                    <TextField
                      fullWidth
                      label="Rate from Supplier"
                      type="number"
                      value={priceFromSupplier.amount || ''}
                      onChange={(e) => setPriceFromSupplier({ ...priceFromSupplier, amount: parseFloat(e.target.value) || 0 })}
                      required
                      size="small"
                      margin="normal"
                      helperText={`Total: ${((priceFromSupplier.amount || 0) * (quantityValue || 0)).toFixed(2)} ${priceFromSupplier.currency}`}
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          bgcolor: 'rgba(255,255,255,0.1)',
                          color: '#FFFFFF',
                          '& fieldset': { borderColor: 'rgba(255,255,255,0.2)' },
                        },
                        '& .MuiInputBase-input': { color: '#FFFFFF' },
                        '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.7)' },
                        '& .MuiFormHelperText-root': { color: 'rgba(255,255,255,0.5)' },
                      }}
                    />
                    <FormControl size="small" sx={{ minWidth: 120, mt: 1 }}>
                      <InputLabel sx={{ color: 'rgba(255,255,255,0.7)' }}>Currency</InputLabel>
                      <Select
                        value={priceFromSupplier.currency}
                        onChange={(e) => setPriceFromSupplier({ ...priceFromSupplier, currency: e.target.value })}
                        label="Currency"
                        sx={{
                          bgcolor: 'rgba(255,255,255,0.1)',
                          color: '#FFFFFF',
                          '& .MuiOutlinedInput-notchedOutline': {
                            borderColor: 'rgba(255,255,255,0.2)',
                          },
                          '& .MuiSelect-icon': {
                            color: 'rgba(255,255,255,0.7)',
                          },
                        }}
                      >
                        <MenuItem value="USD">USD</MenuItem>
                        <MenuItem value="INR">INR</MenuItem>
                        <MenuItem value="EUR">EUR</MenuItem>
                        <MenuItem value="GBP">GBP</MenuItem>
                      </Select>
                    </FormControl>
                  </Box>
                </Box>
              </Box>
            )}

          </Box>
        </DialogContent>
        
        <DialogActions sx={{ p: 2, gap: 1, flexWrap: 'wrap' }}>
          {!manualMode && (
            <Button
              onClick={() => setManualMode(true)}
              variant="outlined"
              startIcon={<Create />}
              sx={{
                color: '#FFFFFF',
                borderColor: 'rgba(255,255,255,0.3)',
                '&:hover': { 
                  borderColor: '#9CA3AF',
                  bgcolor: 'rgba(124, 77, 255, 0.1)',
                },
              }}
            >
              Create Order Manually
            </Button>
          )}
          {manualMode && (
            <Button
              onClick={() => {
                setManualMode(false);
                setPdfFile(null);
                setSupplier(null);
                setSupplierSearch('');
                setMaterialName('');
                setQuantityValue(0);
                setCustomer({
                  name: '',
                  address: '',
                  country: 'India',
                  email: '',
                  phone: '',
                  gstin: '',
                });
                setPriceToCustomer({ amount: 0, currency: 'USD' });
                setPriceFromSupplier({ amount: 0, currency: 'USD' });
              }}
              variant="outlined"
              sx={{
                color: 'rgba(255,255,255,0.7)',
                borderColor: 'rgba(255,255,255,0.3)',
                '&:hover': { borderColor: 'rgba(255,255,255,0.5)' },
              }}
            >
              Back to Upload
            </Button>
          )}
          <Button
            onClick={onClose}
            variant="outlined"
            sx={{
              color: 'rgba(255,255,255,0.7)',
              borderColor: 'rgba(255,255,255,0.3)',
              '&:hover': { borderColor: 'rgba(255,255,255,0.5)' },
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            variant="contained"
            disabled={
              isSubmitting || 
              !entity || 
              isExtractingPDF ||
              (manualMode ? false : !pdfFile)
            }
            startIcon={isSubmitting ? <CircularProgress size={16} /> : (manualMode ? <Save /> : <SmartToy />)}
            sx={{
              bgcolor: '#9CA3AF',
              '&:hover': { bgcolor: '#6B46C1' },
            }}
          >
            {isSubmitting 
              ? (manualMode ? 'Creating Order...' : 'Processing with AI...') 
              : (manualMode ? 'Create Order' : 'Create Order with AI')
            }
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default CreateOrderModal;
