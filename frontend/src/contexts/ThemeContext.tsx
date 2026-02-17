import React, { createContext, useContext, useState, useMemo, useEffect } from 'react';
import { ThemeProvider as MuiThemeProvider, createTheme, CssBaseline } from '@mui/material';

type ThemeMode = 'light' | 'dark';

interface ThemeContextType {
  mode: ThemeMode;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useThemeMode = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useThemeMode must be used within a ThemeProvider');
  }
  return context;
};

interface ThemeProviderProps {
  children: React.ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const [mode, setMode] = useState<ThemeMode>(() => {
    const savedMode = localStorage.getItem('themeMode');
    return (savedMode as ThemeMode) || 'light';
  });

  useEffect(() => {
    localStorage.setItem('themeMode', mode);
  }, [mode]);

  const toggleTheme = () => {
    setMode((prevMode) => (prevMode === 'light' ? 'dark' : 'light'));
  };

  const theme = useMemo(
    () =>
      createTheme({
        // Custom breakpoints for modern devices
        // iPhone 17 Pro: 393px, Pro Max: 430px
        // Galaxy S25: 412px, S25 Ultra: 480px
        // Tablets: 768px-1024px
        breakpoints: {
          values: {
            xs: 0,      // Extra small phones
            sm: 430,    // Small phones (iPhone Pro Max, Galaxy S25)
            md: 768,    // Tablets
            lg: 1024,   // Small laptops/large tablets
            xl: 1440,   // Desktops
          },
        },
        palette: {
          mode,
          primary: {
            main: '#2563eb',
            light: '#60a5fa',
            dark: '#1d4ed8',
          },
          secondary: {
            main: '#7c3aed',
            light: '#a78bfa',
            dark: '#5b21b6',
          },
          success: {
            main: '#10b981',
            light: '#34d399',
            dark: '#059669',
          },
          warning: {
            main: '#f59e0b',
            light: '#fbbf24',
            dark: '#d97706',
          },
          error: {
            main: '#ef4444',
            light: '#f87171',
            dark: '#dc2626',
          },
          info: {
            main: '#06b6d4',
            light: '#22d3ee',
            dark: '#0891b2',
          },
          ...(mode === 'light' ? {
            background: {
              default: '#f8fafc',
              paper: '#ffffff',
            },
            text: {
              primary: '#1e293b',
              secondary: '#64748b',
            },
          } : {
            background: {
              default: '#0f172a',
              paper: '#1e293b',
            },
            text: {
              primary: '#f1f5f9',
              secondary: '#94a3b8',
            },
          }),
        },
        typography: {
          fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
          h1: {
            fontSize: 'clamp(1.75rem, 5vw, 2.5rem)',
            fontWeight: 700,
            letterSpacing: '-0.02em',
          },
          h2: {
            fontSize: 'clamp(1.5rem, 4vw, 2rem)',
            fontWeight: 600,
            letterSpacing: '-0.01em',
          },
          h3: {
            fontSize: 'clamp(1.25rem, 3vw, 1.75rem)',
            fontWeight: 600,
          },
          h4: {
            fontSize: 'clamp(1.125rem, 2.5vw, 1.5rem)',
            fontWeight: 600,
          },
          h5: {
            fontSize: 'clamp(1rem, 2vw, 1.25rem)',
            fontWeight: 600,
          },
          h6: {
            fontSize: 'clamp(0.875rem, 1.5vw, 1rem)',
            fontWeight: 600,
          },
          body1: {
            fontSize: 'clamp(0.875rem, 1.5vw, 1rem)',
            lineHeight: 1.6,
          },
          body2: {
            fontSize: 'clamp(0.75rem, 1.25vw, 0.875rem)',
            lineHeight: 1.5,
          },
          button: {
            textTransform: 'none',
            fontWeight: 600,
          },
        },
        shape: {
          borderRadius: 12,
        },
        components: {
          MuiCssBaseline: {
            styleOverrides: {
              '*': {
                boxSizing: 'border-box',
              },
              html: {
                scrollBehavior: 'smooth',
              },
              body: {
                overflowX: 'hidden',
                // Safe area insets for phones with notch (iPhone, etc.)
                paddingTop: 'env(safe-area-inset-top)',
                paddingBottom: 'env(safe-area-inset-bottom)',
                paddingLeft: 'env(safe-area-inset-left)',
                paddingRight: 'env(safe-area-inset-right)',
              },
            },
          },
          MuiButton: {
            styleOverrides: {
              root: {
                borderRadius: 10,
                padding: '10px 20px',
                fontSize: 'clamp(0.813rem, 1.5vw, 0.938rem)',
                transition: 'all 0.2s ease-in-out',
                '&:hover': {
                  transform: 'translateY(-1px)',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                },
                '&:active': {
                  transform: 'translateY(0)',
                },
              },
              contained: {
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
              },
              sizeSmall: {
                padding: '6px 14px',
                fontSize: '0.813rem',
              },
              sizeLarge: {
                padding: '14px 28px',
                fontSize: '1rem',
              },
            },
          },
          MuiCard: {
            styleOverrides: {
              root: {
                borderRadius: 16,
                boxShadow: mode === 'light'
                  ? '0 1px 3px rgba(0, 0, 0, 0.08), 0 4px 12px rgba(0, 0, 0, 0.05)'
                  : '0 1px 3px rgba(0, 0, 0, 0.3), 0 4px 12px rgba(0, 0, 0, 0.2)',
                transition: 'all 0.3s ease-in-out',
                '&:hover': {
                  transform: 'translateY(-2px)',
                  boxShadow: mode === 'light'
                    ? '0 4px 12px rgba(0, 0, 0, 0.1), 0 8px 24px rgba(0, 0, 0, 0.08)'
                    : '0 4px 12px rgba(0, 0, 0, 0.4), 0 8px 24px rgba(0, 0, 0, 0.3)',
                },
              },
            },
          },
          MuiPaper: {
            styleOverrides: {
              root: {
                borderRadius: 12,
                backgroundImage: 'none',
              },
              elevation1: {
                boxShadow: mode === 'light'
                  ? '0 1px 3px rgba(0, 0, 0, 0.08), 0 2px 8px rgba(0, 0, 0, 0.04)'
                  : '0 1px 3px rgba(0, 0, 0, 0.3), 0 2px 8px rgba(0, 0, 0, 0.2)',
              },
            },
          },
          MuiChip: {
            styleOverrides: {
              root: {
                borderRadius: 8,
                fontWeight: 500,
                transition: 'all 0.2s ease',
                '&:hover': {
                  transform: 'scale(1.02)',
                },
              },
            },
          },
          MuiTextField: {
            styleOverrides: {
              root: {
                '& .MuiOutlinedInput-root': {
                  borderRadius: 10,
                  transition: 'all 0.2s ease',
                  '&:hover': {
                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
                  },
                  '&.Mui-focused': {
                    boxShadow: '0 2px 12px rgba(37, 99, 235, 0.15)',
                  },
                },
              },
            },
          },
          MuiSelect: {
            styleOverrides: {
              root: {
                borderRadius: 10,
              },
            },
          },
          MuiDialog: {
            styleOverrides: {
              paper: {
                borderRadius: 20,
                padding: '8px',
              },
            },
          },
          MuiTableCell: {
            styleOverrides: {
              root: {
                padding: 'clamp(8px, 2vw, 16px)',
                fontSize: 'clamp(0.75rem, 1.5vw, 0.875rem)',
              },
              head: {
                fontWeight: 600,
                backgroundColor: mode === 'light' ? '#f1f5f9' : '#334155',
              },
            },
          },
          MuiTableRow: {
            styleOverrides: {
              root: {
                transition: 'background-color 0.2s ease',
                '&:hover': {
                  backgroundColor: mode === 'light' ? '#f8fafc' : '#1e293b',
                },
              },
            },
          },
          MuiTab: {
            styleOverrides: {
              root: {
                textTransform: 'none',
                fontWeight: 500,
                fontSize: 'clamp(0.75rem, 1.5vw, 0.938rem)',
                minHeight: 48,
                padding: 'clamp(6px, 1.5vw, 12px) clamp(12px, 2vw, 24px)',
                transition: 'all 0.2s ease',
                '&.Mui-selected': {
                  fontWeight: 600,
                },
              },
            },
          },
          MuiTabs: {
            styleOverrides: {
              indicator: {
                height: 3,
                borderRadius: '3px 3px 0 0',
              },
            },
          },
          MuiIconButton: {
            styleOverrides: {
              root: {
                transition: 'all 0.2s ease',
                '&:hover': {
                  transform: 'scale(1.1)',
                  backgroundColor: mode === 'light' ? 'rgba(0, 0, 0, 0.04)' : 'rgba(255, 255, 255, 0.08)',
                },
              },
            },
          },
          MuiAlert: {
            styleOverrides: {
              root: {
                borderRadius: 12,
              },
            },
          },
          MuiTooltip: {
            styleOverrides: {
              tooltip: {
                borderRadius: 8,
                fontSize: '0.813rem',
                padding: '8px 12px',
              },
            },
          },
          MuiDrawer: {
            styleOverrides: {
              paper: {
                borderRight: 'none',
                boxShadow: mode === 'light'
                  ? '2px 0 12px rgba(0, 0, 0, 0.08)'
                  : '2px 0 12px rgba(0, 0, 0, 0.3)',
              },
            },
          },
          MuiAppBar: {
            styleOverrides: {
              root: {
                boxShadow: mode === 'light'
                  ? '0 1px 3px rgba(0, 0, 0, 0.08)'
                  : '0 1px 3px rgba(0, 0, 0, 0.3)',
              },
            },
          },
          MuiFab: {
            styleOverrides: {
              root: {
                boxShadow: '0 4px 14px rgba(0, 0, 0, 0.2)',
                transition: 'all 0.3s ease',
                '&:hover': {
                  transform: 'scale(1.05)',
                  boxShadow: '0 6px 20px rgba(0, 0, 0, 0.25)',
                },
              },
            },
          },
        },
      }),
    [mode]
  );

  const value = useMemo(() => ({ mode, toggleTheme }), [mode]);

  return (
    <ThemeContext.Provider value={value}>
      <MuiThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </MuiThemeProvider>
    </ThemeContext.Provider>
  );
};
