import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Button,
  TextField,
  InputAdornment,
  Grid,
  Card,
  CardContent,
  CardActions,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  Tooltip,
  Fab,
} from '@mui/material';
import {
  Search,
  Add,
  Edit,
  Delete,
  LocalShipping,
  Phone,
  Business,
  LocationOn,
  AccountBalance,
  Close,
} from '@mui/icons-material';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { useFreightHandlers } from '../contexts/FreightHandlerContext';
import AppBanner from '../components/AppBanner';
import LeftNavigation from '../components/LeftNavigation';
import { FreightHandler } from '../types';
import toast from 'react-hot-toast';

interface FreightHandlerFormData {
  name: string;
  company: string;
  address: string;
  country: string;
  phone: string;
  gstin?: string;
  notes?: string;
}

const FreightHandlersPage: React.FC = () => {
  const { mode } = useTheme();
  const { user } = useAuth();
  const {
    freightHandlers,
    createFreightHandler,
    updateFreightHandler,
    deleteFreightHandler,
    searchFreightHandlers,
  } = useFreightHandlers();

  const [searchTerm, setSearchTerm] = useState('');
  const [navCollapsed, setNavCollapsed] = useState(() => {
    const saved = localStorage.getItem('navCollapsed');
    return saved === 'true';
  });
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedHandler, setSelectedHandler] = useState<FreightHandler | null>(null);
  const [formData, setFormData] = useState<FreightHandlerFormData>({
    name: '',
    company: '',
    address: '',
    country: 'India',
    phone: '',
    gstin: '',
    notes: '',
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

  // Filter freight handlers based on search term
  // Ensure freightHandlers is always an array
  const safeFreightHandlers = Array.isArray(freightHandlers) ? freightHandlers : [];
  let filteredHandlers: typeof safeFreightHandlers;
  try {
    filteredHandlers = searchTerm && searchFreightHandlers
      ? searchFreightHandlers(searchTerm)
      : safeFreightHandlers;
    // Ensure filteredHandlers is always an array
    if (!Array.isArray(filteredHandlers)) {
      filteredHandlers = safeFreightHandlers;
    }
  } catch (error) {
    console.error('Error filtering freight handlers:', error);
    filteredHandlers = safeFreightHandlers;
  }

  const getBackgroundColor = () => mode === 'dark' ? '#000000' : '#F8F9FA';
  const getTextColor = () => mode === 'dark' ? '#FFFFFF' : '#333333';
  const getSecondaryTextColor = () => mode === 'dark' ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.6)';
  const getCardBgColor = () => mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.8)';
  const getBorderColor = () => mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(239, 114, 31, 0.2)';

  const handleOpenAddDialog = () => {
    setFormData({
      name: '',
      company: '',
      address: '',
      country: 'India',
      phone: '',
      gstin: '',
      notes: '',
    });
    setAddDialogOpen(true);
  };

  const handleOpenEditDialog = (handler: FreightHandler) => {
    setSelectedHandler(handler);
    setFormData({
      name: handler.name,
      company: handler.company,
      address: handler.address,
      country: handler.country,
      phone: handler.phone,
      gstin: handler.gstin || '',
      notes: handler.notes || '',
    });
    setEditDialogOpen(true);
  };

  const handleOpenDeleteDialog = (handler: FreightHandler) => {
    setSelectedHandler(handler);
    setDeleteDialogOpen(true);
  };

  const handleSave = () => {
    if (!formData.name || !formData.company || !formData.address || !formData.country || !formData.phone) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (editDialogOpen && selectedHandler) {
      updateFreightHandler(selectedHandler.id, formData);
    } else {
      createFreightHandler(formData);
    }

    setAddDialogOpen(false);
    setEditDialogOpen(false);
    setSelectedHandler(null);
  };

  const handleDelete = () => {
    if (selectedHandler) {
      deleteFreightHandler(selectedHandler.id);
      setDeleteDialogOpen(false);
      setSelectedHandler(null);
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', flexGrow: 1, bgcolor: getBackgroundColor(), minHeight: '100vh' }}>
      <AppBanner />
      <Box sx={{ display: 'flex', flexGrow: 1 }}>
        {shouldShowNavigation && <LeftNavigation />}
        <Box
          sx={{
            flexGrow: 1,
            ml: { xs: 0, md: shouldShowNavigation ? '72px' : 0 },
            transition: 'margin-left 0.3s ease-in-out',
            pl: { xs: 2, md: 0.5 },
            pr: { xs: 2, md: 2 },
          }}
        >
          <Container maxWidth="xl" sx={{ mt: 3, mb: 3, pl: { xs: 2, md: 0.5 }, pr: { xs: 2, md: 2 } }}>
          <Box sx={{ mb: 4, width: '100%' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
              <Box>
                <Typography variant="h4" sx={{ color: getTextColor(), fontWeight: 700, mb: 1 }}>
                  Freight Handlers
                </Typography>
                <Typography variant="body1" sx={{ color: getSecondaryTextColor() }}>
                  Manage freight handler information
                </Typography>
              </Box>
              <Button
                variant="contained"
                startIcon={<Add />}
                onClick={handleOpenAddDialog}
                sx={{
                  bgcolor: '#EF721F',
                  '&:hover': { bgcolor: '#F26522' },
                }}
              >
                Add Freight Handler
              </Button>
            </Box>

            <TextField
              fullWidth
              placeholder="Search freight handlers..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search sx={{ color: getSecondaryTextColor() }} />
                  </InputAdornment>
                ),
              }}
              sx={{
                mb: 3,
                '& .MuiOutlinedInput-root': {
                  backgroundColor: mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.9)',
                  color: getTextColor(),
                  '& fieldset': { borderColor: getBorderColor() },
                  '&:hover fieldset': { borderColor: '#EF721F' },
                  '&.Mui-focused fieldset': { borderColor: '#EF721F' },
                },
              }}
            />

            {filteredHandlers.length === 0 ? (
              <Box
                sx={{
                  textAlign: 'center',
                  py: 8,
                  bgcolor: getCardBgColor(),
                  borderRadius: 2,
                  border: `1px dashed ${getBorderColor()}`,
                }}
              >
                <LocalShipping sx={{ fontSize: 64, color: getSecondaryTextColor(), mb: 2 }} />
                <Typography variant="h6" sx={{ color: getTextColor(), mb: 1 }}>
                  No freight handlers found
                </Typography>
                <Typography variant="body2" sx={{ color: getSecondaryTextColor() }}>
                  {searchTerm ? 'Try adjusting your search terms' : 'Get started by adding a freight handler'}
                </Typography>
              </Box>
            ) : (
              <Grid container spacing={3}>
                {filteredHandlers.map((handler) => (
                  <Grid item xs={12} sm={6} md={4} lg={3} key={handler.id}>
                    <Card
                      sx={{
                        bgcolor: getCardBgColor(),
                        border: `1px solid ${getBorderColor()}`,
                        borderRadius: 2,
                        height: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        transition: 'all 0.3s ease',
                        '&:hover': {
                          transform: 'translateY(-4px)',
                          boxShadow: mode === 'dark' ? '0 8px 25px rgba(0,0,0,0.3)' : '0 8px 25px rgba(239, 114, 31,0.2)',
                        },
                      }}
                    >
                      <CardContent sx={{ flex: 1, pb: 1 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                          <Box sx={{ flex: 1 }}>
                            <Typography variant="h6" sx={{ color: getTextColor(), fontWeight: 600, mb: 0.5 }}>
                              {handler.name}
                            </Typography>
                            <Typography variant="body2" sx={{ color: getSecondaryTextColor(), fontSize: '0.85rem' }}>
                              {handler.company}
                            </Typography>
                          </Box>
                          <Chip
                            label={handler.country}
                            size="small"
                            sx={{
                              bgcolor: mode === 'dark' ? 'rgba(239, 114, 31, 0.2)' : 'rgba(239, 114, 31, 0.1)',
                              color: '#EF721F',
                              fontWeight: 600,
                              fontSize: '0.7rem',
                            }}
                          />
                        </Box>

                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Phone sx={{ fontSize: '1rem', color: getSecondaryTextColor() }} />
                            <Typography variant="body2" sx={{ color: getTextColor(), fontSize: '0.85rem' }}>
                              {handler.phone}
                            </Typography>
                          </Box>
                          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                            <LocationOn sx={{ fontSize: '1rem', color: getSecondaryTextColor(), mt: 0.25 }} />
                            <Typography variant="body2" sx={{ color: getTextColor(), fontSize: '0.85rem' }}>
                              {handler.address}
                            </Typography>
                          </Box>
                          {handler.gstin && (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <AccountBalance sx={{ fontSize: '1rem', color: getSecondaryTextColor() }} />
                              <Typography variant="body2" sx={{ color: getTextColor(), fontSize: '0.85rem' }}>
                                GSTIN: {handler.gstin}
                              </Typography>
                            </Box>
                          )}
                        </Box>
                      </CardContent>
                      <CardActions sx={{ px: 2, pb: 2, pt: 0, justifyContent: 'flex-end' }}>
                        <Tooltip title="Edit">
                          <IconButton
                            size="small"
                            onClick={() => handleOpenEditDialog(handler)}
                            sx={{ color: getTextColor() }}
                          >
                            <Edit fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete">
                          <IconButton
                            size="small"
                            onClick={() => handleOpenDeleteDialog(handler)}
                            sx={{ color: '#EF4444' }}
                          >
                            <Delete fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </CardActions>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            )}
          </Box>
        </Container>
        </Box>
      </Box>

      {/* Add/Edit Dialog */}
      <Dialog
        open={addDialogOpen || editDialogOpen}
        onClose={() => {
          setAddDialogOpen(false);
          setEditDialogOpen(false);
          setSelectedHandler(null);
        }}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            bgcolor: mode === 'dark' ? '#1A1A1A' : '#FFFFFF',
            color: getTextColor(),
          },
        }}
      >
        <DialogTitle sx={{ color: getTextColor(), borderBottom: `1px solid ${getBorderColor()}` }}>
          {editDialogOpen ? 'Edit Freight Handler' : 'Add Freight Handler'}
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="Name *"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              fullWidth
              required
              sx={{
                '& .MuiOutlinedInput-root': {
                  color: getTextColor(),
                  '& fieldset': { borderColor: getBorderColor() },
                },
                '& .MuiInputLabel-root': { color: getSecondaryTextColor() },
              }}
            />
            <TextField
              label="Company *"
              value={formData.company}
              onChange={(e) => setFormData({ ...formData, company: e.target.value })}
              fullWidth
              required
              sx={{
                '& .MuiOutlinedInput-root': {
                  color: getTextColor(),
                  '& fieldset': { borderColor: getBorderColor() },
                },
                '& .MuiInputLabel-root': { color: getSecondaryTextColor() },
              }}
            />
            <TextField
              label="Address *"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              fullWidth
              required
              multiline
              rows={3}
              sx={{
                '& .MuiOutlinedInput-root': {
                  color: getTextColor(),
                  '& fieldset': { borderColor: getBorderColor() },
                },
                '& .MuiInputLabel-root': { color: getSecondaryTextColor() },
              }}
            />
            <TextField
              label="Country *"
              value={formData.country}
              onChange={(e) => setFormData({ ...formData, country: e.target.value })}
              fullWidth
              required
              sx={{
                '& .MuiOutlinedInput-root': {
                  color: getTextColor(),
                  '& fieldset': { borderColor: getBorderColor() },
                },
                '& .MuiInputLabel-root': { color: getSecondaryTextColor() },
              }}
            />
            <TextField
              label="Phone *"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              fullWidth
              required
              sx={{
                '& .MuiOutlinedInput-root': {
                  color: getTextColor(),
                  '& fieldset': { borderColor: getBorderColor() },
                },
                '& .MuiInputLabel-root': { color: getSecondaryTextColor() },
              }}
            />
            <TextField
              label="GSTIN"
              value={formData.gstin}
              onChange={(e) => setFormData({ ...formData, gstin: e.target.value })}
              fullWidth
              sx={{
                '& .MuiOutlinedInput-root': {
                  color: getTextColor(),
                  '& fieldset': { borderColor: getBorderColor() },
                },
                '& .MuiInputLabel-root': { color: getSecondaryTextColor() },
              }}
            />
            <TextField
              label="Notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              fullWidth
              multiline
              rows={2}
              sx={{
                '& .MuiOutlinedInput-root': {
                  color: getTextColor(),
                  '& fieldset': { borderColor: getBorderColor() },
                },
                '& .MuiInputLabel-root': { color: getSecondaryTextColor() },
              }}
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ borderTop: `1px solid ${getBorderColor()}`, p: 2 }}>
          <Button
            onClick={() => {
              setAddDialogOpen(false);
              setEditDialogOpen(false);
              setSelectedHandler(null);
            }}
            sx={{ color: getTextColor() }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            variant="contained"
            sx={{
              bgcolor: '#EF721F',
              '&:hover': { bgcolor: '#F26522' },
            }}
          >
            {editDialogOpen ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => {
          setDeleteDialogOpen(false);
          setSelectedHandler(null);
        }}
        PaperProps={{
          sx: {
            bgcolor: mode === 'dark' ? '#1A1A1A' : '#FFFFFF',
            color: getTextColor(),
          },
        }}
      >
        <DialogTitle sx={{ color: getTextColor() }}>Delete Freight Handler</DialogTitle>
        <DialogContent>
          <Typography sx={{ color: getTextColor() }}>
            Are you sure you want to delete <strong>{selectedHandler?.name}</strong>? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setDeleteDialogOpen(false);
              setSelectedHandler(null);
            }}
            sx={{ color: getTextColor() }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleDelete}
            variant="contained"
            color="error"
            sx={{
              bgcolor: '#EF4444',
              '&:hover': { bgcolor: '#DC2626' },
            }}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default FreightHandlersPage;

