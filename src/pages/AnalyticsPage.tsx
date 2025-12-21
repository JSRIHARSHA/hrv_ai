import React, { useMemo, useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Grid,
  Paper,
  Card,
  CardContent,
  useTheme,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Button,
} from '@mui/material';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  Assignment,
  CheckCircle,
  Schedule,
  AttachMoney,
  ShoppingCart,
  LocalShipping,
  Business,
  Assessment,
  AccessTime,
  FileDownload,
} from '@mui/icons-material';
import { useOrders } from '../contexts/OrderContext';
import { useAuth } from '../contexts/AuthContext';
import { useTheme as useAppTheme } from '../contexts/ThemeContext';
import { OrderStatus } from '../types';
import dayjs from 'dayjs';
import AppBanner from '../components/AppBanner';
import LeftNavigation from '../components/LeftNavigation';
import * as XLSX from 'xlsx';
import toast from 'react-hot-toast';

type TimeSpan = '1m' | '3m' | '6m' | '1y' | '2y' | '3y' | '5y' | 'all';

const AnalyticsPage: React.FC = () => {
  const { orders } = useOrders();
  const { user } = useAuth();
  const { mode } = useAppTheme();
  const theme = useTheme();
  const [timeSpan, setTimeSpan] = useState<TimeSpan>('all');
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

  // Filter orders based on selected time span
  const filteredOrders = useMemo(() => {
    if (timeSpan === 'all') return orders;
    
    const now = dayjs();
    let cutoffDate: dayjs.Dayjs;
    
    switch (timeSpan) {
      case '1m':
        cutoffDate = now.subtract(1, 'month');
        break;
      case '3m':
        cutoffDate = now.subtract(3, 'month');
        break;
      case '6m':
        cutoffDate = now.subtract(6, 'month');
        break;
      case '1y':
        cutoffDate = now.subtract(1, 'year');
        break;
      case '2y':
        cutoffDate = now.subtract(2, 'year');
        break;
      case '3y':
        cutoffDate = now.subtract(3, 'year');
        break;
      case '5y':
        cutoffDate = now.subtract(5, 'year');
        break;
      default:
        return orders;
    }
    
    return orders.filter(order => {
      const orderDate = dayjs(order.createdAt);
      return orderDate.isAfter(cutoffDate);
    });
  }, [orders, timeSpan]);

  // Calculate KPIs
  const kpis = useMemo(() => {
    const totalOrders = filteredOrders.length;
    const completedOrders = filteredOrders.filter(o => o.status === 'Completed').length;
    const inTransitOrders = filteredOrders.filter(o => 
      ['Material_Dispatched', 'In_Transit'].includes(o.status)
    ).length;
    const pendingApproval = filteredOrders.filter(o => 
      ['Sent_PO_for_Approval', 'Awaiting_Approval'].includes(o.status)
    ).length;
    
    // Calculate average execution time for completed orders
    // Time is measured from "Drafting_PO_for_Supplier" to "Completed"
    const completedOrdersWithTime = filteredOrders
      .filter(o => o.status === 'Completed')
      .map(order => {
        // Find the timeline event where status changed to 'Drafting_PO_for_Supplier'
        const draftingEvent = order.timeline?.find(
          (event: any) => event.status === 'Drafting_PO_for_Supplier'
        );
        
        let draftingDate;
        if (draftingEvent?.timestamp) {
          draftingDate = dayjs(draftingEvent.timestamp);
        } else {
          // If no timeline event found, skip this order
          return null;
        }
        
        // Find the timeline event where status changed to 'Completed'
        const completionEvent = order.timeline?.find(
          (event: any) => event.status === 'Completed'
        );
        
        let completionDate;
        if (completionEvent?.timestamp) {
          completionDate = dayjs(completionEvent.timestamp);
        } else if (order.updatedAt) {
          // Fallback to updatedAt if no timeline event found
          completionDate = dayjs(order.updatedAt);
        } else {
          // If no completion date found, skip this order
          return null;
        }
        
        const timeDiff = completionDate.diff(draftingDate, 'days', true); // Get difference in days (with decimals)
        return timeDiff >= 0 ? timeDiff : null; // Return null for negative times (data issues)
      })
      .filter((time): time is number => time !== null && time >= 0); // Filter out nulls and negative times
    
    const avgExecutionTime = completedOrdersWithTime.length > 0
      ? completedOrdersWithTime.reduce((sum, time) => sum + time, 0) / completedOrdersWithTime.length
      : 0;
    
    const hrvOrders = filteredOrders.filter(o => o.entity === 'HRV').length;
    const nhgOrders = filteredOrders.filter(o => o.entity === 'NHG').length;
    
    return {
      totalOrders,
      completedOrders,
      inTransitOrders,
      pendingApproval,
      avgExecutionTime,
      hrvOrders,
      nhgOrders,
    };
  }, [filteredOrders]);

  // Orders by Status
  const ordersByStatus = useMemo(() => {
    const statusCounts: Record<string, number> = {};
    filteredOrders.forEach(order => {
      statusCounts[order.status] = (statusCounts[order.status] || 0) + 1;
    });
    
    return Object.entries(statusCounts)
      .map(([status, count]) => ({
        status: status.replace(/_/g, ' '),
        count,
        percentage: ((count / filteredOrders.length) * 100).toFixed(1),
      }))
      .sort((a, b) => b.count - a.count);
  }, [filteredOrders]);

  // Orders over time (last 30 days)
  const ordersOverTime = useMemo(() => {
    const last30Days = Array.from({ length: 30 }, (_, i) => {
      const date = dayjs().subtract(29 - i, 'days');
      return {
        date: date.format('MMM DD'),
        fullDate: date.format('YYYY-MM-DD'),
        orders: 0,
      };
    });

    filteredOrders.forEach(order => {
      const orderDate = dayjs(order.createdAt).format('YYYY-MM-DD');
      const dayData = last30Days.find(d => d.fullDate === orderDate);
      if (dayData) {
        dayData.orders += 1;
      }
    });

    return last30Days;
  }, [filteredOrders]);

  // Orders by Entity
  const ordersByEntity = useMemo(() => {
    const entityCounts: Record<string, number> = {};
    const entityRevenue: Record<string, number> = {};
    
    filteredOrders.forEach(order => {
      const entity = order.entity || 'Unknown';
      entityCounts[entity] = (entityCounts[entity] || 0) + 1;
      entityRevenue[entity] = (entityRevenue[entity] || 0) + (order.priceToCustomer?.amount || 0);
    });

    return Object.entries(entityCounts).map(([entity, count]) => ({
      entity,
      count,
      revenue: entityRevenue[entity],
    }));
  }, [filteredOrders]);


  // Average time spent in each stage
  const avgTimePerStage = useMemo(() => {
    // Track total time and count for each status
    const statusTimeData: Record<string, { totalDays: number; count: number }> = {};
    
    filteredOrders.forEach(order => {
      // Start with order creation
      const orderCreatedAt = dayjs(order.createdAt);
      
      // Sort timeline events by timestamp
      const sortedTimeline = order.timeline 
        ? [...order.timeline]
            .filter((event: any) => event.status) // Only events with status changes
            .sort((a, b) => dayjs(a.timestamp).valueOf() - dayjs(b.timestamp).valueOf())
        : [];
      
      // Track current status and when it started
      // Initial status starts from order creation
      let currentStatus: string = order.status || 'PO_Received_from_Client';
      let statusStartTime: dayjs.Dayjs = orderCreatedAt;
      
      // Process each timeline event (status change)
      sortedTimeline.forEach((event: any) => {
        const eventTime = dayjs(event.timestamp);
        
        // If event has a status, it's a status change
        if (event.status && event.status !== currentStatus) {
          // Calculate time spent in previous status
          const daysSpent = eventTime.diff(statusStartTime, 'days', true);
          if (daysSpent >= 0) {
            if (!statusTimeData[currentStatus]) {
              statusTimeData[currentStatus] = { totalDays: 0, count: 0 };
            }
            statusTimeData[currentStatus].totalDays += daysSpent;
            statusTimeData[currentStatus].count += 1;
          }
          
          // Update to new status
          currentStatus = event.status;
          statusStartTime = eventTime;
        }
      });
      
      // Handle the final/current status
      // For completed orders, use the completion time; for others, use current time
      let endTime: dayjs.Dayjs;
      if (order.status === 'Completed') {
        // Find the completion event timestamp
        const completionEvent = sortedTimeline.find((e: any) => e.status === 'Completed');
        endTime = completionEvent ? dayjs(completionEvent.timestamp) : (order.updatedAt ? dayjs(order.updatedAt) : dayjs());
      } else {
        // For incomplete orders, use current time
        endTime = dayjs();
      }
      
      const daysSpent = endTime.diff(statusStartTime, 'days', true);
      if (daysSpent >= 0) {
        if (!statusTimeData[currentStatus]) {
          statusTimeData[currentStatus] = { totalDays: 0, count: 0 };
        }
        statusTimeData[currentStatus].totalDays += daysSpent;
        statusTimeData[currentStatus].count += 1;
      }
    });
    
    // Calculate averages
    return Object.entries(statusTimeData)
      .map(([status, data]) => ({
        status: status.replace(/_/g, ' '),
        avgDays: data.count > 0 ? data.totalDays / data.count : 0,
        count: data.count,
      }))
      .filter(item => item.avgDays > 0 && item.count > 0) // Only include statuses that have data
      .sort((a, b) => b.avgDays - a.avgDays); // Sort by average time descending
  }, [filteredOrders]);

  // Status distribution for pie chart
  const statusDistribution = useMemo(() => {
    const statusGroups: Record<string, number> = {};
    
    filteredOrders.forEach(order => {
      let group = 'Other';
      if (['PO_Received_from_Client', 'Drafting_PO_for_Supplier'].includes(order.status)) {
        group = 'Draft';
      } else if (['Sent_PO_for_Approval', 'Awaiting_Approval'].includes(order.status)) {
        group = 'Pending Approval';
      } else if (['PO_Approved', 'PO_Sent_to_Supplier'].includes(order.status)) {
        group = 'Approved';
      } else if (['Proforma_Invoice_Received', 'Awaiting_COA', 'COA_Received'].includes(order.status)) {
        group = 'Processing';
      } else if (['Material_Dispatched', 'In_Transit'].includes(order.status)) {
        group = 'In Transit';
      } else if (order.status === 'Completed') {
        group = 'Completed';
      }
      
      statusGroups[group] = (statusGroups[group] || 0) + 1;
    });

    return Object.entries(statusGroups).map(([name, value]) => ({ name, value }));
  }, [filteredOrders]);

  const COLORS = [
    '#EF721F',
    '#3D52A0',
    '#10B981',
    '#F59E0B',
    '#EF4444',
    '#8B5CF6',
    '#06B6D4',
    '#EC4899',
  ];

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatExecutionTime = (days: number) => {
    if (days === 0) return '0 days';
    if (days < 1) {
      const hours = Math.round(days * 24);
      return hours === 1 ? '1 hour' : `${hours} hours`;
    }
    if (days < 30) {
      const roundedDays = Math.round(days);
      return roundedDays === 1 ? '1 day' : `${roundedDays} days`;
    }
    if (days < 365) {
      const months = Math.round(days / 30);
      return months === 1 ? '1 month' : `${months} months`;
    }
    const years = (days / 365).toFixed(1);
    return years === '1.0' ? '1 year' : `${years} years`;
  };

  const KPI_CARDS = [
    {
      title: 'Total Orders',
      value: kpis.totalOrders.toLocaleString(),
      icon: <Assignment />,
      color: '#3D52A0',
      trend: null,
    },
    {
      title: 'Completed Orders',
      value: kpis.completedOrders.toLocaleString(),
      icon: <CheckCircle />,
      color: '#10B981',
      trend: null,
    },
    {
      title: 'In Transit',
      value: kpis.inTransitOrders.toLocaleString(),
      icon: <LocalShipping />,
      color: '#06B6D4',
      trend: null,
    },
    {
      title: 'Pending Approval',
      value: kpis.pendingApproval.toLocaleString(),
      icon: <Schedule />,
      color: '#F59E0B',
      trend: null,
    },
    {
      title: 'Avg. Time Taken to Execute Order',
      value: kpis.completedOrders > 0 ? formatExecutionTime(kpis.avgExecutionTime) : 'N/A',
      icon: <AccessTime />,
      color: '#8B5CF6',
      trend: null,
    },
  ];

  const getBackgroundColor = () => mode === 'dark' ? '#000000' : '#F8F9FA';
  const getCardTextColor = () => mode === 'dark' ? '#FFFFFF' : '#333333';
  const getSecondaryTextColor = () => mode === 'dark' ? 'rgba(255,255,255,0.8)' : 'rgba(0,0,0,0.7)';

  // Export analytics to Excel
  const handleExportToExcel = () => {
    try {
      const workbook = XLSX.utils.book_new();
      
      // Sheet 1: KPI Summary
      const kpiData = [
        { Metric: 'Total Orders', Value: kpis.totalOrders },
        { Metric: 'Completed Orders', Value: kpis.completedOrders },
        { Metric: 'In Transit Orders', Value: kpis.inTransitOrders },
        { Metric: 'Pending Approval', Value: kpis.pendingApproval },
        { Metric: 'Avg. Execution Time (Days)', Value: kpis.avgExecutionTime.toFixed(2) },
        { Metric: 'HRV Orders', Value: kpis.hrvOrders },
        { Metric: 'NHG Orders', Value: kpis.nhgOrders },
        { Metric: 'Time Span', Value: timeSpan === 'all' ? 'All' : timeSpan },
      ];
      const kpiSheet = XLSX.utils.json_to_sheet(kpiData);
      XLSX.utils.book_append_sheet(workbook, kpiSheet, 'KPI Summary');
      
      // Sheet 2: Orders by Status
      const statusSheet = XLSX.utils.json_to_sheet(
        ordersByStatus.map(item => ({
          Status: item.status,
          Count: item.count,
          Percentage: `${item.percentage}%`,
        }))
      );
      XLSX.utils.book_append_sheet(workbook, statusSheet, 'Orders by Status');
      
      // Sheet 3: Orders by Entity
      const entitySheet = XLSX.utils.json_to_sheet(ordersByEntity);
      XLSX.utils.book_append_sheet(workbook, entitySheet, 'Orders by Entity');
      
      // Sheet 4: Average Time per Stage
      const avgTimeSheet = XLSX.utils.json_to_sheet(
        avgTimePerStage.map(item => ({
          Stage: item.status,
          'Avg Days': item.avgDays.toFixed(2),
          'Avg Hours': (item.avgDays * 24).toFixed(2),
        }))
      );
      XLSX.utils.book_append_sheet(workbook, avgTimeSheet, 'Avg Time per Stage');
      
      // Sheet 5: Orders Trend (Last 30 Days)
      const trendSheet = XLSX.utils.json_to_sheet(
        ordersOverTime.map(item => ({
          Date: item.date,
          'Full Date': item.fullDate,
          Orders: item.orders,
        }))
      );
      XLSX.utils.book_append_sheet(workbook, trendSheet, 'Orders Trend (30 Days)');
      
      // Sheet 6: Status Distribution
      const distributionSheet = XLSX.utils.json_to_sheet(
        statusDistribution.map(item => ({
          'Status Group': item.name,
          Count: item.value,
        }))
      );
      XLSX.utils.book_append_sheet(workbook, distributionSheet, 'Status Distribution');
      
      // Generate filename with timestamp
      const timestamp = dayjs().format('YYYY-MM-DD_HH-mm-ss');
      const timeSpanLabel = timeSpan === 'all' ? 'All' : 
        timeSpan === '1m' ? '1Month' :
        timeSpan === '3m' ? '3Months' :
        timeSpan === '6m' ? '6Months' :
        timeSpan === '1y' ? '1Year' :
        timeSpan === '2y' ? '2Years' :
        timeSpan === '3y' ? '3Years' : '5Years';
      const filename = `Analytics_Report_${timeSpanLabel}_${timestamp}.xlsx`;
      
      // Generate Excel file and trigger download
      XLSX.writeFile(workbook, filename);
      
      toast.success('Analytics exported to Excel successfully!');
    } catch (error) {
      console.error('Error exporting analytics to Excel:', error);
      toast.error('Failed to export analytics to Excel');
    }
  };

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
          <Container maxWidth="xl" disableGutters sx={{ mt: { xs: 2, sm: 3, md: 4 }, mb: { xs: 2, sm: 3 }, px: 0 }}>
            <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
              <Box>
                <Typography
                  variant="h4"
                  sx={{
                    fontWeight: 700,
                    color: getCardTextColor(),
                    mb: 1,
                  }}
                >
                  Analytics Dashboard
                </Typography>
                <Typography
                  variant="body1"
                  sx={{
                    color: getSecondaryTextColor(),
                  }}
                >
                  Comprehensive overview of order performance and key metrics
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                <FormControl 
                  size="small" 
                  sx={{ 
                    minWidth: 150,
                    '& .MuiOutlinedInput-root': {
                      bgcolor: mode === 'dark' ? 'rgba(255,255,255,0.05)' : '#FFFFFF',
                      '& fieldset': {
                        borderColor: mode === 'dark' ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.23)',
                      },
                      '&:hover fieldset': {
                        borderColor: mode === 'dark' ? 'rgba(255,255,255,0.3)' : '#EF721F',
                      },
                      '&.Mui-focused fieldset': {
                        borderColor: '#EF721F',
                      },
                    },
                    '& .MuiInputLabel-root': {
                      color: mode === 'dark' ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.6)',
                    },
                    '& .MuiSelect-select': {
                      color: getCardTextColor(),
                    },
                  }}
                >
                  <InputLabel>Time Span</InputLabel>
                  <Select
                    value={timeSpan}
                    label="Time Span"
                    onChange={(e) => setTimeSpan(e.target.value as TimeSpan)}
                  >
                    <MenuItem value="1m">1 Month</MenuItem>
                    <MenuItem value="3m">3 Months</MenuItem>
                    <MenuItem value="6m">6 Months</MenuItem>
                    <MenuItem value="1y">1 Year</MenuItem>
                    <MenuItem value="2y">2 Years</MenuItem>
                    <MenuItem value="3y">3 Years</MenuItem>
                    <MenuItem value="5y">5 Years</MenuItem>
                    <MenuItem value="all">All</MenuItem>
                  </Select>
                </FormControl>
                <Button
                  variant="contained"
                  startIcon={<FileDownload />}
                  onClick={handleExportToExcel}
                  sx={{
                    bgcolor: '#10B981',
                    color: '#FFFFFF',
                    '&:hover': {
                      bgcolor: '#059669',
                    },
                    borderRadius: 2,
                    textTransform: 'none',
                    fontWeight: 600,
                  }}
                >
                  Export
                </Button>
              </Box>
            </Box>

      {/* KPI Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {KPI_CARDS.map((kpi, index) => (
          <Grid item xs={12} sm={6} md={3} key={index}>
            <Card
              sx={{
                bgcolor: mode === 'dark' ? 'rgba(255,255,255,0.05)' : '#FFFFFF',
                border: mode === 'dark' 
                  ? '1px solid rgba(255,255,255,0.1)' 
                  : '1px solid rgba(0,0,0,0.12)',
                borderRadius: 2,
                height: '100%',
                transition: 'transform 0.2s, box-shadow 0.2s',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: mode === 'dark'
                    ? '0 8px 24px rgba(0,0,0,0.3)'
                    : '0 8px 24px rgba(0,0,0,0.15)',
                },
              }}
            >
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                  <Box
                    sx={{
                      p: 1.5,
                      borderRadius: 2,
                      bgcolor: `${kpi.color}15`,
                      color: kpi.color,
                    }}
                  >
                    {kpi.icon}
                  </Box>
                  {kpi.trend && (
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      {kpi.trend === 'up' ? (
                        <TrendingUp sx={{ color: '#10B981', fontSize: 20 }} />
                      ) : (
                        <TrendingDown sx={{ color: '#EF4444', fontSize: 20 }} />
                      )}
                    </Box>
                  )}
                </Box>
                <Typography
                  variant="h5"
                  sx={{
                    fontWeight: 700,
                    color: mode === 'dark' ? '#FFFFFF' : '#1a1a2e',
                    mb: 0.5,
                  }}
                >
                  {kpi.value}
                </Typography>
                <Typography
                  variant="body2"
                  sx={{
                    color: mode === 'dark' ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)',
                  }}
                >
                  {kpi.title}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Charts Grid */}
      <Grid container spacing={3}>
        {/* Orders by Status Distribution (Pie Chart) */}
        <Grid item xs={12} md={6}>
          <Paper
            sx={{
              p: 3,
              bgcolor: mode === 'dark' ? 'rgba(255,255,255,0.05)' : '#FFFFFF',
              border: mode === 'dark' 
                ? '1px solid rgba(255,255,255,0.1)' 
                : '1px solid rgba(0,0,0,0.12)',
              borderRadius: 2,
            }}
          >
            <Typography
              variant="h6"
              sx={{
                fontWeight: 600,
                color: mode === 'dark' ? '#FFFFFF' : '#1a1a2e',
                mb: 3,
              }}
            >
              Orders by Status
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={statusDistribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} (${((percent || 0) * 100).toFixed(0)}%)`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {statusDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        {/* Orders by Entity */}
        <Grid item xs={12} md={6}>
          <Paper
            sx={{
              p: 3,
              bgcolor: mode === 'dark' ? 'rgba(255,255,255,0.05)' : '#FFFFFF',
              border: mode === 'dark' 
                ? '1px solid rgba(255,255,255,0.1)' 
                : '1px solid rgba(0,0,0,0.12)',
              borderRadius: 2,
            }}
          >
            <Typography
              variant="h6"
              sx={{
                fontWeight: 600,
                color: mode === 'dark' ? '#FFFFFF' : '#1a1a2e',
                mb: 3,
              }}
            >
              Orders by Entity
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={ordersByEntity}>
                <CartesianGrid strokeDasharray="3 3" stroke={mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'} />
                <XAxis 
                  dataKey="entity" 
                  stroke={mode === 'dark' ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.7)'}
                />
                <YAxis 
                  stroke={mode === 'dark' ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.7)'}
                />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: mode === 'dark' ? '#1a1a2e' : '#FFFFFF',
                    border: mode === 'dark' ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.1)',
                    borderRadius: 8,
                  }}
                />
                <Legend />
                <Bar dataKey="count" fill="#EF721F" name="Order Count" />
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        {/* Orders Over Time (Last 30 Days) */}
        <Grid item xs={12}>
          <Paper
            sx={{
              p: 3,
              bgcolor: mode === 'dark' ? 'rgba(255,255,255,0.05)' : '#FFFFFF',
              border: mode === 'dark' 
                ? '1px solid rgba(255,255,255,0.1)' 
                : '1px solid rgba(0,0,0,0.12)',
              borderRadius: 2,
            }}
          >
            <Typography
              variant="h6"
              sx={{
                fontWeight: 600,
                color: mode === 'dark' ? '#FFFFFF' : '#1a1a2e',
                mb: 3,
              }}
            >
              Orders Trend (Last 30 Days)
            </Typography>
            <ResponsiveContainer width="100%" height={350}>
              <AreaChart data={ordersOverTime}>
                <defs>
                  <linearGradient id="colorOrders" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#EF721F" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#EF721F" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'} />
                <XAxis 
                  dataKey="date" 
                  stroke={mode === 'dark' ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.7)'}
                />
                <YAxis 
                  stroke={mode === 'dark' ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.7)'}
                />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: mode === 'dark' ? '#1a1a2e' : '#FFFFFF',
                    border: mode === 'dark' ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.1)',
                    borderRadius: 8,
                  }}
                />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="orders"
                  stroke="#EF721F"
                  fillOpacity={1}
                  fill="url(#colorOrders)"
                  name="Orders"
                />
              </AreaChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        {/* Detailed Status Distribution */}
        <Grid item xs={12} md={6}>
          <Paper
            sx={{
              p: 3,
              bgcolor: mode === 'dark' ? 'rgba(255,255,255,0.05)' : '#FFFFFF',
              border: mode === 'dark' 
                ? '1px solid rgba(255,255,255,0.1)' 
                : '1px solid rgba(0,0,0,0.12)',
              borderRadius: 2,
            }}
          >
            <Typography
              variant="h6"
              sx={{
                fontWeight: 600,
                color: mode === 'dark' ? '#FFFFFF' : '#1a1a2e',
                mb: 3,
              }}
            >
              Orders by Status (Detailed)
            </Typography>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={ordersByStatus} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke={mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'} />
                <XAxis 
                  type="number"
                  stroke={mode === 'dark' ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.7)'}
                />
                <YAxis 
                  type="category" 
                  dataKey="status" 
                  width={150}
                  stroke={mode === 'dark' ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.7)'}
                />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: mode === 'dark' ? '#1a1a2e' : '#FFFFFF',
                    border: mode === 'dark' ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.1)',
                    borderRadius: 8,
                  }}
                  formatter={(value: any) => `${value} orders`}
                />
                <Bar dataKey="count" fill="#EF721F" />
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        {/* Average Time Per Stage */}
        <Grid item xs={12} md={6}>
          <Paper
            sx={{
              p: 3,
              bgcolor: mode === 'dark' ? 'rgba(255,255,255,0.05)' : '#FFFFFF',
              border: mode === 'dark' 
                ? '1px solid rgba(255,255,255,0.1)' 
                : '1px solid rgba(0,0,0,0.12)',
              borderRadius: 2,
            }}
          >
            <Typography
              variant="h6"
              sx={{
                fontWeight: 600,
                color: mode === 'dark' ? '#FFFFFF' : '#1a1a2e',
                mb: 3,
              }}
            >
              Average Time per Stage
            </Typography>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={avgTimePerStage} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke={mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'} />
                <XAxis 
                  type="number"
                  stroke={mode === 'dark' ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.7)'}
                  label={{ 
                    value: 'Days', 
                    position: 'insideBottom', 
                    offset: -5,
                    style: { fill: mode === 'dark' ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.7)' }
                  }}
                />
                <YAxis 
                  type="category" 
                  dataKey="status" 
                  width={180}
                  stroke={mode === 'dark' ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.7)'}
                />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: mode === 'dark' ? '#1a1a2e' : '#FFFFFF',
                    border: mode === 'dark' ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.1)',
                    borderRadius: 8,
                  }}
                  formatter={(value: any) => {
                    const days = parseFloat(value);
                    if (days < 1) {
                      const hours = Math.round(days * 24);
                      return `${hours} hour${hours !== 1 ? 's' : ''}`;
                    }
                    return `${days.toFixed(1)} day${days !== 1 ? 's' : ''}`;
                  }}
                />
                <Bar dataKey="avgDays" fill="#3D52A0" name="Avg. Days" />
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

      </Grid>
          </Container>
        </Box>
      </Box>
    </Box>
  );
};

export default AnalyticsPage;

