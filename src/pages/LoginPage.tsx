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
import { useNavigate } from 'react-router-dom';
import { mockUsers } from '../data/constants';

const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const { login, isLoading } = useAuth();
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
        bgcolor: '#0B0B10',
        position: 'relative',
        overflow: 'hidden',
        '&:before': {
          content: '""',
          position: 'absolute',
          inset: 0,
          backgroundImage:
            'radial-gradient(circle at 20% 30%, rgba(66, 66, 255, 0.15) 0, transparent 35%), radial-gradient(circle at 80% 70%, rgba(130, 0, 255, 0.1) 0, transparent 40%), radial-gradient(circle at 50% 110%, rgba(99, 102, 241, 0.18) 0, transparent 35%)',
          filter: 'blur(40px)',
          pointerEvents: 'none',
        },
        '&:after': {
          content: '""',
          position: 'absolute',
          inset: 0,
          backgroundImage: 'radial-gradient(rgba(120, 120, 200, 0.15) 1px, transparent 1px)',
          backgroundSize: '18px 18px',
          opacity: 0.3,
          pointerEvents: 'none',
        },
      }}
    >
      <Container maxWidth="sm" sx={{ position: 'relative', zIndex: 1 }}>
        <Paper
          elevation={0}
          sx={{
            p: 4,
            width: '100%',
            bgcolor: 'rgba(19,19,28,0.85)',
            border: '1px solid rgba(99,102,241,0.25)',
            borderRadius: 3,
            backdropFilter: 'blur(6px)',
            color: '#E6E6F0',
          }}
        >
          <Box sx={{ textAlign: 'center', mb: 3 }}>
            <Box
              component="img"
              src="/images/hrv-logo.png"
              alt="Company Logo"
              sx={{ width: 160, height: 'auto', mb: 1, mx: 'auto', display: 'block' }}
            />
            <Typography variant="body1" sx={{ color: 'rgba(230,230,240,0.75)' }}>
              Log in to access PharmaSource Pro - Pharmaceutical Sourcing Platform
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
                    <Email sx={{ color: '#6B7280' }} />
                  </InputAdornment>
                ),
              }}
              sx={{
                '& .MuiInputLabel-root': { color: '#FFFFFF' },
                '& .MuiInputLabel-root.Mui-focused': { color: '#FFFFFF' },
                '& .MuiInputBase-input': { color: '#E6E6F0' },
                '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.15)' },
                '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.3)' },
                '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#7C4DFF' },
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
                    <Lock sx={{ color: '#6B7280' }} />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <Button
                      onClick={() => setShowPassword(!showPassword)}
                      size="small"
                      sx={{ minWidth: 0, color: '#6B7280' }}
                      tabIndex={-1}
                    >
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </Button>
                  </InputAdornment>
                ),
              }}
              sx={{
                '& .MuiInputLabel-root': { color: '#FFFFFF' },
                '& .MuiInputLabel-root.Mui-focused': { color: '#FFFFFF' },
                '& .MuiInputBase-input': { color: '#E6E6F0' },
                '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.15)' },
                '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.3)' },
                '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#7C4DFF' },
              }}
            />
            <Button
              type="submit"
              fullWidth
              variant="contained"
              sx={{
                mt: 3,
                mb: 2,
                bgcolor: '#6E56CF',
                '&:hover': { bgcolor: '#5b45c1' },
                py: 1.2,
                fontWeight: 600,
              }}
              disabled={isLoading}
            >
              {isLoading ? <CircularProgress size={24} /> : 'Sign In'}
            </Button>
          </form>

          <Divider sx={{ my: 2, borderColor: 'rgba(255,255,255,0.08)' }}>OR</Divider>

          <Box sx={{ mt: 2 }}>
            <Typography variant="h6" gutterBottom>
              Demo Accounts
            </Typography>
            <Typography variant="body2" sx={{ color: 'rgba(230,230,240,0.7)', mb: 2 }}>
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
                    color: '#E6E6F0',
                    borderColor: 'rgba(124,77,255,0.4)',
                    '&:hover': { borderColor: 'rgba(124,77,255,0.7)', backgroundColor: 'rgba(124,77,255,0.08)' },
                  }}
                >
                  <Box>
                    <Typography variant="body2" fontWeight="bold">
                      {user.name}
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'rgba(230,230,240,0.7)' }}>
                      {user.role} - {user.email}
                    </Typography>
                  </Box>
                </Button>
              ))}
            </Box>
          </Box>
          <Box sx={{ mt: 4, textAlign: 'center', color: 'rgba(230,230,240,0.5)' }}>
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
