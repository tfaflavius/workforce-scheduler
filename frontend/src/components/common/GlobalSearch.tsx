import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  Box,
  InputBase,
  Paper,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Typography,
  Popper,
  ClickAwayListener,
  Fade,
  CircularProgress,
  alpha,
  IconButton,
  Chip,
  Dialog,
  Slide,
  AppBar,
  Toolbar,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import type { TransitionProps } from '@mui/material/transitions';
import {
  Search as SearchIcon,
  Person as PersonIcon,
  LocalParking as ParkingIcon,
  BeachAccess as LeaveIcon,
  SwapHoriz as SwapIcon,
  Close as CloseIcon,
  ArrowBack as ArrowBackIcon,
  OpenInNew as OpenInNewIcon,
  ReportProblem as ReportProblemIcon,
  Accessible as AccessibleIcon,
  MilitaryTech as MilitaryTechIcon,
  Home as HomeIcon,
  Gavel as GavelIcon,
  Business as BusinessIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useLazySearchQuery } from '../../store/api/search.api';
import type { SearchResult } from '../../store/api/search.api';

// Use semantic palette keys so colors follow the theme
const typeConfig: Record<string, { icon: React.ReactElement; paletteColor: 'primary' | 'error' | 'success' | 'warning' | 'info'; label: string }> = {
  page: { icon: <OpenInNewIcon fontSize="small" />, paletteColor: 'info', label: 'Pagina' },
  user: { icon: <PersonIcon fontSize="small" />, paletteColor: 'primary', label: 'Utilizator' },
  department: { icon: <BusinessIcon fontSize="small" />, paletteColor: 'primary', label: 'Departament' },
  parking_issue: { icon: <ParkingIcon fontSize="small" />, paletteColor: 'error', label: 'Problema Parcari' },
  parking_damage: { icon: <ReportProblemIcon fontSize="small" />, paletteColor: 'error', label: 'Prejudiciu' },
  handicap_request: { icon: <AccessibleIcon fontSize="small" />, paletteColor: 'info', label: 'Solicitare HC' },
  handicap_legitimation: { icon: <AccessibleIcon fontSize="small" />, paletteColor: 'info', label: 'Legitimatie HC' },
  revolutionar_legitimation: { icon: <MilitaryTechIcon fontSize="small" />, paletteColor: 'info', label: 'Legitimatie Rev' },
  domiciliu_request: { icon: <HomeIcon fontSize="small" />, paletteColor: 'info', label: 'Domiciliu' },
  control_sesizare: { icon: <GavelIcon fontSize="small" />, paletteColor: 'warning', label: 'Sesizare' },
  leave_request: { icon: <LeaveIcon fontSize="small" />, paletteColor: 'success', label: 'Concediu' },
  shift_swap: { icon: <SwapIcon fontSize="small" />, paletteColor: 'warning', label: 'Schimb Tura' },
};

// Slide-up transition for mobile search dialog
const SlideUpTransition = React.forwardRef(function Transition(
  props: TransitionProps & { children: React.ReactElement },
  ref: React.Ref<unknown>,
) {
  return <Slide direction="up" ref={ref} {...props} />;
});

// Shared search results renderer
const SearchResults: React.FC<{
  results: SearchResult[] | undefined;
  isFetching: boolean;
  onSelect: (result: SearchResult) => void;
  activeIndex?: number;
}> = ({ results, isFetching, onSelect, activeIndex = -1 }) => {
  const theme = useTheme();

  if (isFetching) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
        <CircularProgress size={24} />
      </Box>
    );
  }

  if (!results || results.length === 0) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <SearchIcon sx={{ fontSize: 40, color: 'text.disabled', mb: 1 }} />
        <Typography variant="body2" color="text.secondary">
          Niciun rezultat gasit
        </Typography>
      </Box>
    );
  }

  return (
    <List dense disablePadding>
      {results.map((r, index) => {
        const config = typeConfig[r.type] || typeConfig.user;
        const color = theme.palette[config.paletteColor].main;
        const isActive = index === activeIndex;
        return (
          <ListItem
            key={`${r.type}-${r.id}`}
            role="button"
            tabIndex={0}
            onClick={() => onSelect(r)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onSelect(r);
              }
            }}
            sx={{
              cursor: 'pointer',
              bgcolor: isActive ? 'action.selected' : 'transparent',
              '&:hover': { bgcolor: isActive ? 'action.selected' : 'action.hover' },
              borderBottom: '1px solid',
              borderColor: 'divider',
              transition: 'background-color 0.15s ease',
            }}
          >
            <ListItemIcon sx={{ minWidth: 36, color }}>
              {config.icon}
            </ListItemIcon>
            <ListItemText
              primary={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="body2" fontWeight="medium" noWrap>
                    {r.title}
                  </Typography>
                  <Chip
                    label={config.label}
                    size="small"
                    sx={{
                      height: 18,
                      fontSize: '0.65rem',
                      bgcolor: alpha(color, 0.1),
                      color,
                    }}
                  />
                </Box>
              }
              secondary={
                <Typography variant="caption" color="text.secondary" noWrap>
                  {r.subtitle}
                </Typography>
              }
            />
          </ListItem>
        );
      })}
    </List>
  );
};

const GlobalSearch: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const anchorRef = useRef<HTMLDivElement>(null);
  const desktopInputRef = useRef<HTMLInputElement>(null);
  const mobileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const [triggerSearch, { data: results, isFetching }] = useLazySearchQuery();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSearch = useCallback((value: string) => {
    setQuery(value);
    setActiveIndex(-1);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (value.trim().length >= 2) {
      debounceRef.current = setTimeout(() => {
        triggerSearch(value);
        setOpen(true);
      }, 300);
    } else {
      setOpen(false);
    }
  }, [triggerSearch]);

  const handleSelect = (result: SearchResult) => {
    if (result.url) {
      navigate(result.url);
    }
    setOpen(false);
    setMobileOpen(false);
    setQuery('');
    setActiveIndex(-1);
  };

  // Keyboard arrow navigation through search results
  const handleInputKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!results || results.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((prev) => (prev < results.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((prev) => (prev > 0 ? prev - 1 : results.length - 1));
    } else if (e.key === 'Enter' && activeIndex >= 0 && activeIndex < results.length) {
      e.preventDefault();
      handleSelect(results[activeIndex]);
    }
  }, [results, activeIndex]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleClear = () => {
    setQuery('');
    setOpen(false);
  };

  const handleMobileOpen = () => {
    setMobileOpen(true);
    // Focus input after dialog animation
    setTimeout(() => mobileInputRef.current?.focus(), 300);
  };

  const handleMobileClose = () => {
    setMobileOpen(false);
    setQuery('');
    setOpen(false);
  };

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  // Ctrl+K / Cmd+K keyboard shortcut to focus search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (isMobile) {
          handleMobileOpen();
        } else {
          desktopInputRef.current?.focus();
        }
      }
      // Escape closes search
      if (e.key === 'Escape') {
        setOpen(false);
        desktopInputRef.current?.blur();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isMobile]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      {/* Mobile: Search icon button */}
      <IconButton
        color="inherit"
        onClick={handleMobileOpen}
        aria-label="Cauta"
        sx={{ display: { xs: 'inline-flex', md: 'none' } }}
      >
        <SearchIcon />
      </IconButton>

      {/* Mobile: Fullscreen search dialog */}
      <Dialog
        fullScreen
        open={mobileOpen}
        onClose={handleMobileClose}
        TransitionComponent={SlideUpTransition}
        sx={{ display: { md: 'none' } }}
      >
        <AppBar
          position="sticky"
          elevation={0}
          sx={{
            bgcolor: 'background.paper',
            color: 'text.primary',
            borderBottom: '1px solid',
            borderColor: 'divider',
          }}
        >
          <Toolbar sx={{ gap: 1 }}>
            <IconButton edge="start" onClick={handleMobileClose} aria-label="Inchide cautarea">
              <ArrowBackIcon />
            </IconButton>
            <InputBase
              inputRef={mobileInputRef}
              placeholder="Cauta pagini, utilizatori, parcari..."
              value={query}
              onChange={(e) => handleSearch(e.target.value)}
              onKeyDown={handleInputKeyDown}
              autoFocus
              fullWidth
              inputProps={{ 'aria-label': 'Cauta pagini, utilizatori, parcari' }}
              sx={{
                fontSize: '1rem',
                '& input::placeholder': { opacity: 0.6 },
              }}
            />
            {isFetching && <CircularProgress size={20} />}
            {query && !isFetching && (
              <IconButton size="small" onClick={handleClear} aria-label="Sterge cautarea">
                <CloseIcon fontSize="small" />
              </IconButton>
            )}
          </Toolbar>
        </AppBar>
        <Box sx={{ flex: 1, overflow: 'auto' }}>
          {query.length >= 2 ? (
            <SearchResults results={results} isFetching={isFetching} onSelect={handleSelect} activeIndex={activeIndex} />
          ) : (
            <Box sx={{ p: 4, textAlign: 'center' }}>
              <SearchIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
              <Typography variant="body2" color="text.secondary">
                Introdu minim 2 caractere pentru a cauta
              </Typography>
            </Box>
          )}
        </Box>
      </Dialog>

      {/* Desktop: Inline search bar with popper */}
      <ClickAwayListener onClickAway={() => setOpen(false)}>
        <Box ref={anchorRef} sx={{ position: 'relative', display: { xs: 'none', md: 'flex' } }}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              bgcolor: alpha(theme.palette.common.white, 0.15),
              borderRadius: 2,
              px: 1.5,
              py: 0.5,
              width: { md: 250, lg: 320 },
              '&:hover': {
                bgcolor: alpha(theme.palette.common.white, 0.25),
              },
              transition: 'all 0.2s',
            }}
          >
            <SearchIcon sx={{ color: 'inherit', opacity: 0.7, mr: 1, fontSize: 20 }} />
            <InputBase
              inputRef={desktopInputRef}
              placeholder="Cauta pagini, utilizatori, parcari..."
              value={query}
              onChange={(e) => handleSearch(e.target.value)}
              onKeyDown={handleInputKeyDown}
              onFocus={() => query.length >= 2 && results && setOpen(true)}
              inputProps={{ 'aria-label': 'Cauta pagini, utilizatori, parcari' }}
              sx={{
                color: 'inherit',
                flex: 1,
                fontSize: '0.875rem',
                '& input::placeholder': { opacity: 0.7 },
              }}
            />
            {isFetching && <CircularProgress size={16} sx={{ color: 'inherit', opacity: 0.7 }} />}
            {query && !isFetching && (
              <IconButton size="small" onClick={handleClear} aria-label="Sterge cautarea" sx={{ color: 'inherit', opacity: 0.7, p: 0.25 }}>
                <CloseIcon fontSize="small" />
              </IconButton>
            )}
            {!query && (
              <Typography
                variant="caption"
                sx={{
                  opacity: 0.5,
                  fontSize: '0.65rem',
                  border: '1px solid',
                  borderColor: 'inherit',
                  borderRadius: 0.5,
                  px: 0.5,
                  py: 0.1,
                  lineHeight: 1.4,
                  whiteSpace: 'nowrap',
                  userSelect: 'none',
                }}
              >
                {navigator.platform?.includes('Mac') ? '⌘K' : 'Ctrl+K'}
              </Typography>
            )}
          </Box>

          <Popper
            open={open && !!results}
            anchorEl={anchorRef.current}
            placement="bottom-start"
            transition
            style={{ zIndex: 1300, width: anchorRef.current?.offsetWidth || 320 }}
          >
            {({ TransitionProps }) => (
              <Fade {...TransitionProps} timeout={200}>
                <Paper
                  elevation={8}
                  sx={{
                    mt: 0.5,
                    maxHeight: 400,
                    overflow: 'auto',
                    borderRadius: 2,
                  }}
                >
                  <SearchResults results={results} isFetching={false} onSelect={handleSelect} activeIndex={activeIndex} />
                </Paper>
              </Fade>
            )}
          </Popper>
        </Box>
      </ClickAwayListener>
    </>
  );
};

export default GlobalSearch;
