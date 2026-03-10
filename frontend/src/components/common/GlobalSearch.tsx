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
} from '@mui/material';
import {
  Search as SearchIcon,
  Person as PersonIcon,
  LocalParking as ParkingIcon,
  BeachAccess as LeaveIcon,
  SwapHoriz as SwapIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useLazySearchQuery } from '../../store/api/search.api';
import type { SearchResult } from '../../store/api/search.api';

const typeConfig: Record<string, { icon: React.ReactElement; color: string; label: string }> = {
  user: { icon: <PersonIcon fontSize="small" />, color: '#2563eb', label: 'Utilizator' },
  parking_issue: { icon: <ParkingIcon fontSize="small" />, color: '#ef4444', label: 'Problema Parcari' },
  leave_request: { icon: <LeaveIcon fontSize="small" />, color: '#10b981', label: 'Concediu' },
  shift_swap: { icon: <SwapIcon fontSize="small" />, color: '#f59e0b', label: 'Schimb Tura' },
};

const GlobalSearch: React.FC = () => {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const anchorRef = useRef<HTMLDivElement>(null);
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
    setQuery('');
  };

  const handleClear = () => {
    setQuery('');
    setOpen(false);
  };

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  return (
    <ClickAwayListener onClickAway={() => setOpen(false)}>
      <Box ref={anchorRef} sx={{ position: 'relative', display: { xs: 'none', md: 'flex' } }}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            bgcolor: (theme) => alpha(theme.palette.common.white, 0.15),
            borderRadius: 2,
            px: 1.5,
            py: 0.5,
            width: { md: 250, lg: 320 },
            '&:hover': {
              bgcolor: (theme) => alpha(theme.palette.common.white, 0.25),
            },
            transition: 'all 0.2s',
          }}
        >
          <SearchIcon sx={{ color: 'inherit', opacity: 0.7, mr: 1, fontSize: 20 }} />
          <InputBase
            placeholder="Cauta utilizatori, probleme..."
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
                {results && results.length > 0 ? (
                  <List dense disablePadding>
                    {results.map((r) => {
                      const config = typeConfig[r.type] || typeConfig.user;
                      return (
                        <ListItem
                          key={`${r.type}-${r.id}`}
                          onClick={() => handleSelect(r)}
                          sx={{
                            cursor: 'pointer',
                            '&:hover': { bgcolor: 'action.hover' },
                            borderBottom: '1px solid',
                            borderColor: 'divider',
                          }}
                        >
                          <ListItemIcon sx={{ minWidth: 36, color: config.color }}>
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
                                    bgcolor: alpha(config.color, 0.1),
                                    color: config.color,
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
                ) : (
                  <Box sx={{ p: 2, textAlign: 'center' }}>
                    <Typography variant="body2" color="text.secondary">
                      Niciun rezultat gasit
                    </Typography>
                  </Box>
                )}
              </Paper>
            </Fade>
          )}
        </Popper>
      </Box>
    </ClickAwayListener>
  );
};

export default GlobalSearch;
