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
}> = ({ results, isFetching, onSelect }) => {
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
      {results.map((r) => {
        const config = typeConfig[r.type] || typeConfig.user;
        const color = theme.palette[config.paletteColor].main;
        return (
          <ListItem
            key={`${r.type}-${r.id}`}
            onClick={() => onSelect(r)}
            sx={{
              cursor: 'pointer',
              '&:hover': { bgcolor: 'action.hover' },
              borderBottom: '1px solid',
              borderColor: 'divider',
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
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const anchorRef = useRef<HTMLDivElement>(null);
  const mobileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const [triggerSearch, { data: results, isFetching }] = useLazySearchQuery();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSearch = useCallback((value: string) => {
    setQuery(value);
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
  };

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
              autoFocus
              fullWidth
              sx={{
                fontSize: '1rem',
                '& input::placeholder': { opacity: 0.6 },
              }}
            />
            {isFetching && <CircularProgress size={20} />}
            {query && !isFetching && (
              <IconButton size="small" onClick={handleClear}>
                <CloseIcon fontSize="small" />
              </IconButton>
            )}
          </Toolbar>
        </AppBar>
        <Box sx={{ flex: 1, overflow: 'auto' }}>
          {query.length >= 2 ? (
            <SearchResults results={results} isFetching={isFetching} onSelect={handleSelect} />
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
              placeholder="Cauta pagini, utilizatori, parcari..."
              value={query}
              onChange={(e) => handleSearch(e.target.value)}
              onFocus={() => query.length >= 2 && results && setOpen(true)}
              sx={{
                color: 'inherit',
                flex: 1,
                fontSize: '0.875rem',
                '& input::placeholder': { opacity: 0.7 },
              }}
            />
            {isFetching && <CircularProgress size={16} sx={{ color: 'inherit', opacity: 0.7 }} />}
            {query && !isFetching && (
              <IconButton size="small" onClick={handleClear} sx={{ color: 'inherit', opacity: 0.7, p: 0.25 }}>
                <CloseIcon fontSize="small" />
              </IconButton>
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
                  <SearchResults results={results} isFetching={false} onSelect={handleSelect} />
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
