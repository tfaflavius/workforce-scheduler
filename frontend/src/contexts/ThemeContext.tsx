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
    document.documentElement.setAttribute('data-theme', mode);
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.setAttribute('content', mode === 'light' ? '#111827' : '#0f172a');
    }
  }, [mode]);

  const toggleTheme = () => {
    setMode((prevMode) => (prevMode === 'light' ? 'dark' : 'light'));
  };

  const theme = useMemo(
    () =>
      createTheme({
        breakpoints: {
          values: {
            xs: 0,
            sm: 430,
            md: 768,
            lg: 1024,
            xl: 1440,
          },
        },
        palette: {
          mode: 'dark',
          primary: {
            main: '#3b82f6',
            light: '#60a5fa',
            dark: '#1d4ed8',
          },
          secondary: {
            main: '#64748b',
            light: '#94a3b8',
            dark: '#475569',
          },
          success: {
            main: '#059669',
            light: '#10b981',
            dark: '#047857',
          },
          warning: {
            main: '#d97706',
            light: '#f59e0b',
            dark: '#b45309',
          },
          error: {
            main: '#dc2626',
            light: '#ef4444',
            dark: '#b91c1c',
          },
          info: {
            main: '#0891b2',
            light: '#06b6d4',
            dark: '#155e75',
          },
          background: {
            default: mode === 'light' ? '#111827' : '#0f172a',
            paper: mode === 'light' ? '#1f2937' : '#1e293b',
          },
          text: {
            primary: '#f1f5f9',
            secondary: '#94a3b8',
          },
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
          MuiBackdrop: {
            styleOverrides: {
              root: {
                backdropFilter: 'blur(4px)',
                backgroundColor: 'rgba(0, 0, 0, 0.6)',
              },
            },
          },
          MuiCssBaseline: {
            styleOverrides: {
              '*': {
                boxSizing: 'border-box',
              },
              html: {
                scrollBehavior: 'smooth',
                overflowX: 'clip',
              },
              body: {
                paddingLeft: 'env(safe-area-inset-left)',
                paddingRight: 'env(safe-area-inset-right)',
                WebkitOverflowScrolling: 'touch',
                overscrollBehaviorY: 'auto',
              },
            },
          },
          MuiButton: {
            styleOverrides: {
              root: {
                borderRadius: 10,
                padding: '10px 20px',
                fontSize: 'clamp(0.813rem, 1.5vw, 0.938rem)',
                minHeight: 44,
                transition: 'transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out',
                '&:hover': {
                  transform: 'translateY(-1px)',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.25)',
                },
                '&:active': {
                  transform: 'scale(0.98)',
                },
              },
              contained: {
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
                '&.MuiButton-containedPrimary': {
                  backgroundImage: 'linear-gradient(135deg, #1d4ed8 0%, #1e40af 100%)',
                },
                '&.MuiButton-containedSecondary': {
                  backgroundImage: 'linear-gradient(135deg, #475569 0%, #334155 100%)',
                },
                '&.MuiButton-containedSuccess': {
                  backgroundImage: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
                },
                '&.MuiButton-containedError': {
                  backgroundImage: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)',
                },
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
          MuiTypography: {
            styleOverrides: {
              root: {
                overflowWrap: 'anywhere' as const,
                wordBreak: 'break-word' as const,
              },
            },
          },
          MuiCardContent: {
            styleOverrides: {
              root: {
                overflow: 'hidden',
                '&:last-child': {
                  paddingBottom: undefined,
                },
              },
            },
          },
          MuiCard: {
            styleOverrides: {
              root: {
                borderRadius: 16,
                overflow: 'hidden',
                maxWidth: '100%',
                contain: 'content',
                border: '1px solid rgba(255, 255, 255, 0.06)',
                boxShadow: '0 1px 2px rgba(0, 0, 0, 0.2), 0 2px 8px rgba(0, 0, 0, 0.15)',
                transition: 'transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out',
                backgroundColor: 'rgba(30, 41, 59, 0.85)',
                '&[role="button"], &:has(.MuiCardActionArea-root)': {
                  cursor: 'pointer',
                  '&:hover': {
                    transform: 'translateY(-2px)',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.35), 0 8px 24px rgba(0, 0, 0, 0.25)',
                  },
                },
              },
            },
          },
          MuiPaper: {
            styleOverrides: {
              root: {
                borderRadius: 12,
                maxWidth: '100%',
                backgroundImage: 'linear-gradient(145deg, rgba(30, 41, 59, 0.9) 0%, rgba(15, 23, 42, 0.95) 100%)',
              },
              elevation0: {
                border: '1px solid rgba(255, 255, 255, 0.06)',
              },
              elevation1: {
                border: '1px solid rgba(255, 255, 255, 0.05)',
                boxShadow: '0 1px 2px rgba(0, 0, 0, 0.25), 0 2px 8px rgba(0, 0, 0, 0.15)',
              },
            },
          },
          MuiChip: {
            styleOverrides: {
              root: {
                borderRadius: 8,
                fontWeight: 500,
                maxWidth: '100%',
                border: '1px solid rgba(255, 255, 255, 0.08)',
              },
            },
          },
          MuiTextField: {
            styleOverrides: {
              root: {
                '& .MuiOutlinedInput-root': {
                  borderRadius: 10,
                  backgroundColor: 'rgba(255, 255, 255, 0.03)',
                  transition: 'background-color 0.2s ease, box-shadow 0.2s ease',
                  '&:hover': {
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.12)',
                  },
                  '&.Mui-focused': {
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    boxShadow: '0 0 0 3px rgba(59, 130, 246, 0.15), 0 4px 12px rgba(59, 130, 246, 0.1)',
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
                borderRadius: 16,
                padding: '4px',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                boxShadow: '0 24px 48px rgba(0, 0, 0, 0.5), 0 8px 16px rgba(0, 0, 0, 0.3)',
              },
            },
          },
          MuiTableCell: {
            styleOverrides: {
              root: {
                padding: 'clamp(8px, 1.5vw, 16px)',
                fontSize: 'clamp(0.8rem, 1.5vw, 0.875rem)',
                overflowWrap: 'break-word' as const,
                minHeight: 48,
              },
              sizeSmall: {
                padding: 'clamp(6px, 1vw, 10px)',
              },
              head: {
                fontWeight: 600,
                backgroundColor: '#334155',
                backgroundImage: 'linear-gradient(180deg, #3b4252 0%, #334155 100%)',
                borderBottom: '2px solid #475569',
              },
            },
          },
          MuiTableRow: {
            styleOverrides: {
              root: {
                contain: 'layout style',
                transition: 'background-color 0.15s ease',
                '&:nth-of-type(even)': {
                  backgroundColor: 'rgba(255, 255, 255, 0.015)',
                },
                '&:hover': {
                  backgroundColor: '#1e293b',
                },
                '&:active': {
                  backgroundColor: 'rgba(96, 165, 250, 0.06)',
                },
                WebkitTapHighlightColor: 'transparent',
              },
            },
          },
          MuiTab: {
            styleOverrides: {
              root: {
                textTransform: 'none',
                fontWeight: 500,
                fontSize: 'clamp(0.8rem, 1.5vw, 0.938rem)',
                minHeight: 44,
                padding: 'clamp(6px, 1vw, 12px) clamp(8px, 1.5vw, 24px)',
                transition: 'color 0.2s ease, background-color 0.2s ease',
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
                backgroundImage: 'linear-gradient(90deg, #3b82f6 0%, #1d4ed8 100%)',
              },
            },
          },
          MuiIconButton: {
            styleOverrides: {
              root: {
                minWidth: 44,
                minHeight: 44,
                transition: 'transform 0.2s ease, background-color 0.2s ease',
                '&:hover': {
                  transform: 'scale(1.1)',
                  backgroundColor: 'rgba(255, 255, 255, 0.08)',
                },
              },
              sizeSmall: {
                minWidth: 36,
                minHeight: 36,
              },
            },
          },
          MuiAlert: {
            styleOverrides: {
              root: {
                borderRadius: 12,
                borderLeft: '4px solid',
              },
            },
          },
          MuiTooltip: {
            styleOverrides: {
              tooltip: {
                borderRadius: 10,
                fontSize: '0.813rem',
                padding: '8px 14px',
                backgroundColor: '#334155',
                boxShadow: '0 4px 16px rgba(0, 0, 0, 0.25)',
                border: '1px solid rgba(255, 255, 255, 0.06)',
              },
              arrow: {
                color: 'rgba(30, 41, 59, 0.95)',
              },
            },
          },
          MuiMenuItem: {
            styleOverrides: {
              root: {
                minHeight: 44,
                fontSize: 'clamp(0.85rem, 1.5vw, 0.938rem)',
              },
            },
          },
          MuiMenu: {
            styleOverrides: {
              paper: {
                borderRadius: 12,
                border: '1px solid rgba(255, 255, 255, 0.08)',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4), 0 2px 8px rgba(0, 0, 0, 0.2)',
                backgroundColor: 'rgba(30, 41, 59, 0.95)',
              },
            },
          },
          MuiListItemButton: {
            styleOverrides: {
              root: {
                minHeight: 44,
                WebkitTapHighlightColor: 'transparent',
              },
            },
          },
          MuiDrawer: {
            styleOverrides: {
              paper: {
                borderRight: 'none',
                boxShadow: '2px 0 12px rgba(0, 0, 0, 0.3)',
              },
            },
          },
          MuiAppBar: {
            styleOverrides: {
              root: {
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.3)',
              },
            },
          },
          MuiFab: {
            styleOverrides: {
              root: {
                boxShadow: '0 4px 14px rgba(0, 0, 0, 0.3)',
                transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                '&:hover': {
                  transform: 'scale(1.05)',
                  boxShadow: '0 6px 20px rgba(0, 0, 0, 0.35)',
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
