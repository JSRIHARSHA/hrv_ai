import React from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  Box,
  Avatar,
  IconButton,
  Menu,
  MenuItem,
} from '@mui/material';
import {
  AccountCircle,
  Logout,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { getRoleDisplayName } from '../data/constants';

interface AppBannerProps {
  onLogout?: () => void;
}

const AppBanner: React.FC<AppBannerProps> = ({ onLogout }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
    if (onLogout) {
      onLogout();
    }
  };

  if (!user) return null;

  return (
    <AppBar 
      position="static" 
      sx={{ 
        bgcolor: '#1a1a2e',
        borderBottom: '1px solid rgba(124,77,255,0.2)',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
      }}
    >
      <Toolbar sx={{ justifyContent: 'space-between', px: 3 }}>
        {/* Logo Section */}
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Box
            component="img"
            src="/images/hrv-logo.png"
            alt="Company Logo"
            sx={{ 
              height: 40, 
              width: 'auto',
              mr: 2
            }}
          />
          <Typography variant="h6" sx={{ fontWeight: 600, color: '#E6E6F0' }}>
          </Typography>
        </Box>

        {/* User Section */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box sx={{ textAlign: 'right' }}>
            <Typography variant="body2" sx={{ color: '#E6E6F0', fontWeight: 500 }}>
              Hi, {user.name}
            </Typography>
            <Typography variant="caption" sx={{ color: 'rgba(230,230,240,0.7)' }}>
              {getRoleDisplayName(user.role)}
            </Typography>
          </Box>
          
          <IconButton
            size="large"
            edge="end"
            aria-label="account of current user"
            aria-controls="menu-appbar"
            aria-haspopup="true"
            onClick={handleMenuOpen}
            sx={{ color: '#E6E6F0' }}
          >
            <AccountCircle />
          </IconButton>
          
          <Menu
            id="menu-appbar"
            anchorEl={anchorEl}
            anchorOrigin={{
              vertical: 'top',
              horizontal: 'right',
            }}
            keepMounted
            transformOrigin={{
              vertical: 'top',
              horizontal: 'right',
            }}
            open={Boolean(anchorEl)}
            onClose={handleMenuClose}
            sx={{
              '& .MuiPaper-root': {
                bgcolor: '#1a1a2e',
                border: '1px solid rgba(124,77,255,0.2)',
                color: '#E6E6F0',
              }
            }}
          >
            <MenuItem onClick={handleLogout}>
              <Logout sx={{ mr: 1 }} />
              Logout
            </MenuItem>
          </Menu>
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default AppBanner;
