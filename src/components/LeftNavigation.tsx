import React, { useState, useEffect } from 'react';
import {
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Box,
  Typography,
  Divider,
  IconButton,
  Collapse,
  Avatar,
  Chip,
  useTheme,
  useMediaQuery,
  Tooltip,
  Badge,
} from '@mui/material';
import {
  Dashboard,
  Assignment,
  People,
  Analytics,
  Settings,
  ExpandLess,
  ExpandMore,
  Menu as MenuIcon,
  Close,
  Business,
  TrendingUp,
  Assessment,
  AccountBalance,
  Inventory,
  LocalShipping,
  Receipt,
  CheckCircle,
  Warning,
  Schedule,
  ChevronLeft,
  ChevronRight,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTheme as useAppTheme } from '../contexts/ThemeContext';

interface LeftNavigationProps {
  open?: boolean;
  onClose?: () => void;
  variant?: 'permanent' | 'temporary' | 'persistent';
}

const DRAWER_WIDTH = 280;
const DRAWER_WIDTH_COLLAPSED = 72;

const LeftNavigation: React.FC<LeftNavigationProps> = ({ 
  open: controlledOpen, 
  onClose: controlledOnClose,
  variant: controlledVariant 
}) => {
  const { user } = useAuth();
  const { mode } = useAppTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  // Internal state for uncontrolled mode
  const [internalOpen, setInternalOpen] = useState(!isMobile);
  // Always collapsed - navigation is not expandable
  const collapsed = true;
  const [expandedSections, setExpandedSections] = useState<{ [key: string]: boolean }>({
    orders: false,
    analytics: false,
    team: false,
    logistics: false,
    management: false,
  });

  // Determine if controlled or uncontrolled
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const handleClose = isControlled ? controlledOnClose : () => setInternalOpen(false);
  
  // Auto-close on mobile when route changes
  useEffect(() => {
    if (isMobile && open) {
      setInternalOpen(false);
      if (handleClose) handleClose();
    }
  }, [location.pathname, isMobile]);

  // Auto-open on desktop when component mounts
  useEffect(() => {
    if (!isMobile && !isControlled) {
      setInternalOpen(true);
    }
  }, [isMobile, isControlled]);

  // Auto-collapse sub-items (always collapsed, so always keep sections collapsed)
  useEffect(() => {
    setExpandedSections({
      orders: false,
      analytics: false,
      team: false,
      logistics: false,
      management: false,
    });
  }, []);

  const handleToggleSection = (section: string) => {
    // Navigation is always collapsed, so don't allow section expansion
    return;
  };

  const handleNavigation = (path: string) => {
    navigate(path);
    if (isMobile && handleClose) {
      handleClose();
    }
  };

  const isActive = (path: string) => {
    if (path === '/dashboard') {
      return location.pathname === '/dashboard';
    }
    return location.pathname.startsWith(path);
  };

  const isSubItemActive = (path: string) => {
    return location.pathname === path;
  };

  const navigationItems = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: <Dashboard />,
      path: '/dashboard',
      roles: ['Manager', 'Management'],
    },
    {
      id: 'orders',
      label: 'Orders',
      icon: <Assignment />,
      path: '/orders',
      roles: ['Manager', 'Management'],
    },
    {
      id: 'suppliers',
      label: 'Supplier Master Data',
      icon: <Business />,
      path: '/suppliers',
      roles: ['Manager', 'Management'],
    },
    {
      id: 'products',
      label: 'Product Master Data',
      icon: <Inventory />,
      path: '/products',
      roles: ['Manager', 'Management'],
    },
    {
      id: 'team',
      label: 'Team Management',
      icon: <People />,
      path: '/team',
      roles: ['Manager', 'Management'],
      subItems: [
        { label: 'Team Members', path: '/team/members', icon: <People /> },
        { label: 'Performance', path: '/team/performance', icon: <TrendingUp /> },
        { label: 'Workload', path: '/team/workload', icon: <Assessment /> },
      ],
    },
    {
      id: 'analytics',
      label: 'Analytics',
      icon: <Analytics />,
      path: '/analytics',
      roles: ['Manager', 'Management', 'Admin'],
      subItems: [
        { label: 'Order Analytics', path: '/analytics/orders', icon: <Assignment /> },
        { label: 'Financial Reports', path: '/analytics/financial', icon: <AccountBalance /> },
        { label: 'Supplier Performance', path: '/analytics/suppliers', icon: <Business /> },
        { label: 'Inventory Status', path: '/analytics/inventory', icon: <Inventory /> },
      ],
    },
    {
      id: 'logistics',
      label: 'Logistics',
      icon: <LocalShipping />,
      path: '/freight-handlers',
      roles: ['Manager', 'Management'],
    },
    {
      id: 'management',
      label: 'Management',
      icon: <Settings />,
      path: '/management',
      roles: ['Management'],
      subItems: [
        { label: 'User Management', path: '/management/users', icon: <People /> },
        { label: 'System Settings', path: '/management/settings', icon: <Settings /> },
        { label: 'Audit Logs', path: '/management/audit', icon: <Assessment /> },
      ],
    },
  ];

  const filteredItems = navigationItems.filter(item => 
    item.roles.includes(user?.role || 'Employee')
  );

  // Determine drawer variant
  const drawerVariant = isMobile ? 'temporary' : (controlledVariant || 'permanent');
  const drawerWidth = collapsed ? DRAWER_WIDTH_COLLAPSED : DRAWER_WIDTH;

  const drawerContent = (
    <Box 
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        bgcolor: mode === 'dark' ? '#111111' : '#FFFFFF', // Using --background-secondary from CSS
        borderRight: mode === 'dark' 
          ? '1px solid rgba(255,255,255,0.1)' 
          : '1px solid rgba(0,0,0,0.12)',
        position: 'relative',
      }}
    >
      {/* Header Section */}
      <Box 
        sx={{ 
          p: collapsed ? 1.5 : 2, 
          bgcolor: mode === 'dark' ? '#000000' : '#F8F9FA', // Using --background-primary from CSS
          borderBottom: mode === 'dark' 
            ? '1px solid rgba(255,255,255,0.1)' 
            : '1px solid rgba(0,0,0,0.08)',
        }}
      >
        {!collapsed ? (
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Avatar 
                sx={{ 
                  bgcolor: '#EF721F',
                  width: 40,
                  height: 40,
                  fontSize: '1rem',
                  fontWeight: 600,
                }}
              >
                {user?.name?.charAt(0).toUpperCase() || 'U'}
            </Avatar>
              <Box sx={{ minWidth: 0, flex: 1 }}>
                <Typography 
                  variant="subtitle1" 
                  sx={{ 
                    color: mode === 'dark' ? '#FFFFFF' : '#1a1a2e',
                    fontWeight: 600,
                    fontSize: '0.95rem',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {user?.name || 'User'}
              </Typography>
                <Typography 
                  variant="caption" 
                  sx={{ 
                    color: mode === 'dark' ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)',
                    fontSize: '0.75rem',
                    textTransform: 'capitalize',
                  }}
                >
                  {user?.role?.replace('_', ' ') || 'Employee'}
              </Typography>
              </Box>
            </Box>
            {isMobile && (
              <IconButton 
                onClick={handleClose}
                size="small"
                sx={{ 
                  color: mode === 'dark' ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.6)',
                  '&:hover': {
                    bgcolor: mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
                  },
                }}
              >
                <Close fontSize="small" />
              </IconButton>
            )}
          </Box>
        ) : (
          <Box sx={{ display: 'flex', justifyContent: 'center', mb: 1 }}>
            <Avatar 
              sx={{ 
                bgcolor: '#EF721F',
                width: 40,
                height: 40,
                fontSize: '1rem',
                fontWeight: 600,
              }}
            >
              {user?.name?.charAt(0).toUpperCase() || 'U'}
            </Avatar>
          </Box>
        )}

        </Box>

        {/* Navigation Items */}
      <Box sx={{ flex: 1, overflow: 'auto', py: 1, px: collapsed ? 0.5 : 1 }}>
        <List sx={{ px: collapsed ? 0 : 0.5 }}>
          {filteredItems.map((item) => {
            const itemActive = isActive(item.path);
            const hasActiveSubItem = item.subItems?.some(sub => isSubItemActive(sub.path));
            const isExpanded = expandedSections[item.id] || hasActiveSubItem;

            const listItemContent = (
                <ListItemButton
                  onClick={() => {
                  if (item.subItems && !collapsed) {
                      handleToggleSection(item.id);
                    } else {
                      handleNavigation(item.path);
                    }
                  }}
                  sx={{
                  borderRadius: collapsed ? 1.5 : 2,
                  minHeight: 44,
                  py: collapsed ? 1.25 : 1,
                  px: collapsed ? 1 : 1.5,
                  justifyContent: collapsed ? 'center' : 'flex-start',
                  bgcolor: itemActive && !item.subItems
                    ? mode === 'dark' 
                      ? 'rgba(239, 114, 31,0.2)' 
                      : 'rgba(239, 114, 31,0.1)'
                    : 'transparent',
                  color: itemActive && !item.subItems
                    ? mode === 'dark' ? '#FFFFFF' : '#EF721F'
                    : mode === 'dark' ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.87)',
                    '&:hover': {
                    bgcolor: itemActive && !item.subItems
                      ? mode === 'dark' 
                        ? 'rgba(239, 114, 31,0.25)' 
                        : 'rgba(239, 114, 31,0.15)'
                      : mode === 'dark' 
                        ? 'rgba(255,255,255,0.08)' 
                        : 'rgba(0,0,0,0.05)',
                  },
                  transition: 'all 0.2s ease-in-out',
                }}
              >
                <ListItemIcon 
                  sx={{ 
                    color: 'inherit',
                    minWidth: collapsed ? 0 : 40,
                    justifyContent: 'center',
                    mr: collapsed ? 0 : 1,
                  }}
                >
                    {item.icon}
                  </ListItemIcon>
                {!collapsed && (
                  <>
                  <ListItemText
                    primary={item.label}
                    primaryTypographyProps={{
                        fontSize: '0.875rem',
                        fontWeight: itemActive && !item.subItems ? 600 : 500,
                    }}
                  />
                  {item.subItems && (
                      <Box sx={{ ml: 1 }}>
                        {isExpanded ? (
                          <ExpandLess sx={{ fontSize: 20 }} />
                        ) : (
                          <ExpandMore sx={{ fontSize: 20 }} />
                        )}
                      </Box>
                    )}
                  </>
                )}
              </ListItemButton>
            );

            return (
              <React.Fragment key={item.id}>
                <ListItem disablePadding sx={{ mb: 0.5 }}>
                  {collapsed ? (
                    <Tooltip title={item.label} placement="right" arrow>
                      {listItemContent}
                    </Tooltip>
                  ) : (
                    listItemContent
                  )}
              </ListItem>

                {/* Sub Items - Only show when not collapsed */}
                {!collapsed && item.subItems && (
                  <Collapse in={isExpanded} timeout={300} unmountOnExit>
                    <List component="div" disablePadding sx={{ mt: 0.5, mb: 1 }}>
                      {item.subItems.map((subItem) => {
                        const subItemActive = isSubItemActive(subItem.path);
                        return (
                          <ListItem key={subItem.path} disablePadding sx={{ mb: 0.25 }}>
                        <ListItemButton
                          onClick={() => handleNavigation(subItem.path)}
                          sx={{
                                borderRadius: 1.5,
                                minHeight: 36,
                                pl: 5,
                                pr: 1.5,
                                py: 0.75,
                                bgcolor: subItemActive
                                  ? mode === 'dark' 
                                    ? 'rgba(239, 114, 31,0.15)' 
                                    : 'rgba(239, 114, 31,0.08)'
                                  : 'transparent',
                                color: subItemActive
                                  ? mode === 'dark' ? '#FFFFFF' : '#EF721F'
                                  : mode === 'dark' ? 'rgba(255,255,255,0.75)' : 'rgba(0,0,0,0.7)',
                            '&:hover': {
                                  bgcolor: subItemActive
                                    ? mode === 'dark' 
                                      ? 'rgba(239, 114, 31,0.2)' 
                                      : 'rgba(239, 114, 31,0.12)'
                                    : mode === 'dark' 
                                      ? 'rgba(255,255,255,0.05)' 
                                      : 'rgba(0,0,0,0.03)',
                                },
                                transition: 'all 0.2s ease-in-out',
                              }}
                            >
                              <ListItemIcon 
                                sx={{ 
                                  color: 'inherit',
                                  minWidth: 32,
                                  justifyContent: 'center',
                                }}
                              >
                            {subItem.icon}
                          </ListItemIcon>
                          <ListItemText
                            primary={subItem.label}
                            primaryTypographyProps={{
                                  fontSize: '0.8125rem',
                                  fontWeight: subItemActive ? 500 : 400,
                            }}
                          />
                        </ListItemButton>
                      </ListItem>
                        );
                      })}
                  </List>
                </Collapse>
              )}
            </React.Fragment>
            );
          })}
        </List>
      </Box>

      {/* Footer Section - Only show when not collapsed */}
      {!collapsed && (
        <Box 
          sx={{ 
            p: 2,
            borderTop: mode === 'dark' 
              ? '1px solid rgba(255,255,255,0.1)' 
              : '1px solid rgba(0,0,0,0.08)',
            bgcolor: mode === 'dark' ? '#000000' : '#F8F9FA', // Using --background-primary from CSS
          }}
        >
          <Typography 
            variant="caption" 
            sx={{ 
              color: mode === 'dark' ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)',
              fontSize: '0.7rem',
              display: 'block',
              textAlign: 'center',
            }}
          >
            HRV NHG System
          </Typography>
        </Box>
      )}
    </Box>
  );

  return (
    <Drawer
      variant={drawerVariant}
      anchor="left"
      open={open}
      onClose={handleClose}
      ModalProps={{
        keepMounted: true, // Better mobile performance
      }}
      sx={{
        width: drawerVariant === 'permanent' ? drawerWidth : 'auto',
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: drawerWidth,
          boxSizing: 'border-box',
          border: 'none',
          transition: 'width 0.3s ease-in-out',
          ...(drawerVariant === 'permanent' && {
            position: 'relative',
            height: '100%',
          }),
        },
      }}
    >
      {drawerContent}
    </Drawer>
  );
};

export default LeftNavigation;
