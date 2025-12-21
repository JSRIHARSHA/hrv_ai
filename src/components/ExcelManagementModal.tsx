import React, { useState, useCallback } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Card,
  CardContent,
  CardActions,
  IconButton,
  Alert,
  LinearProgress,
  Divider,
  Chip,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemSecondaryAction,
} from '@mui/material';
import {
  Upload,
  Download,
  FileDownload,
  CloudUpload,
  CloudDownload,
  Description,
  CheckCircle,
  Error,
  Warning,
  Info,
  Refresh,
  Close,
} from '@mui/icons-material';
import { useDropzone } from 'react-dropzone';
import { useOrders } from '../contexts/OrderContext';
import { ExcelService } from '../services/excelService';
import toast from 'react-hot-toast';

interface ExcelManagementModalProps {
  open: boolean;
  onClose: () => void;
}

const ExcelManagementModal: React.FC<ExcelManagementModalProps> = ({ open, onClose }) => {
  const { orders, loadOrdersFromExcel, saveOrdersToExcel, createSampleExcel, generateSampleOrders, isLoading } = useOrders();
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [uploadError, setUploadError] = useState<string>('');
  const [downloadStatus, setDownloadStatus] = useState<'idle' | 'downloading' | 'success' | 'error'>('idle');
  const [downloadError, setDownloadError] = useState<string>('');

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    if (!ExcelService.validateExcelFile(file)) {
      setUploadError('Please upload a valid Excel file (.xlsx or .xls)');
      setUploadStatus('error');
      return;
    }

    setUploadStatus('uploading');
    setUploadError('');

    try {
      await loadOrdersFromExcel(file);
      setUploadStatus('success');
      toast.success(`Successfully loaded ${orders.length} orders from Excel file!`);
    } catch (error: unknown) {
      let errorMessage = 'Failed to load Excel file';
      if (error && typeof error === 'object' && 'message' in error) {
        errorMessage = (error as Error).message;
      }
      setUploadError(errorMessage);
      setUploadStatus('error');
      toast.error('Failed to load Excel file');
    }
  }, [loadOrdersFromExcel, orders.length]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
    },
    multiple: false,
  });

  const handleDownload = async () => {
    setDownloadStatus('downloading');
    setDownloadError('');

    try {
      await saveOrdersToExcel();
      setDownloadStatus('success');
      toast.success('Excel file downloaded successfully!');
    } catch (error: unknown) {
      let errorMessage = 'Failed to download Excel file';
      if (error && typeof error === 'object' && 'message' in error) {
        errorMessage = (error as Error).message;
      }
      setDownloadError(errorMessage);
      setDownloadStatus('error');
      toast.error('Failed to download Excel file');
    }
  };

  const handleCreateSample = async () => {
    try {
      await createSampleExcel();
      toast.success('Sample Excel file created and downloaded!');
    } catch (error) {
      toast.error('Failed to create sample Excel file');
    }
  };

  const handleGenerateSampleOrders = () => {
    try {
      generateSampleOrders();
      toast.success('Sample orders generated! The page will refresh in a moment to show them.');
    } catch (error) {
      toast.error('Failed to generate sample orders');
    }
  };

  const handleClose = () => {
    setUploadStatus('idle');
    setUploadError('');
    setDownloadStatus('idle');
    setDownloadError('');
    onClose();
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle sx={{ color: '#4CAF50' }} />;
      case 'error':
        return <Error sx={{ color: '#F44336' }} />;
      case 'uploading':
      case 'downloading':
        return <LinearProgress sx={{ width: 20, height: 20 }} />;
      default:
        return <Info sx={{ color: '#2196F3' }} />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return '#4CAF50';
      case 'error':
        return '#F44336';
      case 'uploading':
      case 'downloading':
        return '#FF9800';
      default:
        return '#2196F3';
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        bgcolor: '#111111', // Using --background-secondary from CSS
        color: '#FFFFFF',
        borderBottom: '1px solid rgba(255,255,255,0.1)'
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Description sx={{ color: '#4CAF50' }} />
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            Excel Data Management
          </Typography>
        </Box>
        <IconButton onClick={handleClose} sx={{ color: '#FFFFFF' }}>
          <Close />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ bgcolor: '#000000', p: 3 }}> {/* Using --background-primary from CSS */}
        {/* Current Data Status */}
        <Card sx={{ mb: 3, bgcolor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
          <CardContent>
            <Typography variant="h6" sx={{ color: '#FFFFFF', mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
              <Info sx={{ color: '#2196F3' }} />
              Current Data Status
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              <Chip
                label={`${orders.length} Orders`}
                sx={{ bgcolor: '#4CAF50', color: '#FFFFFF', fontWeight: 600 }}
              />
              <Chip
                label="Excel Backend Active"
                sx={{ bgcolor: '#2196F3', color: '#FFFFFF', fontWeight: 600 }}
              />
              <Chip
                label="Local Storage Backup"
                sx={{ bgcolor: '#FF9800', color: '#FFFFFF', fontWeight: 600 }}
              />
            </Box>
          </CardContent>
        </Card>

        {/* Upload Section */}
        <Card sx={{ mb: 3, bgcolor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
          <CardContent>
            <Typography variant="h6" sx={{ color: '#FFFFFF', mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
              <CloudUpload sx={{ color: '#4CAF50' }} />
              Upload Excel File
            </Typography>
            
            <Box
              {...getRootProps()}
              sx={{
                border: '2px dashed',
                borderColor: isDragActive ? '#4CAF50' : 'rgba(255,255,255,0.3)',
                borderRadius: 2,
                p: 4,
                textAlign: 'center',
                cursor: 'pointer',
                bgcolor: isDragActive ? 'rgba(76,175,80,0.1)' : 'rgba(255,255,255,0.02)',
                transition: 'all 0.3s ease',
                '&:hover': {
                  borderColor: '#4CAF50',
                  bgcolor: 'rgba(76,175,80,0.05)',
                },
              }}
            >
              <input {...getInputProps()} />
              <Upload sx={{ fontSize: 48, color: '#4CAF50', mb: 2 }} />
              <Typography variant="h6" sx={{ color: '#FFFFFF', mb: 1 }}>
                {isDragActive ? 'Drop the Excel file here' : 'Drag & drop Excel file here'}
              </Typography>
              <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)', mb: 2 }}>
                or click to select file (.xlsx, .xls)
              </Typography>
              <Button
                variant="outlined"
                sx={{
                  color: '#4CAF50',
                  borderColor: '#4CAF50',
                  '&:hover': { borderColor: '#4CAF50', bgcolor: 'rgba(76,175,80,0.1)' },
                }}
              >
                Select File
              </Button>
            </Box>

            {uploadStatus !== 'idle' && (
              <Box sx={{ mt: 2 }}>
                <Alert
                  severity={uploadStatus === 'success' ? 'success' : uploadStatus === 'error' ? 'error' : 'info'}
                  sx={{ bgcolor: 'rgba(255,255,255,0.05)', color: '#FFFFFF' }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {getStatusIcon(uploadStatus)}
                    <Typography variant="body2">
                      {uploadStatus === 'uploading' && 'Uploading and processing Excel file...'}
                      {uploadStatus === 'success' && 'Excel file uploaded and processed successfully!'}
                      {uploadStatus === 'error' && uploadError}
                    </Typography>
                  </Box>
                </Alert>
              </Box>
            )}
          </CardContent>
        </Card>

        {/* Download Section */}
        <Card sx={{ mb: 3, bgcolor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
          <CardContent>
            <Typography variant="h6" sx={{ color: '#FFFFFF', mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
              <CloudDownload sx={{ color: '#2196F3' }} />
              Export Data
            </Typography>
            
            <List>
              <ListItem sx={{ px: 0 }}>
                <ListItemIcon>
                  <Download sx={{ color: '#2196F3' }} />
                </ListItemIcon>
                <ListItemText
                  primary="Export Current Orders to Excel"
                  secondary={`Download all ${orders.length} orders as an Excel file`}
                  primaryTypographyProps={{ color: '#FFFFFF' }}
                  secondaryTypographyProps={{ color: 'rgba(255,255,255,0.7)' }}
                />
                <ListItemSecondaryAction>
                  <Button
                    variant="contained"
                    onClick={handleDownload}
                    disabled={downloadStatus === 'downloading' || orders.length === 0}
                    sx={{
                      bgcolor: '#2196F3',
                      '&:hover': { bgcolor: '#1976D2' },
                      '&:disabled': { bgcolor: 'rgba(255,255,255,0.1)' },
                    }}
                  >
                    {downloadStatus === 'downloading' ? 'Downloading...' : 'Download Excel'}
                  </Button>
                </ListItemSecondaryAction>
              </ListItem>

              <Divider sx={{ bgcolor: 'rgba(255,255,255,0.1)', my: 1 }} />

              <ListItem sx={{ px: 0 }}>
                <ListItemIcon>
                  <FileDownload sx={{ color: '#FF9800' }} />
                </ListItemIcon>
                <ListItemText
                  primary="Create Sample Excel Template"
                  secondary="Download a sample Excel file with proper structure"
                  primaryTypographyProps={{ color: '#FFFFFF' }}
                  secondaryTypographyProps={{ color: 'rgba(255,255,255,0.7)' }}
                />
                <ListItemSecondaryAction>
                  <Button
                    variant="outlined"
                    onClick={handleCreateSample}
                    sx={{
                      color: '#FF9800',
                      borderColor: '#FF9800',
                      '&:hover': { borderColor: '#FF9800', bgcolor: 'rgba(255,152,0,0.1)' },
                    }}
                  >
                    Create Sample
                  </Button>
                </ListItemSecondaryAction>
              </ListItem>

              <Divider sx={{ bgcolor: 'rgba(255,255,255,0.1)', my: 1 }} />

              <ListItem sx={{ px: 0 }}>
                <ListItemIcon>
                  <Refresh sx={{ color: '#9CA3AF' }} />
                </ListItemIcon>
                <ListItemText
                  primary="Generate Sample Orders in App"
                  secondary="Create 36 sample orders (2 per status) directly in the app"
                  primaryTypographyProps={{ color: '#FFFFFF' }}
                  secondaryTypographyProps={{ color: 'rgba(255,255,255,0.7)' }}
                />
                <ListItemSecondaryAction>
                  <Button
                    variant="contained"
                    onClick={handleGenerateSampleOrders}
                    sx={{
                      bgcolor: '#9CA3AF',
                      '&:hover': { bgcolor: '#6A3FD8' },
                    }}
                  >
                    Generate Orders
                  </Button>
                </ListItemSecondaryAction>
              </ListItem>
            </List>

            {downloadStatus !== 'idle' && (
              <Box sx={{ mt: 2 }}>
                <Alert
                  severity={downloadStatus === 'success' ? 'success' : downloadStatus === 'error' ? 'error' : 'info'}
                  sx={{ bgcolor: 'rgba(255,255,255,0.05)', color: '#FFFFFF' }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {getStatusIcon(downloadStatus)}
                    <Typography variant="body2">
                      {downloadStatus === 'downloading' && 'Preparing Excel file for download...'}
                      {downloadStatus === 'success' && 'Excel file downloaded successfully!'}
                      {downloadStatus === 'error' && downloadError}
                    </Typography>
                  </Box>
                </Alert>
              </Box>
            )}
          </CardContent>
        </Card>

        {/* Excel Format Information */}
        <Card sx={{ bgcolor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
          <CardContent>
            <Typography variant="h6" sx={{ color: '#FFFFFF', mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
              <Description sx={{ color: '#FF9800' }} />
              Excel Format Requirements
            </Typography>
            
            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)', mb: 2 }}>
              Your Excel file should contain the following columns:
            </Typography>
            
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {ExcelService.getExcelHeaders().slice(0, 10).map((header, index) => (
                <Chip
                  key={index}
                  label={header}
                  size="small"
                  sx={{ 
                    bgcolor: 'rgba(255,255,255,0.1)', 
                    color: '#FFFFFF',
                    fontSize: '0.7rem'
                  }}
                />
              ))}
              <Chip
                label="... and more"
                size="small"
                sx={{ 
                  bgcolor: 'rgba(255,255,255,0.1)', 
                  color: '#FFFFFF',
                  fontSize: '0.7rem'
                }}
              />
            </Box>
            
            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.6)', mt: 2 }}>
              💡 Tip: Use the "Create Sample Excel Template" button to get a properly formatted file
            </Typography>
          </CardContent>
        </Card>
      </DialogContent>

      <DialogActions sx={{ bgcolor: '#111111', borderTop: '1px solid rgba(255,255,255,0.1)' }}> {/* Using --background-secondary from CSS */}
        <Button onClick={handleClose} sx={{ color: '#FFFFFF' }}>
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ExcelManagementModal;
