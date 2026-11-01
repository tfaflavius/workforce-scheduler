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
      metaThemeColor.setAttribute('content', mode === 'light' ? '#f1f5f9' : '#0f172a');
    }
  }, [mode]);

  const toggleTheme = () => {
    setMode((prevMode) => (prevMode === 'light' ? 'dark' : 'light'));
  };

  const isLight = mode === 'light';

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
          mode,
          primary: {
            main: '#2563eb',
            light: '#60a5fa',
            dark: '#1d4ed8',
          },
          // Slate gray — never purple. Keeps app feeling professional, not "feminine".
          secondary: {
            main: '#475569',
            light: '#64748b',
            dark: '#334155',
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
          ...(isLight
            ? {
                background: {
                  default: '#f1f5f9',
                  paper: '#ffffff',
                },
                text: {
                  primary: '#0f172a',
                  secondary: '#475569',
                },
                divider: 'rgba(15, 23, 42, 0.12)',
              }
            : {
                background: {
                  default: '#0f172a',
                  paper: '#1e293b',
                },
                text: {
                  primary: '#f1f5f9',
                  secondary: '#cbd5e1',
                },
                divider: 'rgba(255, 255, 255, 0.14)',
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
        transitions: {
          // Curbe de easing mai fine (decelerare lina) pentru un feel mai rafinat.
          easing: {
            easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
            easeOut: 'cubic-bezier(0.22, 1, 0.36, 1)',
            easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
            sharp: 'cubic-bezier(0.4, 0, 0.6, 1)',
          },
        },
        components: {
          MuiBackdrop: {
            styleOverrides: {
              root: {
                backdropFilter: 'blur(4px)',
                backgroundColor: isLight ? 'rgba(15, 23, 42, 0.4)' : 'rgba(0, 0, 0, 0.6)',
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
                // Scrollbar fin si tematizat (Firefox)
                scrollbarWidth: 'thin',
                scrollbarColor: isLight
                  ? 'rgba(15, 23, 42, 0.22) transparent'
                  : 'rgba(255, 255, 255, 0.22) transparent',
              },
              body: {
                paddingLeft: 'env(safe-area-inset-left)',
                paddingRight: 'env(safe-area-inset-right)',
                WebkitOverflowScrolling: 'touch',
                overscrollBehaviorY: 'auto',
              },
              // Scrollbar fin si tematizat (Chrome/Safari/Edge)
              '*::-webkit-scrollbar': {
                width: 10,
                height: 10,
              },
              '*::-webkit-scrollbar-track': {
                background: 'transparent',
              },
              '*::-webkit-scrollbar-thumb': {
                backgroundColor: isLight ? 'rgba(15, 23, 42, 0.20)' : 'rgba(255, 255, 255, 0.20)',
                borderRadius: 8,
                border: '2px solid transparent',
                backgroundClip: 'content-box',
                transition: 'background-color 0.2s ease',
              },
              '*::-webkit-scrollbar-thumb:hover': {
                backgroundColor: isLight ? 'rgba(15, 23, 42, 0.34)' : 'rgba(255, 255, 255, 0.34)',
              },
              // Culoarea de selectie a textului
              '::selection': {
                backgroundColor: isLight ? 'rgba(37, 99, 235, 0.18)' : 'rgba(96, 165, 250, 0.30)',
              },
              // Focus vizibil, accesibil si discret (doar la navigare cu tastatura)
              'a:focus-visible, button:focus-visible, [role="button"]:focus-visible, .MuiButtonBase-root:focus-visible':
                {
                  outline: `2px solid ${isLight ? 'rgba(37, 99, 235, 0.55)' : 'rgba(96, 165, 250, 0.65)'}`,
                  outlineOffset: 2,
                },
              // Animatie de aparitie refolosibila (subtila)
              '@keyframes appFadeInUp': {
                from: { opacity: 0, transform: 'translateY(8px)' },
                to: { opacity: 1, transform: 'translateY(0)' },
              },
              // Respecta preferinta sistemului de a reduce miscarea
              '@media (prefers-reduced-motion: reduce)': {
                '*, *::before, *::after': {
                  animationDuration: '0.001ms !important',
                  animationIterationCount: '1 !important',
                  transitionDuration: '0.001ms !important',
                  scrollBehavior: 'auto !important',
                },
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
                transition:
                  'transform 0.22s cubic-bezier(0.22, 1, 0.36, 1), box-shadow 0.22s cubic-bezier(0.22, 1, 0.36, 1)',
                '&:hover': {
                  transform: 'translateY(-1px)',
                  boxShadow: isLight
                    ? '0 4px 12px rgba(15, 23, 42, 0.12)'
                    : '0 4px 12px rgba(0, 0, 0, 0.25)',
                },
                '&:active': {
                  transform: 'scale(0.97)',
                  transition: 'transform 0.08s ease',
                },
              },
              contained: {
                boxShadow: isLight
                  ? '0 2px 8px rgba(15, 23, 42, 0.1)'
                  : '0 2px 8px rgba(0, 0, 0, 0.2)',
                '&.MuiButton-containedPrimary': {
                  backgroundImage: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
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
                border: isLight
                  ? '1px solid rgba(15, 23, 42, 0.08)'
                  : '1px solid rgba(255, 255, 255, 0.08)',
                boxShadow: isLight
                  ? '0 1px 2px rgba(15, 23, 42, 0.05), 0 2px 8px rgba(15, 23, 42, 0.04)'
                  : '0 2px 4px rgba(0, 0, 0, 0.2), 0 4px 12px rgba(0, 0, 0, 0.18)',
                transition:
                  'transform 0.26s cubic-bezier(0.22, 1, 0.36, 1), box-shadow 0.26s cubic-bezier(0.22, 1, 0.36, 1), border-color 0.26s ease',
                backgroundImage: 'none',
                '&[role="button"], &:has(.MuiCardActionArea-root)': {
                  cursor: 'pointer',
                  '&:hover': {
                    transform: 'translateY(-2px)',
                    boxShadow: isLight
                      ? '0 4px 12px rgba(15, 23, 42, 0.08), 0 8px 24px rgba(15, 23, 42, 0.06)'
                      : '0 6px 16px rgba(0, 0, 0, 0.35), 0 10px 28px rgba(0, 0, 0, 0.25)',
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
              },
              elevation0: {
                border: isLight
                  ? '1px solid rgba(15, 23, 42, 0.08)'
                  : '1px solid rgba(255, 255, 255, 0.08)',
              },
              elevation1: {
                border: isLight
                  ? '1px solid rgba(15, 23, 42, 0.06)'
                  : '1px solid rgba(255, 255, 255, 0.08)',
                boxShadow: isLight
                  ? '0 1px 2px rgba(15, 23, 42, 0.05), 0 2px 8px rgba(15, 23, 42, 0.03)'
                  : '0 2px 4px rgba(0, 0, 0, 0.2), 0 4px 12px rgba(0, 0, 0, 0.15)',
              },
            },
          },
          MuiChip: {
            styleOverrides: {
              root: {
                borderRadius: 8,
                fontWeight: 500,
                maxWidth: '100%',
                border: isLight
                  ? '1px solid rgba(15, 23, 42, 0.10)'
                  : '1px solid rgba(255, 255, 255, 0.12)',
                transition:
                  'transform 0.18s cubic-bezier(0.22, 1, 0.36, 1), box-shadow 0.18s ease, background-color 0.18s ease',
                '&.MuiChip-clickable:hover': {
                  transform: 'translateY(-1px)',
                  boxShadow: isLight
                    ? '0 2px 8px rgba(15, 23, 42, 0.12)'
                    : '0 2px 8px rgba(0, 0, 0, 0.3)',
                },
                '&.MuiChip-clickable:active': {
                  transform: 'scale(0.97)',
                },
              },
            },
          },
          MuiTextField: {
            styleOverrides: {
              root: {
                '& .MuiOutlinedInput-root': {
                  borderRadius: 10,
                  backgroundColor: isLight
                    ? '#ffffff'
                    : 'rgba(255, 255, 255, 0.03)',
                  transition: 'background-color 0.2s ease, box-shadow 0.2s ease',
                  '& .MuiOutlinedInput-notchedOutline': {
                    borderColor: isLight ? 'rgba(15, 23, 42, 0.16)' : 'rgba(255, 255, 255, 0.18)',
                  },
                  '&:hover': {
                    '& .MuiOutlinedInput-notchedOutline': {
                      borderColor: isLight ? 'rgba(15, 23, 42, 0.28)' : 'rgba(255, 255, 255, 0.28)',
                    },
                  },
                  '&.Mui-focused': {
                    boxShadow: isLight
                      ? '0 0 0 3px rgba(37, 99, 235, 0.14)'
                      : '0 0 0 3px rgba(59, 130, 246, 0.18)',
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
                border: isLight
                  ? '1px solid rgba(15, 23, 42, 0.08)'
                  : '1px solid rgba(255, 255, 255, 0.08)',
                boxShadow: isLight
                  ? '0 24px 48px rgba(15, 23, 42, 0.18), 0 8px 16px rgba(15, 23, 42, 0.10)'
                  : '0 24px 48px rgba(0, 0, 0, 0.5), 0 8px 16px rgba(0, 0, 0, 0.3)',
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
              },
              sizeSmall: {
                padding: 'clamp(6px, 1vw, 10px)',
              },
              head: {
                fontWeight: 600,
                backgroundColor: isLight ? '#f1f5f9' : '#334155',
                backgroundImage: isLight
                  ? 'linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%)'
                  : 'linear-gradient(180deg, #3b4252 0%, #334155 100%)',
                borderBottom: isLight ? '2px solid #e2e8f0' : '2px solid #475569',
              },
            },
          },
          MuiTableRow: {
            styleOverrides: {
              root: {
                contain: 'layout style',
                transition: 'background-color 0.15s ease',
                '&:nth-of-type(even)': {
                  backgroundColor: isLight ? 'rgba(15, 23, 42, 0.02)' : 'rgba(255, 255, 255, 0.025)',
                },
                '&:hover': {
                  backgroundColor: isLight ? '#f8fafc' : 'rgba(255, 255, 255, 0.06)',
                },
                '&:active': {
                  backgroundColor: isLight ? 'rgba(37, 99, 235, 0.05)' : 'rgba(96, 165, 250, 0.08)',
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
                borderRadius: '8px 8px 0 0',
                '&:hover': {
                  backgroundColor: isLight ? 'rgba(37, 99, 235, 0.06)' : 'rgba(96, 165, 250, 0.10)',
                },
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
                // Blue-only gradient — no purple to keep things professional
                backgroundImage: 'linear-gradient(90deg, #60a5fa 0%, #2563eb 100%)',
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
                  backgroundColor: isLight ? 'rgba(15, 23, 42, 0.06)' : 'rgba(255, 255, 255, 0.10)',
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
                backgroundColor: isLight ? '#0f172a' : '#475569',
                color: '#f8fafc',
                boxShadow: '0 4px 16px rgba(0, 0, 0, 0.2)',
              },
              arrow: {
                color: isLight ? '#0f172a' : '#475569',
              },
            },
          },
          MuiMenuItem: {
            styleOverrides: {
              root: {
                minHeight: 44,
                fontSize: 'clamp(0.85rem, 1.5vw, 0.938rem)',
                '&:hover': {
                  backgroundColor: isLight ? 'rgba(15, 23, 42, 0.04)' : 'rgba(255, 255, 255, 0.06)',
                },
                '&.Mui-selected': {
                  backgroundColor: isLight ? 'rgba(37, 99, 235, 0.10)' : 'rgba(59, 130, 246, 0.16)',
                  '&:hover': {
                    backgroundColor: isLight ? 'rgba(37, 99, 235, 0.14)' : 'rgba(59, 130, 246, 0.22)',
                  },
                },
              },
            },
          },
          MuiMenu: {
            styleOverrides: {
              paper: {
                borderRadius: 12,
                border: isLight
                  ? '1px solid rgba(15, 23, 42, 0.08)'
                  : '1px solid rgba(255, 255, 255, 0.10)',
                boxShadow: isLight
                  ? '0 8px 32px rgba(15, 23, 42, 0.12), 0 2px 8px rgba(15, 23, 42, 0.06)'
                  : '0 8px 32px rgba(0, 0, 0, 0.4), 0 2px 8px rgba(0, 0, 0, 0.2)',
                backgroundImage: 'none',
              },
            },
          },
          MuiListItemButton: {
            styleOverrides: {
              root: {
                minHeight: 44,
                WebkitTapHighlightColor: 'transparent',
                transition:
                  'background-color 0.2s ease, transform 0.2s cubic-bezier(0.22, 1, 0.36, 1)',
                '&:hover': {
                  backgroundColor: isLight ? 'rgba(15, 23, 42, 0.04)' : 'rgba(255, 255, 255, 0.06)',
                  transform: 'translateX(3px)',
                },
                '&.Mui-selected': {
                  backgroundColor: isLight ? 'rgba(37, 99, 235, 0.08)' : 'rgba(59, 130, 246, 0.14)',
                  '&:hover': {
                    backgroundColor: isLight ? 'rgba(37, 99, 235, 0.12)' : 'rgba(59, 130, 246, 0.20)',
                  },
                },
              },
            },
          },
          MuiDrawer: {
            styleOverrides: {
              paper: {
                borderRight: 'none',
                boxShadow: isLight
                  ? '2px 0 12px rgba(15, 23, 42, 0.08)'
                  : '2px 0 12px rgba(0, 0, 0, 0.3)',
                backgroundImage: 'none',
              },
            },
          },
          MuiAppBar: {
            styleOverrides: {
              root: {
                boxShadow: isLight
                  ? '0 1px 3px rgba(15, 23, 42, 0.08)'
                  : '0 1px 3px rgba(0, 0, 0, 0.3)',
                backgroundImage: 'none',
              },
            },
          },
          MuiFab: {
            styleOverrides: {
              root: {
                boxShadow: '0 4px 14px rgba(15, 23, 42, 0.2)',
                transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                '&:hover': {
                  transform: 'scale(1.05)',
                  boxShadow: '0 6px 20px rgba(15, 23, 42, 0.25)',
                },
              },
            },
          },
          MuiDivider: {
            styleOverrides: {
              root: {
                borderColor: isLight ? 'rgba(15, 23, 42, 0.08)' : 'rgba(255, 255, 255, 0.10)',
              },
            },
          },
          MuiSkeleton: {
            defaultProps: {
              // Animatie "wave" (mai fina decat pulse) pentru toate starile de incarcare
              animation: 'wave',
            },
            styleOverrides: {
              root: {
                backgroundColor: isLight ? 'rgba(15, 23, 42, 0.07)' : 'rgba(255, 255, 255, 0.08)',
              },
            },
          },
        },
      }),
    [mode, isLight]
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
