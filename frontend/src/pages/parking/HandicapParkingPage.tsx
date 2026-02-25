import React, { useState, useMemo, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Pagination,
  useTheme,
  useMediaQuery,
  alpha,
  Fade,
  Grow,
  Stack,
  Card,
  CardContent,
  Chip,
  Button,
  IconButton,
  TextField,
  InputAdornment,
  Skeleton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  CircularProgress,
  Alert,
} from '@mui/material';
import {
  Accessible as HandicapIcon,
  AddCircle as AddIcon,
  Place as PlaceIcon,
  Person as PersonIcon,
  Phone as PhoneIcon,
  DirectionsCar as CarIcon,
  Badge as CertificateIcon,
  Search as SearchIcon,
  Close as CloseIcon,
  Check as CheckIcon,
  Delete as DeleteIcon,
  Comment as CommentIcon,
  History as HistoryIcon,
  Map as MapIcon,
  Send as SendIcon,
  FormatPaint as MarkingIcon,
  RemoveCircle as RevokeIcon,
  AddBox as PlacementIcon,
  Edit as EditIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  PictureAsPdf as PdfIcon,
  TableChart as ExcelIcon,
  Summarize as AllSectionsIcon,
} from '@mui/icons-material';
import { useAppSelector } from '../../store/hooks';
import { Navigate, useLocation } from 'react-router-dom';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { ro } from 'date-fns/locale';
import {
  useGetHandicapRequestsQuery,
  useGetHandicapRequestQuery,
  useCreateHandicapRequestMutation,
  useUpdateHandicapRequestMutation,
  useResolveHandicapRequestMutation,
  useDeleteHandicapRequestMutation,
  useAddHandicapCommentMutation,
  useGetHandicapHistoryQuery,
  useGetHandicapLegitimationsQuery,
  useGetRevolutionarLegitimationsQuery,
} from '../../store/api/handicap.api';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import type {
  HandicapRequest,
  HandicapRequestType,
  HandicapRequestStatus,
  CreateHandicapRequestDto,
  HandicapLegitimationStatus,
} from '../../types/handicap.types';
import {
  HANDICAP_REQUEST_TYPE_LABELS,
  HANDICAP_REQUEST_STATUS_LABELS,
  HANDICAP_LEGITIMATION_STATUS_LABELS,
  REVOLUTIONAR_LEGITIMATION_STATUS_LABELS,
} from '../../types/handicap.types';
import { HISTORY_ACTION_LABELS } from '../../types/parking.types';
import { removeDiacritics } from '../../utils/removeDiacritics';
// LegitimationIcon and RevolutionarIcon used in sub-components
import HandicapLegitimatiiTab from './HandicapLegitimatiiTab';
import RevolutionarLegitimatiiTab from './RevolutionarLegitimatiiTab';
import type { RevolutionarLegitimationStatus } from '../../types/handicap.types';
import {
  MAINTENANCE_DEPARTMENT_NAME,
  HANDICAP_DEPARTMENT_NAME,
  DOMICILIU_DEPARTMENT_NAME,
} from '../../constants/departments';

// Departamente cu acces
const ALLOWED_DEPARTMENTS = [MAINTENANCE_DEPARTMENT_NAME, HANDICAP_DEPARTMENT_NAME, DOMICILIU_DEPARTMENT_NAME];
const HANDICAP_PARKING_DEPARTMENT_NAME = HANDICAP_DEPARTMENT_NAME;

// Culori pentru legitimatii
const LEGITIMATION_COLOR = { main: '#059669', bg: '#05966915' };
const REVOLUTIONAR_COLOR = { main: '#7c3aed', bg: '#7c3aed15' };

// Culori pentru tipuri de solicitari
const REQUEST_TYPE_COLORS: Record<HandicapRequestType, { main: string; bg: string }> = {
  AMPLASARE_PANOU: { main: '#2563eb', bg: '#2563eb15' },
  REVOCARE_PANOU: { main: '#f59e0b', bg: '#f59e0b15' },
  CREARE_MARCAJ: { main: '#8b5cf6', bg: '#8b5cf615' },
};

// Icons pentru tipuri
const REQUEST_TYPE_ICONS: Record<HandicapRequestType, React.ReactNode> = {
  AMPLASARE_PANOU: <PlacementIcon />,
  REVOCARE_PANOU: <RevokeIcon />,
  CREARE_MARCAJ: <MarkingIcon />,
};

const ITEMS_PER_PAGE = 10;

// Genereaza optiunile de luna (ultimele 12 luni)
const generateMonthOptions = () => {
  const options: { value: string; label: string }[] = [];
  const now = new Date();
  for (let i = 0; i < 12; i++) {
    const date = subMonths(now, i);
    const value = format(date, 'yyyy-MM');
    const label = format(date, 'MMMM yyyy', { locale: ro });
    options.push({ value, label: label.charAt(0).toUpperCase() + label.slice(1) });
  }
  return options;
};

const MONTH_OPTIONS = generateMonthOptions();

// ============== CREATE DIALOG ==============
interface CreateDialogProps {
  open: boolean;
  onClose: () => void;
  requestType: HandicapRequestType;
}

const CreateHandicapRequestDialog: React.FC<CreateDialogProps> = ({ open, onClose, requestType }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [createRequest, { isLoading }] = useCreateHandicapRequestMutation();
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState<CreateHandicapRequestDto>({
    requestType,
    location: '',
    googleMapsLink: '',
    description: '',
    personName: '',
    handicapCertificateNumber: '',
    carPlate: '',
    phone: '',
  });

  // Sync requestType when dialog opens or type changes
  useEffect(() => {
    if (open) {
      setFormData(prev => ({
        ...prev,
        requestType,
      }));
      setError(null);
    }
  }, [open, requestType]);

  // Reset form when dialog closes
  useEffect(() => {
    if (!open) {
      setFormData({
        requestType,
        location: '',
        googleMapsLink: '',
        description: '',
        personName: '',
        handicapCertificateNumber: '',
        carPlate: '',
        phone: '',
      });
      setError(null);
    }
  }, [open, requestType]);

  const isPersonFieldsRequired = requestType !== 'CREARE_MARCAJ';

  // Auto-generate Google Maps link from location
  const generateMapsLink = (location: string) => {
    if (!location.trim()) return '';
    const query = encodeURIComponent(`${location.trim()}, Oradea, Bihor`);
    return `https://www.google.com/maps/search/?api=1&query=${query}`;
  };

  const handleLocationChange = (value: string) => {
    const cleanValue = removeDiacritics(value);
    const wasAutoGenerated = !formData.googleMapsLink || formData.googleMapsLink === generateMapsLink(formData.location);
    setFormData(prev => ({
      ...prev,
      location: cleanValue,
      // Only auto-update if the link was empty or was previously auto-generated
      googleMapsLink: wasAutoGenerated ? generateMapsLink(cleanValue) : prev.googleMapsLink,
    }));
  };

  const handleTextChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({ ...prev, [field]: removeDiacritics(e.target.value) }));
  };

  const handleSubmit = async () => {
    console.log('handleSubmit called, formData:', formData);
    console.log('isFormValid:', isFormValid());
    setError(null);
    try {
      await createRequest(formData).unwrap();
      onClose();
      setFormData({
        requestType,
        location: '',
        googleMapsLink: '',
        description: '',
        personName: '',
        handicapCertificateNumber: '',
        carPlate: '',
        phone: '',
      });
    } catch (err: any) {
      console.error('Error creating request:', err);
      // Extract error message from various possible formats
      const errorMessage =
        err?.data?.message ||
        err?.error?.data?.message ||
        (Array.isArray(err?.data?.message) ? err.data.message.join(', ') : null) ||
        err?.message ||
        'A aparut o eroare la crearea solicitarii';
      console.log('Setting error:', errorMessage);
      setError(errorMessage);
    }
  };

  const isFormValid = () => {
    if (!formData.location || !formData.description) return false;
    if (isPersonFieldsRequired) {
      return !!(formData.personName && formData.handicapCertificateNumber && formData.carPlate && formData.phone);
    }
    return true;
  };

  const typeColor = REQUEST_TYPE_COLORS[requestType].main;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      fullScreen={isMobile}
      PaperProps={{
        sx: {
          borderRadius: isMobile ? 0 : 2,
          m: isMobile ? 0 : 2,
        },
      }}
    >
      <DialogTitle
        sx={{
          bgcolor: typeColor,
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
          py: 2,
        }}
      >
        {REQUEST_TYPE_ICONS[requestType]}
        <Box sx={{ flex: 1 }}>
          <Typography variant="h6" sx={{ fontWeight: 600, fontSize: { xs: '1.1rem', sm: '1.25rem' } }}>
            {HANDICAP_REQUEST_TYPE_LABELS[requestType]}
          </Typography>
        </Box>
        <IconButton onClick={onClose} sx={{ color: 'white' }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers sx={{ p: { xs: 2, sm: 3 } }}>
        <Stack spacing={2}>
          {error && (
            <Alert severity="error" onClose={() => setError(null)} sx={{ borderRadius: 2 }}>
              {error}
            </Alert>
          )}

          {/* Locatie */}
          <TextField
            label="Locatie (Strada, Numar) *"
            value={formData.location}
            onChange={(e) => handleLocationChange(e.target.value)}
            fullWidth
            size="medium"
            placeholder="Ex: Str. Republicii nr. 10"
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <PlaceIcon color="action" />
                </InputAdornment>
              ),
            }}
          />

          {/* Google Maps Link - auto-generated, clickable */}
          {formData.googleMapsLink && (
            <Button
              variant="outlined"
              startIcon={<MapIcon />}
              href={formData.googleMapsLink}
              target="_blank"
              rel="noopener noreferrer"
              fullWidth
              sx={{
                justifyContent: 'flex-start',
                textTransform: 'none',
                py: 1.25,
                borderColor: 'divider',
                color: 'primary.main',
                fontWeight: 500,
                fontSize: { xs: '0.8rem', sm: '0.875rem' },
                '&:hover': {
                  borderColor: 'primary.main',
                  bgcolor: alpha(theme.palette.primary.main, 0.04),
                },
              }}
            >
              Deschide in Google Maps
            </Button>
          )}

          {/* Campuri specifice pentru AMPLASARE si REVOCARE */}
          {isPersonFieldsRequired && (
            <>
              <Divider>
                <Chip label="Date persoana" size="small" variant="outlined" />
              </Divider>

              <TextField
                label="Nume persoana *"
                value={formData.personName}
                onChange={handleTextChange('personName')}
                fullWidth
                size="medium"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <PersonIcon color="action" />
                    </InputAdornment>
                  ),
                }}
              />

              <TextField
                label="Numar certificat handicap *"
                value={formData.handicapCertificateNumber}
                onChange={(e) => setFormData({ ...formData, handicapCertificateNumber: e.target.value })}
                fullWidth
                size="medium"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <CertificateIcon color="action" />
                    </InputAdornment>
                  ),
                }}
              />

              <TextField
                label="Numar inmatriculare *"
                value={formData.carPlate}
                onChange={(e) => setFormData({ ...formData, carPlate: e.target.value.toUpperCase() })}
                fullWidth
                size="medium"
                placeholder="Ex: BH-01-ABC"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <CarIcon color="action" />
                    </InputAdornment>
                  ),
                }}
              />

              <TextField
                label="Telefon *"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                fullWidth
                size="medium"
                type="tel"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <PhoneIcon color="action" />
                    </InputAdornment>
                  ),
                }}
              />
            </>
          )}

          {/* Descriere */}
          <TextField
            label="Descriere *"
            value={formData.description}
            onChange={handleTextChange('description')}
            fullWidth
            multiline
            rows={3}
            size="medium"
            placeholder={requestType === 'CREARE_MARCAJ'
              ? 'Descrieti detaliile pentru crearea marcajului...'
              : 'Descrieti motivul solicitarii...'
            }
          />
        </Stack>
      </DialogContent>

      <DialogActions sx={{ p: 2, gap: 1 }}>
        <Button onClick={onClose} disabled={isLoading}>
          Anuleaza
        </Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={!isFormValid() || isLoading}
          startIcon={isLoading ? <CircularProgress size={20} color="inherit" /> : <AddIcon />}
          sx={{ bgcolor: typeColor, '&:hover': { bgcolor: alpha(typeColor, 0.85) } }}
        >
          Creeaza
        </Button>
      </DialogActions>
    </Dialog>
  );
};

// ============== DETAILS DIALOG ==============
interface DetailsDialogProps {
  open: boolean;
  onClose: () => void;
  requestId: string | null;
}

const HandicapRequestDetailsDialog: React.FC<DetailsDialogProps> = ({ open, onClose, requestId }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { user } = useAppSelector((state) => state.auth);

  const { data: request, isLoading, refetch } = useGetHandicapRequestQuery(requestId!, { skip: !requestId });
  const { data: history = [] } = useGetHandicapHistoryQuery(requestId!, { skip: !requestId });
  const [addComment] = useAddHandicapCommentMutation();
  const [updateRequest, { isLoading: isUpdating }] = useUpdateHandicapRequestMutation();
  const [resolveRequest] = useResolveHandicapRequestMutation();
  const [deleteRequest] = useDeleteHandicapRequestMutation();

  const [showHistory, setShowHistory] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [showResolveDialog, setShowResolveDialog] = useState(false);
  const [resolutionDescription, setResolutionDescription] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<{
    location: string;
    googleMapsLink: string;
    description: string;
    personName: string;
    handicapCertificateNumber: string;
    carPlate: string;
    autoNumber: string;
    phone: string;
  }>({
    location: '',
    googleMapsLink: '',
    description: '',
    personName: '',
    handicapCertificateNumber: '',
    carPlate: '',
    autoNumber: '',
    phone: '',
  });

  const isAdmin = user?.role === 'ADMIN';
  const isMaintenanceUser = user?.department?.name === MAINTENANCE_DEPARTMENT_NAME;
  const isHandicapDepartment = user?.department?.name === HANDICAP_PARKING_DEPARTMENT_NAME;
  const canResolve = isAdmin || isMaintenanceUser;
  const canEdit = isAdmin || isHandicapDepartment;

  // Populate edit data when request loads
  useEffect(() => {
    if (request && !isEditing) {
      setEditData({
        location: request.location || '',
        googleMapsLink: request.googleMapsLink || '',
        description: request.description || '',
        personName: request.personName || '',
        handicapCertificateNumber: request.handicapCertificateNumber || '',
        carPlate: request.carPlate || '',
        autoNumber: request.autoNumber || '',
        phone: request.phone || '',
      });
    }
  }, [request, isEditing]);

  const handleStartEdit = () => {
    if (request) {
      setEditData({
        location: request.location || '',
        googleMapsLink: request.googleMapsLink || '',
        description: request.description || '',
        personName: request.personName || '',
        handicapCertificateNumber: request.handicapCertificateNumber || '',
        carPlate: request.carPlate || '',
        autoNumber: request.autoNumber || '',
        phone: request.phone || '',
      });
      setIsEditing(true);
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
  };

  const handleSaveEdit = async () => {
    if (!requestId) return;
    try {
      await updateRequest({ id: requestId, data: editData }).unwrap();
      setIsEditing(false);
      refetch();
    } catch (error) {
      console.error('Error updating request:', error);
    }
  };

  const handleAddComment = async () => {
    if (!requestId || !newComment.trim()) return;
    try {
      await addComment({ requestId, data: { content: newComment } }).unwrap();
      setNewComment('');
    } catch (error) {
      console.error('Error adding comment:', error);
    }
  };

  const handleResolve = async () => {
    if (!requestId || !resolutionDescription.trim()) return;
    try {
      await resolveRequest({ id: requestId, data: { resolutionDescription } }).unwrap();
      setShowResolveDialog(false);
      setResolutionDescription('');
      onClose();
    } catch (error) {
      console.error('Error resolving request:', error);
    }
  };

  const handleDelete = async () => {
    if (!requestId) return;
    if (window.confirm('Sigur doriti sa stergeti aceasta solicitare?')) {
      try {
        await deleteRequest(requestId).unwrap();
        onClose();
      } catch (error) {
        console.error('Error deleting request:', error);
      }
    }
  };

  if (!requestId) return null;

  return (
    <>
      <Dialog
        open={open}
        onClose={onClose}
        maxWidth="md"
        fullWidth
        fullScreen={isMobile}
        PaperProps={{
          sx: { borderRadius: isMobile ? 0 : 3 },
        }}
      >
        {isLoading ? (
          <Box sx={{ p: 4, textAlign: 'center' }}>
            <CircularProgress />
          </Box>
        ) : request ? (
          <>
            <DialogTitle sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              background: `linear-gradient(135deg, ${REQUEST_TYPE_COLORS[request.requestType].main}, ${alpha(REQUEST_TYPE_COLORS[request.requestType].main, 0.7)})`,
              color: 'white',
            }}>
              {REQUEST_TYPE_ICONS[request.requestType]}
              <Box sx={{ flex: 1 }}>
                <Typography variant="h6" component="span">
                  {HANDICAP_REQUEST_TYPE_LABELS[request.requestType]}
                </Typography>
                <Chip
                  label={HANDICAP_REQUEST_STATUS_LABELS[request.status]}
                  size="small"
                  sx={{
                    ml: 1,
                    bgcolor: request.status === 'ACTIVE' ? '#ef444420' : '#10b98120',
                    color: request.status === 'ACTIVE' ? '#ef4444' : '#10b981',
                    fontWeight: 600,
                  }}
                />
              </Box>
              <IconButton onClick={onClose} sx={{ color: 'white' }}>
                <CloseIcon />
              </IconButton>
            </DialogTitle>

            <DialogContent sx={{ pt: 3 }}>
              <Stack spacing={3}>
                {/* Edit/View toggle button */}
                {canEdit && request.status === 'ACTIVE' && (
                  <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                    {!isEditing ? (
                      <Button
                        variant="outlined"
                        startIcon={<EditIcon />}
                        onClick={handleStartEdit}
                        size="small"
                      >
                        Editeaza
                      </Button>
                    ) : (
                      <Stack direction="row" spacing={1}>
                        <Button
                          variant="outlined"
                          startIcon={<CancelIcon />}
                          onClick={handleCancelEdit}
                          size="small"
                          color="inherit"
                        >
                          Anuleaza
                        </Button>
                        <Button
                          variant="contained"
                          startIcon={isUpdating ? <CircularProgress size={16} /> : <SaveIcon />}
                          onClick={handleSaveEdit}
                          size="small"
                          disabled={isUpdating}
                        >
                          Salveaza
                        </Button>
                      </Stack>
                    )}
                  </Box>
                )}

                {/* Info Card */}
                <Card variant="outlined" sx={{ borderRadius: 2 }}>
                  <CardContent>
                    <Stack spacing={2}>
                      {isEditing ? (
                        // Edit mode
                        <>
                          <TextField
                            label="Locatie"
                            value={editData.location}
                            onChange={(e) => setEditData({ ...editData, location: e.target.value })}
                            fullWidth
                            required
                            InputProps={{
                              startAdornment: (
                                <InputAdornment position="start">
                                  <PlaceIcon color="action" />
                                </InputAdornment>
                              ),
                            }}
                          />
                          <TextField
                            label="Link Google Maps"
                            value={editData.googleMapsLink}
                            onChange={(e) => setEditData({ ...editData, googleMapsLink: e.target.value })}
                            fullWidth
                            InputProps={{
                              startAdornment: (
                                <InputAdornment position="start">
                                  <MapIcon color="action" />
                                </InputAdornment>
                              ),
                            }}
                          />
                          <Divider />
                          <TextField
                            label="Nume persoana"
                            value={editData.personName}
                            onChange={(e) => setEditData({ ...editData, personName: e.target.value })}
                            fullWidth
                            InputProps={{
                              startAdornment: (
                                <InputAdornment position="start">
                                  <PersonIcon color="action" />
                                </InputAdornment>
                              ),
                            }}
                          />
                          <TextField
                            label="Nr. certificat handicap"
                            value={editData.handicapCertificateNumber}
                            onChange={(e) => setEditData({ ...editData, handicapCertificateNumber: e.target.value })}
                            fullWidth
                            InputProps={{
                              startAdornment: (
                                <InputAdornment position="start">
                                  <CertificateIcon color="action" />
                                </InputAdornment>
                              ),
                            }}
                          />
                          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                            <TextField
                              label="Numar inmatriculare"
                              value={editData.carPlate}
                              onChange={(e) => setEditData({ ...editData, carPlate: e.target.value.toUpperCase() })}
                              fullWidth
                              InputProps={{
                                startAdornment: (
                                  <InputAdornment position="start">
                                    <CarIcon color="action" />
                                  </InputAdornment>
                                ),
                              }}
                            />
                            <TextField
                              label="Nr. auto (serie sasiu)"
                              value={editData.autoNumber}
                              onChange={(e) => setEditData({ ...editData, autoNumber: e.target.value.toUpperCase() })}
                              fullWidth
                            />
                          </Stack>
                          <TextField
                            label="Telefon"
                            value={editData.phone}
                            onChange={(e) => setEditData({ ...editData, phone: e.target.value })}
                            fullWidth
                            InputProps={{
                              startAdornment: (
                                <InputAdornment position="start">
                                  <PhoneIcon color="action" />
                                </InputAdornment>
                              ),
                            }}
                          />
                          <Divider />
                          <TextField
                            label="Descriere"
                            value={editData.description}
                            onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                            fullWidth
                            multiline
                            rows={3}
                            required
                          />
                        </>
                      ) : (
                        // View mode
                        <>
                          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                            <PlaceIcon color="primary" sx={{ mt: 0.3 }} />
                            <Box>
                              <Typography variant="body2" color="text.secondary">Locatie</Typography>
                              <Typography variant="body1" fontWeight={500}>{request.location}</Typography>
                              {request.googleMapsLink && (
                                <Button
                                  size="small"
                                  startIcon={<MapIcon />}
                                  href={request.googleMapsLink}
                                  target="_blank"
                                  sx={{ mt: 0.5, textTransform: 'none' }}
                                >
                                  Deschide in Maps
                                </Button>
                              )}
                            </Box>
                          </Box>

                          {request.personName && (
                            <>
                              <Divider />
                              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                                <Box sx={{ flex: 1 }}>
                                  <Typography variant="body2" color="text.secondary">Persoana</Typography>
                                  <Typography variant="body1" fontWeight={500}>{request.personName}</Typography>
                                </Box>
                                <Box sx={{ flex: 1 }}>
                                  <Typography variant="body2" color="text.secondary">Nr. Certificat</Typography>
                                  <Typography variant="body1">{request.handicapCertificateNumber}</Typography>
                                </Box>
                              </Stack>
                              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                                <Box sx={{ flex: 1 }}>
                                  <Typography variant="body2" color="text.secondary">Numar Auto</Typography>
                                  <Typography variant="body1" fontWeight={600}>{request.carPlate}</Typography>
                                </Box>
                                <Box sx={{ flex: 1 }}>
                                  <Typography variant="body2" color="text.secondary">Telefon</Typography>
                                  <Typography variant="body1">{request.phone}</Typography>
                                </Box>
                              </Stack>
                            </>
                          )}

                          <Divider />
                          <Box>
                            <Typography variant="body2" color="text.secondary">Descriere</Typography>
                            <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>{request.description}</Typography>
                          </Box>
                        </>
                      )}

                      {request.status === 'FINALIZAT' && request.resolutionDescription && (
                        <>
                          <Divider />
                          <Box sx={{ bgcolor: '#10b98115', p: 2, borderRadius: 2 }}>
                            <Typography variant="body2" color="success.main" fontWeight={600}>
                              Rezolvat de {request.resolver?.fullName} la {format(new Date(request.resolvedAt!), 'dd MMM yyyy, HH:mm', { locale: ro })}
                            </Typography>
                            <Typography variant="body1" sx={{ mt: 1 }}>{request.resolutionDescription}</Typography>
                          </Box>
                        </>
                      )}

                      <Divider />
                      <Stack direction="row" spacing={2} sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>
                        <Box>
                          <Typography variant="caption" color="text.secondary">Creat de</Typography>
                          <Typography variant="body2">{request.creator?.fullName}</Typography>
                        </Box>
                        <Box>
                          <Typography variant="caption" color="text.secondary">Data</Typography>
                          <Typography variant="body2">
                            {format(new Date(request.createdAt), 'dd MMM yyyy, HH:mm', { locale: ro })}
                          </Typography>
                        </Box>
                      </Stack>
                    </Stack>
                  </CardContent>
                </Card>

                {/* Comments Section */}
                <Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                    <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <CommentIcon color="primary" />
                      Comentarii ({request.comments?.length || 0})
                    </Typography>
                    <Button
                      size="small"
                      startIcon={<HistoryIcon />}
                      onClick={() => setShowHistory(!showHistory)}
                    >
                      {showHistory ? 'Ascunde istoric' : 'Vezi istoric'}
                    </Button>
                  </Box>

                  {showHistory && (
                    <Card variant="outlined" sx={{ mb: 2, bgcolor: '#f5f5f5' }}>
                      <CardContent>
                        <Typography variant="subtitle2" gutterBottom>Istoric modificari</Typography>
                        <List dense>
                          {history.map((h) => (
                            <ListItem key={h.id} sx={{ px: 0 }}>
                              <ListItemAvatar>
                                <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main', fontSize: '0.875rem' }}>
                                  {h.user?.fullName?.charAt(0) || '?'}
                                </Avatar>
                              </ListItemAvatar>
                              <ListItemText
                                primary={`${h.user?.fullName || 'Utilizator'} - ${HISTORY_ACTION_LABELS[h.action]}`}
                                secondary={format(new Date(h.createdAt), 'dd MMM yyyy, HH:mm', { locale: ro })}
                                primaryTypographyProps={{ variant: 'body2' }}
                                secondaryTypographyProps={{ variant: 'caption' }}
                              />
                            </ListItem>
                          ))}
                        </List>
                      </CardContent>
                    </Card>
                  )}

                  {/* Comments List */}
                  {request.comments && request.comments.length > 0 && (
                    <Stack spacing={1.5} sx={{ mb: 2 }}>
                      {request.comments.map((comment) => (
                        <Card key={comment.id} variant="outlined" sx={{ borderRadius: 2 }}>
                          <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                              <Avatar sx={{ width: 28, height: 28, fontSize: '0.75rem' }}>
                                {comment.user?.fullName?.charAt(0) || '?'}
                              </Avatar>
                              <Typography variant="body2" fontWeight={600}>
                                {comment.user?.fullName}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {format(new Date(comment.createdAt), 'dd MMM, HH:mm', { locale: ro })}
                              </Typography>
                            </Box>
                            <Typography variant="body2" sx={{ pl: 4.5 }}>
                              {comment.content}
                            </Typography>
                          </CardContent>
                        </Card>
                      ))}
                    </Stack>
                  )}

                  {/* Add Comment */}
                  <Stack direction="row" spacing={1}>
                    <TextField
                      fullWidth
                      size="small"
                      placeholder="Adauga un comentariu..."
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleAddComment()}
                    />
                    <IconButton
                      color="primary"
                      onClick={handleAddComment}
                      disabled={!newComment.trim()}
                    >
                      <SendIcon />
                    </IconButton>
                  </Stack>
                </Box>
              </Stack>
            </DialogContent>

            <DialogActions sx={{ p: 2, pt: 1, justifyContent: 'space-between' }}>
              <Box>
                {isAdmin && (
                  <Button
                    color="error"
                    startIcon={<DeleteIcon />}
                    onClick={handleDelete}
                  >
                    Sterge
                  </Button>
                )}
              </Box>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button onClick={onClose}>Inchide</Button>
                {canResolve && request.status === 'ACTIVE' && (
                  <Button
                    variant="contained"
                    color="success"
                    startIcon={<CheckIcon />}
                    onClick={() => setShowResolveDialog(true)}
                  >
                    Finalizeaza
                  </Button>
                )}
              </Box>
            </DialogActions>
          </>
        ) : (
          <Box sx={{ p: 4, textAlign: 'center' }}>
            <Typography>Solicitarea nu a fost gasita</Typography>
          </Box>
        )}
      </Dialog>

      {/* Resolve Dialog */}
      <Dialog
        open={showResolveDialog}
        onClose={() => setShowResolveDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Finalizeaza solicitarea</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            multiline
            rows={3}
            label="Descrierea rezolutiei"
            value={resolutionDescription}
            onChange={(e) => setResolutionDescription(e.target.value)}
            placeholder="Descrieti cum a fost rezolvata solicitarea..."
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowResolveDialog(false)}>Anuleaza</Button>
          <Button
            variant="contained"
            color="success"
            onClick={handleResolve}
            disabled={!resolutionDescription.trim()}
          >
            Finalizeaza
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

// ============== REQUEST CARD ==============
interface RequestCardProps {
  request: HandicapRequest;
  onClick: () => void;
}

const HandicapRequestCard: React.FC<RequestCardProps> = ({ request, onClick }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const colors = REQUEST_TYPE_COLORS[request.requestType];

  return (
    <Card
      onClick={onClick}
      sx={{
        cursor: 'pointer',
        borderRadius: { xs: 2, sm: 2.5 },
        borderLeft: `4px solid ${colors.main}`,
        transition: 'all 0.2s ease',
        touchAction: 'manipulation',
        WebkitTapHighlightColor: 'transparent',
        '&:hover': {
          transform: { xs: 'none', sm: 'translateY(-2px)' },
          boxShadow: theme.shadows[4],
        },
        '&:active': {
          transform: 'scale(0.98)',
        },
      }}
    >
      <CardContent sx={{ py: { xs: 1.5, sm: 2 }, px: { xs: 1.5, sm: 2 }, '&:last-child': { pb: { xs: 1.5, sm: 2 } } }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 1, flexWrap: 'wrap', gap: 0.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0, flex: 1 }}>
            <Box sx={{
              p: { xs: 0.5, sm: 0.75 },
              borderRadius: 1.5,
              bgcolor: colors.bg,
              color: colors.main,
              display: 'flex',
              flexShrink: 0,
              '& .MuiSvgIcon-root': {
                fontSize: { xs: '1.1rem', sm: '1.25rem' },
              },
            }}>
              {REQUEST_TYPE_ICONS[request.requestType]}
            </Box>
            <Typography
              variant="body2"
              fontWeight={600}
              color={colors.main}
              sx={{
                fontSize: { xs: '0.8rem', sm: '0.875rem' },
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {HANDICAP_REQUEST_TYPE_LABELS[request.requestType]}
            </Typography>
          </Box>
          <Chip
            label={HANDICAP_REQUEST_STATUS_LABELS[request.status]}
            size="small"
            sx={{
              bgcolor: request.status === 'ACTIVE' ? '#ef444420' : '#10b98120',
              color: request.status === 'ACTIVE' ? '#ef4444' : '#10b981',
              fontWeight: 600,
              fontSize: { xs: '0.65rem', sm: '0.7rem' },
              height: { xs: 22, sm: 24 },
              flexShrink: 0,
            }}
          />
        </Box>

        <Typography
          variant="body2"
          sx={{
            mb: 0.5,
            display: 'flex',
            alignItems: 'flex-start',
            gap: 0.5,
            fontSize: { xs: '0.8rem', sm: '0.875rem' },
            lineHeight: 1.4,
            wordBreak: 'break-word',
          }}
        >
          <PlaceIcon sx={{ fontSize: { xs: 14, sm: 16 }, color: 'text.secondary', flexShrink: 0, mt: 0.2 }} />
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{request.location}</span>
        </Typography>

        {request.personName && (
          <Box
            component="div"
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 0.5,
              fontSize: { xs: '0.75rem', sm: '0.8rem' },
              flexWrap: 'wrap',
              color: 'text.secondary',
            }}
          >
            <PersonIcon sx={{ fontSize: { xs: 14, sm: 16 }, flexShrink: 0 }} />
            <Typography component="span" variant="body2" color="inherit" sx={{ fontSize: 'inherit' }}>
              {request.personName}
            </Typography>
            {request.carPlate && (
              <Chip
                label={request.carPlate}
                size="small"
                variant="outlined"
                sx={{
                  height: { xs: 18, sm: 20 },
                  fontSize: { xs: '0.65rem', sm: '0.7rem' },
                  '& .MuiChip-label': { px: 0.75 },
                }}
              />
            )}
          </Box>
        )}

        <Box sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          mt: { xs: 1, sm: 1.5 },
          pt: { xs: 0.75, sm: 1 },
          borderTop: '1px solid',
          borderColor: 'divider',
          flexWrap: 'wrap',
          gap: 0.5,
        }}>
          <Typography variant="caption" color="text.secondary" sx={{ fontSize: { xs: '0.65rem', sm: '0.75rem' } }}>
            {request.creator?.fullName} • {format(new Date(request.createdAt), isMobile ? 'dd/MM/yy' : 'dd MMM yyyy', { locale: ro })}
          </Typography>
          {request.comments && request.comments.length > 0 && (
            <Chip
              icon={<CommentIcon sx={{ fontSize: { xs: 12, sm: 14 } }} />}
              label={request.comments.length}
              size="small"
              variant="outlined"
              sx={{ height: { xs: 20, sm: 22 }, fontSize: { xs: '0.65rem', sm: '0.7rem' }, '& .MuiChip-label': { px: 0.5 } }}
            />
          )}
        </Box>
      </CardContent>
    </Card>
  );
};

// ============== MAIN PAGE ==============
const HandicapParkingPage: React.FC = () => {
  const theme = useTheme();
  const isCompact = useMediaQuery(theme.breakpoints.down('md')); // < 768px - for tabs
  const location = useLocation();
  const [tabValue, setTabValue] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<HandicapRequestStatus | ''>('');
  const [createDialogType, setCreateDialogType] = useState<HandicapRequestType | null>(null);
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
  const [openLegitimationId, setOpenLegitimationId] = useState<string | null>(null);
  const [openRevolutionarLegitimationId, setOpenRevolutionarLegitimationId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));

  const { user } = useAppSelector((state) => state.auth);

  // Handle navigation state from notifications
  useEffect(() => {
    const state = location.state as { openRequestId?: string; openLegitimationId?: string; tab?: number } | null;
    if (state) {
      if (state.openRequestId) {
        setSelectedRequestId(state.openRequestId);
      }
      if (state.openLegitimationId) {
        setOpenLegitimationId(state.openLegitimationId);
      }
      if (state.tab !== undefined) {
        setTabValue(state.tab);
      }
      // Clear navigation state after extracting values
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  // Access control
  const hasAccess =
    user?.role === 'ADMIN' ||
    user?.role === 'MANAGER' ||
    (user?.department?.name && ALLOWED_DEPARTMENTS.includes(user.department.name));

  // Poate vedea tab-ul Legitimatii: doar Admin si departamentul Parcari Handicap
  const canSeeLegitimations =
    user?.role === 'ADMIN' ||
    user?.department?.name === HANDICAP_PARKING_DEPARTMENT_NAME;

  const isAdmin = user?.role === 'ADMIN';
  const isMaintenanceUser = user?.role === 'USER' && user?.department?.name === MAINTENANCE_DEPARTMENT_NAME;
  const isHandicapDepartmentUser = user?.department?.name === HANDICAP_PARKING_DEPARTMENT_NAME;
  const canEditHandicap = isAdmin || isHandicapDepartmentUser;
  const canCreate = !isMaintenanceUser; // Intretinere Parcari users cannot create requests

  if (!hasAccess) {
    return <Navigate to="/dashboard" replace />;
  }

  const { data: requests = [], isLoading } = useGetHandicapRequestsQuery(
    statusFilter ? { status: statusFilter } : undefined
  );

  // Legitimation queries (pentru export)
  const { data: handicapLegitimations = [] } = useGetHandicapLegitimationsQuery(
    statusFilter ? { status: statusFilter as HandicapLegitimationStatus } : undefined
  );
  const { data: revolutionarLegitimations = [] } = useGetRevolutionarLegitimationsQuery(
    statusFilter ? { status: statusFilter as RevolutionarLegitimationStatus } : undefined
  );

  // Tab config pentru solicitari (panouri si marcaje)
  const requestTabConfig: { type: HandicapRequestType; label: string; shortLabel: string; icon: React.ReactNode; color: string }[] = [
    {
      type: 'AMPLASARE_PANOU',
      label: 'Amplasare Panouri',
      shortLabel: 'Amplasare',
      icon: <PlacementIcon />,
      color: REQUEST_TYPE_COLORS.AMPLASARE_PANOU.main,
    },
    {
      type: 'REVOCARE_PANOU',
      label: 'Revocare Panouri',
      shortLabel: 'Revocare',
      icon: <RevokeIcon />,
      color: REQUEST_TYPE_COLORS.REVOCARE_PANOU.main,
    },
    {
      type: 'CREARE_MARCAJ',
      label: 'Creare Marcaje',
      shortLabel: 'Marcaje',
      icon: <MarkingIcon />,
      color: REQUEST_TYPE_COLORS.CREARE_MARCAJ.main,
    },
  ];

  // Numarul de tab-uri pentru solicitari (0, 1, 2) si tab-urile Legitimatii (3, 4) - daca sunt vizibile
  const handicapLegitimationsTabIndex = requestTabConfig.length; // index 3
  const revolutionarLegitimationsTabIndex = requestTabConfig.length + 1; // index 4
  const isHandicapLegitimationsTab = canSeeLegitimations && tabValue === handicapLegitimationsTabIndex;
  const isRevolutionarLegitimationsTab = canSeeLegitimations && tabValue === revolutionarLegitimationsTabIndex;
  const isLegitimationsTab = isHandicapLegitimationsTab || isRevolutionarLegitimationsTab;

  // tabConfig pentru render - folosit doar pentru primele 3 tab-uri
  const tabConfig = requestTabConfig;

  // Filter requests by tab type, search and month
  const filteredRequests = useMemo(() => {
    if (isLegitimationsTab) return [];
    if (tabValue >= tabConfig.length) return [];
    const currentType = tabConfig[tabValue].type;
    const [year, month] = selectedMonth.split('-').map(Number);
    const monthStart = startOfMonth(new Date(year, month - 1));
    const monthEnd = endOfMonth(new Date(year, month - 1));
    return requests.filter((r) => {
      const matchesType = r.requestType === currentType;
      const matchesSearch = searchQuery
        ? r.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
          r.personName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          r.carPlate?.toLowerCase().includes(searchQuery.toLowerCase())
        : true;
      const createdAt = new Date(r.createdAt);
      const matchesMonth = createdAt >= monthStart && createdAt <= monthEnd;
      return matchesType && matchesSearch && matchesMonth;
    });
  }, [requests, tabValue, searchQuery, tabConfig, isLegitimationsTab, selectedMonth]);

  // Pagination
  const totalPages = Math.ceil(filteredRequests.length / ITEMS_PER_PAGE);
  const paginatedRequests = useMemo(() => {
    const start = (page - 1) * ITEMS_PER_PAGE;
    return filteredRequests.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredRequests, page]);

  // Reset page when tab/search/filter/month changes
  useEffect(() => {
    setPage(1);
  }, [tabValue, searchQuery, statusFilter, selectedMonth]);

  const handleSectionChange = (newValue: number) => {
    setTabValue(newValue);
    setPage(1);
  };

  // Dropdown options - combina tab-urile de solicitari cu legitimatii
  const sectionOptions = useMemo(() => {
    const options: { value: number; label: string; shortLabel: string; color: string }[] = tabConfig.map((tab, index) => ({
      value: index,
      label: tab.label,
      shortLabel: tab.shortLabel,
      color: tab.color,
    }));
    if (canSeeLegitimations) {
      options.push({
        value: handicapLegitimationsTabIndex,
        label: 'Legitimatii Handicap',
        shortLabel: 'Legit. H.',
        color: LEGITIMATION_COLOR.main,
      });
      options.push({
        value: revolutionarLegitimationsTabIndex,
        label: 'Legitimatii Revolutionar',
        shortLabel: 'Legit. R.',
        color: REVOLUTIONAR_COLOR.main,
      });
    }
    return options;
  }, [tabConfig, canSeeLegitimations, handicapLegitimationsTabIndex, revolutionarLegitimationsTabIndex]);

  // Current section color
  const currentSectionColor = sectionOptions.find(o => o.value === tabValue)?.color || tabConfig[0]?.color || '#6366f1';

  // Filtered legitimations by month (pentru export)
  const getMonthBounds = () => {
    const [year, month] = selectedMonth.split('-').map(Number);
    return { monthStart: startOfMonth(new Date(year, month - 1)), monthEnd: endOfMonth(new Date(year, month - 1)) };
  };

  const filteredHandicapLegitimations = useMemo(() => {
    const { monthStart, monthEnd } = getMonthBounds();
    return handicapLegitimations.filter((l) => {
      const d = new Date(l.createdAt);
      return d >= monthStart && d <= monthEnd;
    });
  }, [handicapLegitimations, selectedMonth]);

  const filteredRevolutionarLegitimations = useMemo(() => {
    const { monthStart, monthEnd } = getMonthBounds();
    return revolutionarLegitimations.filter((l) => {
      const d = new Date(l.createdAt);
      return d >= monthStart && d <= monthEnd;
    });
  }, [revolutionarLegitimations, selectedMonth]);

  // Helper: requests filtrate pe tip + luna
  const getRequestsByType = (type: HandicapRequestType) => {
    const { monthStart, monthEnd } = getMonthBounds();
    return requests.filter((r) => {
      const d = new Date(r.createdAt);
      return r.requestType === type && d >= monthStart && d <= monthEnd;
    });
  };

  // Selected month label
  const monthLabel = useMemo(() => {
    const [year, month] = selectedMonth.split('-').map(Number);
    const label = format(new Date(year, month - 1), 'MMMM yyyy', { locale: ro });
    return label.charAt(0).toUpperCase() + label.slice(1);
  }, [selectedMonth]);

  // ============== EXPORT FUNCTIONS ==============

  const addSectionToPDF = (doc: jsPDF, title: string, headers: string[][], data: string[][], startY: number, color: number[]): number => {
    doc.setFontSize(14);
    doc.setTextColor(color[0], color[1], color[2]);
    doc.text(title, 14, startY);

    const activeCount = data.filter(row => row[row.length - 3] === 'Activ').length;
    const resolvedCount = data.filter(row => row[row.length - 3] === 'Finalizat').length;

    doc.setFontSize(9);
    doc.setTextColor(100);
    doc.text(`Total: ${data.length} | Active: ${activeCount} | Finalizate: ${resolvedCount}`, 14, startY + 7);

    if (data.length === 0) {
      doc.setFontSize(10);
      doc.setTextColor(150);
      doc.text('Nu exista inregistrari pentru aceasta luna.', 14, startY + 16);
      return startY + 24;
    }

    autoTable(doc, {
      startY: startY + 12,
      head: headers,
      body: data,
      styles: { fontSize: 7, cellPadding: 2 },
      headStyles: { fillColor: color as [number, number, number], fontSize: 7 },
      margin: { left: 14, right: 14 },
    });

    return (doc as any).lastAutoTable.finalY + 8;
  };

  const buildRequestsTableData = (reqs: typeof requests) => {
    return reqs.map(r => [
      r.location,
      r.personName || '-',
      r.carPlate || '-',
      r.handicapCertificateNumber || '-',
      HANDICAP_REQUEST_STATUS_LABELS[r.status],
      format(new Date(r.createdAt), 'dd.MM.yyyy'),
      r.resolver?.fullName || '-',
    ]);
  };

  const buildHandicapLegitTableData = (legits: typeof handicapLegitimations) => {
    return legits.map(l => [
      l.personName,
      l.handicapCertificateNumber,
      l.carPlate,
      l.phone || '-',
      HANDICAP_LEGITIMATION_STATUS_LABELS[l.status],
      format(new Date(l.createdAt), 'dd.MM.yyyy'),
      l.resolver?.fullName || '-',
    ]);
  };

  const buildRevolutionarLegitTableData = (legits: typeof revolutionarLegitimations) => {
    return legits.map(l => [
      l.personName,
      l.lawNumber,
      l.carPlate,
      l.phone || '-',
      REVOLUTIONAR_LEGITIMATION_STATUS_LABELS[l.status],
      format(new Date(l.createdAt), 'dd.MM.yyyy'),
      l.resolver?.fullName || '-',
    ]);
  };

  const REQUEST_HEADERS = [['Locatie', 'Persoana', 'Nr Auto', 'Nr Certificat', 'Status', 'Data', 'Rezolvat de']];
  const HANDICAP_LEGIT_HEADERS = [['Persoana', 'Nr Certificat', 'Nr Auto', 'Telefon', 'Status', 'Data', 'Rezolvat de']];
  const REVOLUTIONAR_LEGIT_HEADERS = [['Persoana', 'Nr Lege', 'Nr Auto', 'Telefon', 'Status', 'Data', 'Rezolvat de']];

  const exportCurrentSectionPDF = () => {
    const doc = new jsPDF();
    let sectionTitle = '';
    let headers: string[][] = [];
    let data: string[][] = [];
    let color = [99, 102, 241];
    let fileName = '';

    if (tabValue < tabConfig.length) {
      const tab = tabConfig[tabValue];
      sectionTitle = tab.label;
      headers = REQUEST_HEADERS;
      data = buildRequestsTableData(getRequestsByType(tab.type));
      const hexColor = tab.color;
      color = [parseInt(hexColor.slice(1, 3), 16), parseInt(hexColor.slice(3, 5), 16), parseInt(hexColor.slice(5, 7), 16)];
      fileName = `raport-${tab.type.toLowerCase().replace('_', '-')}-${selectedMonth}`;
    } else if (isHandicapLegitimationsTab) {
      sectionTitle = 'Legitimatii Handicap';
      headers = HANDICAP_LEGIT_HEADERS;
      data = buildHandicapLegitTableData(filteredHandicapLegitimations);
      color = [5, 150, 105];
      fileName = `raport-legitimatii-handicap-${selectedMonth}`;
    } else if (isRevolutionarLegitimationsTab) {
      sectionTitle = 'Legitimatii Revolutionar';
      headers = REVOLUTIONAR_LEGIT_HEADERS;
      data = buildRevolutionarLegitTableData(filteredRevolutionarLegitimations);
      color = [124, 58, 237];
      fileName = `raport-legitimatii-revolutionar-${selectedMonth}`;
    }

    doc.setFontSize(18);
    doc.setTextColor(color[0], color[1], color[2]);
    doc.text(`Raport ${sectionTitle}`, 14, 22);
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Luna: ${monthLabel}`, 14, 30);
    doc.text(`Generat la: ${format(new Date(), 'dd.MM.yyyy HH:mm')}`, 14, 36);

    const active = data.filter(row => row[row.length - 3] === 'Activ').length;
    const resolved = data.filter(row => row[row.length - 3] === 'Finalizat').length;
    doc.setFontSize(11);
    doc.setTextColor(0);
    doc.text(`Total: ${data.length} | Active: ${active} | Finalizate: ${resolved}`, 14, 46);

    if (data.length > 0) {
      autoTable(doc, {
        startY: 54,
        head: headers,
        body: data,
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: color as [number, number, number] },
      });
    } else {
      doc.setFontSize(10);
      doc.setTextColor(150);
      doc.text('Nu exista inregistrari pentru aceasta luna.', 14, 54);
    }

    doc.save(`${fileName}.pdf`);
  };

  const exportCurrentSectionExcel = () => {
    let sheetName = '';
    let excelData: Record<string, string>[] = [];
    let fileName = '';

    if (tabValue < tabConfig.length) {
      const tab = tabConfig[tabValue];
      sheetName = tab.shortLabel;
      const reqs = getRequestsByType(tab.type);
      excelData = reqs.map(r => ({
        'Locatie': r.location,
        'Link Google Maps': r.googleMapsLink || '',
        'Persoana': r.personName || '',
        'Nr Certificat': r.handicapCertificateNumber || '',
        'Nr Auto': r.carPlate || '',
        'Nr Legitimatie Auto': r.autoNumber || '',
        'Telefon': r.phone || '',
        'Descriere': r.description,
        'Status': HANDICAP_REQUEST_STATUS_LABELS[r.status],
        'Data Creare': format(new Date(r.createdAt), 'dd.MM.yyyy HH:mm'),
        'Creat de': r.creator?.fullName || '',
        'Rezolvat de': r.resolver?.fullName || '',
        'Data Rezolvare': r.resolvedAt ? format(new Date(r.resolvedAt), 'dd.MM.yyyy HH:mm') : '',
        'Descriere Rezolutie': r.resolutionDescription || '',
      }));
      fileName = `raport-${tab.type.toLowerCase().replace('_', '-')}-${selectedMonth}`;
    } else if (isHandicapLegitimationsTab) {
      sheetName = 'Legit Handicap';
      excelData = filteredHandicapLegitimations.map(l => ({
        'Persoana': l.personName,
        'Nr Certificat': l.handicapCertificateNumber,
        'Nr Auto': l.carPlate,
        'Nr Legitimatie Auto': l.autoNumber || '',
        'Telefon': l.phone || '',
        'Descriere': l.description || '',
        'Status': HANDICAP_LEGITIMATION_STATUS_LABELS[l.status],
        'Data Creare': format(new Date(l.createdAt), 'dd.MM.yyyy HH:mm'),
        'Creat de': l.creator?.fullName || '',
        'Rezolvat de': l.resolver?.fullName || '',
        'Data Rezolvare': l.resolvedAt ? format(new Date(l.resolvedAt), 'dd.MM.yyyy HH:mm') : '',
        'Descriere Rezolutie': l.resolutionDescription || '',
      }));
      fileName = `raport-legitimatii-handicap-${selectedMonth}`;
    } else if (isRevolutionarLegitimationsTab) {
      sheetName = 'Legit Revolutionar';
      excelData = filteredRevolutionarLegitimations.map(l => ({
        'Persoana': l.personName,
        'Nr Lege/Hotarare': l.lawNumber,
        'Nr Auto': l.carPlate,
        'Nr Legitimatie Auto': l.autoNumber || '',
        'Telefon': l.phone || '',
        'Descriere': l.description || '',
        'Status': REVOLUTIONAR_LEGITIMATION_STATUS_LABELS[l.status],
        'Data Creare': format(new Date(l.createdAt), 'dd.MM.yyyy HH:mm'),
        'Creat de': l.creator?.fullName || '',
        'Rezolvat de': l.resolver?.fullName || '',
        'Data Rezolvare': l.resolvedAt ? format(new Date(l.resolvedAt), 'dd.MM.yyyy HH:mm') : '',
        'Descriere Rezolutie': l.resolutionDescription || '',
      }));
      fileName = `raport-legitimatii-revolutionar-${selectedMonth}`;
    }

    const ws = XLSX.utils.json_to_sheet(excelData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    if (excelData.length > 0) {
      ws['!cols'] = Object.keys(excelData[0]).map(key => ({
        wch: Math.min(40, Math.max(key.length + 2, ...excelData.map(row => String(row[key] || '').length)))
      }));
    }
    XLSX.writeFile(wb, `${fileName}.xlsx`);
  };

  const exportAllSectionsPDF = () => {
    const doc = new jsPDF();

    // Cover header
    doc.setFontSize(20);
    doc.setTextColor(99, 102, 241);
    doc.text('Raport Complet Parcari Handicap', 14, 22);
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Luna: ${monthLabel}`, 14, 30);
    doc.text(`Generat la: ${format(new Date(), 'dd.MM.yyyy HH:mm')}`, 14, 36);

    // Summary
    const amplasare = getRequestsByType('AMPLASARE_PANOU');
    const revocare = getRequestsByType('REVOCARE_PANOU');
    const marcaje = getRequestsByType('CREARE_MARCAJ');

    doc.setFontSize(12);
    doc.setTextColor(0);
    doc.text('Sumar:', 14, 48);
    doc.setFontSize(10);
    doc.text(`Amplasare Panouri: ${amplasare.length}`, 14, 56);
    doc.text(`Revocare Panouri: ${revocare.length}`, 14, 62);
    doc.text(`Creare Marcaje: ${marcaje.length}`, 14, 68);
    doc.text(`Legitimatii Handicap: ${filteredHandicapLegitimations.length}`, 14, 74);
    doc.text(`Legitimatii Revolutionar: ${filteredRevolutionarLegitimations.length}`, 14, 80);

    let y = 94;

    // Section 1: Amplasare
    y = addSectionToPDF(doc, 'Amplasare Panouri', REQUEST_HEADERS, buildRequestsTableData(amplasare), y, [37, 99, 235]);
    if (y > 240) { doc.addPage(); y = 20; }

    // Section 2: Revocare
    y = addSectionToPDF(doc, 'Revocare Panouri', REQUEST_HEADERS, buildRequestsTableData(revocare), y, [245, 158, 11]);
    if (y > 240) { doc.addPage(); y = 20; }

    // Section 3: Marcaje
    y = addSectionToPDF(doc, 'Creare Marcaje', REQUEST_HEADERS, buildRequestsTableData(marcaje), y, [139, 92, 246]);
    if (y > 240) { doc.addPage(); y = 20; }

    // Section 4: Legitimatii Handicap
    y = addSectionToPDF(doc, 'Legitimatii Handicap', HANDICAP_LEGIT_HEADERS, buildHandicapLegitTableData(filteredHandicapLegitimations), y, [5, 150, 105]);
    if (y > 240) { doc.addPage(); y = 20; }

    // Section 5: Legitimatii Revolutionar
    addSectionToPDF(doc, 'Legitimatii Revolutionar', REVOLUTIONAR_LEGIT_HEADERS, buildRevolutionarLegitTableData(filteredRevolutionarLegitimations), y, [124, 58, 237]);

    doc.save(`raport-complet-handicap-${selectedMonth}.pdf`);
  };

  const exportAllSectionsExcel = () => {
    const wb = XLSX.utils.book_new();

    const addSheet = (name: string, data: Record<string, string>[]) => {
      const ws = XLSX.utils.json_to_sheet(data.length > 0 ? data : [{ 'Info': 'Nu exista inregistrari' }]);
      if (data.length > 0) {
        ws['!cols'] = Object.keys(data[0]).map(key => ({
          wch: Math.min(40, Math.max(key.length + 2, ...data.map(row => String(row[key] || '').length)))
        }));
      }
      XLSX.utils.book_append_sheet(wb, ws, name);
    };

    // Request sections
    const requestTypes: { type: HandicapRequestType; sheet: string }[] = [
      { type: 'AMPLASARE_PANOU', sheet: 'Amplasare' },
      { type: 'REVOCARE_PANOU', sheet: 'Revocare' },
      { type: 'CREARE_MARCAJ', sheet: 'Marcaje' },
    ];

    requestTypes.forEach(({ type, sheet }) => {
      const reqs = getRequestsByType(type);
      addSheet(sheet, reqs.map(r => ({
        'Locatie': r.location,
        'Persoana': r.personName || '',
        'Nr Certificat': r.handicapCertificateNumber || '',
        'Nr Auto': r.carPlate || '',
        'Telefon': r.phone || '',
        'Descriere': r.description,
        'Status': HANDICAP_REQUEST_STATUS_LABELS[r.status],
        'Data Creare': format(new Date(r.createdAt), 'dd.MM.yyyy HH:mm'),
        'Creat de': r.creator?.fullName || '',
        'Rezolvat de': r.resolver?.fullName || '',
        'Data Rezolvare': r.resolvedAt ? format(new Date(r.resolvedAt), 'dd.MM.yyyy HH:mm') : '',
      })));
    });

    // Legitimatii Handicap
    addSheet('Legit Handicap', filteredHandicapLegitimations.map(l => ({
      'Persoana': l.personName,
      'Nr Certificat': l.handicapCertificateNumber,
      'Nr Auto': l.carPlate,
      'Telefon': l.phone || '',
      'Descriere': l.description || '',
      'Status': HANDICAP_LEGITIMATION_STATUS_LABELS[l.status],
      'Data Creare': format(new Date(l.createdAt), 'dd.MM.yyyy HH:mm'),
      'Creat de': l.creator?.fullName || '',
      'Rezolvat de': l.resolver?.fullName || '',
      'Data Rezolvare': l.resolvedAt ? format(new Date(l.resolvedAt), 'dd.MM.yyyy HH:mm') : '',
    })));

    // Legitimatii Revolutionar
    addSheet('Legit Revolutionar', filteredRevolutionarLegitimations.map(l => ({
      'Persoana': l.personName,
      'Nr Lege/Hotarare': l.lawNumber,
      'Nr Auto': l.carPlate,
      'Telefon': l.phone || '',
      'Descriere': l.description || '',
      'Status': REVOLUTIONAR_LEGITIMATION_STATUS_LABELS[l.status],
      'Data Creare': format(new Date(l.createdAt), 'dd.MM.yyyy HH:mm'),
      'Creat de': l.creator?.fullName || '',
      'Rezolvat de': l.resolver?.fullName || '',
      'Data Rezolvare': l.resolvedAt ? format(new Date(l.resolvedAt), 'dd.MM.yyyy HH:mm') : '',
    })));

    XLSX.writeFile(wb, `raport-complet-handicap-${selectedMonth}.xlsx`);
  };

  // State for export all dialog
  const [exportAllOpen, setExportAllOpen] = useState(false);

  return (
    <Box sx={{ p: { xs: 0, sm: 1 }, maxWidth: '100%', overflow: 'hidden' }}>
      {/* Header */}
      <Grow in={true} timeout={500}>
        <Box
          sx={{
            mb: { xs: 2, sm: 3 },
            p: { xs: 2, sm: 2.5, md: 3 },
            background: theme.palette.mode === 'light'
              ? 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)'
              : 'linear-gradient(135deg, #4338ca 0%, #6d28d9 100%)',
            borderRadius: { xs: 2, sm: 3 },
            color: 'white',
            position: 'relative',
            overflow: 'hidden',
            boxShadow: '0 4px 20px rgba(99, 102, 241, 0.3)',
          }}
        >
          {/* Background decorations */}
          <Box
            sx={{
              position: 'absolute',
              top: -50,
              right: -50,
              width: 150,
              height: 150,
              borderRadius: '50%',
              background: 'rgba(255, 255, 255, 0.1)',
            }}
          />
          <Box
            sx={{
              position: 'absolute',
              bottom: -30,
              left: -30,
              width: 100,
              height: 100,
              borderRadius: '50%',
              background: 'rgba(255, 255, 255, 0.05)',
            }}
          />

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, position: 'relative' }}>
            <HandicapIcon sx={{ fontSize: { xs: 28, sm: 32 } }} />
            <Box sx={{ flex: 1 }}>
              <Typography
                variant="h4"
                sx={{
                  fontWeight: 700,
                  fontSize: { xs: '1.25rem', sm: '1.5rem', md: '1.75rem' },
                  mb: 0.5,
                }}
              >
                Parcari Handicap
              </Typography>
              <Typography
                variant="body2"
                sx={{ opacity: 0.9, fontSize: { xs: '0.75rem', sm: '0.875rem' } }}
              >
                Gestioneaza solicitarile de amplasare/revocare panouri si creare marcaje
              </Typography>
            </Box>
          </Box>
        </Box>
      </Grow>

      {/* Filters */}
      <Paper sx={{ mb: 2, p: { xs: 1, sm: 1.5, md: 2 }, borderRadius: 2 }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={{ xs: 1, md: 2 }} alignItems={{ xs: 'stretch', md: 'center' }}>
          <TextField
            placeholder={isCompact ? "Cauta..." : "Cauta dupa locatie, persoana sau numar auto..."}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            size="small"
            fullWidth
            sx={{ maxWidth: { md: 400 } }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon color="action" sx={{ fontSize: 18 }} />
                </InputAdornment>
              ),
            }}
          />

          <Stack direction="row" spacing={1} alignItems="center" sx={{ flexWrap: 'wrap' }}>
            <FormControl size="small" sx={{ minWidth: 160, flex: 1 }}>
              <InputLabel>Luna</InputLabel>
              <Select
                value={selectedMonth}
                label="Luna"
                onChange={(e) => setSelectedMonth(e.target.value)}
              >
                {MONTH_OPTIONS.map((opt) => (
                  <MenuItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl size="small" sx={{ minWidth: 120, flex: 1 }}>
              <InputLabel>Status</InputLabel>
              <Select
                value={statusFilter}
                label="Status"
                onChange={(e) => setStatusFilter(e.target.value as HandicapRequestStatus | '')}
              >
                <MenuItem value="">Toate</MenuItem>
                <MenuItem value="ACTIVE">Active</MenuItem>
                <MenuItem value="FINALIZAT">Finalizate</MenuItem>
              </Select>
            </FormControl>

            {/* Butonul Adauga - ascuns pe tab-ul Legitimatii (are propriul buton) si pentru Intretinere Parcari */}
            {canCreate && !isLegitimationsTab && tabValue < tabConfig.length && (
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => setCreateDialogType(tabConfig[tabValue].type)}
                size="small"
                sx={{
                  bgcolor: tabConfig[tabValue].color,
                  '&:hover': { bgcolor: alpha(tabConfig[tabValue].color, 0.9) },
                  whiteSpace: 'nowrap',
                  px: 2,
                  py: 0.75,
                  fontWeight: 600,
                  borderRadius: 2,
                  boxShadow: `0 2px 8px ${alpha(tabConfig[tabValue].color, 0.3)}`,
                }}
              >
                Adauga
              </Button>
            )}
          </Stack>
        </Stack>
      </Paper>

      {/* Section Dropdown */}
      <Paper sx={{ mb: { xs: 1.5, sm: 2 }, p: { xs: 1.5, sm: 2 }, borderRadius: { xs: 2, sm: 3 } }}>
        <FormControl fullWidth size="small">
          <InputLabel>Sectiune</InputLabel>
          <Select
            value={tabValue}
            label="Sectiune"
            onChange={(e) => handleSectionChange(e.target.value as number)}
            sx={{
              fontWeight: 600,
              '& .MuiSelect-select': {
                display: 'flex',
                alignItems: 'center',
                gap: 1,
              },
              '& .MuiOutlinedInput-notchedOutline': {
                borderColor: alpha(currentSectionColor, 0.4),
              },
              '&:hover .MuiOutlinedInput-notchedOutline': {
                borderColor: currentSectionColor,
              },
              '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                borderColor: currentSectionColor,
              },
            }}
          >
            {sectionOptions.map((option) => (
              <MenuItem key={option.value} value={option.value}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box
                    sx={{
                      width: 10,
                      height: 10,
                      borderRadius: '50%',
                      bgcolor: option.color,
                      flexShrink: 0,
                    }}
                  />
                  {isCompact ? option.shortLabel : option.label}
                </Box>
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Paper>

      {/* Export Buttons */}
      <Paper sx={{ mb: { xs: 1.5, sm: 2 }, p: { xs: 1, sm: 1.5 }, borderRadius: { xs: 2, sm: 3 } }}>
        <Stack direction="row" spacing={1} justifyContent="center" flexWrap="wrap" useFlexGap>
          <Button
            size="small"
            variant="contained"
            startIcon={<PdfIcon />}
            onClick={exportCurrentSectionPDF}
            sx={{
              bgcolor: '#ef4444',
              '&:hover': { bgcolor: '#dc2626' },
              fontSize: { xs: '0.7rem', sm: '0.8rem' },
              px: { xs: 1.5, sm: 2 },
            }}
          >
            {isCompact ? 'PDF' : 'Exporta PDF'}
          </Button>
          <Button
            size="small"
            variant="contained"
            startIcon={<ExcelIcon />}
            onClick={exportCurrentSectionExcel}
            sx={{
              bgcolor: '#10b981',
              '&:hover': { bgcolor: '#059669' },
              fontSize: { xs: '0.7rem', sm: '0.8rem' },
              px: { xs: 1.5, sm: 2 },
            }}
          >
            {isCompact ? 'Excel' : 'Exporta Excel'}
          </Button>
          <Button
            size="small"
            variant="outlined"
            startIcon={<AllSectionsIcon />}
            onClick={() => setExportAllOpen(true)}
            sx={{
              borderColor: '#6366f1',
              color: '#6366f1',
              '&:hover': { borderColor: '#4f46e5', bgcolor: alpha('#6366f1', 0.05) },
              fontSize: { xs: '0.7rem', sm: '0.8rem' },
              px: { xs: 1.5, sm: 2 },
            }}
          >
            {isCompact ? 'Tot' : 'Raport Complet'}
          </Button>
        </Stack>
      </Paper>

      {/* Export All Dialog */}
      <Dialog open={exportAllOpen} onClose={() => setExportAllOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <AllSectionsIcon color="primary" />
          Raport Complet — {monthLabel}
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Exporta toate cele 5 sectiuni intr-un singur fisier.
          </Typography>
          <Stack spacing={2}>
            <Button
              fullWidth
              variant="contained"
              startIcon={<PdfIcon />}
              onClick={() => { exportAllSectionsPDF(); setExportAllOpen(false); }}
              sx={{ bgcolor: '#ef4444', '&:hover': { bgcolor: '#dc2626' }, py: 1.5 }}
            >
              Exporta PDF Complet
            </Button>
            <Button
              fullWidth
              variant="contained"
              startIcon={<ExcelIcon />}
              onClick={() => { exportAllSectionsExcel(); setExportAllOpen(false); }}
              sx={{ bgcolor: '#10b981', '&:hover': { bgcolor: '#059669' }, py: 1.5 }}
            >
              Exporta Excel Complet
            </Button>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setExportAllOpen(false)}>Inchide</Button>
        </DialogActions>
      </Dialog>

      {/* Content - Solicitari (primele 3 sectiuni) */}
      {!isLegitimationsTab && tabValue < tabConfig.length && (
        <Fade in={true} timeout={400} key={tabValue}>
          <Box>
            {isLoading ? (
              <Stack spacing={2}>
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} variant="rounded" height={120} sx={{ borderRadius: 2 }} />
                ))}
              </Stack>
            ) : filteredRequests.length === 0 ? (
              <Paper
                sx={{
                  p: 4,
                  textAlign: 'center',
                  borderRadius: 3,
                  bgcolor: alpha(tabConfig[tabValue].color, 0.05),
                }}
              >
                <HandicapIcon sx={{ fontSize: 64, color: alpha(tabConfig[tabValue].color, 0.3), mb: 2 }} />
                <Typography variant="h6" color="text.secondary" gutterBottom>
                  Nu exista solicitari
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  {searchQuery
                    ? 'Nu s-au gasit rezultate pentru cautarea ta'
                    : isMaintenanceUser
                      ? 'Nu exista solicitari alocate de acest tip'
                      : 'Nu exista solicitari de acest tip inca'}
                </Typography>
                {canCreate && (
                  <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={() => setCreateDialogType(tabConfig[tabValue].type)}
                    sx={{
                      bgcolor: tabConfig[tabValue].color,
                      '&:hover': { bgcolor: alpha(tabConfig[tabValue].color, 0.9) },
                    }}
                  >
                    Creeaza prima solicitare
                  </Button>
                )}
              </Paper>
            ) : (
              <>
                <Stack spacing={1.5}>
                  {paginatedRequests.map((request) => (
                    <HandicapRequestCard
                      key={request.id}
                      request={request}
                      onClick={() => setSelectedRequestId(request.id)}
                    />
                  ))}
                </Stack>
                {totalPages > 1 && (
                  <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
                    <Pagination
                      count={totalPages}
                      page={page}
                      onChange={(_e, value) => setPage(value)}
                      color="primary"
                      size={isCompact ? 'small' : 'medium'}
                      sx={{
                        '& .MuiPaginationItem-root': {
                          '&.Mui-selected': {
                            bgcolor: tabConfig[tabValue].color,
                            '&:hover': { bgcolor: alpha(tabConfig[tabValue].color, 0.85) },
                          },
                        },
                      }}
                    />
                  </Box>
                )}
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ display: 'block', textAlign: 'center', mt: 1 }}
                >
                  {filteredRequests.length} solicitari total
                </Typography>
              </>
            )}
          </Box>
        </Fade>
      )}

      {/* Content - Legitimatii Handicap */}
      {canSeeLegitimations && isHandicapLegitimationsTab && (
        <Fade in={true} timeout={400} key="legit-handicap">
          <Box>
            <HandicapLegitimatiiTab
              isAdmin={isAdmin}
              canEdit={canEditHandicap}
              searchQuery={searchQuery}
              statusFilter={statusFilter as HandicapLegitimationStatus | ''}
              selectedMonth={selectedMonth}
              initialOpenId={openLegitimationId}
              onOpenIdHandled={() => setOpenLegitimationId(null)}
            />
          </Box>
        </Fade>
      )}

      {/* Content - Legitimatii Revolutionar/Deportat */}
      {canSeeLegitimations && isRevolutionarLegitimationsTab && (
        <Fade in={true} timeout={400} key="legit-revolutionar">
          <Box>
            <RevolutionarLegitimatiiTab
              isAdmin={isAdmin}
              canEdit={canEditHandicap}
              searchQuery={searchQuery}
              statusFilter={statusFilter as RevolutionarLegitimationStatus | ''}
              selectedMonth={selectedMonth}
              initialOpenId={openRevolutionarLegitimationId}
              onOpenIdHandled={() => setOpenRevolutionarLegitimationId(null)}
            />
          </Box>
        </Fade>
      )}

      {/* Dialogs */}
      {canCreate && createDialogType && (
        <CreateHandicapRequestDialog
          open={!!createDialogType}
          onClose={() => setCreateDialogType(null)}
          requestType={createDialogType}
        />
      )}

      <HandicapRequestDetailsDialog
        open={!!selectedRequestId}
        onClose={() => setSelectedRequestId(null)}
        requestId={selectedRequestId}
      />
    </Box>
  );
};

export default HandicapParkingPage;
