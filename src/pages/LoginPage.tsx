import React, { useState } from 'react';
import {
  Container,
  Paper,
  TextField,
  Button,
  Typography,
  Box,
  Alert,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  InputAdornment,
  Divider,
} from '@mui/material';
import { Email, Lock, Visibility, VisibilityOff } from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { useTheme as useThemeContext } from '../contexts/ThemeContext';
import { useNavigate } from 'react-router-dom';
import { mockUsers } from '../data/constants';
import { useTheme } from '@mui/material/styles';

const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const { login, isLoading } = useAuth();
  const { mode } = useThemeContext();
  const theme = useTheme();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('Please enter both email and password');
      return;
    }

    const success = await login(email, password);
    if (success) {
      navigate('/dashboard');
    } else {
      setError('Invalid email or password');
    }
  };

  const handleDemoLogin = (userEmail: string) => {
    setEmail(userEmail);
    setPassword('password123');
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: mode === 'dark' ? '#000000' : '#F8F9FA', // Using --background-primary from CSS
        position: 'relative',
        overflow: 'hidden',
        '&:before': {
          content: '""',
          position: 'absolute',
          inset: 0,
          backgroundImage: 'none',
          filter: 'blur(40px)',
          pointerEvents: 'none',
        },
        '&:after': {
          content: '""',
          position: 'absolute',
          inset: 0,
          backgroundImage: 'none',
          backgroundSize: '18px 18px',
          opacity: 0.3,
          pointerEvents: 'none',
        },
      }}
    >
      <Container maxWidth="sm" sx={{ position: 'relative', zIndex: 1, px: { xs: 2, sm: 3 } }}>
        <Paper
          elevation={0}
          sx={{
            p: { xs: 2, sm: 3, md: 4 },
            width: '100%',
            bgcolor: mode === 'dark' ? 'rgba(19,19,28,0.85)' : 'rgba(255,255,255,0.95)',
            border: `2px solid ${mode === 'dark' ? 'rgba(239, 114, 31,0.3)' : 'rgba(239, 114, 31,0.2)'}`,
            borderRadius: { xs: 2, sm: 3 },
            backdropFilter: 'blur(6px)',
            color: mode === 'dark' ? '#E6E6F0' : '#333333',
            boxShadow: mode === 'dark' ? '0 8px 32px rgba(239, 114, 31,0.15)' : '0 8px 32px rgba(239, 114, 31,0.1)',
          }}
        >
          <Box sx={{ textAlign: 'center', mb: { xs: 2, sm: 3 } }}>
            <Box
              component="img"
              src="/images/HRV%20ai.png"
              alt="Company Logo"
              sx={{ width: { xs: 200, sm: 250, md: 300 }, height: 'auto', mb: 1, mx: 'auto', display: 'block' }}
            />
            <Typography variant="body1" sx={{ color: mode === 'dark' ? 'rgba(230,230,240,0.75)' : 'rgba(0,0,0,0.6)' }}>
              The AI For You
            </Typography>
          </Box>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <form onSubmit={handleSubmit}>
            <TextField
              fullWidth
              label="Email Address"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              margin="normal"
              required
              disabled={isLoading}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Email sx={{ color: mode === 'dark' ? '#EF721F' : '#EF721F' }} />
                  </InputAdornment>
                ),
              }}
              sx={{
                '& .MuiInputLabel-root': { color: mode === 'dark' ? '#FFFFFF' : '#333333' },
                '& .MuiInputLabel-root.Mui-focused': { color: '#EF721F' },
                '& .MuiInputBase-input': { color: mode === 'dark' ? '#E6E6F0' : '#333333' },
                '& .MuiOutlinedInput-notchedOutline': { borderColor: mode === 'dark' ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.23)' },
                '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: mode === 'dark' ? 'rgba(255,255,255,0.3)' : 'rgba(239, 114, 31,0.5)' },
                '& .Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#EF721F' },
              }}
            />
            <TextField
              fullWidth
              label="Password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              margin="normal"
              required
              disabled={isLoading}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Lock sx={{ color: mode === 'dark' ? '#EF721F' : '#EF721F' }} />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <Button
                      onClick={() => setShowPassword(!showPassword)}
                      size="small"
                      sx={{ minWidth: 0, color: mode === 'dark' ? '#EF721F' : '#EF721F' }}
                      tabIndex={-1}
                    >
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </Button>
                  </InputAdornment>
                ),
              }}
              sx={{
                '& .MuiInputLabel-root': { color: mode === 'dark' ? '#FFFFFF' : '#333333' },
                '& .MuiInputLabel-root.Mui-focused': { color: '#EF721F' },
                '& .MuiInputBase-input': { color: mode === 'dark' ? '#E6E6F0' : '#333333' },
                '& .MuiOutlinedInput-notchedOutline': { borderColor: mode === 'dark' ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.23)' },
                '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: mode === 'dark' ? 'rgba(255,255,255,0.3)' : 'rgba(239, 114, 31,0.5)' },
                '& .Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#EF721F' },
              }}
            />
            <Button
              type="submit"
              fullWidth
              variant="contained"
              sx={{
                mt: 3,
                mb: 2,
                bgcolor: '#EF721F',
                '&:hover': { bgcolor: '#F26522' },
                color: '#FFFFFF',
                py: 1.2,
                fontWeight: 600,
                textTransform: 'none',
                fontSize: '1rem',
              }}
              disabled={isLoading}
            >
              {isLoading ? <CircularProgress size={24} sx={{ color: '#FFFFFF' }} /> : 'Sign In'}
            </Button>
          </form>

          <Divider sx={{ my: 2, borderColor: mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.12)' }}>OR</Divider>

          <Box sx={{ mt: 2 }}>
            <Typography variant="h6" gutterBottom>
              Demo Accounts
            </Typography>
            <Typography variant="body2" sx={{ color: mode === 'dark' ? 'rgba(230,230,240,0.7)' : 'rgba(0,0,0,0.7)', mb: 2 }}>
              Click any role to auto-fill credentials (password: password123)
            </Typography>
            
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {mockUsers.map((user) => (
                <Button
                  key={user.userId}
                  variant="outlined"
                  size="small"
                  onClick={() => handleDemoLogin(user.email)}
                  disabled={isLoading}
                  sx={{
                    justifyContent: 'flex-start',
                    textAlign: 'left',
                    color: mode === 'dark' ? '#E6E6F0' : '#333333',
                    borderColor: mode === 'dark' ? 'rgba(239, 114, 31,0.4)' : 'rgba(239, 114, 31,0.3)',
                    '&:hover': { 
                      borderColor: 'rgba(239, 114, 31,0.7)', 
                      backgroundColor: mode === 'dark' ? 'rgba(239, 114, 31,0.08)' : 'rgba(239, 114, 31,0.05)'
                    },
                  }}
                >
                  <Box>
                    <Typography variant="body2" fontWeight="bold">
                      {user.name}
                    </Typography>
                    <Typography variant="caption" sx={{ color: mode === 'dark' ? 'rgba(230,230,240,0.7)' : 'rgba(0,0,0,0.6)' }}>
                      {user.role} - {user.email}
                    </Typography>
                  </Box>
                </Button>
              ))}
            </Box>
          </Box>
          <Box sx={{ mt: 4, textAlign: 'center', color: mode === 'dark' ? 'rgba(230,230,240,0.5)' : 'rgba(0,0,0,0.5)' }}>
            <Typography variant="caption">
              By signing in, you agree to our Terms of Service and Privacy Policy. All pharmaceutical data is handled in compliance with FDA regulations.
            </Typography>
          </Box>
        </Paper>
      </Container>
    </Box>
  );
};

export default LoginPage;
