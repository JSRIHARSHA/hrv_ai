import React, { useState } from 'react';
import {
  Box,
  Container,
  Typography,
  Button,
  Chip,
  Grid,
  Card,
  CardContent,
  Avatar,
  TextField,
  InputAdornment,
  Badge,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Collapse,
  CardHeader,
  LinearProgress,
  Fab,
} from '@mui/material';
import {
  Search,
  Add,
  ExpandMore,
  Assignment,
  TrendingUp,
  Schedule,
  CheckCircle,
  Warning,
  Info,
  PlayArrow,
  Pause,
  Refresh,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { useOrders } from '../contexts/OrderContext';
import { useNavigate } from 'react-router-dom';
import { Order, OrderStatus } from '../types';
import { 
  mockUsers,
  getStatusCardColor,
  getStatusChipLabel,
  statusDisplayNames,
} from '../data/constants';
import AppBanner from '../components/AppBanner';
import CreateOrderModal from '../components/CreateOrderModal';
import { PDFExtractorService } from '../services/pdfExtractorService';
import toast from 'react-hot-toast';

const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const { orders, createOrder } = useOrders();
  const navigate = useNavigate();
  const [createOrderOpen, setCreateOrderOpen] = useState(false);
  const [expandedSections, setExpandedSections] = useState<{ [key: string]: boolean }>({});
  const [searchTerm, setSearchTerm] = useState('');

  const toggleSection = (status: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [status]: !prev[status]
    }));
  };

  const getStatusIcon = (status: OrderStatus) => {
    const iconMap: { [key in OrderStatus]: React.ReactNode } = {
      PO_Received_from_Client: <Assignment sx={{ color: '#4FC3F7' }} />,
      Drafting_PO_for_Supplier: <PlayArrow sx={{ color: '#81C784' }} />,
      PO_Sent_to_Supplier: <TrendingUp sx={{ color: '#FFB74D' }} />,
      Proforma_Invoice_Received: <Info sx={{ color: '#64B5F6' }} />,
      Awaiting_COA: <Schedule sx={{ color: '#FFD54F' }} />,
      COA_Received: <CheckCircle sx={{ color: '#81C784' }} />,
      COA_Revision: <Warning sx={{ color: '#FF8A65' }} />,
      COA_Accepted: <CheckCircle sx={{ color: '#4CAF50' }} />,
      Awaiting_Approval: <Pause sx={{ color: '#FF9800' }} />,
      Approved: <CheckCircle sx={{ color: '#4CAF50' }} />,
      Advance_Payment_Completed: <TrendingUp sx={{ color: '#2196F3' }} />,
      Material_to_be_Dispatched: <Schedule sx={{ color: '#9C27B0' }} />,
      Material_Dispatched: <PlayArrow sx={{ color: '#00BCD4' }} />,
      In_Transit: <TrendingUp sx={{ color: '#3F51B5' }} />,
      Completed: <CheckCircle sx={{ color: '#4CAF50' }} />,
    };
    return iconMap[status];
  };

  const getStatusPriority = (status: OrderStatus): number => {
    const priorityMap: { [key in OrderStatus]: number } = {
      PO_Received_from_Client: 1,
      Drafting_PO_for_Supplier: 2,
      PO_Sent_to_Supplier: 3,
      Proforma_Invoice_Received: 4,
      Awaiting_COA: 5,
      COA_Received: 6,
      COA_Revision: 7,
      COA_Accepted: 8,
      Awaiting_Approval: 9,
      Approved: 10,
      Advance_Payment_Completed: 11,
      Material_to_be_Dispatched: 12,
      Material_Dispatched: 13,
      In_Transit: 14,
      Completed: 15,
    };
    return priorityMap[status];
  };

  // Get user-specific tasks
  const getMyTasks = (): Order[] => {
    if (!user) return [];
    
    return orders.filter(order => {
      // User can see orders they created or are assigned to
      return order.createdBy.userId === user.userId || 
             order.assignedTo.userId === user.userId;
    });
  };

  const getTeamTasks = (): Order[] => {
    if (!user) return [];
    
    // Only managers and higher management can see team tasks
    if (user.role !== 'Manager' && user.role !== 'Higher_Management') return [];
    
    return orders.filter(order => {
      // Find team members
      const teamMembers = mockUsers.filter(u => u.team === user.team);
      const teamMemberIds = teamMembers.map(m => m.userId);
      
      return teamMemberIds.includes(order.assignedTo.userId) || 
             teamMemberIds.includes(order.createdBy.userId);
    });
  };

  const myTasks = getMyTasks();

  // Group orders by status and sort by priority
  const statusGroups = Object.entries(statusDisplayNames)
    .map(([status, displayName]) => ({
      status: status as OrderStatus,
      displayName,
      orders: myTasks.filter(task => task.status === status),
      priority: getStatusPriority(status as OrderStatus),
    }))
    .sort((a, b) => a.priority - b.priority);

  const filteredStatusGroups = statusGroups.filter(group =>
    group.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    group.orders.some(order => 
      order.orderId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.materialName.toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  const handleCreateOrder = (orderData: any) => {
    console.log('Creating order:', orderData);
    console.log('PDF file:', orderData.pdfFile);
    console.log('Extracted data:', orderData.extractedData);
    
    try {
      // Check if we have PDF extraction result
      const extractedData = orderData.extractedData;
      const isPDFExtraction = extractedData && extractedData.data && extractedData.data.PO_NUMBER;
      
      if (isPDFExtraction) {
        // Handle PDF extraction result using the PDF extraction service
        const pdfExtractor = PDFExtractorService.getInstance();
        const newOrder = pdfExtractor.convertExtractedDataToOrder(extractedData, user?.userId || 'system', orderData.supplier);
        
        // Create the order using the converted data
        const createdOrder = createOrder(newOrder);
        
        console.log('Created order with extracted customer data:', createdOrder);
        
        // Redirect to the order detail page
        navigate(`/order/${createdOrder.orderId}?created=true`);
        
        // Close the modal
        setCreateOrderOpen(false);
        
        // Show success message
        toast.success(`Order ${createdOrder.orderId} created successfully from PDF!`);
        
      } else {
        // No PDF extraction result available, but still create order with uploaded PDF if available
        if (orderData.pdfFile) {
          const newOrder = createOrder({
            // Customer information (default)
            customer: {
              name: 'Pharmaceutical Customer',
              address: 'Customer Address',
              country: 'India',
              email: 'customer@example.com',
              phone: 'Customer Contact',
              gstin: 'CUSTOMER_GSTIN'
            },
            // Supplier information from selection
            supplier: orderData.supplier,
            // Material information (default)
            materialName: 'Unknown Material',
            materials: [{
          id: 'material-1',
              name: 'Unknown Material',
          sku: '',
              description: 'Material information not available',
              quantity: {
                value: 1,
                unit: 'Kg'
              },
              unitPrice: {
                amount: 0,
                currency: 'USD'
              },
              totalPrice: {
                amount: 0,
                currency: 'USD'
              }
        }],
        quantity: {
              value: 1,
              unit: 'Kg'
        },
        priceToCustomer: {
              amount: 0,
              currency: 'USD'
        },
        priceFromSupplier: {
              amount: 0,
              currency: 'USD'
        },
        status: 'PO_Received_from_Client',
            poNumber: `AUTO-${Date.now()}`,
            deliveryTerms: 'FOB',
            notes: 'Order created from PDF upload (extraction failed)',
        orderId: `ORD-${Date.now()}`,
            entity: 'HRV', // Default entity
            // Documents section - include the uploaded PDF
            documents: {
              customerPO: {
                id: `doc_${Date.now()}`,
                filename: orderData.pdfFile.name,
                uploadedAt: new Date().toISOString(),
                uploadedBy: {
                  userId: user?.userId || 'current-user',
                  name: user?.name || 'Current User'
                },
                fileSize: orderData.pdfFile.size,
                mimeType: 'application/pdf'
              }
            },
        timeline: [{
          id: `timeline-${Date.now()}`,
          timestamp: new Date().toISOString(),
          event: 'Order Created',
          actor: {
            userId: user?.userId || 'current-user',
            name: user?.name || 'Current User',
                role: user?.role || 'Employee'
          },
              details: 'Order created from PDF upload (extraction failed)',
          status: 'PO_Received_from_Client'
        }]
      });
      
          console.log('New order created from PDF (no extraction):', newOrder);
      
      // Redirect to the order detail page
      navigate(`/order/${newOrder.orderId}?created=true`);
      
      // Close the modal
      setCreateOrderOpen(false);
      
      // Show success message
          toast.success(`Order ${newOrder.orderId} created successfully from PDF!`);
        } else {
          // No PDF extraction result available
          toast.error('PDF extraction failed. Please try uploading a different PDF.');
        }
      }
      
    } catch (error) {
      console.error('Error creating order:', error);
      toast.error('Failed to create order. Please try again.');
    }
  };


  return (
    <Box sx={{ flexGrow: 1, bgcolor: '#0F0F23', minHeight: '100vh' }}>
      <AppBanner />

      <Container maxWidth="xl" sx={{ mt: 3, mb: 3 }}>
        {/* Enhanced Header Section */}
        <Box sx={{ mb: 4 }}>
          <Box sx={{ 
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            borderRadius: 3,
            p: 4,
            mb: 3,
            position: 'relative',
            overflow: 'hidden',
            '&::before': {
              content: '""',
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'url("data:image/svg+xml,%3Csvg width="60" height="60" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"%3E%3Cg fill="none" fill-rule="evenodd"%3E%3Cg fill="%23ffffff" fill-opacity="0.05"%3E%3Ccircle cx="30" cy="30" r="2"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")',
              opacity: 0.3,
            }
          }}>
            <Typography variant="h3" sx={{ color: '#FFFFFF', fontWeight: 700, mb: 1, position: 'relative', zIndex: 1 }}>
            </Typography>
            <Typography variant="h6" sx={{ color: 'rgba(255,255,255,0.9)', mb: 2, position: 'relative', zIndex: 1 }}>
            </Typography>
            
            {/* Quick Stats */}
            <Grid container spacing={2} sx={{ position: 'relative', zIndex: 1 }}>
              <Grid item xs={12} sm={3}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h4" sx={{ color: '#FFFFFF', fontWeight: 700 }}>
                    {myTasks.length}
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)' }}>
                    Total Orders
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} sm={3}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h4" sx={{ color: '#4CAF50', fontWeight: 700 }}>
                    {myTasks.filter(task => task.status === 'Completed').length}
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)' }}>
                    Completed
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} sm={3}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h4" sx={{ color: '#FF9800', fontWeight: 700 }}>
                    {myTasks.filter(task => ['Awaiting_Approval', 'Awaiting_COA'].includes(task.status)).length}
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)' }}>
                    Pending
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} sm={3}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h4" sx={{ color: '#2196F3', fontWeight: 700 }}>
                    {myTasks.filter(task => ['In_Transit', 'Material_Dispatched'].includes(task.status)).length}
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)' }}>
                    In Transit
                  </Typography>
                </Box>
              </Grid>
            </Grid>
          </Box>
          
          {/* Enhanced Search and Actions Bar */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <TextField
              placeholder="🔍 Search orders, customers, or materials..."
              variant="outlined"
              size="small"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              sx={{
                width: 500,
                '& .MuiOutlinedInput-root': {
                  backgroundColor: 'rgba(255,255,255,0.1)',
                  color: '#FFFFFF',
                  borderRadius: 2,
                  '& fieldset': { borderColor: 'rgba(255,255,255,0.2)' },
                  '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.3)' },
                  '&.Mui-focused fieldset': { borderColor: '#7C4DFF' },
                },
                '& .MuiInputBase-input': { color: '#FFFFFF' },
                '& .MuiInputBase-input::placeholder': { color: 'rgba(255,255,255,0.6)' },
              }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search sx={{ color: 'rgba(255,255,255,0.6)' }} />
                  </InputAdornment>
                ),
              }}
            />
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Button
                variant="outlined"
                startIcon={<Refresh />}
                onClick={() => window.location.reload()}
                sx={{
                  color: '#FFFFFF',
                  borderColor: 'rgba(255,255,255,0.3)',
                  borderRadius: 2,
                  '&:hover': { borderColor: 'rgba(255,255,255,0.5)' },
                }}
              >
                Refresh
              </Button>
              <Button
                variant="contained"
                startIcon={<Add />}
                onClick={() => setCreateOrderOpen(true)}
                sx={{
                  bgcolor: '#7C4DFF',
                  borderRadius: 2,
                  px: 3,
                  '&:hover': { bgcolor: '#6B46C1' },
                }}
              >
                Create Order with AI
              </Button>
            </Box>
          </Box>
        </Box>

        {/* Collapsible Status Sections */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="h5" sx={{ color: '#FFFFFF', fontWeight: 600, mb: 3 }}>
            📊 Order Status Overview
          </Typography>
          
          {filteredStatusGroups.map((group) => {
            const isExpanded = expandedSections[group.status];
            const progressValue = (group.priority / 15) * 100;
            
            return (
              <Accordion
                key={group.status}
                expanded={isExpanded}
                onChange={() => toggleSection(group.status)}
                sx={{
                  mb: 2,
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
                  <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mr: 2 }}>
                      {getStatusIcon(group.status)}
                    </Box>
                    <Box sx={{ flexGrow: 1 }}>
                      <Typography variant="h6" sx={{ color: '#FFFFFF', fontWeight: 600 }}>
                        {group.displayName}
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', mt: 0.5 }}>
                        <LinearProgress
                          variant="determinate"
                          value={progressValue}
                          sx={{
                            width: 200,
                            height: 6,
                            borderRadius: 3,
                            bgcolor: 'rgba(255,255,255,0.1)',
                            '& .MuiLinearProgress-bar': {
                              bgcolor: getStatusCardColor(group.status),
                              borderRadius: 3,
                            },
                          }}
                        />
                        <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.6)', ml: 1 }}>
                          Step {group.priority} of 15
                        </Typography>
                      </Box>
                    </Box>
                    <Badge
                      badgeContent={group.orders.length}
                      sx={{
                        '& .MuiBadge-badge': {
                          bgcolor: getStatusCardColor(group.status),
                          color: '#FFFFFF',
                          fontWeight: 600,
                        },
                      }}
                    >
                      <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.1)' }}>
                        <Assignment sx={{ color: '#FFFFFF' }} />
                      </Avatar>
                    </Badge>
                  </Box>
                </AccordionSummary>
                
                <AccordionDetails sx={{ pt: 0 }}>
                  <Collapse in={isExpanded}>
                    <Grid container spacing={2}>
                      {group.orders.length === 0 ? (
                        <Grid item xs={12}>
                          <Box sx={{ 
                            textAlign: 'center', 
                            py: 4,
                            bgcolor: 'rgba(255,255,255,0.03)',
                            borderRadius: 2,
                            border: '2px dashed rgba(255,255,255,0.1)',
                          }}>
                            <Typography variant="body1" sx={{ color: 'rgba(255,255,255,0.5)' }}>
                              No orders in this status
                            </Typography>
                          </Box>
                        </Grid>
                      ) : (
                        group.orders.map((order) => (
                          <Grid item xs={12} sm={6} md={4} lg={3} key={order.orderId}>
                            <Card
                              onClick={() => navigate(`/order/${order.orderId}`)}
                              sx={{
                                bgcolor: getStatusCardColor(group.status),
                                border: '1px solid rgba(255,255,255,0.1)',
                                borderRadius: 2,
                                cursor: 'pointer',
                                transition: 'all 0.3s ease',
                                '&:hover': {
                                  bgcolor: getStatusCardColor(group.status, true),
                                  transform: 'translateY(-4px)',
                                  boxShadow: '0 8px 25px rgba(0,0,0,0.3)',
                                },
                              }}
                            >
                              <CardHeader
                                title={
                                  <Typography variant="subtitle1" sx={{ color: '#FFFFFF', fontWeight: 600 }}>
                                    {order.orderId}
                                  </Typography>
                                }
                                subheader={
                                  <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                                    {new Date(order.createdAt).toLocaleDateString()}
                                  </Typography>
                                }
                                action={
                                  <Chip
                                    label={getStatusChipLabel(group.status)}
                                    size="small"
                                    sx={{
                                      bgcolor: 'rgba(255,255,255,0.2)',
                                      color: '#FFFFFF',
                                      fontSize: '0.7rem',
                                    }}
                                  />
                                }
                                sx={{ pb: 1 }}
                              />
                              <CardContent sx={{ pt: 0 }}>
                                <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.9)', mb: 1 }}>
                                  <strong>Customer:</strong> {order.customer.name}
                                </Typography>
                                <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.9)', mb: 1 }}>
                                  <strong>Material:</strong> {order.materialName}
                                </Typography>
                                <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.9)', mb: 1 }}>
                                  <strong>Quantity:</strong> {order.quantity.value} {order.quantity.unit}
                                </Typography>
                                <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.9)' }}>
                                  <strong>Assigned to:</strong> {order.assignedTo.name}
                                </Typography>
                              </CardContent>
                            </Card>
                          </Grid>
                        ))
                      )}
                    </Grid>
                  </Collapse>
                </AccordionDetails>
              </Accordion>
            );
          })}
        </Box>

        {/* Floating Action Button */}
        <Fab
          color="primary"
          aria-label="create order"
          onClick={() => setCreateOrderOpen(true)}
          sx={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            bgcolor: '#7C4DFF',
            '&:hover': { bgcolor: '#6B46C1' },
            zIndex: 1000,
          }}
        >
          <Add />
        </Fab>
      </Container>

      {/* Create Order Modal */}
      <CreateOrderModal
        open={createOrderOpen}
        onClose={() => setCreateOrderOpen(false)}
        onSubmit={handleCreateOrder}
      />

    </Box>
  );
};

export default DashboardPage;