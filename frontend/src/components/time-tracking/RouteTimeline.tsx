import React, { useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  Chip,
  Divider,
  CircularProgress,
  Alert,
  Collapse,
  IconButton,
  Tooltip,
  Grid,
  alpha,
} from '@mui/material';
import {
  Route as RouteIcon,
  LocationOn as LocationIcon,
  AccessTime as ClockIcon,
  Straighten as DistanceIcon,
  Map as MapIcon,
  Close as CloseIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  MyLocation as GeoIcon,
} from '@mui/icons-material';
import {
  useGetAdminEntryRouteQuery,
  useGeocodeEntryLocationsMutation,
} from '../../store/api/time-tracking.api';
import type { RoutePoint } from '../../types/time-tracking.types';

const formatTime = (dateStr: string) => {
  const d = new Date(dateStr);
  return d.toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' });
};

const formatDate = (dateStr: string) => {
  const d = new Date(dateStr);
  return d.toLocaleDateString('ro-RO', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
};

const formatDuration = (minutes: number) => {
  if (minutes < 1) return '<1 min';
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
};

const formatDistance = (meters: number) => {
  if (meters < 1000) return `${meters} m`;
  return `${(meters / 1000).toFixed(1)} km`;
};

interface RouteTimelineProps {
  timeEntryId: string;
  onClose?: () => void;
}

// Group consecutive points with same address for collapsing
interface PointGroup {
  address: string;
  points: RoutePoint[];
  totalDuration: number;
  firstTime: string;
  lastTime: string;
  isMoving: boolean;
}

function groupPoints(points: RoutePoint[]): PointGroup[] {
  if (points.length === 0) return [];

  const groups: PointGroup[] = [];
  let current: PointGroup = {
    address: points[0].address || `${points[0].latitude.toFixed(5)}, ${points[0].longitude.toFixed(5)}`,
    points: [points[0]],
    totalDuration: points[0].durationMinutes,
    firstTime: points[0].recordedAt,
    lastTime: points[0].recordedAt,
    isMoving: points[0].isMoving,
  };

  for (let i = 1; i < points.length; i++) {
    const p = points[i];
    const addr = p.address || `${p.latitude.toFixed(5)}, ${p.longitude.toFixed(5)}`;

    if (addr === current.address && !p.isMoving) {
      current.points.push(p);
      current.totalDuration += p.durationMinutes;
      current.lastTime = p.recordedAt;
    } else {
      groups.push(current);
      current = {
        address: addr,
        points: [p],
        totalDuration: p.durationMinutes,
        firstTime: p.recordedAt,
        lastTime: p.recordedAt,
        isMoving: p.isMoving,
      };
    }
  }
  groups.push(current);
  return groups;
}

const RouteTimeline: React.FC<RouteTimelineProps> = ({ timeEntryId, onClose }) => {
  const { data: route, isLoading, error } = useGetAdminEntryRouteQuery(timeEntryId);
  const [geocode, { isLoading: isGeocoding }] = useGeocodeEntryLocationsMutation();
  const [expandedGroups, setExpandedGroups] = useState<Set<number>>(new Set());
  const [geocodeSuccess, setGeocodeSuccess] = useState<string | null>(null);

  const handleGeocode = async () => {
    try {
      const result = await geocode(timeEntryId).unwrap();
      setGeocodeSuccess(`${result.geocodedCount} adrese geocodate cu succes!`);
      setTimeout(() => setGeocodeSuccess(null), 5000);
    } catch {
      // Error handled by RTK Query
    }
  };

  const toggleGroup = (index: number) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  if (isLoading) {
    return (
      <Paper sx={{ p: 3, borderRadius: 3, mt: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      </Paper>
    );
  }

  if (error || !route) {
    return (
      <Paper sx={{ p: 3, borderRadius: 3, mt: 2 }}>
        <Alert severity="error">Nu s-au putut incarca datele traseului.</Alert>
      </Paper>
    );
  }

  const pointGroups = groupPoints(route.points);
  const uniqueStreets = route.streetSummary.filter(s => !s.streetName.includes(','));

  return (
    <Paper sx={{ borderRadius: 3, mt: 2, overflow: 'hidden' }}>
      {/* Header */}
      <Box
        sx={{
          background: 'linear-gradient(135deg, #f59e0b 0%, #ea580c 100%)',
          p: { xs: 2, sm: 2.5 },
          color: 'white',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box>
            <Typography variant="h6" fontWeight={700}>
              <RouteIcon sx={{ mr: 1, verticalAlign: 'middle', fontSize: 22 }} />
              Traseu GPS - {route.employeeName}
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.9, mt: 0.5 }}>
              {formatDate(route.date)} | {route.department}
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.9 }}>
              {formatTime(route.startTime)} - {route.endTime ? formatTime(route.endTime) : 'In curs'}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            {!route.geocodingComplete && (
              <Button
                variant="contained"
                size="small"
                onClick={handleGeocode}
                disabled={isGeocoding}
                startIcon={isGeocoding ? <CircularProgress size={16} color="inherit" /> : <GeoIcon />}
                sx={{
                  bgcolor: 'rgba(255,255,255,0.2)',
                  '&:hover': { bgcolor: 'rgba(255,255,255,0.3)' },
                  textTransform: 'none',
                  fontWeight: 600,
                }}
              >
                {isGeocoding ? 'Se geocodeaza...' : `Geocodeaza (${route.ungeocodedCount})`}
              </Button>
            )}
            {onClose && (
              <IconButton onClick={onClose} sx={{ color: 'white' }}>
                <CloseIcon />
              </IconButton>
            )}
          </Box>
        </Box>
      </Box>

      <Box sx={{ p: { xs: 2, sm: 2.5 } }}>
        {geocodeSuccess && (
          <Alert severity="success" sx={{ mb: 2, borderRadius: 2 }}>{geocodeSuccess}</Alert>
        )}

        {/* Stats Row */}
        <Grid container spacing={1.5} sx={{ mb: 2.5 }}>
          <Grid size={{ xs: 6, sm: 3 }}>
            <Box sx={{ textAlign: 'center', p: 1.5, borderRadius: 2, bgcolor: alpha('#f59e0b', 0.08) }}>
              <ClockIcon sx={{ color: '#f59e0b', fontSize: 20 }} />
              <Typography variant="h6" fontWeight={700}>{formatDuration(route.totalDurationMinutes)}</Typography>
              <Typography variant="caption" color="text.secondary">Durata totala</Typography>
            </Box>
          </Grid>
          <Grid size={{ xs: 6, sm: 3 }}>
            <Box sx={{ textAlign: 'center', p: 1.5, borderRadius: 2, bgcolor: alpha('#3b82f6', 0.08) }}>
              <DistanceIcon sx={{ color: '#3b82f6', fontSize: 20 }} />
              <Typography variant="h6" fontWeight={700}>{route.totalDistanceKm} km</Typography>
              <Typography variant="caption" color="text.secondary">Distanta totala</Typography>
            </Box>
          </Grid>
          <Grid size={{ xs: 6, sm: 3 }}>
            <Box sx={{ textAlign: 'center', p: 1.5, borderRadius: 2, bgcolor: alpha('#10b981', 0.08) }}>
              <MapIcon sx={{ color: '#10b981', fontSize: 20 }} />
              <Typography variant="h6" fontWeight={700}>{uniqueStreets.length || route.streetSummary.length}</Typography>
              <Typography variant="caption" color="text.secondary">Strazi vizitate</Typography>
            </Box>
          </Grid>
          <Grid size={{ xs: 6, sm: 3 }}>
            <Box sx={{ textAlign: 'center', p: 1.5, borderRadius: 2, bgcolor: alpha('#8b5cf6', 0.08) }}>
              <LocationIcon sx={{ color: '#8b5cf6', fontSize: 20 }} />
              <Typography variant="h6" fontWeight={700}>{route.points.length}</Typography>
              <Typography variant="caption" color="text.secondary">Puncte GPS</Typography>
            </Box>
          </Grid>
        </Grid>

        {/* Street Summary Chips */}
        {route.geocodingComplete && route.streetSummary.length > 0 && (
          <Box sx={{ mb: 2.5 }}>
            <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1 }}>
              Rezumat Strazi
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
              {route.streetSummary.map((street) => (
                <Chip
                  key={`${street.streetName}-${street.firstVisitTime}`}
                  label={`${street.streetName} (${formatDuration(street.totalDurationMinutes)})`}
                  size="small"
                  sx={{
                    bgcolor: alpha('#f59e0b', 0.1),
                    color: '#92400e',
                    fontWeight: 500,
                    fontSize: '0.75rem',
                  }}
                />
              ))}
            </Box>
          </Box>
        )}

        <Divider sx={{ mb: 2 }} />

        {/* Timeline */}
        <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1.5 }}>
          Cronologie Traseu
        </Typography>

        {pointGroups.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ py: 3, textAlign: 'center' }}>
            Nu sunt puncte GPS inregistrate pentru aceasta tura.
          </Typography>
        ) : (
          <Box sx={{ position: 'relative', pl: 4 }}>
            {/* Vertical line */}
            <Box
              sx={{
                position: 'absolute',
                left: 11,
                top: 8,
                bottom: 8,
                width: 2,
                bgcolor: alpha('#f59e0b', 0.2),
              }}
            />

            {pointGroups.map((group, groupIndex) => {
              const isExpanded = expandedGroups.has(groupIndex);
              const hasMultiplePoints = group.points.length > 1;
              const dotColor = group.isMoving ? '#f59e0b' : '#10b981';

              return (
                <Box key={groupIndex} sx={{ position: 'relative', mb: 1.5 }}>
                  {/* Dot */}
                  <Box
                    sx={{
                      position: 'absolute',
                      left: -25,
                      top: 8,
                      width: 12,
                      height: 12,
                      borderRadius: '50%',
                      bgcolor: dotColor,
                      border: '2px solid white',
                      boxShadow: `0 0 0 2px ${alpha(dotColor, 0.3)}`,
                      zIndex: 1,
                    }}
                  />

                  {/* Content */}
                  <Box
                    sx={{
                      p: 1.5,
                      borderRadius: 2,
                      bgcolor: group.isMoving ? alpha('#f59e0b', 0.04) : alpha('#10b981', 0.04),
                      border: `1px solid ${alpha(dotColor, 0.15)}`,
                      cursor: hasMultiplePoints ? 'pointer' : 'default',
                    }}
                    onClick={() => hasMultiplePoints && toggleGroup(groupIndex)}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="body2" fontWeight={700} sx={{ color: 'text.secondary', minWidth: 45 }}>
                            {formatTime(group.firstTime)}
                          </Typography>
                          <Typography variant="body2" fontWeight={600} noWrap sx={{ flex: 1 }}>
                            {group.isMoving ? 'Deplasare' : group.address}
                          </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', gap: 1, mt: 0.5, ml: '53px' }}>
                          {group.totalDuration > 0 && (
                            <Chip
                              label={formatDuration(group.totalDuration)}
                              size="small"
                              sx={{ height: 20, fontSize: '0.7rem', bgcolor: alpha(dotColor, 0.1), color: dotColor }}
                            />
                          )}
                          {group.points[0].distanceFromPrev > 0 && (
                            <Chip
                              label={formatDistance(group.points[0].distanceFromPrev)}
                              size="small"
                              variant="outlined"
                              sx={{ height: 20, fontSize: '0.7rem' }}
                            />
                          )}
                          {hasMultiplePoints && (
                            <Chip
                              label={`${group.points.length} puncte`}
                              size="small"
                              variant="outlined"
                              sx={{ height: 20, fontSize: '0.7rem' }}
                            />
                          )}
                        </Box>
                      </Box>
                      {hasMultiplePoints && (
                        <IconButton size="small">
                          {isExpanded ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
                        </IconButton>
                      )}
                    </Box>

                    {/* Expanded points */}
                    {hasMultiplePoints && (
                      <Collapse in={isExpanded}>
                        <Box sx={{ mt: 1, pl: '53px' }}>
                          {group.points.map((point, pIndex) => (
                            <Box key={point.id} sx={{ display: 'flex', gap: 1, alignItems: 'center', py: 0.25 }}>
                              <Typography variant="caption" color="text.secondary" sx={{ minWidth: 40 }}>
                                {formatTime(point.recordedAt)}
                              </Typography>
                              <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: alpha(dotColor, 0.4) }} />
                              <Typography variant="caption" color="text.secondary">
                                {point.address || `${point.latitude.toFixed(5)}, ${point.longitude.toFixed(5)}`}
                                {point.distanceFromPrev > 0 && ` (${formatDistance(point.distanceFromPrev)})`}
                              </Typography>
                            </Box>
                          ))}
                        </Box>
                      </Collapse>
                    )}
                  </Box>
                </Box>
              );
            })}
          </Box>
        )}
      </Box>
    </Paper>
  );
};

export default RouteTimeline;
