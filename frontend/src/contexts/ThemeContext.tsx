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
      metaThemeColor.setAttribute('content', mode === 'light' ? '#1e293b' : '#111827');
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
            main: '#94a3b8',
            light: '#cbd5e1',
            dark: '#64748b',
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
          background: {
            // Page bg: medium-dark, warm slate for "light" mode; deeper navy for "dark"
            default: mode === 'light' ? '#1e293b' : '#0f172a',
            // Card/paper bg: clearly lighter than page so cards stand out
            paper: mode === 'light' ? '#334155' : '#1e293b',
          },
          text: {
            primary: '#f8fafc',
            // Brighter secondary for better readability
            secondary: '#cbd5e1',
          },
          divider: 'rgba(255, 255, 255, 0.14)',
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
                backgroundColor: 'rgba(0, 0, 0, 0.55)',
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
                  backgroundImage: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                },
                '&.MuiButton-containedSecondary': {
                  backgroundImage: 'linear-gradient(135deg, #64748b 0%, #475569 100%)',
                },
                '&.MuiButton-containedSuccess': {
                  backgroundImage: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
                },
                '&.MuiButton-containedError': {
                  backgroundImage: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)',
                },
              },
              outlined: {
                borderColor: 'rgba(255, 255, 255, 0.18)',
                '&:hover': {
                  borderColor: 'rgba(255, 255, 255, 0.32)',
                  backgroundColor: 'rgba(255, 255, 255, 0.04)',
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
                border: '1px solid rgba(255, 255, 255, 0.10)',
                boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2), 0 4px 12px rgba(0, 0, 0, 0.18)',
                transition: 'transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out',
                // Solid lighter card surface for clear contrast against page bg
                backgroundColor: mode === 'light' ? '#334155' : '#1e293b',
                backgroundImage: 'none',
                '&[role="button"], &:has(.MuiCardActionArea-root)': {
                  cursor: 'pointer',
                  '&:hover': {
                    transform: 'translateY(-2px)',
                    boxShadow: '0 6px 16px rgba(0, 0, 0, 0.35), 0 10px 28px rgba(0, 0, 0, 0.25)',
                    borderColor: 'rgba(255, 255, 255, 0.16)',
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
                backgroundImage: 'none',
                backgroundColor: mode === 'light' ? '#334155' : '#1e293b',
              },
              elevation0: {
                border: '1px solid rgba(255, 255, 255, 0.08)',
              },
              elevation1: {
                border: '1px solid rgba(255, 255, 255, 0.08)',
                boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2), 0 4px 12px rgba(0, 0, 0, 0.15)',
              },
            },
          },
          MuiChip: {
            styleOverrides: {
              root: {
                borderRadius: 8,
                fontWeight: 500,
                maxWidth: '100%',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                backgroundColor: 'rgba(255, 255, 255, 0.06)',
              },
              outlined: {
                borderColor: 'rgba(255, 255, 255, 0.18)',
              },
            },
          },
          MuiTextField: {
            styleOverrides: {
              root: {
                '& .MuiOutlinedInput-root': {
                  borderRadius: 10,
                  // Clearly visible input surface against card bg
                  backgroundColor: 'rgba(15, 23, 42, 0.5)',
                  transition: 'background-color 0.2s ease, box-shadow 0.2s ease',
                  '& .MuiOutlinedInput-notchedOutline': {
                    borderColor: 'rgba(255, 255, 255, 0.18)',
                  },
                  '&:hover': {
                    backgroundColor: 'rgba(15, 23, 42, 0.65)',
                    '& .MuiOutlinedInput-notchedOutline': {
                      borderColor: 'rgba(255, 255, 255, 0.28)',
                    },
                  },
                  '&.Mui-focused': {
                    backgroundColor: 'rgba(15, 23, 42, 0.7)',
                    boxShadow: '0 0 0 3px rgba(59, 130, 246, 0.18), 0 4px 12px rgba(59, 130, 246, 0.12)',
                  },
                },
              },
            },
          },
          MuiOutlinedInput: {
            styleOverrides: {
              root: {
                backgroundColor: 'rgba(15, 23, 42, 0.5)',
                '& .MuiOutlinedInput-notchedOutline': {
                  borderColor: 'rgba(255, 255, 255, 0.18)',
                },
                '&:hover .MuiOutlinedInput-notchedOutline': {
                  borderColor: 'rgba(255, 255, 255, 0.28)',
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
                border: '1px solid rgba(255, 255, 255, 0.10)',
                boxShadow: '0 24px 48px rgba(0, 0, 0, 0.5), 0 8px 16px rgba(0, 0, 0, 0.3)',
                backgroundColor: mode === 'light' ? '#334155' : '#1e293b',
                backgroundImage: 'none',
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
                borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
              },
              sizeSmall: {
                padding: 'clamp(6px, 1vw, 10px)',
              },
              head: {
                fontWeight: 600,
                color: '#f8fafc',
                backgroundColor: mode === 'light' ? '#475569' : '#334155',
                backgroundImage: 'none',
                borderBottom: '2px solid rgba(255, 255, 255, 0.12)',
              },
            },
          },
          MuiTableRow: {
            styleOverrides: {
              root: {
                contain: 'layout style',
                transition: 'background-color 0.15s ease',
                '&:nth-of-type(even)': {
                  backgroundColor: 'rgba(255, 255, 255, 0.025)',
                },
                '&:hover': {
                  backgroundColor: 'rgba(255, 255, 255, 0.06)',
                },
                '&:active': {
                  backgroundColor: 'rgba(96, 165, 250, 0.08)',
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
                color: '#cbd5e1',
                '&.Mui-selected': {
                  fontWeight: 600,
                  color: '#f8fafc',
                },
              },
            },
          },
          MuiTabs: {
            styleOverrides: {
              indicator: {
                height: 3,
                borderRadius: '3px 3px 0 0',
                backgroundImage: 'linear-gradient(90deg, #60a5fa 0%, #3b82f6 100%)',
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
                  transform: 'scale(1.08)',
                  backgroundColor: 'rgba(255, 255, 255, 0.10)',
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
                backgroundColor: 'rgba(15, 23, 42, 0.6)',
                color: '#f8fafc',
              },
              standardSuccess: {
                backgroundColor: 'rgba(16, 185, 129, 0.15)',
                color: '#d1fae5',
                borderColor: '#10b981',
              },
              standardError: {
                backgroundColor: 'rgba(239, 68, 68, 0.15)',
                color: '#fecaca',
                borderColor: '#ef4444',
              },
              standardWarning: {
                backgroundColor: 'rgba(245, 158, 11, 0.15)',
                color: '#fde68a',
                borderColor: '#f59e0b',
              },
              standardInfo: {
                backgroundColor: 'rgba(6, 182, 212, 0.15)',
                color: '#cffafe',
                borderColor: '#06b6d4',
              },
            },
          },
          MuiTooltip: {
            styleOverrides: {
              tooltip: {
                borderRadius: 10,
                fontSize: '0.813rem',
                padding: '8px 14px',
                backgroundColor: '#475569',
                color: '#f8fafc',
                boxShadow: '0 4px 16px rgba(0, 0, 0, 0.25)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
              },
              arrow: {
                color: '#475569',
              },
            },
          },
          MuiMenuItem: {
            styleOverrides: {
              root: {
                minHeight: 44,
                fontSize: 'clamp(0.85rem, 1.5vw, 0.938rem)',
                '&:hover': {
                  backgroundColor: 'rgba(255, 255, 255, 0.06)',
                },
                '&.Mui-selected': {
                  backgroundColor: 'rgba(59, 130, 246, 0.16)',
                  '&:hover': {
                    backgroundColor: 'rgba(59, 130, 246, 0.22)',
                  },
                },
              },
            },
          },
          MuiMenu: {
            styleOverrides: {
              paper: {
                borderRadius: 12,
                border: '1px solid rgba(255, 255, 255, 0.10)',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4), 0 2px 8px rgba(0, 0, 0, 0.2)',
                backgroundColor: mode === 'light' ? '#334155' : '#1e293b',
                backgroundImage: 'none',
              },
            },
          },
          MuiListItemButton: {
            styleOverrides: {
              root: {
                minHeight: 44,
                WebkitTapHighlightColor: 'transparent',
                '&:hover': {
                  backgroundColor: 'rgba(255, 255, 255, 0.06)',
                },
                '&.Mui-selected': {
                  backgroundColor: 'rgba(59, 130, 246, 0.14)',
                  '&:hover': {
                    backgroundColor: 'rgba(59, 130, 246, 0.20)',
                  },
                },
              },
            },
          },
          MuiDrawer: {
            styleOverrides: {
              paper: {
                borderRight: 'none',
                boxShadow: '2px 0 12px rgba(0, 0, 0, 0.3)',
                backgroundColor: mode === 'light' ? '#1e293b' : '#0f172a',
                backgroundImage: 'none',
              },
            },
          },
          MuiAppBar: {
            styleOverrides: {
              root: {
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.3)',
                backgroundImage: 'none',
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
          MuiDivider: {
            styleOverrides: {
              root: {
                borderColor: 'rgba(255, 255, 255, 0.10)',
              },
            },
          },
          MuiInputLabel: {
            styleOverrides: {
              root: {
                color: '#cbd5e1',
                '&.Mui-focused': {
                  color: '#60a5fa',
                },
              },
            },
          },
          MuiFormHelperText: {
            styleOverrides: {
              root: {
                color: '#94a3b8',
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
