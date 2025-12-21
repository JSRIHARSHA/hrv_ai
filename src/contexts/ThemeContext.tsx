import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { ThemeProvider as MUIThemeProvider, createTheme, Theme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';

type ThemeMode = 'light' | 'dark';

interface ThemeContextType {
  mode: ThemeMode;
  toggleMode: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

interface ThemeProviderProps {
  children: ReactNode;
}

const lightThemeColors = {
  primary: '#EF721F', // HRV Orange
  secondary: '#FFAE2F', // HRV Orange Light
  background: '#F8F9FA', // Background secondary
  surface: '#FFFFFF', // Background primary
  text: '#1A1A1A', // Text primary
  textSecondary: '#1e1e20', // Text secondary
  border: '#E2E8F0', // Border color
  divider: 'rgba(239, 114, 31, 0.2)', // Orange tint
  accent: '#10B981', // Emerald green
  warning: '#F59E0B', // Amber
  error: '#EF4444', // Red
  info: '#4299e1', // Info color
};

const darkThemeColors = {
  primary: '#EF721F', // HRV Orange
  secondary: '#FFAE2F', // HRV Orange Light
  background: '#000000', // Background primary
  surface: '#111111', // Background secondary
  text: '#FFFFFF', // Text primary
  textSecondary: '#f5f5f5', // Text secondary
  border: '#2a2a2a', // Border color
  divider: 'rgba(255,255,255,0.12)',
};

const getTheme = (mode: ThemeMode): Theme => {
  const colors = mode === 'light' ? lightThemeColors : darkThemeColors;

  return createTheme({
    palette: {
      mode,
      primary: {
        main: colors.primary,
        light: mode === 'light' ? '#FFAE2F' : '#FFAE2F',
        dark: mode === 'light' ? '#F26522' : '#F26522',
      },
      secondary: {
        main: colors.secondary,
        light: mode === 'light' ? '#F472B6' : '#FF6B6B',
        dark: mode === 'light' ? '#DB2777' : '#E55555',
      },
      background: {
        default: colors.background,
        paper: colors.surface,
      },
      text: {
        primary: colors.text,
        secondary: colors.textSecondary,
      },
      divider: colors.divider,
      ...(mode === 'light' && {
        success: { main: '#10B981' },
        warning: { main: '#F59E0B' },
        error: { main: '#EF4444' },
        info: { main: '#3B82F6' },
      }),
    },
    typography: {
      fontFamily: '"Montserrat", "Roboto", "Helvetica", "Arial", sans-serif',
      // Consistent heading sizes - Poppins font
      h1: {
        fontFamily: '"Poppins", "Roboto", "Helvetica", "Arial", sans-serif',
        fontSize: '2.5rem', // 40px
        fontWeight: 700,
        lineHeight: 1.2,
        letterSpacing: '-0.02em',
      },
      h2: {
        fontFamily: '"Poppins", "Roboto", "Helvetica", "Arial", sans-serif',
        fontSize: '2rem', // 32px
        fontWeight: 700,
        lineHeight: 1.3,
        letterSpacing: '-0.01em',
      },
      h3: {
        fontFamily: '"Poppins", "Roboto", "Helvetica", "Arial", sans-serif',
        fontSize: '1.75rem', // 28px
        fontWeight: 700,
        lineHeight: 1.3,
        letterSpacing: '-0.01em',
      },
      h4: {
        fontFamily: '"Poppins", "Roboto", "Helvetica", "Arial", sans-serif',
        fontSize: '1.5rem', // 24px
        fontWeight: 600,
        lineHeight: 1.4,
      },
      h5: {
        fontFamily: '"Poppins", "Roboto", "Helvetica", "Arial", sans-serif',
        fontSize: '1.25rem', // 20px
        fontWeight: 600,
        lineHeight: 1.4,
      },
      h6: {
        fontFamily: '"Poppins", "Roboto", "Helvetica", "Arial", sans-serif',
        fontSize: '1.125rem', // 18px
        fontWeight: 600,
        lineHeight: 1.5,
      },
      // Consistent body text sizes - Montserrat font
      body1: {
        fontFamily: '"Montserrat", "Roboto", "Helvetica", "Arial", sans-serif',
        fontSize: '1rem', // 16px
        fontWeight: 400,
        lineHeight: 1.5,
      },
      body2: {
        fontFamily: '"Montserrat", "Roboto", "Helvetica", "Arial", sans-serif',
        fontSize: '1rem', // 16px
        fontWeight: 400,
        lineHeight: 1.5,
      },
      // Consistent subtitle sizes - Poppins for subtitles (they're like headings)
      subtitle1: {
        fontFamily: '"Poppins", "Roboto", "Helvetica", "Arial", sans-serif',
        fontSize: '1rem', // 16px
        fontWeight: 500,
        lineHeight: 1.5,
      },
      subtitle2: {
        fontFamily: '"Poppins", "Roboto", "Helvetica", "Arial", sans-serif',
        fontSize: '1rem', // 16px
        fontWeight: 500,
        lineHeight: 1.5,
      },
      // Consistent caption size - Montserrat font
      caption: {
        fontFamily: '"Montserrat", "Roboto", "Helvetica", "Arial", sans-serif',
        fontSize: '1rem', // 16px
        fontWeight: 400,
        lineHeight: 1.4,
      },
      // Button text - Montserrat font
      button: {
        fontFamily: '"Montserrat", "Roboto", "Helvetica", "Arial", sans-serif',
        fontSize: '1rem', // 16px
        fontWeight: 600,
        textTransform: 'none',
        lineHeight: 1.5,
      },
    },
    components: {
      MuiButton: {
        styleOverrides: {
          root: {
            textTransform: 'none',
            borderRadius: '12px',
            padding: '12px 28px',
            fontWeight: 600,
            boxShadow: mode === 'light' ? '0 4px 12px rgba(239, 114, 31, 0.25)' : 'none',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            '&:hover': {
              boxShadow: mode === 'light' ? '0 6px 20px rgba(239, 114, 31, 0.35)' : '0 2px 8px rgba(239, 114, 31, 0.3)',
              transform: 'translateY(-2px)',
            },
          },
          contained: {
            background: colors.primary,
            color: '#FFFFFF',
            '&:hover': {
              background: mode === 'light' ? '#F26522' : '#F26522',
            },
          },
        },
      },
      MuiAppBar: {
        styleOverrides: {
          root: {
            backgroundColor: mode === 'light' ? '#FFFFFF' : colors.surface,
            borderBottom: `3px solid ${mode === 'light' ? colors.primary : colors.border}`,
            boxShadow: mode === 'light' ? '0 4px 20px rgba(239, 114, 31, 0.15)' : 'none',
          },
        },
      },
      MuiTextField: {
        styleOverrides: {
          root: {
            '& .MuiOutlinedInput-root': {
              borderRadius: '10px',
              '& fieldset': {
                borderWidth: '2px',
                borderColor: colors.border,
              },
              '&:hover fieldset': {
                borderColor: mode === 'light' ? colors.primary : colors.primary,
              },
              '&.Mui-focused fieldset': {
                borderColor: colors.primary,
                borderWidth: '2px',
                boxShadow: mode === 'light' ? `0 0 0 4px rgba(239, 114, 31, 0.15)` : 'none',
              },
            },
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            borderRadius: '20px',
            boxShadow: mode === 'light' 
              ? '0 8px 25px rgba(239, 114, 31, 0.12)' 
              : '0 4px 20px rgba(0,0,0,0.3)',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            border: mode === 'light' ? '1px solid rgba(239, 114, 31, 0.1)' : 'none',
            '&:hover': {
              boxShadow: mode === 'light' 
                ? '0 12px 40px rgba(239, 114, 31, 0.2)' 
                : '0 8px 30px rgba(239, 114, 31, 0.2)',
              transform: 'translateY(-4px)',
            },
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            borderRadius: '20px',
            boxShadow: mode === 'light' 
              ? '0 4px 15px rgba(239, 114, 31, 0.08)' 
              : '0 2px 12px rgba(0,0,0,0.2)',
          },
        },
      },
      MuiAccordion: {
        styleOverrides: {
          root: {
            borderRadius: '16px !important',
            border: `2px solid ${mode === 'light' ? 'rgba(239, 114, 31, 0.15)' : colors.border}`,
            boxShadow: mode === 'light' ? '0 2px 10px rgba(239, 114, 31, 0.05)' : 'none',
            '&.Mui-expanded': {
              background: mode === 'light' 
                ? 'rgba(239, 114, 31, 0.04)'
                : 'rgba(255,255,255,0.05)',
              border: `2px solid ${mode === 'light' ? 'rgba(239, 114, 31, 0.25)' : colors.border}`,
            },
          },
        },
      },
    },
  });
};

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const [mode, setMode] = useState<ThemeMode>(() => {
    const saved = localStorage.getItem('themeMode');
    return (saved === 'light' || saved === 'dark') ? saved : 'dark';
  });

  useEffect(() => {
    localStorage.setItem('themeMode', mode);
  }, [mode]);

  const toggleMode = () => {
    setMode((prevMode) => (prevMode === 'light' ? 'dark' : 'light'));
  };

  const theme = getTheme(mode);

  return (
    <ThemeContext.Provider value={{ mode, toggleMode }}>
      <MUIThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </MUIThemeProvider>
    </ThemeContext.Provider>
  );
};

