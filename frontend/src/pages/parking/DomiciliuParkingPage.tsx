import React, { useState, useMemo, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Tabs,
  Tab,
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
  Home as HomeIcon,
  AddCircle as AddIcon,
  Place as PlaceIcon,
  Person as PersonIcon,
  Search as SearchIcon,
  Close as CloseIcon,
  Check as CheckIcon,
  Delete as DeleteIcon,
  Comment as CommentIcon,
  History as HistoryIcon,
  Map as MapIcon,
  Send as SendIcon,
  AddLocation as ApproveLocationIcon,
  RemoveCircle as RevokeIcon,
  FormatListNumbered as SpotsIcon,
  ViewColumn as LayoutIcon,
} from '@mui/icons-material';
import { useAppSelector } from '../../store/hooks';
import { Navigate, useLocation } from 'react-router-dom';
import { format } from 'date-fns';
import { ro } from 'date-fns/locale';
import {
  useGetDomiciliuRequestsQuery,
  useGetDomiciliuRequestQuery,
  useCreateDomiciliuRequestMutation,
  useResolveDomiciliuRequestMutation,
  useDeleteDomiciliuRequestMutation,
  useAddDomiciliuCommentMutation,
  useGetDomiciliuHistoryQuery,
} from '../../store/api/domiciliu.api';
import type {
  DomiciliuRequest,
  DomiciliuRequestType,
  DomiciliuRequestStatus,
  ParkingLayoutType,
  CreateDomiciliuRequestDto,
} from '../../types/domiciliu.types';
import { DOMICILIU_REQUEST_TYPE_LABELS, DOMICILIU_REQUEST_STATUS_LABELS, PARKING_LAYOUT_LABELS } from '../../types/domiciliu.types';
import { HISTORY_ACTION_LABELS } from '../../types/parking.types';
import { removeDiacritics } from '../../utils/removeDiacritics';
import { useGetCarStatusTodayQuery } from '../../store/api/pvDisplay.api';
import { DirectionsCar as CarIcon } from '@mui/icons-material';
import {
  MAINTENANCE_DEPARTMENT_NAME,
  HANDICAP_DEPARTMENT_NAME,
  DOMICILIU_DEPARTMENT_NAME,
} from '../../constants/departments';

// Departamente cu acces
const ALLOWED_DEPARTMENTS = [MAINTENANCE_DEPARTMENT_NAME, HANDICAP_DEPARTMENT_NAME, DOMICILIU_DEPARTMENT_NAME];

// Culori pentru tipuri de solicitari
const REQUEST_TYPE_COLORS: Record<DomiciliuRequestType, { main: string; bg: string }> = {
  TRASARE_LOCURI: { main: '#059669', bg: '#05966915' },
  REVOCARE_LOCURI: { main: '#dc2626', bg: '#dc262615' },
};

// Icons pentru tipuri
const REQUEST_TYPE_ICONS: Record<DomiciliuRequestType, React.ReactNode> = {
  TRASARE_LOCURI: <ApproveLocationIcon />,
  REVOCARE_LOCURI: <RevokeIcon />,
};

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  if (value !== index) return null;

  return (
    <div
      role="tabpanel"
      id={`domiciliu-tabpanel-${index}`}
      aria-labelledby={`domiciliu-tab-${index}`}
      {...other}
    >
      <Fade in={true} timeout={400}>
        <Box sx={{ pt: { xs: 1.5, sm: 2 } }}>{children}</Box>
      </Fade>
    </div>
  );
}

// ============== CREATE DIALOG ==============
interface CreateDialogProps {
  open: boolean;
  onClose: () => void;
  requestType: DomiciliuRequestType;
}

const CreateDomiciliuRequestDialog: React.FC<CreateDialogProps> = ({ open, onClose, requestType }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [createRequest, { isLoading }] = useCreateDomiciliuRequestMutation();
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState<CreateDomiciliuRequestDto>({
    requestType,
    location: '',
    googleMapsLink: '',
    description: '',
    numberOfSpots: undefined,
    parkingLayout: undefined,
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
        numberOfSpots: undefined,
        parkingLayout: undefined,
      });
      setError(null);
    }
  }, [open, requestType]);

  const handleSubmit = async () => {
    setError(null);
    try {
      await createRequest(formData).unwrap();
      onClose();
      setFormData({
        requestType,
        location: '',
        googleMapsLink: '',
        description: '',
        numberOfSpots: undefined,
        parkingLayout: undefined,
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
      googleMapsLink: wasAutoGenerated ? generateMapsLink(cleanValue) : prev.googleMapsLink,
    }));
  };

  const handleTextChange = (field: keyof CreateDomiciliuRequestDto) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({ ...prev, [field]: removeDiacritics(e.target.value) }));
  };

  const isFormValid = () => {
    return !!(
      formData.location &&
      formData.description
    );
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      fullScreen={isMobile}
      PaperProps={{
        sx: { borderRadius: isMobile ? 0 : 3 },
      }}
    >
      <DialogTitle sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        background: `linear-gradient(135deg, ${REQUEST_TYPE_COLORS[requestType].main}, ${alpha(REQUEST_TYPE_COLORS[requestType].main, 0.7)})`,
        color: 'white',
      }}>
        {REQUEST_TYPE_ICONS[requestType]}
        <Typography variant="h6" component="span">
          {DOMICILIU_REQUEST_TYPE_LABELS[requestType]}
        </Typography>
        <IconButton
          onClick={onClose}
          sx={{ ml: 'auto', color: 'white' }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers sx={{ p: { xs: 2, sm: 3 } }}>
        <Stack spacing={2.5}>
          {error && (
            <Alert severity="error" onClose={() => setError(null)} sx={{ borderRadius: 2 }}>
              {error}
            </Alert>
          )}

          {/* Locatie */}
          <TextField
            label="Locatie parcare (Strada, Numar)"
            value={formData.location}
            onChange={(e) => handleLocationChange(e.target.value)}
            fullWidth
            placeholder="Ex: Str. Republicii nr. 10"
            error={!formData.location && !!formData.description}
            helperText={!formData.location && !!formData.description ? 'Locatia este obligatorie' : ''}
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
                py: 1,
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

          {/* Detalii parcari */}
          <Stack direction="row" spacing={2}>
            <TextField
              label="Cate locuri"
              value={formData.numberOfSpots ?? ''}
              onChange={(e) => {
                const val = e.target.value;
                setFormData({ ...formData, numberOfSpots: val ? parseInt(val, 10) || undefined : undefined });
              }}
              fullWidth
              type="number"
              inputProps={{ min: 1 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SpotsIcon color="action" />
                  </InputAdornment>
                ),
              }}
            />

            <FormControl fullWidth>
              <InputLabel>Tip parcaj</InputLabel>
              <Select
                value={formData.parkingLayout ?? ''}
                label="Tip parcaj"
                onChange={(e) => setFormData({ ...formData, parkingLayout: (e.target.value || undefined) as ParkingLayoutType | undefined })}
                startAdornment={
                  <InputAdornment position="start">
                    <LayoutIcon color="action" />
                  </InputAdornment>
                }
              >
                <MenuItem value="">Neselectat</MenuItem>
                <MenuItem value="PARALEL">Paralel</MenuItem>
                <MenuItem value="PERPENDICULAR">Perpendicular</MenuItem>
                <MenuItem value="SPIC">Spic</MenuItem>
              </Select>
            </FormControl>
          </Stack>

          {/* Descriere */}
          <TextField
            label="Descriere"
            value={formData.description}
            onChange={handleTextChange('description')}
            fullWidth
            multiline
            rows={3}
            placeholder="Descrieti detaliile solicitarii..."
            error={!formData.description && !!formData.location}
            helperText={!formData.description && !!formData.location ? 'Descrierea este obligatorie' : ''}
          />
        </Stack>
      </DialogContent>

      <DialogActions sx={{ p: 2, pt: 1 }}>
        <Button onClick={onClose} disabled={isLoading}>
          Anuleaza
        </Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={!isFormValid() || isLoading}
          startIcon={isLoading ? <CircularProgress size={20} /> : <AddIcon />}
          sx={{
            bgcolor: REQUEST_TYPE_COLORS[requestType].main,
            '&:hover': { bgcolor: alpha(REQUEST_TYPE_COLORS[requestType].main, 0.9) },
          }}
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

const DomiciliuRequestDetailsDialog: React.FC<DetailsDialogProps> = ({ open, onClose, requestId }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { user } = useAppSelector((state) => state.auth);

  const { data: request, isLoading } = useGetDomiciliuRequestQuery(requestId!, { skip: !requestId });
  const { data: history = [] } = useGetDomiciliuHistoryQuery(requestId!, { skip: !requestId });
  const [addComment] = useAddDomiciliuCommentMutation();
  const [resolveRequest] = useResolveDomiciliuRequestMutation();
  const [deleteRequest] = useDeleteDomiciliuRequestMutation();

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
                  {DOMICILIU_REQUEST_TYPE_LABELS[request.requestType]}
                </Typography>
                <Chip
                  label={DOMICILIU_REQUEST_STATUS_LABELS[request.status]}
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
                          <Typography variant="body2" color="text.secondary">Locatie parcare</Typography>
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

                      {/* Detalii parcari */}
                      {(request.numberOfSpots || request.parkingLayout) && (
                        <>
                          <Divider />
                          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                            {request.numberOfSpots && (
                              <Box sx={{ flex: 1 }}>
                                <Typography variant="body2" color="text.secondary">Numar locuri</Typography>
                                <Typography variant="body1" fontWeight={600}>{request.numberOfSpots}</Typography>
                              </Box>
                            )}
                            {request.parkingLayout && (
                              <Box sx={{ flex: 1 }}>
                                <Typography variant="body2" color="text.secondary">Tip parcaj</Typography>
                                <Typography variant="body1" fontWeight={500}>{PARKING_LAYOUT_LABELS[request.parkingLayout]}</Typography>
                              </Box>
                            )}
                          </Stack>
                        </>
                      )}

                      {/* Date persoana */}
                      {(request.personName || request.cnp || request.address || request.carPlate) && (
                        <>
                          <Divider />
                          {(request.personName || request.cnp) && (
                            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                              {request.personName && (
                                <Box sx={{ flex: 1 }}>
                                  <Typography variant="body2" color="text.secondary">Persoana</Typography>
                                  <Typography variant="body1" fontWeight={500}>{request.personName}</Typography>
                                </Box>
                              )}
                              {request.cnp && (
                                <Box sx={{ flex: 1 }}>
                                  <Typography variant="body2" color="text.secondary">CNP</Typography>
                                  <Typography variant="body1">{request.cnp}</Typography>
                                </Box>
                              )}
                            </Stack>
                          )}

                          {request.address && (
                            <Box>
                              <Typography variant="body2" color="text.secondary">Adresa de domiciliu</Typography>
                              <Typography variant="body1">{request.address}</Typography>
                            </Box>
                          )}

                          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                            {request.carPlate && (
                              <Box sx={{ flex: 1 }}>
                                <Typography variant="body2" color="text.secondary">Numar Auto</Typography>
                                <Typography variant="body1" fontWeight={600}>{request.carPlate}</Typography>
                              </Box>
                            )}
                            {request.carBrand && (
                              <Box sx={{ flex: 1 }}>
                                <Typography variant="body2" color="text.secondary">Marca Auto</Typography>
                                <Typography variant="body1">{request.carBrand}</Typography>
                              </Box>
                            )}
                          </Stack>

                          {(request.phone || request.email || request.contractNumber) && (
                            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                              {request.phone && (
                                <Box sx={{ flex: 1 }}>
                                  <Typography variant="body2" color="text.secondary">Telefon</Typography>
                                  <Typography variant="body1">{request.phone}</Typography>
                                </Box>
                              )}
                              {request.email && (
                                <Box sx={{ flex: 1 }}>
                                  <Typography variant="body2" color="text.secondary">Email</Typography>
                                  <Typography variant="body1">{request.email}</Typography>
                                </Box>
                              )}
                              {request.contractNumber && (
                                <Box sx={{ flex: 1 }}>
                                  <Typography variant="body2" color="text.secondary">Nr. Contract</Typography>
                                  <Typography variant="body1">{request.contractNumber}</Typography>
                                </Box>
                              )}
                            </Stack>
                          )}
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
  request: DomiciliuRequest;
  onClick: () => void;
}

const DomiciliuRequestCard: React.FC<RequestCardProps> = ({ request, onClick }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const colors = REQUEST_TYPE_COLORS[request.requestType];

  return (
    <Card
      onClick={onClick}
      sx={{
        cursor: 'pointer',
        borderRadius: 2,
        borderLeft: `4px solid ${colors.main}`,
        transition: 'all 0.2s ease',
        touchAction: 'manipulation',
        WebkitTapHighlightColor: 'transparent',
        minHeight: { xs: 44, sm: 'auto' }, // Touch-friendly minimum height
        '&:hover': {
          transform: { xs: 'none', sm: 'translateY(-2px)' },
          boxShadow: theme.shadows[4],
        },
        '&:active': {
          transform: 'scale(0.98)',
        },
      }}
    >
      <CardContent sx={{ py: { xs: 1.25, sm: 1.5 }, px: { xs: 1.5, sm: 2 }, '&:last-child': { pb: { xs: 1.25, sm: 1.5 } } }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 1, flexWrap: 'wrap', gap: 0.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 0.75, sm: 1 }, minWidth: 0, flex: 1 }}>
            <Box sx={{
              p: { xs: 0.5, sm: 0.75 },
              borderRadius: 1.5,
              bgcolor: colors.bg,
              color: colors.main,
              display: 'flex',
              flexShrink: 0,
              '& .MuiSvgIcon-root': {
                fontSize: { xs: 18, sm: 24 },
              },
            }}>
              {REQUEST_TYPE_ICONS[request.requestType]}
            </Box>
            <Typography variant="body2" fontWeight={600} color={colors.main} sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' }, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {DOMICILIU_REQUEST_TYPE_LABELS[request.requestType]}
            </Typography>
          </Box>
          <Chip
            label={isMobile ? (request.status === 'ACTIVE' ? 'Activ' : 'Final') : DOMICILIU_REQUEST_STATUS_LABELS[request.status]}
            size="small"
            sx={{
              bgcolor: request.status === 'ACTIVE' ? '#ef444420' : '#10b98120',
              color: request.status === 'ACTIVE' ? '#ef4444' : '#10b981',
              fontWeight: 600,
              fontSize: { xs: '0.65rem', sm: '0.75rem' },
              height: { xs: 22, sm: 24 },
            }}
          />
        </Box>

        <Typography variant="body2" sx={{ mb: 0.5, display: 'flex', alignItems: 'flex-start', gap: 0.5, fontSize: { xs: '0.75rem', sm: '0.875rem' }, lineHeight: 1.4, wordBreak: 'break-word' }}>
          <PlaceIcon sx={{ fontSize: { xs: 14, sm: 16 }, color: 'text.secondary', flexShrink: 0, mt: 0.2 }} />
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{request.location}</span>
        </Typography>

        {(request.numberOfSpots || request.parkingLayout) && (
          <Typography variant="body2" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, fontSize: { xs: '0.7rem', sm: '0.875rem' }, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            <LayoutIcon sx={{ fontSize: { xs: 14, sm: 16 }, flexShrink: 0 }} />
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {request.numberOfSpots && `${request.numberOfSpots} locuri`}
              {request.numberOfSpots && request.parkingLayout && ' • '}
              {request.parkingLayout && PARKING_LAYOUT_LABELS[request.parkingLayout]}
            </span>
          </Typography>
        )}

        {(request.personName || request.carPlate) && (
          <Typography variant="body2" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, fontSize: { xs: '0.7rem', sm: '0.875rem' }, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }}>
            <PersonIcon sx={{ fontSize: { xs: 14, sm: 16 }, flexShrink: 0 }} />
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {request.personName}
              {request.personName && request.carPlate && ' • '}
              {request.carPlate}
            </span>
          </Typography>
        )}

        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 1.5, pt: 1, borderTop: '1px solid', borderColor: 'divider', flexWrap: 'wrap', gap: 0.5 }}>
          <Typography variant="caption" color="text.secondary" sx={{ fontSize: { xs: '0.65rem', sm: '0.75rem' }, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0, flex: 1 }}>
            {request.creator?.fullName} • {format(new Date(request.createdAt), isMobile ? 'dd/MM/yy' : 'dd MMM yyyy', { locale: ro })}
          </Typography>
          {request.comments && request.comments.length > 0 && (
            <Chip
              icon={<CommentIcon sx={{ fontSize: 14 }} />}
              label={request.comments.length}
              size="small"
              variant="outlined"
              sx={{ height: 22, '& .MuiChip-label': { px: 0.75 } }}
            />
          )}
        </Box>
      </CardContent>
    </Card>
  );
};

// ============== MAIN PAGE ==============
const DomiciliuParkingPage: React.FC = () => {
  const theme = useTheme();
  const isCompact = useMediaQuery(theme.breakpoints.down('md')); // < 768px
  const location = useLocation();
  const [tabValue, setTabValue] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<DomiciliuRequestStatus | ''>('');
  const [createDialogType, setCreateDialogType] = useState<DomiciliuRequestType | null>(null);
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);

  const { user } = useAppSelector((state) => state.auth);

  // Handle navigation state from notifications
  useEffect(() => {
    const state = location.state as { openRequestId?: string } | null;
    if (state?.openRequestId) {
      setSelectedRequestId(state.openRequestId);
      // Clear the state after handling
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  // Car status for PV display
  const { data: carStatus } = useGetCarStatusTodayQuery();

  // Check if user is from Intretinere Parcari department
  const isMaintenanceUser = user?.role === 'USER' && user?.department?.name === MAINTENANCE_DEPARTMENT_NAME;
  const canCreate = !isMaintenanceUser; // Intretinere Parcari users cannot create requests

  // Access control
  const hasAccess =
    user?.role === 'ADMIN' ||
    user?.role === 'MANAGER' ||
    (user?.department?.name && ALLOWED_DEPARTMENTS.includes(user.department.name));

  if (!hasAccess) {
    return <Navigate to="/dashboard" replace />;
  }

  const { data: requests = [], isLoading } = useGetDomiciliuRequestsQuery(
    statusFilter ? { status: statusFilter } : undefined
  );

  const tabConfig: { type: DomiciliuRequestType; label: string; shortLabel: string; icon: React.ReactNode; color: string }[] = [
    {
      type: 'TRASARE_LOCURI',
      label: 'Trasare Locuri',
      shortLabel: 'Trasare',
      icon: <ApproveLocationIcon />,
      color: REQUEST_TYPE_COLORS.TRASARE_LOCURI.main,
    },
    {
      type: 'REVOCARE_LOCURI',
      label: 'Revocare Locuri',
      shortLabel: 'Revocare',
      icon: <RevokeIcon />,
      color: REQUEST_TYPE_COLORS.REVOCARE_LOCURI.main,
    },
  ];

  // Filter requests by tab type and search
  const filteredRequests = useMemo(() => {
    const currentType = tabConfig[tabValue].type;
    return requests.filter((r) => {
      const matchesType = r.requestType === currentType;
      const matchesSearch = searchQuery
        ? r.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
          r.personName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          r.carPlate?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          r.address?.toLowerCase().includes(searchQuery.toLowerCase())
        : true;
      return matchesType && matchesSearch;
    });
  }, [requests, tabValue, searchQuery, tabConfig]);

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
              ? 'linear-gradient(135deg, #059669 0%, #10b981 100%)'
              : 'linear-gradient(135deg, #047857 0%, #059669 100%)',
            borderRadius: { xs: 2, sm: 3 },
            color: 'white',
            position: 'relative',
            overflow: 'hidden',
            boxShadow: '0 4px 20px rgba(5, 150, 105, 0.3)',
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
            <HomeIcon sx={{ fontSize: { xs: 28, sm: 32 } }} />
            <Box sx={{ flex: 1 }}>
              <Typography
                variant="h4"
                sx={{
                  fontWeight: 700,
                  fontSize: { xs: '1.25rem', sm: '1.5rem', md: '1.75rem' },
                  mb: 0.5,
                }}
              >
                Parcari Domiciliu
              </Typography>
              <Typography
                variant="body2"
                sx={{ opacity: 0.9, fontSize: { xs: '0.75rem', sm: '0.875rem' } }}
              >
                Gestioneaza solicitarile de trasare si revocare locuri de parcare
              </Typography>
            </Box>
          </Box>
        </Box>
      </Grow>

      {/* PV Car Status Banner */}
      {carStatus?.carInUse && (
        <Alert
          severity="warning"
          icon={<CarIcon />}
          sx={{
            mb: { xs: 2, sm: 3 },
            borderRadius: 2,
            '& .MuiAlert-message': { width: '100%' },
          }}
        >
          <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 0.5 }}>
            Masina indisponibila — Afisare Procese Verbale
          </Typography>
          {carStatus.days.map((day) => (
            <Typography key={day.id} variant="body2" color="text.secondary" sx={{ fontSize: '0.8rem' }}>
              {day.displayDate} — {[day.controlUser1Name, day.controlUser2Name].filter(Boolean).join(', ')} • Estimativ pana la {day.estimatedReturn}
            </Typography>
          ))}
        </Alert>
      )}

      {/* Filters */}
      <Paper sx={{ mb: 2, p: { xs: 1, sm: 1.5, md: 2 }, borderRadius: 2 }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={{ xs: 1, md: 2 }} alignItems={{ xs: 'stretch', md: 'center' }}>
          <TextField
            placeholder={isCompact ? "Cauta..." : "Cauta dupa locatie, persoana, adresa sau numar auto..."}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            size="small"
            fullWidth
            sx={{ maxWidth: { md: 400 } }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon color="action" />
                </InputAdornment>
              ),
            }}
          />

          <Stack direction="row" spacing={1} alignItems="center">
            <FormControl size="small" sx={{ minWidth: 120, flex: 1 }}>
              <InputLabel>Status</InputLabel>
              <Select
                value={statusFilter}
                label="Status"
                onChange={(e) => setStatusFilter(e.target.value as DomiciliuRequestStatus | '')}
              >
                <MenuItem value="">Toate</MenuItem>
                <MenuItem value="ACTIVE">Active</MenuItem>
                <MenuItem value="FINALIZAT">Finalizate</MenuItem>
              </Select>
            </FormControl>

            {canCreate && (
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => setCreateDialogType(tabConfig[tabValue].type)}
                size="small"
                sx={{
                  bgcolor: tabConfig[tabValue].color,
                  '&:hover': { bgcolor: alpha(tabConfig[tabValue].color, 0.9) },
                  whiteSpace: 'nowrap',
                  py: 0.75,
                }}
              >
                Adauga
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
            minHeight: { xs: 44, md: 72 },
            '& .MuiTabs-indicator': {
              height: 3,
              borderRadius: '3px 3px 0 0',
              background: tabConfig[tabValue].color,
            },
            '& .MuiTab-root': {
              minHeight: { xs: 44, md: 72 },
              fontSize: { xs: '0.8rem', md: '0.875rem' },
              fontWeight: 500,
              textTransform: 'none',
              px: { xs: 1, md: 2 },
              minWidth: 0,
              '&.Mui-selected': {
                fontWeight: 700,
                color: tabConfig[tabValue].color,
              },
            },
          }}
        >
          {tabConfig.map((tab) => (
            <Tab
              key={tab.type}
              label={isCompact ? tab.shortLabel : tab.label}
              sx={{
                '&.Mui-selected': {
                  color: tab.color,
                },
              }}
            />
          ))}
        </Tabs>
      </Paper>

      {/* Content */}
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
              <HomeIcon sx={{ fontSize: 64, color: alpha(tab.color, 0.3), mb: 2 }} />
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
                  onClick={() => setCreateDialogType(tab.type)}
                  sx={{
                    bgcolor: tab.color,
                    '&:hover': { bgcolor: alpha(tab.color, 0.9) },
                  }}
                >
                  Creeaza prima solicitare
                </Button>
              )}
            </Paper>
          ) : (
            <Stack spacing={1.5}>
              {filteredRequests.map((request) => (
                <DomiciliuRequestCard
                  key={request.id}
                  request={request}
                  onClick={() => setSelectedRequestId(request.id)}
                />
              ))}
            </Stack>
          )}
        </TabPanel>
      ))}

      {/* Dialogs */}
      {canCreate && createDialogType && (
        <CreateDomiciliuRequestDialog
          open={!!createDialogType}
          onClose={() => setCreateDialogType(null)}
          requestType={createDialogType}
        />
      )}

      <DomiciliuRequestDetailsDialog
        open={!!selectedRequestId}
        onClose={() => setSelectedRequestId(null)}
        requestId={selectedRequestId}
      />
    </Box>
  );
};

export default DomiciliuParkingPage;
