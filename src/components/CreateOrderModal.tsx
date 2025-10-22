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
} from '@mui/material';
import {
  Close,
  Upload,
  Save,
  SmartToy,
} from '@mui/icons-material';
import { ContactInfo } from '../types';
import { Supplier, searchSuppliers } from '../data/suppliers';
import { PDFExtractorService, PDFExtractionResult } from '../services/pdfExtractorService';
import { GeminiPDFExtractorService } from '../services/geminiPdfExtractor';
import type { PurchaseOrder } from '../types';
import { useDropzone } from 'react-dropzone';
import toast from 'react-hot-toast';

interface CreateOrderModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (orderData: CreateOrderData) => void;
}

interface CreateOrderData {
  pdfFile: File | null;
  supplier: ContactInfo;
  extractedData?: PDFExtractionResult;
  geminiData?: PurchaseOrder;
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

  useEffect(() => {
    if (supplierSearch.trim()) {
      const filteredSuppliers = searchSuppliers(supplierSearch);
      setSupplierOptions(filteredSuppliers);
    } else {
      setSupplierOptions([]);
    }
  }, [supplierSearch]);

  // Auto-extract PDF data when file is uploaded
  useEffect(() => {
    if (pdfFile && pdfFile.type === 'application/pdf') {
      handlePDFExtraction();
    }
  }, [pdfFile]);

  // Reset form when modal closes
  useEffect(() => {
    if (!open) {
      setPdfFile(null);
      setSupplier(null);
      setSupplierSearch('');
      setSupplierOptions([]);
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

  const handleSupplierSelect = (selectedSupplier: Supplier | null) => {
    if (selectedSupplier) {
      setSupplier({
        name: selectedSupplier.name,
        address: selectedSupplier.address,
        country: selectedSupplier.country,
        email: selectedSupplier.email,
        phone: selectedSupplier.phone,
        gstin: selectedSupplier.gstin,
      });
      setSupplierSearch(selectedSupplier.name);
    } else {
      setSupplier(null);
      setSupplierSearch('');
    }
  };

  const handlePDFExtraction = async () => {
    if (!pdfFile) return;

    try {
      setIsExtractingPDF(true);
      
      // Try Gemini AI extraction first
      try {
        console.log('🤖 Using Gemini AI for PDF extraction...');
        toast.loading('Extracting data with Gemini AI...', { id: 'gemini-extraction' });
        
        const geminiResult = await geminiExtractor.extractFromPDF(pdfFile);
        setGeminiExtractionResult(geminiResult);
        
        toast.success('✨ PDF data extracted successfully with Gemini AI!', { id: 'gemini-extraction' });
        
        // Auto-populate supplier if customer name is extracted
        if (geminiResult.customerName) {
          // Note: In Gemini extraction, customer is the one issuing the PO
          // So we might need to adjust this logic based on your business flow
          console.log('Gemini extracted customer:', geminiResult.customerName);
        }
        
      } catch (geminiError: any) {
        console.log('⚠️  Gemini extraction failed, falling back to Python extractor:', geminiError);
        toast.error('Gemini AI not configured. Falling back to Python extractor...', { id: 'gemini-extraction' });
        
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

  const handleSubmit = async () => {
    if (!pdfFile) {
      toast.error('Please upload a document');
      return;
    }
    if (!supplier) {
      toast.error('Please select a supplier');
      return;
    }

    setIsSubmitting(true);
    try {
      // Use Gemini extraction result if available
      if (geminiExtractionResult) {
        onSubmit({
          pdfFile,
          supplier,
          geminiData: geminiExtractionResult,
        });
        toast.success('✨ Order created successfully with Gemini AI extraction!', { id: 'ai-processing' });
        onClose();
      } 
      // Fallback to Python extraction result if available
      else if (pdfExtractionResult && pdfExtractionResult.success) {
        onSubmit({
          pdfFile,
          supplier,
          extractedData: pdfExtractionResult,
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

  return (
    <>
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
            {/* PDF Upload Section */}
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
                <Upload sx={{ fontSize: 48, color: '#7C4DFF', mb: 1 }} />
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
                    <Typography variant="body2" sx={{ color: '#7C4DFF' }}>
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

            {/* Supplier Selection Section */}
            <Box>
              <Typography variant="h6" sx={{ color: '#FFFFFF', fontWeight: 600, mb: 2 }}>
                Supplier Information
              </Typography>
              
              <Autocomplete
                options={supplierOptions}
                value={supplier ? supplierOptions.find(s => s.name === supplier.name) || null : null}
                onChange={(_, newValue) => handleSupplierSelect(newValue)}
                onInputChange={(_, newInputValue) => setSupplierSearch(newInputValue)}
                getOptionLabel={(option) => option.name}
                isOptionEqualToValue={(option, value) => option.name === value?.name}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Search Supplier"
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
                )}
                renderOption={(props, option) => (
                  <Box component="li" {...props}>
                    <Box>
                      <Typography variant="body1" sx={{ color: '#FFFFFF', fontWeight: 600 }}>
                        {option.name}
                      </Typography>
                      <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.6)' }}>
                        {option.country} • {option.specialties.join(', ')}
                      </Typography>
                    </Box>
                  </Box>
                )}
                PaperComponent={({ children, ...other }) => (
                  <Paper
                    {...other}
                    sx={{
                      bgcolor: 'rgba(30, 30, 30, 0.95)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      '& .MuiAutocomplete-noOptions': {
                        color: 'rgba(255,255,255,0.6)',
                      },
                    }}
                  >
                    {children}
                  </Paper>
                )}
                noOptionsText="No suppliers found"
              />

              {/* Supplier Details Display */}
              {supplier && (
                <Box sx={{ mt: 2, p: 2, bgcolor: 'rgba(255,255,255,0.05)', borderRadius: 1 }}>
                  <Typography variant="subtitle2" sx={{ color: '#FFFFFF', fontWeight: 600, mb: 1 }}>
                    Selected Supplier Details:
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)' }}>
                    <strong>Name:</strong> {supplier.name}
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)' }}>
                    <strong>Address:</strong> {supplier.address}
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)' }}>
                    <strong>Country:</strong> {supplier.country}
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)' }}>
                    <strong>Email:</strong> {supplier.email}
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)' }}>
                    <strong>Phone:</strong> {supplier.phone}
                  </Typography>
                  {supplier.gstin && (
                    <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)' }}>
                      <strong>GSTIN:</strong> {supplier.gstin}
                    </Typography>
                  )}
                </Box>
              )}
            </Box>
          </Box>
        </DialogContent>
        
        <DialogActions sx={{ p: 2 }}>
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
            disabled={isSubmitting || !pdfFile || !supplier}
            startIcon={isSubmitting ? <CircularProgress size={16} /> : <SmartToy />}
            sx={{
              bgcolor: '#7C4DFF',
              '&:hover': { bgcolor: '#6B46C1' },
            }}
          >
            {isSubmitting ? 'Processing with AI...' : 'Create Order with AI'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default CreateOrderModal;
