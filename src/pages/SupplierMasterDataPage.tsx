import React, { useState, useMemo, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Button,
  TextField,
  InputAdornment,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Menu,
  MenuItem,
  Chip,
  Tooltip,
} from '@mui/material';
import {
  Search,
  Add,
  Edit,
  Delete,
  MoreVert,
  Download,
  Upload,
  Settings,
  History,
  ViewColumn,
  FilterList,
  ViewComfy,
  Fullscreen,
  Close,
  ExpandMore,
  ExpandLess,
  Menu as MenuIcon,
} from '@mui/icons-material';
import {
  DataGrid,
  GridColDef,
  GridActionsCellItem,
  GridToolbar,
  GridRowParams,
} from '@mui/x-data-grid';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import AppBanner from '../components/AppBanner';
import LeftNavigation from '../components/LeftNavigation';
import { Supplier, getSuppliers, initializeSuppliers, setSuppliers, addSupplier, updateSupplier, deleteSupplier, searchSuppliers as searchSuppliersUtil } from '../data/suppliers';
import toast from 'react-hot-toast';

interface SupplierFormData {
  name: string;
  address: string;
  city: string;
  country: string;
  email: string;
  phone: string;
  gstin?: string;
}

const SupplierMasterDataPage: React.FC = () => {
  const { mode } = useTheme();
  const { user } = useAuth();
  const [suppliers, setSuppliersState] = useState<Supplier[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [navCollapsed, setNavCollapsed] = useState(() => {
    const saved = localStorage.getItem('navCollapsed');
    return saved === 'true';
  });

  const shouldShowNavigation = user?.role === 'Manager' || user?.role === 'Management';

  // Listen for storage changes to update margin when nav is collapsed/expanded
  useEffect(() => {
    const handleStorageChange = () => {
      const saved = localStorage.getItem('navCollapsed');
      setNavCollapsed(saved === 'true');
    };
    
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('navCollapsedChange', handleStorageChange);
    
    const interval = setInterval(() => {
      const saved = localStorage.getItem('navCollapsed');
      if ((saved === 'true') !== navCollapsed) {
        setNavCollapsed(saved === 'true');
      }
    }, 100);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('navCollapsedChange', handleStorageChange);
      clearInterval(interval);
    };
  }, [navCollapsed]);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [expandedAddresses, setExpandedAddresses] = useState<Set<string>>(new Set());
  const [formData, setFormData] = useState<SupplierFormData>({
    name: '',
    address: '',
    city: '',
    country: 'India',
    email: '',
    phone: '',
    gstin: '',
  });
  const [exportMenuAnchor, setExportMenuAnchor] = useState<null | HTMLElement>(null);
  const [configureMenuAnchor, setConfigureMenuAnchor] = useState<null | HTMLElement>(null);
  const [changeLogDialogOpen, setChangeLogDialogOpen] = useState(false);

  // Load suppliers from CSV on component mount
  React.useEffect(() => {
    const loadSuppliers = async () => {
      setIsLoading(true);
      try {
        await initializeSuppliers();
        const loadedSuppliers = await getSuppliers();
        setSuppliersState(loadedSuppliers);
      } catch (error) {
        console.error('Failed to load suppliers:', error);
        toast.error('Failed to load suppliers from CSV');
      } finally {
        setIsLoading(false);
      }
    };

    loadSuppliers();
  }, []);

  // Filter suppliers based on search term
  const filteredSuppliers = useMemo(() => {
    if (!searchTerm.trim()) return suppliers;
    return searchSuppliersUtil(searchTerm, suppliers);
  }, [suppliers, searchTerm]);

  // Toggle address expansion
  const toggleAddress = (supplierId: string) => {
    setExpandedAddresses(prev => {
      const newSet = new Set(prev);
      if (newSet.has(supplierId)) {
        newSet.delete(supplierId);
      } else {
        newSet.add(supplierId);
      }
      return newSet;
    });
  };


  // Handle add supplier
  const handleAdd = () => {
    setFormData({
      name: '',
      address: '',
      city: '',
      country: 'India',
      email: '',
      phone: '',
      gstin: '',
    });
    setAddDialogOpen(true);
  };

  const handleSaveAdd = async () => {
    if (!formData.name.trim() || !formData.address.trim()) {
      toast.error('Please fill in required fields (Name and Address)');
      return;
    }

    try {
      const newSupplier = await addSupplier({
        name: formData.name,
        address: formData.address,
        city: formData.city || undefined,
        country: formData.country,
        email: formData.email || `${formData.name.toLowerCase().replace(/\s+/g, '.')}@example.com`,
        phone: formData.phone || 'N/A',
        gstin: formData.gstin || undefined,
        specialties: [],
        rating: 0,
        isActive: true,
      });

      setSuppliersState([...suppliers, newSupplier]);
      toast.success('Supplier added successfully');
      setAddDialogOpen(false);
      resetForm();
    } catch (error) {
      console.error('Error adding supplier:', error);
      toast.error('Failed to add supplier');
    }
  };

  // Handle edit supplier
  const handleEdit = (supplier: Supplier) => {
    setSelectedSupplier(supplier);
    setFormData({
      name: supplier.name,
      address: supplier.address,
      city: supplier.city || '',
      country: supplier.country,
      email: supplier.email,
      phone: supplier.phone,
      gstin: supplier.gstin || '',
    });
    setEditDialogOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!selectedSupplier || !formData.name.trim() || !formData.address.trim()) {
      toast.error('Please fill in required fields');
      return;
    }

    try {
      const updated: Supplier | null = await updateSupplier(selectedSupplier.id, {
        name: formData.name,
        address: formData.address,
        city: formData.city || undefined,
        country: formData.country,
        email: formData.email,
        phone: formData.phone,
        gstin: formData.gstin || undefined,
      });

      if (updated !== null) {
        setSuppliersState(suppliers.map(s => s.id === selectedSupplier.id ? updated : s));
        toast.success('Supplier updated successfully');
        setEditDialogOpen(false);
        resetForm();
      } else {
        toast.error('Failed to update supplier');
      }
    } catch (error) {
      console.error('Error updating supplier:', error);
      toast.error('Failed to update supplier');
    }
  };

  // Handle delete supplier
  const handleDelete = (supplier: Supplier) => {
    setSelectedSupplier(supplier);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (selectedSupplier) {
      try {
        const deleted = await deleteSupplier(selectedSupplier.id);
        if (deleted) {
          setSuppliersState(suppliers.filter(s => s.id !== selectedSupplier.id));
          toast.success('Supplier deleted successfully');
        } else {
          toast.error('Failed to delete supplier');
        }
        setDeleteDialogOpen(false);
        setSelectedSupplier(null);
      } catch (error) {
        console.error('Error deleting supplier:', error);
        toast.error('Failed to delete supplier');
      }
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      address: '',
      city: '',
      country: 'India',
      email: '',
      phone: '',
      gstin: '',
    });
    setSelectedSupplier(null);
  };

  // Handle export
  const handleExport = (format: 'csv' | 'excel' | 'pdf') => {
    toast.success(`Exporting to ${format.toUpperCase()}...`);
    // TODO: Implement actual export functionality
    setExportMenuAnchor(null);
  };

  // Columns for DataGrid
  const columns: GridColDef[] = [
    {
      field: 'id',
      headerName: 'Supplier ID',
      width: 120,
      sortable: true,
    },
    {
      field: 'name',
      headerName: 'Supplier Name',
      width: 250,
      sortable: true,
    },
    {
      field: 'address',
      headerName: 'Supplier Address',
      width: 400,
      sortable: false,
      renderCell: (params) => {
        const supplier = params.row as Supplier;
        const isExpanded = expandedAddresses.has(supplier.id);
        const addressPreview = supplier.address.length > 50
          ? (isExpanded ? supplier.address : `${supplier.address.substring(0, 50)}...`)
          : supplier.address;

        return (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
            <Typography variant="body2" sx={{ flex: 1 }}>
              {addressPreview}
            </Typography>
            {supplier.address.length > 50 && (
              <IconButton
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleAddress(supplier.id);
                }}
                sx={{ p: 0.5 }}
              >
                {isExpanded ? <ExpandLess /> : <ExpandMore />}
              </IconButton>
            )}
          </Box>
        );
      },
    },
    {
      field: 'city',
      headerName: 'City',
      width: 150,
      sortable: true,
      valueGetter: (value) => value || 'N/A',
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 120,
      sortable: false,
      renderCell: (params) => {
        const supplier = params.row as Supplier;
        return (
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Tooltip title="Edit">
              <IconButton
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  handleEdit(supplier);
                }}
                sx={{ color: '#2196F3' }}
              >
                <Edit fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Delete">
              <IconButton
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete(supplier);
                }}
                sx={{ color: '#f44336' }}
              >
                <Delete fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
        );
      },
    },
  ];

  const getBackgroundColor = () => mode === 'dark' ? '#000000' : '#F8F9FA';
  const getCardTextColor = () => mode === 'dark' ? '#FFFFFF' : '#333333';
  const getSecondaryTextColor = () => mode === 'dark' ? 'rgba(255,255,255,0.8)' : 'rgba(0,0,0,0.7)';

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', flexGrow: 1, bgcolor: getBackgroundColor(), minHeight: '100vh' }}>
      {/* Full width banner at top */}
      <AppBanner />
      
      {/* Content area with navigation */}
      <Box sx={{ display: 'flex', flexGrow: 1 }}>
        <LeftNavigation />
        
        <Box sx={{ 
          flexGrow: 1, 
          ml: { xs: 0, md: '72px' }, 
          pl: { xs: 2, md: 0.5 },
          pr: { xs: 2, md: 2 },
          transition: 'margin-left 0.3s ease-in-out',
        }}>
          <Container maxWidth="xl" sx={{ mt: 3, mb: 3, pl: { xs: 2, md: 0.5 }, pr: { xs: 2, md: 2 } }}>
          {/* Header */}
          <Box sx={{ mb: 4 }}>
            <Typography
              variant="h4"
              sx={{
                fontWeight: 700,
                color: getCardTextColor(),
                mb: 1,
              }}
            >
              Supplier Master Data
            </Typography>
            <Typography
              variant="body1"
              sx={{
                color: getSecondaryTextColor(),
              }}
            >
              Manage and configure your supplier master data.
            </Typography>
          </Box>

          {/* Action Buttons */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              <Button
                variant="contained"
                startIcon={<History />}
                onClick={() => setChangeLogDialogOpen(true)}
                sx={{
                  bgcolor: '#EF721F',
                  '&:hover': { bgcolor: '#F26522' },
                  textTransform: 'none',
                }}
              >
                Change Logs
              </Button>
              
              <Button
                variant="contained"
                startIcon={<Download />}
                onClick={(e) => setExportMenuAnchor(e.currentTarget)}
                endIcon={<ExpandMore />}
                sx={{
                  bgcolor: '#EF721F',
                  '&:hover': { bgcolor: '#F26522' },
                  textTransform: 'none',
                }}
              >
                Export
              </Button>
              
              <Button
                variant="contained"
                startIcon={<Add />}
                onClick={handleAdd}
                sx={{
                  bgcolor: '#EF721F',
                  '&:hover': { bgcolor: '#F26522' },
                  textTransform: 'none',
                }}
              >
                + Add Supplier
              </Button>
              
              <Button
                variant="contained"
                startIcon={<Upload />}
                sx={{
                  bgcolor: '#EF721F',
                  '&:hover': { bgcolor: '#F26522' },
                  textTransform: 'none',
                }}
              >
                Bulk Upload
              </Button>
              
              <Button
                variant="contained"
                startIcon={<Settings />}
                onClick={(e) => setConfigureMenuAnchor(e.currentTarget)}
                endIcon={<ExpandMore />}
                sx={{
                  bgcolor: '#EF721F',
                  '&:hover': { bgcolor: '#F26522' },
                  textTransform: 'none',
                }}
              >
                Configure
              </Button>
            </Box>
          </Box>

          {/* Search and Table Options */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 2 }}>
            <TextField
              placeholder="Search anything..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search />
                  </InputAdornment>
                ),
              }}
              sx={{
                minWidth: 300,
                bgcolor: mode === 'dark' ? 'rgba(255,255,255,0.05)' : '#FFFFFF',
                '& .MuiOutlinedInput-root': {
                  '& fieldset': {
                    borderColor: mode === 'dark' ? 'rgba(255,255,255,0.2)' : 'rgba(239, 114, 31,0.3)',
                  },
                  '&:hover fieldset': {
                    borderColor: mode === 'dark' ? 'rgba(255,255,255,0.3)' : '#EF721F',
                  },
                  '&.Mui-focused fieldset': {
                    borderColor: '#EF721F',
                    borderWidth: '2px',
                  },
                },
              }}
            />
            
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Tooltip title="Columns">
                <IconButton>
                  <ViewColumn />
                </IconButton>
              </Tooltip>
              <Tooltip title="Filters">
                <IconButton>
                  <FilterList />
                </IconButton>
              </Tooltip>
              <Tooltip title="Density">
                <IconButton>
                  <ViewComfy />
                </IconButton>
              </Tooltip>
              <Tooltip title="Fullscreen">
                <IconButton>
                  <Fullscreen />
                </IconButton>
              </Tooltip>
            </Box>
          </Box>

          {/* Data Table */}
          <Box
            sx={{
              height: 600,
              width: '100%',
              bgcolor: mode === 'dark' ? 'rgba(255,255,255,0.05)' : '#FFFFFF',
              borderRadius: 2,
              overflow: 'hidden',
            }}
          >
            {isLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                <Typography variant="body1" sx={{ color: getCardTextColor() }}>
                  Loading suppliers from CSV...
                </Typography>
              </Box>
            ) : (
              <DataGrid
                rows={filteredSuppliers}
                columns={columns}
                rowsPerPageOptions={[10, 25, 50, 100]}
                initialState={{
                  pagination: {
                    pageSize: 25,
                  },
                }}
                disableSelectionOnClick
                autoHeight={false}
                sx={{
                  height: '100%',
                border: 'none',
                '& .MuiDataGrid-cell': {
                  borderBottom: `1px solid ${mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
                  color: getCardTextColor(),
                },
                '& .MuiDataGrid-columnHeaders': {
                  bgcolor: mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(239, 114, 31,0.05)',
                  color: getCardTextColor(),
                  fontWeight: 600,
                  borderBottom: `2px solid ${mode === 'dark' ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)'}`,
                },
                '& .MuiDataGrid-row': {
                  '&:hover': {
                    bgcolor: mode === 'dark' ? 'rgba(239, 114, 31,0.1)' : 'rgba(239, 114, 31,0.05)',
                  },
                },
                '& .MuiDataGrid-footerContainer': {
                  bgcolor: mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(239, 114, 31,0.05)',
                  borderTop: `1px solid ${mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
                },
              }}
              />
            )}
          </Box>

          {/* Add Supplier Dialog */}
          <Dialog open={addDialogOpen} onClose={() => setAddDialogOpen(false)} maxWidth="sm" fullWidth>
            <DialogTitle sx={{ bgcolor: '#EF721F', color: '#FFFFFF', display: 'flex', justifyContent: 'space-between' }}>
              Add Supplier
              <IconButton onClick={() => setAddDialogOpen(false)} sx={{ color: '#FFFFFF' }}>
                <Close />
              </IconButton>
            </DialogTitle>
            <DialogContent sx={{ mt: 2 }}>
              <TextField
                fullWidth
                label="Supplier Name *"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                sx={{ mb: 2 }}
              />
              <TextField
                fullWidth
                label="Address *"
                multiline
                rows={3}
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                sx={{ mb: 2 }}
              />
              <TextField
                fullWidth
                label="City"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                sx={{ mb: 2 }}
              />
              <TextField
                fullWidth
                label="Country"
                value={formData.country}
                onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                sx={{ mb: 2 }}
              />
              <TextField
                fullWidth
                label="Email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                sx={{ mb: 2 }}
              />
              <TextField
                fullWidth
                label="Phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                sx={{ mb: 2 }}
              />
              <TextField
                fullWidth
                label="GSTIN"
                value={formData.gstin}
                onChange={(e) => setFormData({ ...formData, gstin: e.target.value })}
              />
            </DialogContent>
            <DialogActions sx={{ p: 2 }}>
              <Button onClick={() => setAddDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleSaveAdd} variant="contained" sx={{ bgcolor: '#EF721F', '&:hover': { bgcolor: '#F26522' } }}>
                Save
              </Button>
            </DialogActions>
          </Dialog>

          {/* Edit Supplier Dialog */}
          <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="sm" fullWidth>
            <DialogTitle sx={{ bgcolor: '#EF721F', color: '#FFFFFF', display: 'flex', justifyContent: 'space-between' }}>
              Edit Supplier
              <IconButton onClick={() => setEditDialogOpen(false)} sx={{ color: '#FFFFFF' }}>
                <Close />
              </IconButton>
            </DialogTitle>
            <DialogContent sx={{ mt: 2 }}>
              <TextField
                fullWidth
                label="Supplier Name *"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                sx={{ mb: 2 }}
              />
              <TextField
                fullWidth
                label="Address *"
                multiline
                rows={3}
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                sx={{ mb: 2 }}
              />
              <TextField
                fullWidth
                label="City"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                sx={{ mb: 2 }}
              />
              <TextField
                fullWidth
                label="Country"
                value={formData.country}
                onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                sx={{ mb: 2 }}
              />
              <TextField
                fullWidth
                label="Email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                sx={{ mb: 2 }}
              />
              <TextField
                fullWidth
                label="Phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                sx={{ mb: 2 }}
              />
              <TextField
                fullWidth
                label="GSTIN"
                value={formData.gstin}
                onChange={(e) => setFormData({ ...formData, gstin: e.target.value })}
              />
            </DialogContent>
            <DialogActions sx={{ p: 2 }}>
              <Button onClick={() => setEditDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleSaveEdit} variant="contained" sx={{ bgcolor: '#EF721F', '&:hover': { bgcolor: '#F26522' } }}>
                Save
              </Button>
            </DialogActions>
          </Dialog>

          {/* Delete Confirmation Dialog */}
          <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
            <DialogTitle sx={{ bgcolor: '#EF721F', color: '#FFFFFF', display: 'flex', justifyContent: 'space-between' }}>
              Delete Supplier
              <IconButton onClick={() => setDeleteDialogOpen(false)} sx={{ color: '#FFFFFF' }}>
                <Close />
              </IconButton>
            </DialogTitle>
            <DialogContent>
              <Typography>
                Are you sure you want to delete "{selectedSupplier?.name}"? This action cannot be undone.
              </Typography>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleConfirmDelete} color="error" variant="contained">
                Delete
              </Button>
            </DialogActions>
          </Dialog>

          {/* Export Menu */}
          <Menu
            anchorEl={exportMenuAnchor}
            open={Boolean(exportMenuAnchor)}
            onClose={() => setExportMenuAnchor(null)}
          >
            <MenuItem onClick={() => handleExport('csv')}>Export as CSV</MenuItem>
            <MenuItem onClick={() => handleExport('excel')}>Export as Excel</MenuItem>
            <MenuItem onClick={() => handleExport('pdf')}>Export as PDF</MenuItem>
          </Menu>

          {/* Configure Menu */}
          <Menu
            anchorEl={configureMenuAnchor}
            open={Boolean(configureMenuAnchor)}
            onClose={() => setConfigureMenuAnchor(null)}
          >
            <MenuItem>Table Settings</MenuItem>
            <MenuItem>Column Preferences</MenuItem>
            <MenuItem>Default Filters</MenuItem>
          </Menu>

          {/* Change Logs Dialog */}
          <Dialog open={changeLogDialogOpen} onClose={() => setChangeLogDialogOpen(false)} maxWidth="md" fullWidth>
            <DialogTitle sx={{ bgcolor: '#EF721F', color: '#FFFFFF', display: 'flex', justifyContent: 'space-between' }}>
              Change Logs
              <IconButton onClick={() => setChangeLogDialogOpen(false)} sx={{ color: '#FFFFFF' }}>
                <Close />
              </IconButton>
            </DialogTitle>
            <DialogContent sx={{ mt: 2 }}>
              <Typography variant="body2" color="text.secondary">
                Change logs will be displayed here. This feature is coming soon.
              </Typography>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setChangeLogDialogOpen(false)}>Close</Button>
            </DialogActions>
          </Dialog>
          </Container>
        </Box>
      </Box>
    </Box>
  );
};

export default SupplierMasterDataPage;

