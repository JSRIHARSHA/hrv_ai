import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Button,
  Chip,
  Grid,
  Card,
  CardContent,
  CardHeader,
  TextField,
  InputAdornment,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  LinearProgress,
  Avatar,
  Badge,
  Collapse,
  Tooltip,
} from '@mui/material';
import {
  Search,
  Add,
  Assignment,
  Warning,
  Schedule,
  CheckCircle,
  ExpandMore,
  ExpandLess,
  PlayArrow,
  Pause,
  Send,
  Close,
  TrendingUp,
  Info,
  Refresh,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { useOrders } from '../contexts/OrderContext';
import { useTheme } from '../contexts/ThemeContext';
import { useNavigate } from 'react-router-dom';
import AppBanner from '../components/AppBanner';
import LeftNavigation from '../components/LeftNavigation';
import CreateOrderModal from '../components/CreateOrderModal';
import { Order, OrderStatus, MaterialItem } from '../types';
import { statusDisplayNames } from '../data/constants';
import { PDFExtractorService } from '../services/pdfExtractorService';
import { GeminiPDFExtractorService } from '../services/geminiPdfExtractor';
import { generatePONumber } from '../utils/poNumberGenerator';
import toast from 'react-hot-toast';

const OrdersPage: React.FC = () => {
  const { user } = useAuth();
  const { orders, createOrder } = useOrders();
  const { mode } = useTheme();
  const navigate = useNavigate();
  
  // Helper function to navigate to order page based on user role
  const navigateToOrder = (orderId: string) => {
    if (user?.role === 'Management') {
      navigate(`/order-summary/${orderId}`);
    } else {
      navigate(`/order/${orderId}`);
    }
  };
  const [expandedSections, setExpandedSections] = useState<{ [key: string]: boolean }>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [createOrderOpen, setCreateOrderOpen] = useState(false);
  const [navCollapsed, setNavCollapsed] = useState(() => {
    const saved = localStorage.getItem('navCollapsed');
    return saved === 'true';
  });

  const convertFileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleCreateOrder = async (orderData: any) => {
    console.log('Creating order:', orderData);
    
    // Convert PDF file to base64 if it exists
    let pdfFileData: string | null = null;
    if (orderData.pdfFile) {
      pdfFileData = await convertFileToBase64(orderData.pdfFile);
    }
    
    try {
      // Check if we have HRV AI extraction result
      const geminiData = orderData.geminiData;
      const hasGeminiData = geminiData && geminiData.customerName && geminiData.items && geminiData.items.length > 0;
      
      // Check if we have Python extraction result
      const extractedData = orderData.extractedData;
      const isPythonExtraction = extractedData && extractedData.data && extractedData.data.PO_NUMBER;
      
      // Check if we have manual entry data
      const manualEntry = orderData.manualEntry;
      const isManualEntry = manualEntry && manualEntry.materialName && manualEntry.customer && manualEntry.customer.name;
      
      if (isManualEntry) {
        // Handle manual order entry
        const entity = orderData.entity || 'HRV';
        const generatedPONumber = generatePONumber({ entity, existingOrders: orders });
        
        const newOrder = await createOrder({
          customer: manualEntry.customer,
          supplier: orderData.supplier,
          materialName: manualEntry.materialName,
          materials: [{
            id: `material-${Date.now()}`,
            name: manualEntry.materialName,
            sku: '',
            description: '',
            quantity: manualEntry.quantity,
            unitPrice: {
              amount: manualEntry.priceToCustomer.amount,
              currency: manualEntry.priceToCustomer.currency
            },
            totalPrice: {
              amount: manualEntry.priceToCustomer.amount * (manualEntry.quantity.value || 1),
              currency: manualEntry.priceToCustomer.currency
            },
            supplierUnitPrice: {
              amount: manualEntry.priceFromSupplier.amount,
              currency: manualEntry.priceFromSupplier.currency
            },
            supplierTotalPrice: {
              amount: manualEntry.priceFromSupplier.amount * (manualEntry.quantity.value || 1),
              currency: manualEntry.priceFromSupplier.currency
            },
            account: '',
            taxRate: 18,
            taxAmount: ((manualEntry.priceToCustomer.amount * (manualEntry.quantity.value || 1)) * 0.18)
          }],
          quantity: manualEntry.quantity,
          priceToCustomer: {
            amount: manualEntry.priceToCustomer.amount * (manualEntry.quantity.value || 1),
            currency: manualEntry.priceToCustomer.currency
          },
          priceFromSupplier: {
            amount: manualEntry.priceFromSupplier.amount * (manualEntry.quantity.value || 1),
            currency: manualEntry.priceFromSupplier.currency
          },
          status: 'PO_Received_from_Client',
          poNumber: generatedPONumber,
          deliveryTerms: 'FOB',
          notes: 'Order created manually',
          entity: entity,
          orderType: orderData.poType || undefined,
          timeline: [{
            id: `timeline-${Date.now()}`,
            timestamp: new Date().toISOString(),
            event: 'Order Created',
            actor: {
              userId: user?.userId || 'current-user',
              name: user?.name || 'Current User',
              role: user?.role || 'Employee'
            },
            details: 'Order created manually'
          }]
        });
        
        setCreateOrderOpen(false);
        toast.success(`Order ${newOrder.orderId} created successfully!`);
        navigate(`/order/${newOrder.orderId}`);
        
      } else if (hasGeminiData) {
        // Handle HRV AI extraction result
        const geminiExtractor = GeminiPDFExtractorService.getInstance();
        const entity = orderData.entity || 'HRV';
        
        // Check if we have consignments
        if (orderData.consignments && orderData.consignments.length > 0) {
          const createdOrders = [];
          
          // Track orders list for sequential PO number generation
          let currentOrders = [...orders];
          
          for (let i = 0; i < orderData.consignments.length; i++) {
            const consignment = orderData.consignments[i];
            const consignmentNumber = i + 1;
            
            // Generate a unique sequential PO number for each consignment
            const consignmentPONumber = generatePONumber({ entity, existingOrders: currentOrders });
            
            const consignmentGeminiData = {
              ...geminiData,
              items: consignment.materials.map((mat: MaterialItem) => ({
                materialName: mat.name,
                materialGrade: mat.description || '',
                quantity: mat.quantity.value,
                unitPrice: mat.unitPrice.amount,
                totalPrice: mat.totalPrice.amount,
              })),
              totalAmount: consignment.materials.reduce((sum: number, mat: MaterialItem) => sum + mat.totalPrice.amount, 0),
            };
            
            const newOrder = geminiExtractor.convertGeminiDataToOrder(
              consignmentGeminiData,
              user?.userId || 'system',
              orderData.supplier,
              pdfFileData || undefined,
              entity,
              consignmentPONumber
            );
            
            const createdOrder = await createOrder({ ...newOrder, orderType: orderData.poType || undefined });
            createdOrders.push(createdOrder);
            
            // Update currentOrders to include the newly created order for next iteration
            currentOrders = [...currentOrders, createdOrder];
          }
          
          setCreateOrderOpen(false);
          toast.success(`✨ Created ${createdOrders.length} consignment orders successfully!`);
          
          if (createdOrders.length > 0) {
            navigate(`/order/${createdOrders[0].orderId}`);
          }
          
        } else {
          // Single order
          const generatedPONumber = generatePONumber({ entity, existingOrders: orders });
          const newOrder = geminiExtractor.convertGeminiDataToOrder(
            geminiData,
            user?.userId || 'system',
            orderData.supplier,
            pdfFileData || undefined,
            entity,
            generatedPONumber
          );
          
          const createdOrder = await createOrder({ ...newOrder, orderType: orderData.poType || undefined });
          setCreateOrderOpen(false);
          toast.success(`✨ Order ${createdOrder.orderId} created successfully with HRV AI!`);
          navigate(`/order/${createdOrder.orderId}`);
        }
        
      } else if (isPythonExtraction) {
        // Handle Python extraction result
        const pdfExtractor = PDFExtractorService.getInstance();
        const entity = orderData.entity || 'HRV';
        const generatedPONumber = generatePONumber({ entity, existingOrders: orders });
        
        const newOrder = pdfExtractor.convertExtractedDataToOrder(
          extractedData,
          user?.userId || 'system',
          orderData.supplier,
          pdfFileData || undefined,
          entity,
          generatedPONumber
        );
        
        const createdOrder = await createOrder({ ...newOrder, orderType: orderData.poType || undefined });
        setCreateOrderOpen(false);
        toast.success(`Order ${createdOrder.orderId} created successfully!`);
        navigate(`/order/${createdOrder.orderId}`);
        
      } else {
        toast.error('No valid order data provided');
      }
    } catch (error) {
      console.error('Error creating order:', error);
      toast.error('Failed to create order');
    }
  };

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
      Sent_PO_for_Approval: <Send sx={{ color: '#AB47BC' }} />,
      PO_Rejected: <Close sx={{ color: '#EF4444' }} />,
      PO_Approved: <CheckCircle sx={{ color: '#EF721F' }} />,
      PO_Sent_to_Supplier: <TrendingUp sx={{ color: '#FFB74D' }} />,
      Proforma_Invoice_Received: <Info sx={{ color: '#64B5F6' }} />,
      Awaiting_COA: <Schedule sx={{ color: '#FFD54F' }} />,
      COA_Received: <CheckCircle sx={{ color: '#81C784' }} />,
      COA_Revision: <Warning sx={{ color: '#FF8A65' }} />,
      COA_Accepted: <CheckCircle sx={{ color: '#4CAF50' }} />,
      Awaiting_Approval: <Pause sx={{ color: '#FF9800' }} />,
      Approved: <CheckCircle sx={{ color: '#4CAF50' }} />,
      Advance_Payment_Completed: <TrendingUp sx={{ color: '#2196F3' }} />,
      Material_to_be_Dispatched: <Schedule sx={{ color: '#EF721F' }} />,
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
      Sent_PO_for_Approval: 3,
      PO_Rejected: 4,
      PO_Approved: 5,
      PO_Sent_to_Supplier: 6,
      Proforma_Invoice_Received: 7,
      Awaiting_COA: 8,
      COA_Received: 9,
      COA_Revision: 10,
      COA_Accepted: 11,
      Awaiting_Approval: 12,
      Approved: 13,
      Advance_Payment_Completed: 14,
      Material_to_be_Dispatched: 15,
      Material_Dispatched: 16,
      In_Transit: 17,
      Completed: 18,
    };
    return priorityMap[status];
  };

  const getStatusCardColor = (status: OrderStatus, hover = false) => {
    const opacity = hover ? 0.9 : 0.8;
    const colorMap: { [key in OrderStatus]: string } = {
      PO_Received_from_Client: `rgba(79,195,247,${opacity})`,
      Drafting_PO_for_Supplier: `rgba(129,199,132,${opacity})`,
      Sent_PO_for_Approval: `rgba(171,71,188,${opacity})`,
      PO_Rejected: `rgba(239,68,68,${opacity})`,
      PO_Approved: `rgba(156,39,176,${opacity})`,
      PO_Sent_to_Supplier: `rgba(255,183,77,${opacity})`,
      Proforma_Invoice_Received: `rgba(100,181,246,${opacity})`,
      Awaiting_COA: `rgba(255,213,79,${opacity})`,
      COA_Received: `rgba(129,199,132,${opacity})`,
      COA_Revision: `rgba(255,138,101,${opacity})`,
      COA_Accepted: `rgba(76,175,80,${opacity})`,
      Awaiting_Approval: `rgba(255,152,0,${opacity})`,
      Approved: `rgba(76,175,80,${opacity})`,
      Advance_Payment_Completed: `rgba(33,150,243,${opacity})`,
      Material_to_be_Dispatched: `rgba(156,39,176,${opacity})`,
      Material_Dispatched: `rgba(0,188,212,${opacity})`,
      In_Transit: `rgba(63,81,181,${opacity})`,
      Completed: `rgba(76,175,80,${opacity})`,
    };
    return colorMap[status];
  };

  const getStatusChipLabel = (status: OrderStatus) => {
    return statusDisplayNames[status] || status;
  };

  // Get user-specific tasks
  const getMyTasks = (): Order[] => {
    if (!user) return [];
    
    // Show all orders to all users (organization-wide visibility)
    return orders;
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

  const getBackgroundColor = () => mode === 'dark' ? '#000000' : '#F8F9FA'; // Using --background-primary from CSS
  const getCardTextColor = () => mode === 'dark' ? '#FFFFFF' : '#333333';
  const getSecondaryTextColor = () => mode === 'dark' ? 'rgba(255,255,255,0.8)' : 'rgba(0,0,0,0.7)';

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', flexGrow: 1, bgcolor: getBackgroundColor(), minHeight: '100vh' }}>
      {/* Fixed banner at top */}
      <Box sx={{ position: 'sticky', top: 0, zIndex: 1100, bgcolor: getBackgroundColor() }}>
        <AppBanner />
      </Box>
      
      {/* Content area with navigation */}
      <Box sx={{ display: 'flex', flexGrow: 1 }}>
        {/* Fixed Navigation for Manager and Management roles */}
        {shouldShowNavigation && (
          <Box sx={{ position: 'sticky', top: 64, height: 'calc(100vh - 64px)', zIndex: 1000 }}>
            <LeftNavigation />
          </Box>
        )}
        
        <Box sx={{ 
          flexGrow: 1, 
          ml: { xs: 0, sm: 0, md: shouldShowNavigation ? '40px' : 0 },
          transition: 'margin-left 0.3s ease-in-out',
          px: { xs: 2, sm: 3, md: shouldShowNavigation ? 0 : 4, lg: shouldShowNavigation ? 0 : 5 },
          pr: { md: shouldShowNavigation ? '40px' : 0, lg: shouldShowNavigation ? '40px' : 0, xl: shouldShowNavigation ? '40px' : 0 }
        }}>
          <Container maxWidth="xl" disableGutters sx={{ mt: { xs: 2, sm: 3 }, mb: { xs: 2, sm: 3 }, px: 0 }}>
          {/* Sticky Header */}
          <Box sx={{ 
            position: 'sticky', 
            top: 64, 
            zIndex: 999, 
            bgcolor: getBackgroundColor(),
            pt: { xs: 2, sm: 3, md: 4 },
            pb: 2,
            mb: 0
          }}>
            <Typography variant="h4" sx={{ color: getCardTextColor(), fontWeight: 700, mb: 2 }}>
              Order Status Overview
            </Typography>
            
            {/* Search Bar */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <TextField
                placeholder="🔍 Search orders, customers, or materials..."
                variant="outlined"
                size="small"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                sx={{
                  width: 500,
                  '& .MuiOutlinedInput-root': {
                    backgroundColor: mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.9)',
                    color: getCardTextColor(),
                    borderRadius: 2,
                    '& fieldset': { borderColor: mode === 'dark' ? 'rgba(255,255,255,0.2)' : 'rgba(239, 114, 31,0.3)' },
                    '&:hover fieldset': { borderColor: mode === 'dark' ? 'rgba(255,255,255,0.3)' : 'rgba(239, 114, 31,0.5)' },
                    '&.Mui-focused fieldset': { borderColor: '#EF721F' },
                  },
                  '& .MuiInputBase-input': { color: getCardTextColor() },
                  '& .MuiInputBase-input::placeholder': { color: mode === 'dark' ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.5)' },
                }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search sx={{ color: mode === 'dark' ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.5)' }} />
                    </InputAdornment>
                  ),
                }}
              />
              <Box sx={{ display: 'flex', gap: 2 }}>
                <Button
                  variant="contained"
                  startIcon={<Add />}
                  onClick={() => setCreateOrderOpen(true)}
                  sx={{
                    bgcolor: '#EF721F',
                    color: '#FFFFFF',
                    borderRadius: 2,
                    '&:hover': { bgcolor: '#6A3DD8' },
                  }}
                >
                  Create Order
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<Refresh />}
                  onClick={() => window.location.reload()}
                  sx={{
                    color: getCardTextColor(),
                    borderColor: mode === 'dark' ? 'rgba(255,255,255,0.3)' : 'rgba(239, 114, 31,0.3)',
                    borderRadius: 2,
                    '&:hover': { borderColor: mode === 'dark' ? 'rgba(255,255,255,0.5)' : 'rgba(239, 114, 31,0.5)' },
                  }}
                >
                  Refresh
                </Button>
              </Box>
            </Box>
          </Box>

          {/* Status Sections */}
          <Box sx={{ mb: 3, pt: 3 }}>
            <Typography variant="h5" sx={{ color: getCardTextColor(), fontWeight: 600, mb: 3 }}>
              📊 {user?.role === 'Employee' ? 'My Orders' : 'Order Status Overview'}
            </Typography>
            
            {filteredStatusGroups.map((group) => {
              const isExpanded = expandedSections[group.status];
              const totalStatuses = statusGroups.length;
              const progressValue = (group.priority / totalStatuses) * 100;
              
              return (
                <Accordion
                  key={group.status}
                  expanded={isExpanded}
                  onChange={() => toggleSection(group.status)}
                  sx={{
                    mb: 2,
                    bgcolor: mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.8)',
                    border: mode === 'dark' ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(239, 114, 31,0.2)',
                    borderRadius: 2,
                    boxShadow: mode === 'light' ? '0 2px 8px rgba(239, 114, 31,0.1)' : 'none',
                    '&:before': { display: 'none' },
                    '&.Mui-expanded': {
                      bgcolor: mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.95)',
                    },
                  }}
                >
                  <AccordionSummary
                    expandIcon={<ExpandMore sx={{ color: getCardTextColor() }} />}
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
                        <Typography variant="h6" sx={{ color: getCardTextColor(), fontWeight: 600 }}>
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
                          <Typography variant="caption" sx={{ color: getSecondaryTextColor(), ml: 1 }}>
                            Step {group.priority} of {statusGroups.length}
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
                        <Avatar sx={{ bgcolor: mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(239, 114, 31,0.1)' }}>
                          <Assignment sx={{ color: getCardTextColor() }} />
                        </Avatar>
                      </Badge>
                    </Box>
                  </AccordionSummary>
                  
                  <AccordionDetails sx={{ pt: 0 }}>
                    <Collapse in={isExpanded}>
                      <Grid container spacing={{ xs: 1.5, sm: 2 }}>
                        {group.orders.length === 0 ? (
                          <Grid item xs={12}>
                            <Box sx={{ 
                              textAlign: 'center', 
                              py: 4,
                              bgcolor: mode === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
                              borderRadius: 2,
                              border: `2px dashed ${mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
                            }}>
                              <Typography variant="body1" sx={{ color: getSecondaryTextColor() }}>
                                No orders in this status
                              </Typography>
                            </Box>
                          </Grid>
                        ) : (
                          group.orders.map((order) => (
                            <Grid item xs={12} sm={6} md={4} lg={3} key={order.orderId}>
                              <Card
                                onClick={() => navigateToOrder(order.orderId)}
                                sx={{
                                  bgcolor: getStatusCardColor(group.status),
                                  border: '1px solid rgba(255,255,255,0.1)',
                                  borderRadius: 2,
                                  cursor: 'pointer',
                                  transition: 'all 0.3s ease',
                                  height: '100%',
                                  display: 'flex',
                                  flexDirection: 'column',
                                  '&:hover': {
                                    bgcolor: getStatusCardColor(group.status, true),
                                    transform: 'translateY(-4px)',
                                    boxShadow: '0 8px 25px rgba(0,0,0,0.3)',
                                  },
                                }}
                              >
                                <CardHeader
                                  title={
                                    <Typography variant="subtitle2" sx={{ color: '#FFFFFF', fontWeight: 600, fontSize: '0.875rem' }}>
                                      {order.orderId}
                                    </Typography>
                                  }
                                  subheader={
                                    <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.7rem' }}>
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
                                        fontSize: '0.65rem',
                                        height: '20px',
                                      }}
                                    />
                                  }
                                  sx={{ pb: 0.5, pt: 1.5, px: 1.5 }}
                                />
                                <CardContent sx={{ pt: 0, pb: 1.5, px: 1.5, flex: 1, display: 'flex', flexDirection: 'column' }}>
                                  <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.9)', mb: 0.5, fontSize: '0.8rem' }}>
                                    <strong>Customer:</strong> {order.customer.name}
                                  </Typography>
                                  <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.9)', mb: 0.5, fontSize: '0.8rem' }}>
                                    <strong>Material:</strong> {order.materialName}
                                  </Typography>
                                  <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.9)', mb: 0.5, fontSize: '0.8rem' }}>
                                    <strong>Quantity:</strong> {order.quantity.value} {order.quantity.unit}
                                  </Typography>
                                  <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.9)', fontSize: '0.8rem' }}>
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
          </Container>
        </Box>
      </Box>

      {/* Create Order Modal */}
      <CreateOrderModal
        open={createOrderOpen}
        onClose={() => setCreateOrderOpen(false)}
        onSubmit={handleCreateOrder}
      />
    </Box>
  );
};

export default OrdersPage;

