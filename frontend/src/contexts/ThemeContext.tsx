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
    // Update PWA theme-color meta tag to match current mode
    const themeColor = mode === 'light' ? '#2563eb' : '#0f172a';
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.setAttribute('content', themeColor);
    }
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
          MuiBackdrop: {
            styleOverrides: {
              root: {
                backdropFilter: 'blur(4px)',
                backgroundColor: mode === 'light' ? 'rgba(0, 0, 0, 0.3)' : 'rgba(0, 0, 0, 0.6)',
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
                // Prevent horizontal overflow at html level (safe for iOS scroll)
                overflowX: 'clip',
              },
              body: {
                // Only horizontal safe-area insets on body — vertical handled by components
                paddingLeft: 'env(safe-area-inset-left)',
                paddingRight: 'env(safe-area-inset-right)',
                // Ensure iOS Safari doesn't constrain body scroll
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
                minHeight: 44, // Apple HIG: 44px minimum touch target
                transition: 'transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out',
                '&:hover': {
                  transform: 'translateY(-1px)',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                },
                '&:active': {
                  transform: 'scale(0.98)',
                },
              },
              contained: {
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
                '&.MuiButton-containedPrimary': {
                  backgroundImage: `linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)`,
                },
                '&.MuiButton-containedSecondary': {
                  backgroundImage: `linear-gradient(135deg, #7c3aed 0%, #5b21b6 100%)`,
                },
                '&.MuiButton-containedSuccess': {
                  backgroundImage: `linear-gradient(135deg, #10b981 0%, #059669 100%)`,
                },
                '&.MuiButton-containedError': {
                  backgroundImage: `linear-gradient(135deg, #ef4444 0%, #dc2626 100%)`,
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
                  paddingBottom: undefined, // Let component-level styles handle this
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
                // CSS containment — tells browser card layout is independent, reduces reflows
                contain: 'content',
                border: mode === 'light' ? '1px solid rgba(0, 0, 0, 0.06)' : '1px solid rgba(255, 255, 255, 0.06)',
                boxShadow: mode === 'light'
                  ? '0 1px 2px rgba(0, 0, 0, 0.04), 0 2px 8px rgba(0, 0, 0, 0.03)'
                  : '0 1px 2px rgba(0, 0, 0, 0.2), 0 2px 8px rgba(0, 0, 0, 0.15)',
                transition: 'transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out',
                ...(mode === 'dark' && {
                  backgroundColor: 'rgba(30, 41, 59, 0.85)',
                }),
                // Hover lift only on interactive cards (with onClick or CardActionArea)
                '&[role="button"], &:has(.MuiCardActionArea-root)': {
                  cursor: 'pointer',
                  '&:hover': {
                    transform: 'translateY(-2px)',
                    boxShadow: mode === 'light'
                      ? '0 4px 12px rgba(0, 0, 0, 0.08), 0 8px 24px rgba(0, 0, 0, 0.06)'
                      : '0 4px 12px rgba(0, 0, 0, 0.35), 0 8px 24px rgba(0, 0, 0, 0.25)',
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
                backgroundImage: mode === 'dark'
                  ? 'linear-gradient(145deg, rgba(30, 41, 59, 0.9) 0%, rgba(15, 23, 42, 0.95) 100%)'
                  : 'none',
              },
              elevation0: {
                border: mode === 'light' ? '1px solid rgba(0, 0, 0, 0.06)' : '1px solid rgba(255, 255, 255, 0.06)',
              },
              elevation1: {
                border: mode === 'light' ? '1px solid rgba(0, 0, 0, 0.05)' : '1px solid rgba(255, 255, 255, 0.05)',
                boxShadow: mode === 'light'
                  ? '0 1px 2px rgba(0, 0, 0, 0.05), 0 2px 8px rgba(0, 0, 0, 0.03)'
                  : '0 1px 2px rgba(0, 0, 0, 0.25), 0 2px 8px rgba(0, 0, 0, 0.15)',
              },
            },
          },
          MuiChip: {
            styleOverrides: {
              root: {
                borderRadius: 8,
                fontWeight: 500,
                maxWidth: '100%',
                border: mode === 'light' ? '1px solid rgba(0, 0, 0, 0.06)' : '1px solid rgba(255, 255, 255, 0.08)',
              },
            },
          },
          MuiTextField: {
            styleOverrides: {
              root: {
                '& .MuiOutlinedInput-root': {
                  borderRadius: 10,
                  backgroundColor: mode === 'light' ? 'rgba(0, 0, 0, 0.02)' : 'rgba(255, 255, 255, 0.03)',
                  transition: 'background-color 0.2s ease, box-shadow 0.2s ease',
                  '&:hover': {
                    backgroundColor: mode === 'light' ? 'rgba(0, 0, 0, 0.03)' : 'rgba(255, 255, 255, 0.05)',
                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)',
                  },
                  '&.Mui-focused': {
                    backgroundColor: mode === 'light' ? '#ffffff' : 'rgba(255, 255, 255, 0.05)',
                    boxShadow: mode === 'light'
                      ? '0 0 0 3px rgba(37, 99, 235, 0.12), 0 4px 12px rgba(37, 99, 235, 0.08)'
                      : '0 0 0 3px rgba(96, 165, 250, 0.15), 0 4px 12px rgba(96, 165, 250, 0.1)',
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
                border: mode === 'light' ? '1px solid rgba(0, 0, 0, 0.06)' : '1px solid rgba(255, 255, 255, 0.08)',
                boxShadow: mode === 'light'
                  ? '0 24px 48px rgba(0, 0, 0, 0.12), 0 8px 16px rgba(0, 0, 0, 0.08)'
                  : '0 24px 48px rgba(0, 0, 0, 0.5), 0 8px 16px rgba(0, 0, 0, 0.3)',
              },
            },
          },
          MuiTableCell: {
            styleOverrides: {
              root: {
                padding: 'clamp(8px, 1.5vw, 16px)',
                fontSize: 'clamp(0.8rem, 1.5vw, 0.875rem)',
                overflowWrap: 'break-word' as const,
                // Ensure minimum row height for touch on mobile
                minHeight: 48,
              },
              sizeSmall: {
                padding: 'clamp(6px, 1vw, 10px)',
              },
              head: {
                fontWeight: 600,
                backgroundColor: mode === 'light' ? '#f1f5f9' : '#334155',
                backgroundImage: mode === 'light'
                  ? 'linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%)'
                  : 'linear-gradient(180deg, #3b4252 0%, #334155 100%)',
                borderBottom: mode === 'light' ? '2px solid #e2e8f0' : '2px solid #475569',
              },
            },
          },
          MuiTableRow: {
            styleOverrides: {
              root: {
                // CSS containment — row layout doesn't affect other rows
                contain: 'layout style',
                transition: 'background-color 0.15s ease',
                '&:nth-of-type(even)': {
                  backgroundColor: mode === 'light' ? 'rgba(0, 0, 0, 0.015)' : 'rgba(255, 255, 255, 0.015)',
                },
                '&:hover': {
                  backgroundColor: mode === 'light' ? '#f8fafc' : '#1e293b',
                },
                // Better active state feedback for touch on mobile
                '&:active': {
                  backgroundColor: mode === 'light' ? 'rgba(37, 99, 235, 0.04)' : 'rgba(96, 165, 250, 0.06)',
                },
                // Disable tap highlight on mobile for custom feedback
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
                backgroundImage: 'linear-gradient(90deg, #2563eb 0%, #7c3aed 100%)',
              },
            },
          },
          MuiIconButton: {
            styleOverrides: {
              root: {
                minWidth: 44, // Apple HIG: 44px minimum touch target
                minHeight: 44,
                transition: 'transform 0.2s ease, background-color 0.2s ease',
                '&:hover': {
                  transform: 'scale(1.1)',
                  backgroundColor: mode === 'light' ? 'rgba(0, 0, 0, 0.04)' : 'rgba(255, 255, 255, 0.08)',
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
                // Removed backdropFilter: blur() — expensive on mobile GPU
              },
            },
          },
          MuiTooltip: {
            styleOverrides: {
              tooltip: {
                borderRadius: 10,
                fontSize: '0.813rem',
                padding: '8px 14px',
                // Solid bg instead of backdropFilter: blur() — saves GPU on mobile
                backgroundColor: mode === 'light' ? '#0f172a' : '#334155',
                boxShadow: '0 4px 16px rgba(0, 0, 0, 0.15)',
                border: mode === 'dark' ? '1px solid rgba(255, 255, 255, 0.06)' : 'none',
              },
              arrow: {
                color: mode === 'light' ? 'rgba(15, 23, 42, 0.9)' : 'rgba(30, 41, 59, 0.95)',
              },
            },
          },
          MuiMenuItem: {
            styleOverrides: {
              root: {
                minHeight: 44, // Apple HIG touch target
                fontSize: 'clamp(0.85rem, 1.5vw, 0.938rem)',
              },
            },
          },
          MuiMenu: {
            styleOverrides: {
              paper: {
                borderRadius: 12,
                // Removed backdropFilter: blur() — expensive on mobile GPU
                border: mode === 'light' ? '1px solid rgba(0, 0, 0, 0.06)' : '1px solid rgba(255, 255, 255, 0.08)',
                boxShadow: mode === 'light'
                  ? '0 8px 32px rgba(0, 0, 0, 0.12), 0 2px 8px rgba(0, 0, 0, 0.06)'
                  : '0 8px 32px rgba(0, 0, 0, 0.4), 0 2px 8px rgba(0, 0, 0, 0.2)',
                ...(mode === 'dark' && {
                  backgroundColor: 'rgba(30, 41, 59, 0.9)',
                }),
              },
            },
          },
          MuiListItemButton: {
            styleOverrides: {
              root: {
                minHeight: 44, // Apple HIG touch target
                WebkitTapHighlightColor: 'transparent',
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
                transition: 'transform 0.2s ease, box-shadow 0.2s ease',
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
