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
  WbSunny as SolarIcon,
  ElectricBolt as ElectricIcon,
  FiberNew as NewIcon,
  History as OldIcon,
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
import type { ParkingMeter, ParkingZone, PowerSource, MeterCondition } from '../../types/parking.types';

// Fix default marker icons in Leaflet + Vite
// eslint-disable-next-line @typescript-eslint/no-explicit-any
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Zone color mapping
const ZONE_COLORS: Record<ParkingZone, { bg: string; border: string; shadow: string }> = {
  ROSU: { bg: '#ef4444', border: '#ffffff', shadow: 'rgba(239,68,68,0.5)' },
  GALBEN: { bg: '#f59e0b', border: '#ffffff', shadow: 'rgba(245,158,11,0.5)' },
  ALB: { bg: '#9ca3af', border: '#ffffff', shadow: 'rgba(156,163,175,0.5)' },
};

const ZONE_LABELS: Record<ParkingZone, string> = { ROSU: 'Rosu', GALBEN: 'Galben', ALB: 'Alb' };
const POWER_LABELS: Record<PowerSource, string> = { CURENT: 'Curent', SOLAR: 'Solar' };
const CONDITION_LABELS: Record<MeterCondition, string> = { NOU: 'Nou', VECHI: 'Vechi' };

// Create zone-colored marker icon
const createZoneIcon = (zone: ParkingZone) => {
  const colors = ZONE_COLORS[zone];
  return L.divIcon({
    className: 'parking-meter-marker',
    html: `<div style="
      background-color: ${colors.bg};
      width: 28px;
      height: 28px;
      border-radius: 50%;
      border: 3px solid ${colors.border};
      box-shadow: 0 2px 8px ${colors.shadow};
      display: flex;
      align-items: center;
      justify-content: center;
    "><span style="color: white; font-size: 14px; font-weight: 700;">P</span></div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -16],
  });
};

// Pre-create icons for each zone
const zoneIcons: Record<ParkingZone, L.DivIcon> = {
  ROSU: createZoneIcon('ROSU'),
  GALBEN: createZoneIcon('GALBEN'),
  ALB: createZoneIcon('ALB'),
};

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

// ============== Chip Selector Component ==============

interface ChipOption<T extends string> {
  value: T;
  label: string;
  color: string;
  textColor?: string;
  icon?: React.ReactElement;
}

interface ChipSelectorProps<T extends string> {
  label: string;
  options: ChipOption<T>[];
  value: T;
  onChange: (value: T) => void;
}

function ChipSelector<T extends string>({ label, options, value, onChange }: ChipSelectorProps<T>) {
  return (
    <Box>
      <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary', mb: 0.75, display: 'block' }}>
        {label}
      </Typography>
      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
        {options.map((opt) => {
          const isSelected = value === opt.value;
          return (
            <Chip
              key={opt.value}
              label={opt.label}
              icon={opt.icon}
              onClick={() => onChange(opt.value)}
              sx={{
                fontWeight: 600,
                fontSize: '0.8rem',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                bgcolor: isSelected ? opt.color : 'grey.100',
                color: isSelected ? (opt.textColor || 'white') : 'text.secondary',
                border: '2px solid',
                borderColor: isSelected ? opt.color : 'transparent',
                '& .MuiChip-icon': {
                  color: isSelected ? (opt.textColor || 'white') : 'text.secondary',
                },
                '&:hover': {
                  bgcolor: isSelected ? opt.color : alpha(opt.color, 0.15),
                  borderColor: opt.color,
                },
                boxShadow: isSelected ? `0 2px 8px ${alpha(opt.color, 0.4)}` : 'none',
              }}
            />
          );
        })}
      </Box>
    </Box>
  );
}

// ============== Main Component ==============

interface FormData {
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  zone: ParkingZone;
  powerSource: PowerSource;
  condition: MeterCondition;
}

const DEFAULT_FORM: FormData = {
  name: '',
  address: '',
  latitude: 0,
  longitude: 0,
  zone: 'ROSU',
  powerSource: 'CURENT',
  condition: 'NOU',
};

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
  const [formData, setFormData] = useState<FormData>(DEFAULT_FORM);
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
    setFormData({ ...DEFAULT_FORM, latitude: lat, longitude: lng });
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
      zone: meter.zone || 'ALB',
      powerSource: meter.powerSource || 'CURENT',
      condition: meter.condition || 'NOU',
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
      const payload = {
        name: formData.name.trim(),
        address: formData.address.trim() || undefined,
        latitude: formData.latitude,
        longitude: formData.longitude,
        zone: formData.zone,
        powerSource: formData.powerSource,
        condition: formData.condition,
      };
      if (editingMeter) {
        await updateMeter({ id: editingMeter.id, data: payload }).unwrap();
      } else {
        await createMeter(payload).unwrap();
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

  // Chip selector options
  const zoneOptions: ChipOption<ParkingZone>[] = [
    { value: 'ROSU', label: 'Rosu', color: '#ef4444' },
    { value: 'GALBEN', label: 'Galben', color: '#f59e0b' },
    { value: 'ALB', label: 'Alb', color: '#6b7280', textColor: 'white' },
  ];

  const powerOptions: ChipOption<PowerSource>[] = [
    { value: 'CURENT', label: 'Curent', color: '#3b82f6', icon: <ElectricIcon sx={{ fontSize: 16 }} /> },
    { value: 'SOLAR', label: 'Solar', color: '#f97316', icon: <SolarIcon sx={{ fontSize: 16 }} /> },
  ];

  const conditionOptions: ChipOption<MeterCondition>[] = [
    { value: 'NOU', label: 'Nou', color: '#10b981', icon: <NewIcon sx={{ fontSize: 16 }} /> },
    { value: 'VECHI', label: 'Vechi', color: '#8b5cf6', icon: <OldIcon sx={{ fontSize: 16 }} /> },
  ];

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
                icon={zoneIcons[meter.zone] || zoneIcons.ALB}
              >
                <Popup minWidth={220} maxWidth={300}>
                  <Box sx={{ p: 0.5 }} onMouseDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5, color: ZONE_COLORS[meter.zone]?.bg || '#8b5cf6' }}>
                      {meter.name}
                    </Typography>
                    {meter.address && (
                      <Typography variant="caption" sx={{ display: 'block', mb: 0.5, color: 'text.secondary' }}>
                        {meter.address}
                      </Typography>
                    )}
                    {/* Zone / Power / Condition chips */}
                    <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mb: 0.75 }}>
                      <Chip
                        label={ZONE_LABELS[meter.zone] || meter.zone}
                        size="small"
                        sx={{
                          height: 20,
                          fontSize: '0.65rem',
                          fontWeight: 700,
                          bgcolor: ZONE_COLORS[meter.zone]?.bg || '#9ca3af',
                          color: 'white',
                        }}
                      />
                      <Chip
                        icon={meter.powerSource === 'SOLAR' ? <SolarIcon sx={{ fontSize: '12px !important' }} /> : <ElectricIcon sx={{ fontSize: '12px !important' }} />}
                        label={POWER_LABELS[meter.powerSource] || meter.powerSource}
                        size="small"
                        sx={{
                          height: 20,
                          fontSize: '0.65rem',
                          fontWeight: 600,
                          bgcolor: meter.powerSource === 'SOLAR' ? '#fff7ed' : '#eff6ff',
                          color: meter.powerSource === 'SOLAR' ? '#ea580c' : '#2563eb',
                          '& .MuiChip-icon': { color: meter.powerSource === 'SOLAR' ? '#ea580c' : '#2563eb' },
                        }}
                      />
                      <Chip
                        label={CONDITION_LABELS[meter.condition] || meter.condition}
                        size="small"
                        sx={{
                          height: 20,
                          fontSize: '0.65rem',
                          fontWeight: 600,
                          bgcolor: meter.condition === 'NOU' ? '#ecfdf5' : '#f5f3ff',
                          color: meter.condition === 'NOU' ? '#059669' : '#7c3aed',
                        }}
                      />
                    </Box>
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

          {/* Zone selector */}
          <ChipSelector<ParkingZone>
            label="Zona"
            options={zoneOptions}
            value={formData.zone}
            onChange={(zone) => setFormData({ ...formData, zone })}
          />

          {/* Power source selector */}
          <ChipSelector<PowerSource>
            label="Alimentare"
            options={powerOptions}
            value={formData.powerSource}
            onChange={(powerSource) => setFormData({ ...formData, powerSource })}
          />

          {/* Condition selector */}
          <ChipSelector<MeterCondition>
            label="Stare"
            options={conditionOptions}
            value={formData.condition}
            onChange={(condition) => setFormData({ ...formData, condition })}
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
