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
  IconButton,
  Tooltip,
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
  Send,
  Close,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { useOrders } from '../contexts/OrderContext';
import { useTheme } from '../contexts/ThemeContext';
import { useNavigate } from 'react-router-dom';
import { Order, OrderStatus, LogisticsSubStatus, MaterialItem } from '../types';
import { 
  mockUsers,
  getStatusCardColor,
  getStatusChipLabel,
  statusDisplayNames,
  getLogisticsSubStatusDisplayName,
} from '../data/constants';
import AppBanner from '../components/AppBanner';
import CreateOrderModal from '../components/CreateOrderModal';
import LeftNavigation from '../components/LeftNavigation';
import { PDFExtractorService } from '../services/pdfExtractorService';
import { GeminiPDFExtractorService } from '../services/geminiPdfExtractor';
import { generatePONumber } from '../utils/poNumberGenerator';
import toast from 'react-hot-toast';

const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const { orders, createOrder } = useOrders();
  
  // Helper function to navigate to order page based on user role
  const navigateToOrder = (orderId: string) => {
    if (user?.role === 'Management' || user?.role === 'Admin') {
      navigate(`/order-summary/${orderId}`);
    } else {
      navigate(`/order/${orderId}`);
    }
  };
  const { mode } = useTheme();
  const navigate = useNavigate();
  const [createOrderOpen, setCreateOrderOpen] = useState(false);
  const [expandedSections, setExpandedSections] = useState<{ [key: string]: boolean }>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [navCollapsed, setNavCollapsed] = useState(() => {
    const saved = localStorage.getItem('navCollapsed');
    return saved === 'true';
  });

  // Check if user should see navigation
  const shouldShowNavigation = user?.role === 'Manager' || user?.role === 'Management' || user?.role === 'Admin';

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

  // Helper function to convert file to base64
  const convertFileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

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

  // Calculate dispatch progress based on logistics sub-status
  const calculateDispatchProgress = (order: Order): number => {
    if (!order.logisticsSubStatus) return 0;
    
    const allSubStatuses: LogisticsSubStatus[] = [
      'Dispatch_Confirmation_Sent',
      'Awaiting_Documents_from_Supplier',
      'Drafting_Documents',
      'Awaiting_Quotation_from_Freight_Handler',
      'Awaiting_ADC_Clearance',
      'ADC_Clearance_Done',
      'Shipping_Bill_Filed',
      'Awaiting_Dispatch_Schedule',
      'Clearance_Completed',
      order.transitType === 'Air' ? 'Received_Air_Way_Bill' : 'Received_Bill_of_Lading',
      'Sending_Documents_to_Customer',
      'Sent_Documents_to_Customer',
    ];
    
    const currentIndex = allSubStatuses.indexOf(order.logisticsSubStatus);
    if (currentIndex === -1) return 0;
    
    const totalSubStatuses = allSubStatuses.length;
    return Math.round(((currentIndex + 1) / totalSubStatuses) * 100);
  };

  // Get last status update timestamp from timeline
  const getLastStatusUpdateTime = (order: Order): Date => {
    // Find the most recent timeline event with a status change
    const statusEvents = order.timeline
      .filter(event => event.status && event.event === 'Status Updated')
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    
    if (statusEvents.length > 0) {
      return new Date(statusEvents[0].timestamp);
    }
    
    // If no status update found, use creation date
    return new Date(order.createdAt);
  };

  // Calculate days since last status update
  const getDaysSinceLastUpdate = (order: Order): number => {
    const lastUpdate = getLastStatusUpdateTime(order);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - lastUpdate.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  // Get priority for an order
  const getOrderPriority = (order: Order): 'high' | 'medium' | 'low' => {
    const daysSinceUpdate = getDaysSinceLastUpdate(order);
    if (daysSinceUpdate >= 5) return 'high';
    if (daysSinceUpdate >= 3) return 'medium';
    return 'low';
  };

  // Get user-specific tasks (all orders for employees, priority orders for managers)
  const getMyTasks = (): Order[] => {
    if (!user) {
      // If no user, show all orders for testing
      return orders;
    }
    
    // Show all orders to all users (organization-wide visibility)
    const filteredOrders = orders;

    // For managers/management, filter by priority (high/medium)
    if (user.role === 'Manager' || user.role === 'Management') {
      return filteredOrders
        .filter(order => {
          const priority = getOrderPriority(order);
          return priority === 'high' || priority === 'medium';
        })
        .sort((a, b) => {
          // Sort by priority (high first) then by days since update (most stale first)
          const priorityA = getOrderPriority(a);
          const priorityB = getOrderPriority(b);
          if (priorityA !== priorityB) {
            return priorityA === 'high' ? -1 : 1;
          }
          return getDaysSinceLastUpdate(b) - getDaysSinceLastUpdate(a);
        });
    }

    // For employees, return all orders (no priority filtering)
    return filteredOrders;
  };

  const getTeamTasks = (): Order[] => {
    if (!user) return [];
    
    // Only managers and management can see team tasks
    if (user.role !== 'Manager' && user.role !== 'Management') return [];
    
    // Show all orders to managers/management (organization-wide visibility)
    return orders;
  };

  const myTasks = getMyTasks();
  
  // Check if user is manager/management
  const isManager = user?.role === 'Manager' || user?.role === 'Management';
  
  // For KPIs: Always use ALL orders (not filtered by priority)
  // This ensures KPIs show organization-wide stats for all roles
  const allOrganizationOrders = orders;
  
  // For managers/management: Group priority orders by priority level
  // For employees: Group all orders by status (old layout)
  const highPriorityOrders = isManager ? myTasks.filter(order => getOrderPriority(order) === 'high') : [];
  const mediumPriorityOrders = isManager ? myTasks.filter(order => getOrderPriority(order) === 'medium') : [];
  
  // Orders needing approval for field changes (only for Management and Admin roles)
  const ordersNeedingApproval = (user?.role === 'Management' || user?.role === 'Admin') 
    ? allOrganizationOrders.filter(order => 
        order.isLocked && 
        order.pendingFieldChanges?.status === 'Pending'
      )
    : [];
  
  // Debug: Log KPI data
  useEffect(() => {
    console.log('📊 KPI Debug:', {
      totalOrders: allOrganizationOrders.length,
      completedOrders: allOrganizationOrders.filter(task => task.status === 'Completed').length,
      pendingOrders: allOrganizationOrders.filter(task => ['Awaiting_Approval', 'Awaiting_COA'].includes(task.status)).length,
      inTransitOrders: allOrganizationOrders.filter(task => ['In_Transit', 'Material_Dispatched'].includes(task.status)).length,
      priorityFilteredTasks: myTasks.length,
      user: user?.name,
      role: user?.role,
      isManager,
    });
  }, [allOrganizationOrders, myTasks, user, isManager]);

  // For employees: Group orders by status (old status overview layout)
  const statusGroups = !isManager ? Object.entries(statusDisplayNames)
    .map(([status, displayName]) => ({
      status: status as OrderStatus,
      displayName,
      orders: myTasks.filter(task => task.status === status),
      priority: getStatusPriority(status as OrderStatus),
    }))
    .sort((a, b) => a.priority - b.priority) : [];

  const filteredStatusGroups = !isManager ? statusGroups.filter(group =>
    group.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    group.orders.some(order => 
      order.orderId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.materialName.toLowerCase().includes(searchTerm.toLowerCase())
    )
  ) : [];

  const handleCreateOrder = async (orderData: any) => {
    console.log('Creating order:', orderData);
    console.log('PDF file:', orderData.pdfFile);
    console.log('Extracted data:', orderData.extractedData);
    console.log('Manual entry:', orderData.manualEntry);
    
    // Convert PDF file to base64 if it exists
    let pdfFileData: string | null = null;
    if (orderData.pdfFile) {
      pdfFileData = await convertFileToBase64(orderData.pdfFile);
      console.log('PDF file converted to base64');
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
        console.log('Using manual entry data');
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
            details: 'Order created manually',
            status: 'PO_Received_from_Client'
          }]
        });
        
        console.log('New order created manually:', newOrder);
        
        // Redirect to the order detail page
        navigate(`/order/${newOrder.orderId}?created=true`);
        
        // Close the modal
        setCreateOrderOpen(false);
        
        // Show success message
        toast.success(`Order ${newOrder.orderId} created successfully!`);
        
      } else if (hasGeminiData) {
        // Handle HRV AI extraction result
        console.log('Using HRV AI extracted data');
        const geminiExtractor = GeminiPDFExtractorService.getInstance();
        const entity = orderData.entity || 'HRV';
        
        // Check if we have consignments (multiple materials split into separate orders)
        if (orderData.consignments && orderData.consignments.length > 0) {
          console.log(`Creating ${orderData.consignments.length} consignment orders`);
          const createdOrders = [];
          
          // Track orders list for sequential PO number generation
          let currentOrders = [...orders];
          
          for (let i = 0; i < orderData.consignments.length; i++) {
            const consignment = orderData.consignments[i];
            const consignmentNumber = i + 1;
            
            // Generate a unique sequential PO number for each consignment
            const consignmentPONumber = generatePONumber({ entity, existingOrders: currentOrders });
            
            // Create modified geminiData with only this consignment's materials
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
            
            // Create the order
            const createdOrder = await createOrder({ ...newOrder, orderType: orderData.poType || undefined });
            createdOrders.push(createdOrder);
            
            // Update currentOrders to include the newly created order for next iteration
            currentOrders = [...currentOrders, createdOrder];
            
            console.log(`Created consignment ${consignmentNumber} order:`, createdOrder.orderId);
          }
          
          // Close the modal
          setCreateOrderOpen(false);
          
          // Show success message
          toast.success(`✨ Created ${createdOrders.length} consignment orders successfully!`);
          
          // Redirect to the first order
          if (createdOrders.length > 0) {
            navigate(`/order/${createdOrders[0].orderId}?created=true`);
          }
          
        } else {
          // Single order - normal flow
          const generatedPONumber = generatePONumber({ entity, existingOrders: orders });
          
          const newOrder = geminiExtractor.convertGeminiDataToOrder(
            geminiData, 
            user?.userId || 'system', 
            orderData.supplier, 
            pdfFileData || undefined,
            entity,
            generatedPONumber
          );
          
          // Create the order using the converted data
          const createdOrder = await createOrder({ ...newOrder, orderType: orderData.poType || undefined });
          
          console.log('Created order with HRV AI extracted data:', createdOrder);
          
          // Redirect to the order detail page
          navigate(`/order/${createdOrder.orderId}?created=true`);
          
          // Close the modal
          setCreateOrderOpen(false);
          
          // Show success message
          toast.success(`✨ Order ${createdOrder.orderId} created successfully with HRV AI!`);
        }
        
      } else if (isPythonExtraction) {
        // Handle Python PDF extraction result
        console.log('Using Python extracted data');
        const pdfExtractor = PDFExtractorService.getInstance();
        
        // Generate PO number based on entity
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
        
        // Create the order using the converted data
        const createdOrder = await createOrder({ ...newOrder, orderType: orderData.poType || undefined });
        
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
          // Generate PO number based on entity
          const entity = orderData.entity || 'HRV';
          const generatedPONumber = generatePONumber({ entity, existingOrders: orders });
          
          const newOrder = await createOrder({
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
            poNumber: generatedPONumber,
            deliveryTerms: 'FOB',
            notes: 'Order created from PDF upload (extraction failed)',
        // Let OrderContext set orderId = poNumber
            entity: entity, // Use selected entity
            orderType: orderData.poType || undefined,
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
                mimeType: 'application/pdf',
                data: pdfFileData || undefined, // Add the base64 data
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


  const getBackgroundColor = () => mode === 'dark' ? '#000000' : '#F8F9FA'; // Using --background-primary from CSS
  const getGradient = () => '#EF721F'; // Solid color instead of gradient
  const getTextColor = () => mode === 'dark' ? '#FFFFFF' : '#FFFFFF'; // Keep white on solid background
  const getCardTextColor = () => mode === 'dark' ? '#FFFFFF' : '#333333'; // Dark text on light background
  const getSecondaryTextColor = () => mode === 'dark' ? 'rgba(255,255,255,0.8)' : 'rgba(0,0,0,0.7)';

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', flexGrow: 1, bgcolor: getBackgroundColor(), minHeight: '100vh' }}>
      {/* Full width banner at top */}
      <AppBanner />
      
      {/* Content area with navigation */}
      <Box sx={{ display: 'flex', flexGrow: 1 }}>
        {/* Navigation for Manager and Management roles */}
        {shouldShowNavigation && (
          <LeftNavigation />
        )}
        
        <Box sx={{ 
          flexGrow: 1, 
          ml: { xs: 0, sm: 0, md: shouldShowNavigation ? '40px' : 0 }, 
          transition: 'margin-left 0.3s ease-in-out',
          pl: { xs: 2, sm: 3, md: shouldShowNavigation ? 0 : 4, lg: shouldShowNavigation ? 0 : 5 },
          pr: { xs: 2, sm: 3, md: '40px', lg: '40px', xl: '40px' }
        }}>
          <Container maxWidth="xl" disableGutters sx={{ mt: { xs: 2, sm: 3 }, mb: { xs: 2, sm: 3 }, px: 0 }}>
          {/* Enhanced Header Section */}
        <Box sx={{ mb: { xs: 2, sm: 3, md: 4 } }}>
          <Box sx={{ 
            background: getGradient(),
            borderRadius: { xs: 2, sm: 3 },
            p: { xs: 2, sm: 3, md: 4 },
            mb: { xs: 2, sm: 3 },
            position: 'relative',
            overflow: 'hidden',
            boxShadow: mode === 'light' ? '0 8px 24px rgba(239, 114, 31,0.2)' : 'none',
            '&::before': {
              content: '""',
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: mode === 'dark'
                ? 'url("data:image/svg+xml,%3Csvg width="60" height="60" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"%3E%3Cg fill="none" fill-rule="evenodd"%3E%3Cg fill="%23ffffff" fill-opacity="0.05"%3E%3Ccircle cx="30" cy="30" r="2"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")'
                : 'url("data:image/svg+xml,%3Csvg width="60" height="60" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"%3E%3Cg fill="none" fill-rule="evenodd"%3E%3Cg fill="%23000000" fill-opacity="0.03"%3E%3Ccircle cx="30" cy="30" r="2"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")',
              opacity: 0.3,
            }
          }}>
            <Typography variant="h3" sx={{ color: getTextColor(), fontWeight: 700, mb: 1, position: 'relative', zIndex: 1 }}>
              Welcome back, {user?.name}!
            </Typography>
            <Typography variant="h6" sx={{ color: getTextColor(), opacity: 0.9, mb: 2, position: 'relative', zIndex: 1 }}>
              {user?.role} Dashboard - {user?.team}
            </Typography>
            
            {/* Quick Stats */}
            <Grid container spacing={2} sx={{ position: 'relative', zIndex: 1 }}>
              <Grid item xs={12} sm={3}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h4" sx={{ color: mode === 'dark' ? '#FFFFFF' : '#1A202C', fontWeight: 700 }}>
                    {allOrganizationOrders.length}
                  </Typography>
                  <Typography variant="body2" sx={{ color: getSecondaryTextColor() }}>
                    Total Orders
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} sm={3}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h4" sx={{ color: mode === 'dark' ? '#FFFFFF' : '#1A202C', fontWeight: 700 }}>
                    {allOrganizationOrders.filter(task => task.status === 'Completed').length}
                  </Typography>
                  <Typography variant="body2" sx={{ color: getSecondaryTextColor() }}>
                    Completed
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} sm={3}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h4" sx={{ color: mode === 'dark' ? '#FFFFFF' : '#1A202C', fontWeight: 700 }}>
                    {allOrganizationOrders.filter(task => ['Awaiting_Approval', 'Awaiting_COA'].includes(task.status)).length}
                  </Typography>
                  <Typography variant="body2" sx={{ color: getSecondaryTextColor() }}>
                    Pending
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} sm={3}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h4" sx={{ color: mode === 'dark' ? '#FFFFFF' : '#1A202C', fontWeight: 700 }}>
                    {allOrganizationOrders.filter(task => ['In_Transit', 'Material_Dispatched'].includes(task.status)).length}
                  </Typography>
                  <Typography variant="body2" sx={{ color: getSecondaryTextColor() }}>
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
              <Button
                variant="contained"
                startIcon={<Add />}
                onClick={() => setCreateOrderOpen(true)}
                sx={{
                  bgcolor: '#EF721F',
                  borderRadius: 2,
                  px: 3,
                  '&:hover': { bgcolor: '#EF721F' },
                }}
              >
                Create Order with AI
              </Button>
            </Box>
          </Box>
        </Box>

        {/* Conditional Rendering: Priority Orders for Managers, Status Overview for Employees */}
        {isManager ? (
          <Box sx={{ mb: 3 }}>
            <Typography variant="h5" sx={{ color: getCardTextColor(), fontWeight: 600, mb: 3 }}>
              ⚠️ Priority Orders Requiring Attention
            </Typography>
          
          {/* Field Changes Approval Section - Only for Management and Admin roles */}
          {ordersNeedingApproval.length > 0 && (
            <Box sx={{ mb: 4 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Warning sx={{ color: '#FF9800', mr: 1, fontSize: 28 }} />
                <Typography variant="h6" sx={{ color: '#FF9800', fontWeight: 600 }}>
                  Field Changes Pending Approval ({ordersNeedingApproval.length})
                </Typography>
              </Box>
              <Grid container spacing={2}>
                {ordersNeedingApproval
                  .filter(order => 
                    searchTerm === '' ||
                    order.orderId.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    order.customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    order.materialName.toLowerCase().includes(searchTerm.toLowerCase())
                  )
                  .map((order) => (
                    <Grid item xs={12} sm={6} md={4} lg={3} key={order.orderId}>
                      <Card
                        onClick={() => navigateToOrder(order.orderId)}
                        sx={{
                          bgcolor: mode === 'dark' ? 'rgba(255,152,0,0.2)' : 'rgba(255,152,0,0.1)',
                          border: '2px solid #FF9800',
                          borderRadius: 2,
                          cursor: 'pointer',
                          transition: 'all 0.3s ease',
                          height: '100%',
                          display: 'flex',
                          flexDirection: 'column',
                          '&:hover': {
                            transform: 'translateY(-4px)',
                            boxShadow: '0 8px 25px rgba(255,152,0,0.3)',
                          },
                        }}
                      >
                        <CardHeader
                          title={
                            <Typography variant="subtitle2" sx={{ color: getCardTextColor(), fontWeight: 600, fontSize: '0.875rem' }}>
                              {order.orderId}
                            </Typography>
                          }
                          subheader={
                            <Typography variant="caption" sx={{ color: getSecondaryTextColor(), fontSize: '0.7rem' }}>
                              {order.pendingFieldChanges?.fields?.length || 0} field(s) changed
                            </Typography>
                          }
                          action={
                            <Chip
                              label="Pending Approval"
                              size="small"
                              sx={{
                                bgcolor: '#FF9800',
                                color: '#FFFFFF',
                                fontSize: '0.65rem',
                                fontWeight: 600,
                                height: '20px',
                              }}
                            />
                          }
                          sx={{ pb: 0.5, pt: 1.5, px: 1.5 }}
                        />
                        <CardContent sx={{ pt: 0, pb: 1.5, px: 1.5, flex: 1, display: 'flex', flexDirection: 'column' }}>
                          <Typography variant="body2" sx={{ color: getCardTextColor(), mb: 0.5, fontSize: '0.8rem' }}>
                            <strong>Customer:</strong> {order.customer.name}
                          </Typography>
                          <Typography variant="body2" sx={{ color: getCardTextColor(), mb: 0.5, fontSize: '0.8rem' }}>
                            <strong>Material:</strong> {order.materialName}
                          </Typography>
                          <Typography variant="body2" sx={{ color: getCardTextColor(), mb: 0.5, fontSize: '0.8rem' }}>
                            <strong>Status:</strong> {statusDisplayNames[order.status]}
                          </Typography>
                          <Typography variant="body2" sx={{ color: getCardTextColor(), fontSize: '0.8rem' }}>
                            <strong>Requested by:</strong> {order.pendingFieldChanges?.requestedBy?.name || 'N/A'}
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
              </Grid>
            </Box>
          )}
          
          {/* High Priority Section */}
          {highPriorityOrders.length > 0 && (
            <Box sx={{ mb: 4 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Warning sx={{ color: '#EF4444', mr: 1, fontSize: 28 }} />
                <Typography variant="h6" sx={{ color: '#EF4444', fontWeight: 600 }}>
                  High Priority - No Status Updates Since 5+ Days ({highPriorityOrders.length})
                </Typography>
              </Box>
              <Grid container spacing={2}>
                {highPriorityOrders
                  .filter(order => 
                    searchTerm === '' ||
                    order.orderId.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    order.customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    order.materialName.toLowerCase().includes(searchTerm.toLowerCase())
                  )
                  .map((order) => (
                    <Grid item xs={12} sm={6} md={4} lg={3} key={order.orderId}>
                      <Card
                        onClick={() => navigateToOrder(order.orderId)}
                        sx={{
                          bgcolor: mode === 'dark' ? 'rgba(239,68,68,0.2)' : 'rgba(239,68,68,0.1)',
                          border: '2px solid #EF4444',
                          borderRadius: 2,
                          cursor: 'pointer',
                          transition: 'all 0.3s ease',
                          height: '100%',
                          display: 'flex',
                          flexDirection: 'column',
                          '&:hover': {
                            transform: 'translateY(-4px)',
                            boxShadow: '0 8px 25px rgba(239,68,68,0.3)',
                          },
                        }}
                      >
                        <CardHeader
                          title={
                            <Typography variant="subtitle2" sx={{ color: getCardTextColor(), fontWeight: 600, fontSize: '0.875rem' }}>
                              {order.orderId}
                            </Typography>
                          }
                          subheader={
                            <Typography variant="caption" sx={{ color: getSecondaryTextColor(), fontSize: '0.7rem' }}>
                              Updated: {getDaysSinceLastUpdate(order)} days ago
                            </Typography>
                          }
                          action={
                            <Chip
                              label={getStatusChipLabel(order.status)}
                              size="small"
                              sx={{
                                bgcolor: '#EF4444',
                                color: '#FFFFFF',
                                fontSize: '0.65rem',
                                fontWeight: 600,
                                height: '20px',
                              }}
                            />
                          }
                          sx={{ pb: 0.5, pt: 1.5, px: 1.5 }}
                        />
                        <CardContent sx={{ pt: 0, pb: 1.5, px: 1.5, flex: 1, display: 'flex', flexDirection: 'column' }}>
                          <Typography variant="body2" sx={{ color: getCardTextColor(), mb: 0.5, fontSize: '0.8rem' }}>
                            <strong>Customer:</strong> {order.customer.name}
                          </Typography>
                          <Typography variant="body2" sx={{ color: getCardTextColor(), mb: 0.5, fontSize: '0.8rem' }}>
                            <strong>Material:</strong> {order.materialName}
                          </Typography>
                          <Typography variant="body2" sx={{ color: getCardTextColor(), mb: 0.5, fontSize: '0.8rem' }}>
                            <strong>Status:</strong> {statusDisplayNames[order.status]}
                          </Typography>
                          <Typography variant="body2" sx={{ color: getCardTextColor(), fontSize: '0.8rem' }}>
                            <strong>Assigned to:</strong> {order.assignedTo.name}
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
              </Grid>
            </Box>
          )}

          {/* Medium Priority Section */}
          {mediumPriorityOrders.length > 0 && (
            <Box sx={{ mb: 4 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Schedule sx={{ color: '#FF9800', mr: 1, fontSize: 28 }} />
                <Typography variant="h6" sx={{ color: '#FF9800', fontWeight: 600 }}>
                  Medium Priority - No Status Updates Since 3+ Days ({mediumPriorityOrders.length})
                </Typography>
              </Box>
              <Grid container spacing={2}>
                {mediumPriorityOrders
                  .filter(order => 
                    searchTerm === '' ||
                    order.orderId.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    order.customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    order.materialName.toLowerCase().includes(searchTerm.toLowerCase())
                  )
                  .map((order) => (
                    <Grid item xs={12} sm={6} md={4} lg={3} key={order.orderId}>
                      <Card
                        onClick={() => navigateToOrder(order.orderId)}
                        sx={{
                          bgcolor: mode === 'dark' ? 'rgba(255,152,0,0.2)' : 'rgba(255,152,0,0.1)',
                          border: '2px solid #FF9800',
                          borderRadius: 2,
                          cursor: 'pointer',
                          transition: 'all 0.3s ease',
                          height: '100%',
                          display: 'flex',
                          flexDirection: 'column',
                          '&:hover': {
                            transform: 'translateY(-4px)',
                            boxShadow: '0 8px 25px rgba(255,152,0,0.3)',
                          },
                        }}
                      >
                        <CardHeader
                          title={
                            <Typography variant="subtitle2" sx={{ color: getCardTextColor(), fontWeight: 600, fontSize: '0.875rem' }}>
                              {order.orderId}
                            </Typography>
                          }
                          subheader={
                            <Typography variant="caption" sx={{ color: getSecondaryTextColor(), fontSize: '0.7rem' }}>
                              Updated: {getDaysSinceLastUpdate(order)} days ago
                            </Typography>
                          }
                          action={
                            <Chip
                              label={getStatusChipLabel(order.status)}
                              size="small"
                              sx={{
                                bgcolor: '#FF9800',
                                color: '#FFFFFF',
                                fontSize: '0.65rem',
                                fontWeight: 600,
                                height: '20px',
                              }}
                            />
                          }
                          sx={{ pb: 0.5, pt: 1.5, px: 1.5 }}
                        />
                        <CardContent sx={{ pt: 0, pb: 1.5, px: 1.5, flex: 1, display: 'flex', flexDirection: 'column' }}>
                          <Typography variant="body2" sx={{ color: getCardTextColor(), mb: 0.5, fontSize: '0.8rem' }}>
                            <strong>Customer:</strong> {order.customer.name}
                          </Typography>
                          <Typography variant="body2" sx={{ color: getCardTextColor(), mb: 0.5, fontSize: '0.8rem' }}>
                            <strong>Material:</strong> {order.materialName}
                          </Typography>
                          <Typography variant="body2" sx={{ color: getCardTextColor(), mb: 0.5, fontSize: '0.8rem' }}>
                            <strong>Status:</strong> {statusDisplayNames[order.status]}
                          </Typography>
                          <Typography variant="body2" sx={{ color: getCardTextColor(), fontSize: '0.8rem' }}>
                            <strong>Assigned to:</strong> {order.assignedTo.name}
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
              </Grid>
            </Box>
          )}

          {/* No Priority Orders Message */}
          {highPriorityOrders.length === 0 && mediumPriorityOrders.length === 0 && (
            <Box sx={{ 
              textAlign: 'center', 
              py: 6,
              bgcolor: mode === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
              borderRadius: 2,
              border: `2px dashed ${mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
            }}>
              <CheckCircle sx={{ fontSize: 64, color: mode === 'dark' ? 'rgba(76,175,80,0.5)' : '#4CAF50', mb: 2 }} />
              <Typography variant="h6" sx={{ color: getCardTextColor(), mb: 1 }}>
                All caught up! 🎉
              </Typography>
              <Typography variant="body1" sx={{ color: getSecondaryTextColor() }}>
                No orders require immediate attention. All orders have been updated within the last 3 days.
              </Typography>
            </Box>
          )}
          </Box>
        ) : (
          /* Status Overview for Employees (Old Layout) */
          <Box sx={{ mb: 3 }}>
            <Typography variant="h5" sx={{ color: getCardTextColor(), fontWeight: 600, mb: 3 }}>
              📊 My Orders
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
                      <Grid container spacing={2}>
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
                              {group.status === 'Material_to_be_Dispatched' ? (
                                <Tooltip 
                                  title={
                                    <Box>
                                      <Box>Dispatch Progress: {calculateDispatchProgress(order)}%</Box>
                                      <Box sx={{ mt: 0.5 }}>
                                        {order.logisticsSubStatus 
                                          ? getLogisticsSubStatusDisplayName(order.logisticsSubStatus)
                                          : 'No sub-status selected'
                                        }
                                      </Box>
                                    </Box>
                                  }
                                  arrow
                                  placement="top"
                                >
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
                                </Tooltip>
                              ) : (
                                <Card
                                  onClick={() => navigateToOrder(order.orderId)}
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
                              )}
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
        )}


        {/* Floating Action Button */}
        <Fab
          color="primary"
          aria-label="create order"
          onClick={() => setCreateOrderOpen(true)}
          sx={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            bgcolor: '#EF721F',
            '&:hover': { bgcolor: '#EF721F' },
            zIndex: 1000,
          }}
        >
          <Add />
        </Fab>

        {/* Create Order Modal */}
        <CreateOrderModal
          open={createOrderOpen}
          onClose={() => setCreateOrderOpen(false)}
          onSubmit={handleCreateOrder}
        />
          </Container>
        </Box>
      </Box>
    </Box>
  );
};

export default DashboardPage;