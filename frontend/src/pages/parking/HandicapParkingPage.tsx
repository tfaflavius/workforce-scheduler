import React, { useState, useMemo, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Tabs,
  Tab,
  Badge,
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
} from '@mui/icons-material';
import { useAppSelector } from '../../store/hooks';
import { Navigate, useLocation } from 'react-router-dom';
import { format } from 'date-fns';
import { ro } from 'date-fns/locale';
import {
  useGetHandicapRequestsQuery,
  useGetHandicapRequestQuery,
  useCreateHandicapRequestMutation,
  useResolveHandicapRequestMutation,
  useDeleteHandicapRequestMutation,
  useAddHandicapCommentMutation,
  useGetHandicapHistoryQuery,
} from '../../store/api/handicap.api';
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
} from '../../types/handicap.types';
import { HISTORY_ACTION_LABELS } from '../../types/parking.types';
import { CardMembership as LegitimationIcon } from '@mui/icons-material';
import HandicapLegitimatiiTab from './HandicapLegitimatiiTab';

// Departamente cu acces
const ALLOWED_DEPARTMENTS = ['Întreținere Parcări', 'Parcări Handicap', 'Parcări Domiciliu'];
const MAINTENANCE_DEPARTMENT_NAME = 'Întreținere Parcări';
const HANDICAP_PARKING_DEPARTMENT_NAME = 'Parcări Handicap';

// Culori pentru legitimații
const LEGITIMATION_COLOR = { main: '#059669', bg: '#05966915' };

// Culori pentru tipuri de solicitări
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

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`handicap-tabpanel-${index}`}
      aria-labelledby={`handicap-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Fade in={true} timeout={400}>
          <Box sx={{ pt: { xs: 1.5, sm: 2 } }}>{children}</Box>
        </Fade>
      )}
    </div>
  );
}

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
  const [success, setSuccess] = useState(false);

  const [formData, setFormData] = useState<CreateHandicapRequestDto>({
    requestType,
    location: '',
    googleMapsLink: '',
    description: '',
    personName: '',
    handicapCertificateNumber: '',
    carPlate: '',
    autoNumber: '',
    phone: '',
  });

  const isPersonFieldsRequired = requestType !== 'CREARE_MARCAJ';

  const handleSubmit = async () => {
    try {
      await createRequest(formData).unwrap();
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        onClose();
        setFormData({
          requestType,
          location: '',
          googleMapsLink: '',
          description: '',
          personName: '',
          handicapCertificateNumber: '',
          carPlate: '',
          autoNumber: '',
          phone: '',
        });
      }, 800);
    } catch (error) {
      console.error('Error creating request:', error);
    }
  };

  const isFormValid = () => {
    if (!formData.location || !formData.description) return false;
    if (isPersonFieldsRequired) {
      return !!(formData.personName && formData.handicapCertificateNumber && formData.carPlate && formData.phone);
    }
    return true;
  };

  // Calculate form progress
  const totalFields = isPersonFieldsRequired ? 6 : 2;
  const filledFields = [
    formData.location,
    formData.description,
    ...(isPersonFieldsRequired ? [formData.personName, formData.handicapCertificateNumber, formData.carPlate, formData.phone] : []),
  ].filter(Boolean).length;
  const progress = (filledFields / totalFields) * 100;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      fullScreen={isMobile}
      scroll="paper"
      TransitionProps={{
        timeout: 300,
      }}
      PaperProps={{
        sx: {
          borderRadius: isMobile ? 0 : 3,
          maxHeight: isMobile ? '100%' : '90vh',
          display: 'flex',
          flexDirection: 'column',
        },
      }}
    >
      {/* Progress indicator */}
      <Box
        sx={{
          height: 6,
          bgcolor: alpha(REQUEST_TYPE_COLORS[requestType].main, 0.15),
          position: 'relative',
          flexShrink: 0,
        }}
      >
        <Box
          sx={{
            height: '100%',
            width: `${progress}%`,
            bgcolor: REQUEST_TYPE_COLORS[requestType].main,
            transition: 'width 0.3s ease',
            borderRadius: '0 3px 3px 0',
          }}
        />
      </Box>

      <DialogTitle sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        background: `linear-gradient(135deg, ${REQUEST_TYPE_COLORS[requestType].main}, ${alpha(REQUEST_TYPE_COLORS[requestType].main, 0.7)})`,
        color: 'white',
        py: { xs: 1.5, sm: 2 },
        flexShrink: 0,
      }}>
        <Box
          sx={{
            p: 1,
            borderRadius: '50%',
            bgcolor: 'rgba(255, 255, 255, 0.2)',
            display: 'flex',
            '& .MuiSvgIcon-root': {
              fontSize: { xs: '1.25rem', sm: '1.5rem' },
            },
          }}
        >
          {REQUEST_TYPE_ICONS[requestType]}
        </Box>
        <Box sx={{ flex: 1 }}>
          <Typography variant="h6" component="span" sx={{ fontSize: { xs: '1rem', sm: '1.25rem' } }}>
            {HANDICAP_REQUEST_TYPE_LABELS[requestType]}
          </Typography>
          <Typography variant="caption" sx={{ display: 'block', opacity: 0.85 }}>
            Completează formularul de mai jos
          </Typography>
        </Box>
        <IconButton
          onClick={onClose}
          sx={{
            color: 'white',
            bgcolor: 'rgba(255, 255, 255, 0.1)',
            '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.2)' },
          }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ pt: 3, pb: 2, flex: 1, overflowY: 'auto' }}>
        <Stack spacing={2.5}>
          {/* Locație */}
          <TextField
            label="Locație (Stradă, Număr)"
            value={formData.location}
            onChange={(e) => setFormData({ ...formData, location: e.target.value })}
            required
            fullWidth
            placeholder="Ex: Str. Republicii nr. 10"
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: 2,
                transition: 'all 0.2s ease',
                '&:hover': {
                  boxShadow: `0 0 0 2px ${alpha(REQUEST_TYPE_COLORS[requestType].main, 0.1)}`,
                },
                '&.Mui-focused': {
                  boxShadow: `0 0 0 3px ${alpha(REQUEST_TYPE_COLORS[requestType].main, 0.2)}`,
                },
              },
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <PlaceIcon sx={{ color: formData.location ? REQUEST_TYPE_COLORS[requestType].main : 'action.disabled' }} />
                </InputAdornment>
              ),
            }}
          />

          {/* Google Maps Link */}
          <TextField
            label="Link Google Maps (opțional)"
            value={formData.googleMapsLink}
            onChange={(e) => setFormData({ ...formData, googleMapsLink: e.target.value })}
            fullWidth
            placeholder="https://maps.google.com/..."
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: 2,
              },
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <MapIcon sx={{ color: formData.googleMapsLink ? REQUEST_TYPE_COLORS[requestType].main : 'action.disabled' }} />
                </InputAdornment>
              ),
            }}
          />

          {/* Câmpuri specifice pentru AMPLASARE și REVOCARE */}
          {isPersonFieldsRequired && (
            <>
              <Divider sx={{ my: 1.5 }}>
                <Chip
                  label="Date persoană"
                  size="small"
                  sx={{
                    bgcolor: alpha(REQUEST_TYPE_COLORS[requestType].main, 0.1),
                    color: REQUEST_TYPE_COLORS[requestType].main,
                    fontWeight: 600,
                  }}
                />
              </Divider>

              <TextField
                label="Nume persoană"
                value={formData.personName}
                onChange={(e) => setFormData({ ...formData, personName: e.target.value })}
                required
                fullWidth
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 2,
                    transition: 'all 0.2s ease',
                    '&:hover': {
                      boxShadow: `0 0 0 2px ${alpha(REQUEST_TYPE_COLORS[requestType].main, 0.1)}`,
                    },
                    '&.Mui-focused': {
                      boxShadow: `0 0 0 3px ${alpha(REQUEST_TYPE_COLORS[requestType].main, 0.2)}`,
                    },
                  },
                }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <PersonIcon sx={{ color: formData.personName ? REQUEST_TYPE_COLORS[requestType].main : 'action.disabled' }} />
                    </InputAdornment>
                  ),
                }}
              />

              <TextField
                label="Număr certificat handicap"
                value={formData.handicapCertificateNumber}
                onChange={(e) => setFormData({ ...formData, handicapCertificateNumber: e.target.value })}
                required
                fullWidth
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 2,
                    transition: 'all 0.2s ease',
                    '&:hover': {
                      boxShadow: `0 0 0 2px ${alpha(REQUEST_TYPE_COLORS[requestType].main, 0.1)}`,
                    },
                    '&.Mui-focused': {
                      boxShadow: `0 0 0 3px ${alpha(REQUEST_TYPE_COLORS[requestType].main, 0.2)}`,
                    },
                  },
                }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <CertificateIcon sx={{ color: formData.handicapCertificateNumber ? REQUEST_TYPE_COLORS[requestType].main : 'action.disabled' }} />
                    </InputAdornment>
                  ),
                }}
              />

              <TextField
                label="Număr înmatriculare"
                value={formData.carPlate}
                onChange={(e) => setFormData({ ...formData, carPlate: e.target.value.toUpperCase() })}
                required
                fullWidth
                placeholder="Ex: BH-01-ABC"
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 2,
                    transition: 'all 0.2s ease',
                    '&:hover': {
                      boxShadow: `0 0 0 2px ${alpha(REQUEST_TYPE_COLORS[requestType].main, 0.1)}`,
                    },
                    '&.Mui-focused': {
                      boxShadow: `0 0 0 3px ${alpha(REQUEST_TYPE_COLORS[requestType].main, 0.2)}`,
                    },
                  },
                }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <CarIcon sx={{ color: formData.carPlate ? REQUEST_TYPE_COLORS[requestType].main : 'action.disabled' }} />
                    </InputAdornment>
                  ),
                }}
              />

              <TextField
                label="Telefon"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                required
                fullWidth
                type="tel"
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 2,
                    transition: 'all 0.2s ease',
                    '&:hover': {
                      boxShadow: `0 0 0 2px ${alpha(REQUEST_TYPE_COLORS[requestType].main, 0.1)}`,
                    },
                    '&.Mui-focused': {
                      boxShadow: `0 0 0 3px ${alpha(REQUEST_TYPE_COLORS[requestType].main, 0.2)}`,
                    },
                  },
                }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <PhoneIcon sx={{ color: formData.phone ? REQUEST_TYPE_COLORS[requestType].main : 'action.disabled' }} />
                    </InputAdornment>
                  ),
                }}
              />
            </>
          )}

          {/* Descriere */}
          <TextField
            label="Descriere"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            required
            fullWidth
            multiline
            rows={3}
            placeholder={requestType === 'CREARE_MARCAJ'
              ? 'Descrieți detaliile pentru crearea marcajului...'
              : 'Descrieți motivul solicitării...'
            }
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: 2,
                transition: 'all 0.2s ease',
                '&:hover': {
                  boxShadow: `0 0 0 2px ${alpha(REQUEST_TYPE_COLORS[requestType].main, 0.1)}`,
                },
                '&.Mui-focused': {
                  boxShadow: `0 0 0 3px ${alpha(REQUEST_TYPE_COLORS[requestType].main, 0.2)}`,
                },
              },
            }}
          />
        </Stack>
      </DialogContent>

      <DialogActions sx={{
        p: 2,
        pt: 1,
        gap: 1,
        borderTop: '1px solid',
        borderColor: 'divider',
        flexShrink: 0,
        bgcolor: 'background.paper',
      }}>
        <Button
          onClick={onClose}
          disabled={isLoading}
          sx={{
            borderRadius: 2,
            px: 3,
          }}
        >
          Anulează
        </Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={!isFormValid() || isLoading || success}
          startIcon={
            success ? <CheckIcon /> :
            isLoading ? <CircularProgress size={20} color="inherit" /> :
            <AddIcon />
          }
          sx={{
            bgcolor: success ? 'success.main' : REQUEST_TYPE_COLORS[requestType].main,
            '&:hover': { bgcolor: success ? 'success.dark' : alpha(REQUEST_TYPE_COLORS[requestType].main, 0.9) },
            borderRadius: 2,
            px: 3,
            fontWeight: 600,
            boxShadow: `0 2px 8px ${alpha(REQUEST_TYPE_COLORS[requestType].main, 0.3)}`,
            transition: 'all 0.3s ease',
            '&:active': {
              transform: 'scale(0.98)',
            },
          }}
        >
          {success ? 'Creat!' : 'Creează'}
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

  const { data: request, isLoading } = useGetHandicapRequestQuery(requestId!, { skip: !requestId });
  const { data: history = [] } = useGetHandicapHistoryQuery(requestId!, { skip: !requestId });
  const [addComment] = useAddHandicapCommentMutation();
  const [resolveRequest] = useResolveHandicapRequestMutation();
  const [deleteRequest] = useDeleteHandicapRequestMutation();

  const [showHistory, setShowHistory] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [showResolveDialog, setShowResolveDialog] = useState(false);
  const [resolutionDescription, setResolutionDescription] = useState('');

  const isAdmin = user?.role === 'ADMIN';
  const isMaintenanceUser = user?.department?.name === MAINTENANCE_DEPARTMENT_NAME;
  const canResolve = isAdmin || isMaintenanceUser;

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
    if (window.confirm('Sigur doriți să ștergeți această solicitare?')) {
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
                {/* Info Card */}
                <Card variant="outlined" sx={{ borderRadius: 2 }}>
                  <CardContent>
                    <Stack spacing={2}>
                      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                        <PlaceIcon color="primary" sx={{ mt: 0.3 }} />
                        <Box>
                          <Typography variant="body2" color="text.secondary">Locație</Typography>
                          <Typography variant="body1" fontWeight={500}>{request.location}</Typography>
                          {request.googleMapsLink && (
                            <Button
                              size="small"
                              startIcon={<MapIcon />}
                              href={request.googleMapsLink}
                              target="_blank"
                              sx={{ mt: 0.5, textTransform: 'none' }}
                            >
                              Deschide în Maps
                            </Button>
                          )}
                        </Box>
                      </Box>

                      {request.personName && (
                        <>
                          <Divider />
                          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                            <Box sx={{ flex: 1 }}>
                              <Typography variant="body2" color="text.secondary">Persoană</Typography>
                              <Typography variant="body1" fontWeight={500}>{request.personName}</Typography>
                            </Box>
                            <Box sx={{ flex: 1 }}>
                              <Typography variant="body2" color="text.secondary">Nr. Certificat</Typography>
                              <Typography variant="body1">{request.handicapCertificateNumber}</Typography>
                            </Box>
                          </Stack>
                          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                            <Box sx={{ flex: 1 }}>
                              <Typography variant="body2" color="text.secondary">Număr Auto</Typography>
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
                        <Typography variant="subtitle2" gutterBottom>Istoric modificări</Typography>
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
                      placeholder="Adaugă un comentariu..."
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
                    Șterge
                  </Button>
                )}
              </Box>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button onClick={onClose}>Închide</Button>
                {canResolve && request.status === 'ACTIVE' && (
                  <Button
                    variant="contained"
                    color="success"
                    startIcon={<CheckIcon />}
                    onClick={() => setShowResolveDialog(true)}
                  >
                    Finalizează
                  </Button>
                )}
              </Box>
            </DialogActions>
          </>
        ) : (
          <Box sx={{ p: 4, textAlign: 'center' }}>
            <Typography>Solicitarea nu a fost găsită</Typography>
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
        <DialogTitle>Finalizează solicitarea</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            multiline
            rows={3}
            label="Descrierea rezoluției"
            value={resolutionDescription}
            onChange={(e) => setResolutionDescription(e.target.value)}
            placeholder="Descrieți cum a fost rezolvată solicitarea..."
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowResolveDialog(false)}>Anulează</Button>
          <Button
            variant="contained"
            color="success"
            onClick={handleResolve}
            disabled={!resolutionDescription.trim()}
          >
            Finalizează
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
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 0.5,
              fontSize: { xs: '0.75rem', sm: '0.8rem' },
              flexWrap: 'wrap',
            }}
          >
            <PersonIcon sx={{ fontSize: { xs: 14, sm: 16 }, flexShrink: 0 }} />
            <span>{request.personName}</span>
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
          </Typography>
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
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const location = useLocation();
  const [tabValue, setTabValue] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<HandicapRequestStatus | ''>('');
  const [createDialogType, setCreateDialogType] = useState<HandicapRequestType | null>(null);
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
  const [openLegitimationId, setOpenLegitimationId] = useState<string | null>(null);

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
        // Switch to legitimations tab if user can see it
        // Tab 3 is legitimations
      }
      if (state.tab !== undefined) {
        setTabValue(state.tab);
      }
      // Clear the state after handling
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  // Access control
  const hasAccess =
    user?.role === 'ADMIN' ||
    user?.role === 'MANAGER' ||
    (user?.department?.name && ALLOWED_DEPARTMENTS.includes(user.department.name));

  // Poate vedea tab-ul Legitimații: doar Admin și departamentul Parcări Handicap
  const canSeeLegitimations =
    user?.role === 'ADMIN' ||
    user?.department?.name === HANDICAP_PARKING_DEPARTMENT_NAME;

  const isAdmin = user?.role === 'ADMIN';

  if (!hasAccess) {
    return <Navigate to="/dashboard" replace />;
  }

  const { data: requests = [], isLoading } = useGetHandicapRequestsQuery(
    statusFilter ? { status: statusFilter } : undefined
  );

  // Tab config pentru solicitări (panouri și marcaje)
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

  // Numărul de tab-uri pentru solicitări (0, 1, 2) și tab-ul Legitimații (3) - dacă e vizibil
  const legitimationsTabIndex = requestTabConfig.length;
  const isLegitimationsTab = canSeeLegitimations && tabValue === legitimationsTabIndex;

  // tabConfig pentru render - folosit doar pentru primele 3 tab-uri
  const tabConfig = requestTabConfig;

  // Filter requests by tab type and search (doar pentru tab-urile de solicitări, nu legitimații)
  const filteredRequests = useMemo(() => {
    if (isLegitimationsTab) return [];
    if (tabValue >= tabConfig.length) return [];
    const currentType = tabConfig[tabValue].type;
    return requests.filter((r) => {
      const matchesType = r.requestType === currentType;
      const matchesSearch = searchQuery
        ? r.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
          r.personName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          r.carPlate?.toLowerCase().includes(searchQuery.toLowerCase())
        : true;
      return matchesType && matchesSearch;
    });
  }, [requests, tabValue, searchQuery, tabConfig, isLegitimationsTab]);

  // Count per type for badges
  const countPerType = useMemo(() => {
    const counts: Record<HandicapRequestType, number> = {
      AMPLASARE_PANOU: 0,
      REVOCARE_PANOU: 0,
      CREARE_MARCAJ: 0,
    };
    requests.filter(r => r.status === 'ACTIVE').forEach((r) => {
      counts[r.requestType]++;
    });
    return counts;
  }, [requests]);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

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
                Parcări Handicap
              </Typography>
              <Typography
                variant="body2"
                sx={{ opacity: 0.9, fontSize: { xs: '0.75rem', sm: '0.875rem' } }}
              >
                Gestionează solicitările de amplasare/revocare panouri și creare marcaje
              </Typography>
            </Box>
          </Box>
        </Box>
      </Grow>

      {/* Filters */}
      <Paper sx={{ mb: 2, p: { xs: 1.5, sm: 2 }, borderRadius: 2 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={{ xs: 1.5, sm: 2 }} alignItems={{ xs: 'stretch', sm: 'center' }}>
          <TextField
            placeholder={isMobile ? "Caută..." : "Caută după locație, persoană sau număr auto..."}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            size="small"
            fullWidth
            sx={{ maxWidth: { sm: 400 } }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon color="action" sx={{ fontSize: { xs: 18, sm: 20 } }} />
                </InputAdornment>
              ),
            }}
          />

          <Stack direction="row" spacing={1} sx={{ width: { xs: '100%', sm: 'auto' } }}>
            <FormControl size="small" sx={{ minWidth: { xs: 0, sm: 130 }, flex: { xs: 1, sm: 'none' } }}>
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

            {/* Butonul Adaugă - ascuns pe tab-ul Legitimații (are propriul buton) */}
            {!isLegitimationsTab && tabValue < tabConfig.length && (
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => setCreateDialogType(tabConfig[tabValue].type)}
                size={isMobile ? 'medium' : 'medium'}
                sx={{
                  bgcolor: tabConfig[tabValue].color,
                  '&:hover': { bgcolor: alpha(tabConfig[tabValue].color, 0.9) },
                  whiteSpace: 'nowrap',
                  minWidth: { xs: 'auto', sm: 100 },
                  px: { xs: 2, sm: 3 },
                  fontWeight: 600,
                  borderRadius: 2,
                  boxShadow: `0 2px 8px ${alpha(tabConfig[tabValue].color, 0.3)}`,
                  transition: 'all 0.2s ease',
                  '&:active': {
                    transform: 'scale(0.98)',
                  },
                }}
              >
                {isMobile ? 'Adaugă' : 'Adaugă'}
              </Button>
            )}
          </Stack>
        </Stack>
      </Paper>

      {/* Tabs */}
      <Paper sx={{ mb: { xs: 1.5, sm: 2 }, borderRadius: { xs: 2, sm: 3 }, overflow: 'hidden' }}>
        <Tabs
          value={tabValue}
          onChange={handleTabChange}
          variant="fullWidth"
          sx={{
            minHeight: { xs: 56, sm: 64, md: 72 },
            '& .MuiTabs-indicator': {
              height: 3,
              borderRadius: '3px 3px 0 0',
              background: isLegitimationsTab ? LEGITIMATION_COLOR.main : (tabConfig[tabValue]?.color || LEGITIMATION_COLOR.main),
            },
            '& .MuiTab-root': {
              minHeight: { xs: 56, sm: 64, md: 72 },
              fontSize: { xs: '0.65rem', sm: '0.75rem', md: '0.8rem' },
              fontWeight: 500,
              textTransform: 'none',
              transition: 'all 0.3s ease',
              px: { xs: 0.5, sm: 1.5 },
              '&.Mui-selected': {
                fontWeight: 600,
              },
            },
          }}
        >
          {tabConfig.map((tab, index) => (
            <Tab
              key={tab.type}
              icon={
                <Badge
                  badgeContent={countPerType[tab.type]}
                  color="error"
                  max={99}
                  sx={{
                    '& .MuiBadge-badge': {
                      fontSize: { xs: '0.6rem', sm: '0.65rem' },
                      minWidth: { xs: 14, sm: 16 },
                      height: { xs: 14, sm: 16 },
                    },
                  }}
                >
                  <Box
                    sx={{
                      p: { xs: 0.5, sm: 0.75 },
                      borderRadius: '50%',
                      bgcolor: tabValue === index ? alpha(tab.color, 0.15) : 'transparent',
                      display: 'flex',
                      '& .MuiSvgIcon-root': {
                        fontSize: { xs: '1.1rem', sm: '1.25rem' },
                        color: tabValue === index ? tab.color : 'text.secondary',
                      },
                    }}
                  >
                    {tab.icon}
                  </Box>
                </Badge>
              }
              label={isMobile ? tab.shortLabel : tab.label}
              iconPosition="top"
              sx={{
                '&.Mui-selected': {
                  color: tab.color,
                  bgcolor: alpha(tab.color, 0.1),
                },
              }}
            />
          ))}
          {/* Tab Legitimații - vizibil doar pentru Admin și Parcări Handicap */}
          {canSeeLegitimations && (
            <Tab
              icon={
                <Box
                  sx={{
                    p: { xs: 0.5, sm: 0.75 },
                    borderRadius: '50%',
                    bgcolor: isLegitimationsTab ? alpha(LEGITIMATION_COLOR.main, 0.15) : 'transparent',
                    display: 'flex',
                    '& .MuiSvgIcon-root': {
                      fontSize: { xs: '1.1rem', sm: '1.25rem' },
                      color: isLegitimationsTab ? LEGITIMATION_COLOR.main : 'text.secondary',
                    },
                  }}
                >
                  <LegitimationIcon />
                </Box>
              }
              label={isMobile ? 'Legitimații' : 'Legitimații'}
              iconPosition="top"
              sx={{
                '&.Mui-selected': {
                  color: LEGITIMATION_COLOR.main,
                  bgcolor: alpha(LEGITIMATION_COLOR.main, 0.1),
                },
              }}
            />
          )}
        </Tabs>
      </Paper>

      {/* Content - Tab-uri solicitări */}
      {tabConfig.map((tab, index) => (
        <TabPanel key={tab.type} value={tabValue} index={index}>
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
                bgcolor: alpha(tab.color, 0.05),
              }}
            >
              <HandicapIcon sx={{ fontSize: 64, color: alpha(tab.color, 0.3), mb: 2 }} />
              <Typography variant="h6" color="text.secondary" gutterBottom>
                Nu există solicitări
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                {searchQuery
                  ? 'Nu s-au găsit rezultate pentru căutarea ta'
                  : 'Nu există solicitări de acest tip încă'}
              </Typography>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => setCreateDialogType(tab.type)}
                sx={{
                  bgcolor: tab.color,
                  '&:hover': { bgcolor: alpha(tab.color, 0.9) },
                }}
              >
                Creează prima solicitare
              </Button>
            </Paper>
          ) : (
            <Stack spacing={1.5}>
              {filteredRequests.map((request) => (
                <HandicapRequestCard
                  key={request.id}
                  request={request}
                  onClick={() => setSelectedRequestId(request.id)}
                />
              ))}
            </Stack>
          )}
        </TabPanel>
      ))}

      {/* Content - Tab Legitimații */}
      {canSeeLegitimations && (
        <TabPanel value={tabValue} index={legitimationsTabIndex}>
          <HandicapLegitimatiiTab
            isAdmin={isAdmin}
            searchQuery={searchQuery}
            statusFilter={statusFilter as HandicapLegitimationStatus | ''}
            initialOpenId={openLegitimationId}
            onOpenIdHandled={() => setOpenLegitimationId(null)}
          />
        </TabPanel>
      )}

      {/* Dialogs */}
      {createDialogType && (
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
