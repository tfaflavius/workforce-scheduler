import React, { useState, useCallback, useRef } from 'react';
import {
  Box,
  Typography,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  CircularProgress,
  Alert,
  IconButton,
  alpha,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  Place as PlaceIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Close as CloseIcon,
  MyLocation as MyLocationIcon,
} from '@mui/icons-material';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  useGetParkingMetersQuery,
  useCreateParkingMeterMutation,
  useUpdateParkingMeterMutation,
  useDeleteParkingMeterMutation,
} from '../../store/api/parking.api';
import type { ParkingMeter } from '../../types/parking.types';

// Fix default marker icons in Leaflet + Vite
// eslint-disable-next-line @typescript-eslint/no-explicit-any
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Custom violet marker icon for parking meters
const meterIcon = L.divIcon({
  className: 'parking-meter-marker',
  html: `<div style="
    background-color: #8b5cf6;
    width: 28px;
    height: 28px;
    border-radius: 50%;
    border: 3px solid white;
    box-shadow: 0 2px 8px rgba(0,0,0,0.35);
    display: flex;
    align-items: center;
    justify-content: center;
  "><span style="color: white; font-size: 14px; font-weight: 700;">P</span></div>`,
  iconSize: [28, 28],
  iconAnchor: [14, 14],
  popupAnchor: [0, -16],
});

// New meter marker (green)
const newMeterIcon = L.divIcon({
  className: 'new-meter-marker',
  html: `<div style="
    background-color: #22c55e;
    width: 28px;
    height: 28px;
    border-radius: 50%;
    border: 3px solid white;
    box-shadow: 0 0 12px rgba(34,197,94,0.6);
    display: flex;
    align-items: center;
    justify-content: center;
  "><span style="color: white; font-size: 16px; font-weight: 700;">+</span></div>`,
  iconSize: [28, 28],
  iconAnchor: [14, 14],
  popupAnchor: [0, -16],
});

// ORADEA center
const ORADEA_CENTER: [number, number] = [47.06, 21.94];

// ============== Map Click Handler ==============

interface MapClickHandlerProps {
  onMapClick: (lat: number, lng: number) => void;
  popupOpenRef: React.MutableRefObject<boolean>;
}

const MapClickHandler: React.FC<MapClickHandlerProps> = ({ onMapClick, popupOpenRef }) => {
  useMapEvents({
    click(e) {
      // Ignore clicks when a popup is open (prevents creating new markers when interacting with popups)
      if (popupOpenRef.current) {
        return;
      }
      onMapClick(e.latlng.lat, e.latlng.lng);
    },
    popupopen() {
      popupOpenRef.current = true;
    },
    popupclose() {
      // Small delay to prevent the close-click from also triggering a map click
      setTimeout(() => {
        popupOpenRef.current = false;
      }, 100);
    },
  });
  return null;
};

// ============== Main Component ==============

const ParcometrePage: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  // API hooks
  const { data: meters, isLoading } = useGetParkingMetersQuery();
  const [createMeter, { isLoading: creating }] = useCreateParkingMeterMutation();
  const [updateMeter, { isLoading: updating }] = useUpdateParkingMeterMutation();
  const [deleteMeter] = useDeleteParkingMeterMutation();

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingMeter, setEditingMeter] = useState<ParkingMeter | null>(null);
  const [formData, setFormData] = useState({ name: '', address: '', latitude: 0, longitude: 0 });
  const [error, setError] = useState('');

  // Delete confirm dialog state
  const [deletingMeter, setDeletingMeter] = useState<ParkingMeter | null>(null);

  // New marker position (before saving)
  const [newMarkerPos, setNewMarkerPos] = useState<[number, number] | null>(null);

  // Ref to track if a popup is currently open (prevents map click while interacting with popups)
  const popupOpenRef = useRef(false);

  // Handle map click -> open create dialog
  const handleMapClick = useCallback((lat: number, lng: number) => {
    // Guard: don't open create dialog if already open
    if (dialogOpen) return;
    setEditingMeter(null);
    setFormData({ name: '', address: '', latitude: lat, longitude: lng });
    setNewMarkerPos([lat, lng]);
    setError('');
    setDialogOpen(true);
  }, [dialogOpen]);

  // Handle edit existing meter
  const handleEdit = useCallback((meter: ParkingMeter) => {
    setEditingMeter(meter);
    setFormData({
      name: meter.name,
      address: meter.address || '',
      latitude: Number(meter.latitude),
      longitude: Number(meter.longitude),
    });
    setNewMarkerPos(null);
    setError('');
    setDialogOpen(true);
  }, []);

  // Handle save (create or update)
  const handleSave = async () => {
    if (!formData.name.trim()) {
      setError('Numele este obligatoriu.');
      return;
    }
    try {
      setError('');
      if (editingMeter) {
        await updateMeter({
          id: editingMeter.id,
          data: {
            name: formData.name.trim(),
            address: formData.address.trim() || undefined,
            latitude: formData.latitude,
            longitude: formData.longitude,
          },
        }).unwrap();
      } else {
        await createMeter({
          name: formData.name.trim(),
          address: formData.address.trim() || undefined,
          latitude: formData.latitude,
          longitude: formData.longitude,
        }).unwrap();
      }
      setDialogOpen(false);
      setNewMarkerPos(null);
      setEditingMeter(null);
    } catch (err: any) {
      setError(err?.data?.message || 'Eroare la salvare.');
    }
  };

  // Handle delete confirm
  const handleDeleteConfirm = async () => {
    if (!deletingMeter) return;
    try {
      await deleteMeter(deletingMeter.id).unwrap();
      setDeletingMeter(null);
    } catch {
      // silent
    }
  };

  // Close dialog
  const handleCloseDialog = () => {
    setDialogOpen(false);
    setNewMarkerPos(null);
    setEditingMeter(null);
  };

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
          px: { xs: 2, sm: 3 },
          py: { xs: 1.5, sm: 2 },
          flexWrap: 'wrap',
        }}
      >
        <PlaceIcon sx={{ fontSize: { xs: 26, sm: 32 }, color: '#8b5cf6' }} />
        <Typography variant="h5" sx={{ fontWeight: 700, fontSize: { xs: '1.15rem', sm: '1.4rem' }, flex: 1 }}>
          Parcometre
        </Typography>
        {meters && (
          <Chip
            icon={<MyLocationIcon sx={{ fontSize: 16 }} />}
            label={`${meters.length} parcometr${meters.length !== 1 ? 'e' : 'u'}`}
            sx={{
              fontWeight: 600,
              bgcolor: alpha('#8b5cf6', 0.1),
              color: '#8b5cf6',
              '& .MuiChip-icon': { color: '#8b5cf6' },
            }}
          />
        )}
      </Box>

      {/* Info bar */}
      <Box sx={{ px: { xs: 2, sm: 3 }, pb: 1.5 }}>
        <Alert
          severity="info"
          icon={<AddIcon />}
          sx={{
            borderRadius: 2,
            py: 0,
            '& .MuiAlert-message': { fontSize: '0.8rem' },
          }}
        >
          Click pe harta pentru a adauga un parcometru nou.
        </Alert>
      </Box>

      {/* Map */}
      <Box
        sx={{
          flex: 1,
          mx: { xs: 1, sm: 2, md: 3 },
          mb: { xs: 1, sm: 2 },
          borderRadius: 3,
          overflow: 'hidden',
          border: '1px solid',
          borderColor: 'divider',
          minHeight: { xs: 400, sm: 500, md: 600 },
          position: 'relative',
        }}
      >
        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', minHeight: 400 }}>
            <CircularProgress sx={{ color: '#8b5cf6' }} />
          </Box>
        ) : (
          <MapContainer
            center={ORADEA_CENTER}
            zoom={14}
            style={{ height: '100%', width: '100%', minHeight: isMobile ? 400 : 500 }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            <MapClickHandler onMapClick={handleMapClick} popupOpenRef={popupOpenRef} />

            {/* Existing parking meter markers */}
            {meters?.map((meter) => (
              <Marker
                key={meter.id}
                position={[Number(meter.latitude), Number(meter.longitude)]}
                icon={meterIcon}
              >
                <Popup minWidth={200} maxWidth={280}>
                  <Box sx={{ p: 0.5 }} onMouseDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5, color: '#8b5cf6' }}>
                      {meter.name}
                    </Typography>
                    {meter.address && (
                      <Typography variant="caption" sx={{ display: 'block', mb: 0.5, color: 'text.secondary' }}>
                        {meter.address}
                      </Typography>
                    )}
                    <Typography
                      variant="caption"
                      sx={{ display: 'block', mb: 1, color: 'text.disabled', fontSize: '0.65rem' }}
                    >
                      {Number(meter.latitude).toFixed(6)}, {Number(meter.longitude).toFixed(6)}
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                      <Button
                        size="small"
                        startIcon={<EditIcon sx={{ fontSize: 14 }} />}
                        onClick={() => handleEdit(meter)}
                        sx={{ fontSize: '0.7rem', textTransform: 'none', minWidth: 'auto', px: 1 }}
                      >
                        Editeaza
                      </Button>
                      <Button
                        size="small"
                        color="error"
                        startIcon={<DeleteIcon sx={{ fontSize: 14 }} />}
                        onClick={() => setDeletingMeter(meter)}
                        sx={{ fontSize: '0.7rem', textTransform: 'none', minWidth: 'auto', px: 1 }}
                      >
                        Sterge
                      </Button>
                    </Box>
                  </Box>
                </Popup>
              </Marker>
            ))}

            {/* New marker preview (before saving) */}
            {newMarkerPos && (
              <Marker position={newMarkerPos} icon={newMeterIcon}>
                <Popup>
                  <Typography variant="caption" sx={{ fontWeight: 600 }}>
                    Parcometru nou
                  </Typography>
                </Popup>
              </Marker>
            )}
          </MapContainer>
        )}
      </Box>

      {/* Create/Edit Dialog */}
      <Dialog
        open={dialogOpen}
        onClose={handleCloseDialog}
        fullScreen={isMobile}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: isMobile ? 0 : 3,
            overflow: 'hidden',
          },
        }}
      >
        <DialogTitle
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            background: 'linear-gradient(135deg, #8b5cf6 0%, #a78bfa 100%)',
            color: 'white',
            py: 1.5,
            px: { xs: 2, sm: 3 },
            minHeight: 56,
          }}
        >
          <PlaceIcon />
          <Typography variant="h6" sx={{ fontWeight: 600, flex: 1, fontSize: { xs: '1rem', sm: '1.15rem' } }}>
            {editingMeter ? 'Editeaza Parcometru' : 'Parcometru Nou'}
          </Typography>
          <IconButton onClick={handleCloseDialog} sx={{ color: 'white' }}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>

        <DialogContent
          sx={{
            pt: '28px !important',
            pb: 2,
            px: { xs: 2, sm: 3 },
            display: 'flex',
            flexDirection: 'column',
            gap: 2.5,
          }}
        >
          {error && (
            <Alert severity="error" sx={{ borderRadius: 2 }} onClose={() => setError('')}>
              {error}
            </Alert>
          )}

          <TextField
            fullWidth
            label="Nume parcometru"
            placeholder="ex: Parcometru Str. Republicii 14"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
            autoFocus
            variant="outlined"
          />

          <TextField
            fullWidth
            label="Adresa (optional)"
            placeholder="ex: Str. Republicii nr. 14"
            value={formData.address}
            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            variant="outlined"
          />

          <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', sm: 'row' } }}>
            <TextField
              fullWidth
              label="Latitudine"
              value={formData.latitude.toFixed(6)}
              slotProps={{ input: { readOnly: true } }}
              size="small"
              variant="outlined"
              sx={{
                '& .MuiInputBase-root': { bgcolor: 'grey.50' },
                '& .MuiInputBase-input': { fontFamily: 'monospace', fontSize: '0.875rem' },
              }}
            />
            <TextField
              fullWidth
              label="Longitudine"
              value={formData.longitude.toFixed(6)}
              slotProps={{ input: { readOnly: true } }}
              size="small"
              variant="outlined"
              sx={{
                '& .MuiInputBase-root': { bgcolor: 'grey.50' },
                '& .MuiInputBase-input': { fontFamily: 'monospace', fontSize: '0.875rem' },
              }}
            />
          </Box>
        </DialogContent>

        <DialogActions
          sx={{
            px: { xs: 2, sm: 3 },
            pb: { xs: 2, sm: 2.5 },
            pt: 1,
            gap: 1,
            flexDirection: { xs: 'column-reverse', sm: 'row' },
            '& > button': { minWidth: { xs: '100%', sm: 'auto' } },
          }}
        >
          <Button
            onClick={handleCloseDialog}
            variant="outlined"
            sx={{ borderRadius: 2, py: { xs: 1.2, sm: 1 } }}
          >
            Anuleaza
          </Button>
          <Button
            onClick={handleSave}
            variant="contained"
            disabled={creating || updating || !formData.name.trim()}
            sx={{
              borderRadius: 2,
              py: { xs: 1.2, sm: 1 },
              background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
              '&:hover': { background: 'linear-gradient(135deg, #7c3aed, #6d28d9)' },
            }}
          >
            {creating || updating ? <CircularProgress size={20} color="inherit" /> : editingMeter ? 'Salveaza' : 'Adauga'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={!!deletingMeter}
        onClose={() => setDeletingMeter(null)}
        maxWidth="xs"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, pb: 1 }}>
          <DeleteIcon color="error" />
          <Typography variant="h6" sx={{ fontWeight: 600, fontSize: '1.05rem' }}>
            Sterge Parcometru
          </Typography>
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            Esti sigur ca vrei sa stergi parcometrul <strong>{deletingMeter?.name}</strong>?
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
          <Button onClick={() => setDeletingMeter(null)} variant="outlined" sx={{ borderRadius: 2 }}>
            Anuleaza
          </Button>
          <Button
            onClick={handleDeleteConfirm}
            variant="contained"
            color="error"
            sx={{ borderRadius: 2 }}
          >
            Sterge
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ParcometrePage;
