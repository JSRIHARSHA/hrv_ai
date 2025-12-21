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
  Tooltip,
} from '@mui/material';
import {
  Search,
  Add,
  Edit,
  Delete,
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
} from '@mui/icons-material';
import {
  DataGrid,
  GridColDef,
} from '@mui/x-data-grid';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import AppBanner from '../components/AppBanner';
import LeftNavigation from '../components/LeftNavigation';
import { Product } from '../types';
import { getProducts, initializeProducts, setProducts, addProduct, updateProduct, deleteProduct, searchProducts as searchProductsUtil } from '../data/products';
import toast from 'react-hot-toast';

interface ProductFormData {
  itemName: string;
  sku: string;
  hsnSac?: string;
  categoryName?: string;
  productType?: string;
  unitName?: string;
  vendor?: string;
  warehouseName?: string;
  status?: string;
  intraStateTaxRate?: number;
  interStateTaxRate?: number;
  reorderPoint?: number;
}

const ProductMasterDataPage: React.FC = () => {
  const { mode } = useTheme();
  const { user } = useAuth();
  const [products, setProductsState] = useState<Product[]>([]);
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
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [expandedDescriptions, setExpandedDescriptions] = useState<Set<string>>(new Set());
  const [formData, setFormData] = useState<ProductFormData>({
    itemName: '',
    sku: '',
    hsnSac: '',
    categoryName: '',
    productType: '',
    unitName: '',
    vendor: '',
    warehouseName: '',
    status: 'Active',
    intraStateTaxRate: 18,
    interStateTaxRate: 18,
    reorderPoint: 0,
  });
  const [exportMenuAnchor, setExportMenuAnchor] = useState<null | HTMLElement>(null);
  const [configureMenuAnchor, setConfigureMenuAnchor] = useState<null | HTMLElement>(null);
  const [changeLogDialogOpen, setChangeLogDialogOpen] = useState(false);

  // Load products from CSV on component mount
  React.useEffect(() => {
    const loadProducts = async () => {
      setIsLoading(true);
      try {
        await initializeProducts();
        const loadedProducts = await getProducts();
        setProductsState(loadedProducts);
      } catch (error) {
        console.error('Failed to load products:', error);
        toast.error('Failed to load products from CSV');
      } finally {
        setIsLoading(false);
      }
    };

    loadProducts();
  }, []);

  // Filter products based on search term
  const filteredProducts = useMemo(() => {
    if (!searchTerm.trim()) return products;
    return searchProductsUtil(searchTerm, products);
  }, [products, searchTerm]);

  // Toggle description expansion
  const toggleDescription = (productId: string) => {
    setExpandedDescriptions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(productId)) {
        newSet.delete(productId);
      } else {
        newSet.add(productId);
      }
      return newSet;
    });
  };

  // Handle add product
  const handleAdd = () => {
    resetForm();
    setAddDialogOpen(true);
  };

  const handleSaveAdd = async () => {
    if (!formData.itemName.trim() || !formData.sku.trim()) {
      toast.error('Please fill in required fields (Item Name and SKU)');
      return;
    }

    try {
      const newProduct = addProduct({
        itemId: `ITEM-${Date.now()}`,
        itemName: formData.itemName,
        sku: formData.sku,
        upc: undefined,
        hsnSac: formData.hsnSac || undefined,
        categoryName: formData.categoryName || undefined,
        productType: formData.productType || undefined,
        unitName: formData.unitName || undefined,
        defaultSalesUnitName: formData.unitName || undefined,
        defaultPurchaseUnitName: formData.unitName || undefined,
        vendor: formData.vendor || undefined,
        warehouseName: formData.warehouseName || undefined,
        status: formData.status || 'Active',
        taxable: true,
        intraStateTaxRate: formData.intraStateTaxRate,
        interStateTaxRate: formData.interStateTaxRate,
        inventoryAccount: undefined,
        reorderPoint: formData.reorderPoint,
        stockOnHand: 0,
        itemType: 'Inventory',
      });

      setProductsState([...products, newProduct]);
      toast.success('Product added successfully');
      setAddDialogOpen(false);
      resetForm();
    } catch (error) {
      console.error('Error adding product:', error);
      toast.error('Failed to add product');
    }
  };

  // Handle edit product
  const handleEdit = (product: Product) => {
    setSelectedProduct(product);
    setFormData({
      itemName: product.itemName,
      sku: product.sku,
      hsnSac: product.hsnSac || '',
      categoryName: product.categoryName || '',
      productType: product.productType || '',
      unitName: product.unitName || '',
      vendor: product.vendor || '',
      warehouseName: product.warehouseName || '',
      status: product.status || 'Active',
      intraStateTaxRate: product.intraStateTaxRate || 18,
      interStateTaxRate: product.interStateTaxRate || 18,
      reorderPoint: product.reorderPoint || 0,
    });
    setEditDialogOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!selectedProduct || !formData.itemName.trim() || !formData.sku.trim()) {
      toast.error('Please fill in required fields');
      return;
    }

    try {
      const updated: Product | null = await updateProduct(selectedProduct.id, {
        itemName: formData.itemName,
        sku: formData.sku,
        hsnSac: formData.hsnSac || undefined,
        categoryName: formData.categoryName || undefined,
        productType: formData.productType || undefined,
        unitName: formData.unitName || undefined,
        vendor: formData.vendor || undefined,
        warehouseName: formData.warehouseName || undefined,
        status: formData.status || undefined,
        intraStateTaxRate: formData.intraStateTaxRate,
        interStateTaxRate: formData.interStateTaxRate,
        reorderPoint: formData.reorderPoint,
      });

      if (updated !== null) {
        setProductsState(products.map(p => p.id === selectedProduct.id ? updated : p));
        toast.success('Product updated successfully');
        setEditDialogOpen(false);
        resetForm();
      } else {
        toast.error('Failed to update product');
      }
    } catch (error) {
      console.error('Error updating product:', error);
      toast.error('Failed to update product');
    }
  };

  // Handle delete product
  const handleDelete = (product: Product) => {
    setSelectedProduct(product);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (selectedProduct) {
      try {
        const deleted = deleteProduct(selectedProduct.id);
        if (deleted) {
          setProductsState(products.filter(p => p.id !== selectedProduct.id));
          toast.success('Product deleted successfully');
        } else {
          toast.error('Failed to delete product');
        }
        setDeleteDialogOpen(false);
        setSelectedProduct(null);
      } catch (error) {
        console.error('Error deleting product:', error);
        toast.error('Failed to delete product');
      }
    }
  };

  const resetForm = () => {
    setFormData({
      itemName: '',
      sku: '',
      hsnSac: '',
      categoryName: '',
      productType: '',
      unitName: '',
      vendor: '',
      warehouseName: '',
      status: 'Active',
      intraStateTaxRate: 18,
      interStateTaxRate: 18,
      reorderPoint: 0,
    });
    setSelectedProduct(null);
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
      field: 'itemId',
      headerName: 'Item ID',
      width: 150,
      sortable: true,
    },
    {
      field: 'itemName',
      headerName: 'Item Name',
      width: 300,
      sortable: true,
    },
    {
      field: 'sku',
      headerName: 'SKU',
      width: 200,
      sortable: true,
    },
    {
      field: 'hsnSac',
      headerName: 'HSN/SAC',
      width: 120,
      sortable: true,
      valueGetter: (value) => value || 'N/A',
    },
    {
      field: 'categoryName',
      headerName: 'Category',
      width: 150,
      sortable: true,
      valueGetter: (value) => value || 'N/A',
    },
    {
      field: 'productType',
      headerName: 'Product Type',
      width: 150,
      sortable: true,
      valueGetter: (value) => value || 'N/A',
    },
    {
      field: 'vendor',
      headerName: 'Vendor',
      width: 200,
      sortable: true,
      valueGetter: (value) => value || 'N/A',
    },
    {
      field: 'unitName',
      headerName: 'Unit',
      width: 100,
      sortable: true,
      valueGetter: (value) => value || 'N/A',
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 100,
      sortable: true,
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 120,
      sortable: false,
      renderCell: (params) => {
        const product = params.row as Product;
        return (
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Tooltip title="Edit">
              <IconButton
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  handleEdit(product);
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
                  handleDelete(product);
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
      <AppBanner />
      
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
              Product Master Data
            </Typography>
            <Typography
              variant="body1"
              sx={{
                color: getSecondaryTextColor(),
              }}
            >
              Manage and configure your product master data.
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
            </Box>
            
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
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
                + Add Product
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
              placeholder="Search products..."
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
            <DataGrid
              rows={filteredProducts}
              columns={columns}
              pageSize={10}
              rowsPerPageOptions={[10, 25, 50, 100]}
              disableSelectionOnClick
              loading={isLoading}
              sx={{
                border: 'none',
                '& .MuiDataGrid-cell': {
                  borderBottom: `1px solid ${mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(239, 114, 31,0.1)'}`,
                  color: getCardTextColor(),
                },
                '& .MuiDataGrid-row': {
                  '&:hover': {
                    bgcolor: mode === 'dark' ? 'rgba(239, 114, 31,0.1)' : 'rgba(239, 114, 31,0.05)',
                  },
                },
                '& .MuiDataGrid-footerContainer': {
                  bgcolor: mode === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(239, 114, 31,0.03)',
                  borderTop: `1px solid ${mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(239, 114, 31,0.1)'}`,
                },
                '& .MuiDataGrid-columnHeaders': {
                  bgcolor: mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(239, 114, 31,0.05)',
                  color: getCardTextColor(),
                  fontWeight: 600,
                  borderBottom: `2px solid ${mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(239, 114, 31,0.2)'}`,
                },
              }}
            />
          </Box>
          </Container>
        </Box>
      </Box>

      {/* Add Product Dialog */}
      <Dialog open={addDialogOpen} onClose={() => setAddDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ bgcolor: '#EF721F', color: '#FFFFFF', display: 'flex', justifyContent: 'space-between' }}>
          Add Product
          <IconButton onClick={() => setAddDialogOpen(false)} sx={{ color: '#FFFFFF' }}>
            <Close />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          <TextField
            fullWidth
            label="Item Name *"
            value={formData.itemName}
            onChange={(e) => setFormData({ ...formData, itemName: e.target.value })}
            sx={{ mb: 2 }}
          />
          <TextField
            fullWidth
            label="SKU *"
            value={formData.sku}
            onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
            sx={{ mb: 2 }}
          />
          <TextField
            fullWidth
            label="HSN/SAC"
            value={formData.hsnSac}
            onChange={(e) => setFormData({ ...formData, hsnSac: e.target.value })}
            sx={{ mb: 2 }}
          />
          <TextField
            fullWidth
            label="Category Name"
            value={formData.categoryName}
            onChange={(e) => setFormData({ ...formData, categoryName: e.target.value })}
            sx={{ mb: 2 }}
          />
          <TextField
            fullWidth
            label="Product Type"
            value={formData.productType}
            onChange={(e) => setFormData({ ...formData, productType: e.target.value })}
            sx={{ mb: 2 }}
          />
          <TextField
            fullWidth
            label="Unit Name"
            value={formData.unitName}
            onChange={(e) => setFormData({ ...formData, unitName: e.target.value })}
            sx={{ mb: 2 }}
          />
          <TextField
            fullWidth
            label="Vendor"
            value={formData.vendor}
            onChange={(e) => setFormData({ ...formData, vendor: e.target.value })}
            sx={{ mb: 2 }}
          />
          <TextField
            fullWidth
            label="Warehouse Name"
            value={formData.warehouseName}
            onChange={(e) => setFormData({ ...formData, warehouseName: e.target.value })}
            sx={{ mb: 2 }}
          />
          <TextField
            fullWidth
            label="Status"
            value={formData.status}
            onChange={(e) => setFormData({ ...formData, status: e.target.value })}
            sx={{ mb: 2 }}
          />
          <TextField
            fullWidth
            label="Intra State Tax Rate (%)"
            type="number"
            value={formData.intraStateTaxRate}
            onChange={(e) => setFormData({ ...formData, intraStateTaxRate: parseFloat(e.target.value) || 0 })}
            sx={{ mb: 2 }}
          />
          <TextField
            fullWidth
            label="Inter State Tax Rate (%)"
            type="number"
            value={formData.interStateTaxRate}
            onChange={(e) => setFormData({ ...formData, interStateTaxRate: parseFloat(e.target.value) || 0 })}
            sx={{ mb: 2 }}
          />
          <TextField
            fullWidth
            label="Reorder Point"
            type="number"
            value={formData.reorderPoint}
            onChange={(e) => setFormData({ ...formData, reorderPoint: parseFloat(e.target.value) || 0 })}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setAddDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleSaveAdd} variant="contained" sx={{ bgcolor: '#EF721F', '&:hover': { bgcolor: '#F26522' } }}>
            Save
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Product Dialog */}
      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ bgcolor: '#EF721F', color: '#FFFFFF', display: 'flex', justifyContent: 'space-between' }}>
          Edit Product
          <IconButton onClick={() => setEditDialogOpen(false)} sx={{ color: '#FFFFFF' }}>
            <Close />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          <TextField
            fullWidth
            label="Item Name *"
            value={formData.itemName}
            onChange={(e) => setFormData({ ...formData, itemName: e.target.value })}
            sx={{ mb: 2 }}
          />
          <TextField
            fullWidth
            label="SKU *"
            value={formData.sku}
            onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
            sx={{ mb: 2 }}
          />
          <TextField
            fullWidth
            label="HSN/SAC"
            value={formData.hsnSac}
            onChange={(e) => setFormData({ ...formData, hsnSac: e.target.value })}
            sx={{ mb: 2 }}
          />
          <TextField
            fullWidth
            label="Category Name"
            value={formData.categoryName}
            onChange={(e) => setFormData({ ...formData, categoryName: e.target.value })}
            sx={{ mb: 2 }}
          />
          <TextField
            fullWidth
            label="Product Type"
            value={formData.productType}
            onChange={(e) => setFormData({ ...formData, productType: e.target.value })}
            sx={{ mb: 2 }}
          />
          <TextField
            fullWidth
            label="Unit Name"
            value={formData.unitName}
            onChange={(e) => setFormData({ ...formData, unitName: e.target.value })}
            sx={{ mb: 2 }}
          />
          <TextField
            fullWidth
            label="Vendor"
            value={formData.vendor}
            onChange={(e) => setFormData({ ...formData, vendor: e.target.value })}
            sx={{ mb: 2 }}
          />
          <TextField
            fullWidth
            label="Warehouse Name"
            value={formData.warehouseName}
            onChange={(e) => setFormData({ ...formData, warehouseName: e.target.value })}
            sx={{ mb: 2 }}
          />
          <TextField
            fullWidth
            label="Status"
            value={formData.status}
            onChange={(e) => setFormData({ ...formData, status: e.target.value })}
            sx={{ mb: 2 }}
          />
          <TextField
            fullWidth
            label="Intra State Tax Rate (%)"
            type="number"
            value={formData.intraStateTaxRate}
            onChange={(e) => setFormData({ ...formData, intraStateTaxRate: parseFloat(e.target.value) || 0 })}
            sx={{ mb: 2 }}
          />
          <TextField
            fullWidth
            label="Inter State Tax Rate (%)"
            type="number"
            value={formData.interStateTaxRate}
            onChange={(e) => setFormData({ ...formData, interStateTaxRate: parseFloat(e.target.value) || 0 })}
            sx={{ mb: 2 }}
          />
          <TextField
            fullWidth
            label="Reorder Point"
            type="number"
            value={formData.reorderPoint}
            onChange={(e) => setFormData({ ...formData, reorderPoint: parseFloat(e.target.value) || 0 })}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setEditDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleSaveEdit} variant="contained" sx={{ bgcolor: '#EF721F', '&:hover': { bgcolor: '#F26522' } }}>
            Update
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle sx={{ bgcolor: '#EF721F', color: '#FFFFFF', display: 'flex', justifyContent: 'space-between' }}>
          Delete Product
          <IconButton onClick={() => setDeleteDialogOpen(false)} sx={{ color: '#FFFFFF' }}>
            <Close />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          Are you sure you want to delete <strong>{selectedProduct?.itemName}</strong>? This action cannot be undone.
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleConfirmDelete} variant="contained" color="error">
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
        <MenuItem onClick={() => setConfigureMenuAnchor(null)}>Column Settings</MenuItem>
        <MenuItem onClick={() => setConfigureMenuAnchor(null)}>Filter Settings</MenuItem>
        <MenuItem onClick={() => setConfigureMenuAnchor(null)}>View Settings</MenuItem>
      </Menu>

      {/* Change Log Dialog */}
      <Dialog open={changeLogDialogOpen} onClose={() => setChangeLogDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Change Logs</DialogTitle>
        <DialogContent>
          <Typography>Change logs will be displayed here.</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setChangeLogDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ProductMasterDataPage;

