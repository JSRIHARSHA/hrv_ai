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
  Brightness4,
  Brightness7,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { getRoleDisplayName } from '../data/constants';
import { useTheme } from '../contexts/ThemeContext';

interface AppBannerProps {
  onLogout?: () => void;
}

const AppBanner: React.FC<AppBannerProps> = ({ onLogout }) => {
  const { user, logout } = useAuth();
  const { mode, toggleMode } = useTheme();
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

  const getBannerStyles = () => ({
    bgcolor: mode === 'dark' ? '#000000' : '#FFFFFF', // Using --background-primary from CSS
    borderBottom: mode === 'dark' 
      ? '1px solid rgba(239, 114, 31, 0.2)' 
      : '1px solid rgba(0,0,0,0.12)',
    boxShadow: mode === 'dark' 
      ? '0 2px 8px rgba(0,0,0,0.1)' 
      : '0 2px 4px rgba(0,0,0,0.08)',
  });

  return (
    <AppBar 
      position="static" 
      sx={getBannerStyles()}
    >
      <Toolbar sx={{ justifyContent: 'space-between', px: { xs: 1, sm: 2, md: 3 }, minHeight: { xs: '56px', sm: '64px' } }}>
        {/* Logo Section */}
        <Box sx={{ display: 'flex', alignItems: 'center', ml: { xs: 0, sm: -1 } }}>
          <Box
            component="img"
            src="/images/HRV%20ai.png"
            alt="Company Logo"
            sx={{ 
              height: { xs: 50, sm: 60, md: 75 }, 
              width: 'auto',
              mr: { xs: 1, sm: 2 }
            }}
          />
          <Typography variant="h6" sx={{ fontWeight: 600, color: mode === 'dark' ? '#E6E6F0' : '#333333', display: { xs: 'none', md: 'block' } }}>
          </Typography>
        </Box>

        {/* User Section */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 0.5, sm: 1, md: 2 } }}>
          {/* Theme Toggle */}
          <IconButton
            onClick={toggleMode}
            sx={{ color: mode === 'dark' ? '#E6E6F0' : '#333333' }}
            aria-label="toggle theme"
          >
            {mode === 'dark' ? <Brightness7 /> : <Brightness4 />}
          </IconButton>
          
          <Box sx={{ textAlign: 'right', display: { xs: 'none', sm: 'block' } }}>
            <Typography variant="body2" sx={{ color: mode === 'dark' ? '#E6E6F0' : '#333333', fontWeight: 500, fontSize: { sm: '0.875rem', md: '1rem' } }}>
              Hi, {user.name}
            </Typography>
            <Typography variant="caption" sx={{ color: mode === 'dark' ? 'rgba(230,230,240,0.7)' : 'rgba(0,0,0,0.6)', fontSize: { sm: '0.75rem', md: '0.875rem' } }}>
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
            sx={{ color: mode === 'dark' ? '#E6E6F0' : '#333333' }}
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
                bgcolor: mode === 'dark' ? '#111111' : '#FFFFFF',
                border: mode === 'dark' 
                  ? '1px solid rgba(239, 114, 31, 0.2)' 
                  : '1px solid rgba(0,0,0,0.12)',
                color: mode === 'dark' ? '#FFFFFF' : '#1A1A1A',
              },
              '& .MuiMenuItem-root:hover': {
                bgcolor: mode === 'dark' ? 'rgba(239, 114, 31, 0.1)' : 'rgba(0,0,0,0.04)',
              }
            }}
          >
            <MenuItem onClick={handleLogout}>
              <Logout sx={{ mr: 1, color: mode === 'dark' ? '#E6E6F0' : '#333333' }} />
              Logout
            </MenuItem>
          </Menu>
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default AppBanner;
