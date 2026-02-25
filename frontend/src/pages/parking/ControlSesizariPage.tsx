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
  ReportProblem as ReportProblemIcon,
  AddCircle as AddIcon,
  Place as PlaceIcon,
  Search as SearchIcon,
  Close as CloseIcon,
  Check as CheckIcon,
  Delete as DeleteIcon,
  Comment as CommentIcon,
  History as HistoryIcon,
  Map as MapIcon,
  Send as SendIcon,
  FormatPaint as MarkingIcon,
  Signpost as SignpostIcon,
  Edit as EditIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
} from '@mui/icons-material';
import { useAppSelector } from '../../store/hooks';
import { Navigate } from 'react-router-dom';
import { format } from 'date-fns';
import { ro } from 'date-fns/locale';
import {
  useGetControlSesizariQuery,
  useGetControlSesizareQuery,
  useCreateControlSesizareMutation,
  useUpdateControlSesizareMutation,
  useResolveControlSesizareMutation,
  useDeleteControlSesizareMutation,
  useAddControlCommentMutation,
  useGetControlHistoryQuery,
} from '../../store/api/control.api';
import type {
  ControlSesizare,
  ControlSesizareType,
  ControlSesizareStatus,
  ControlSesizareZone,
  ControlParkingLayoutType,
  CreateControlSesizareDto,
} from '../../types/control.types';
import {
  CONTROL_SESIZARE_TYPE_LABELS,
  CONTROL_SESIZARE_STATUS_LABELS,
  CONTROL_SESIZARE_ZONE_LABELS,
  CONTROL_PARKING_LAYOUT_LABELS,
  ZONE_COLORS,
} from '../../types/control.types';
import { HISTORY_ACTION_LABELS } from '../../types/parking.types';
import { removeDiacritics } from '../../utils/removeDiacritics';
import {
  CONTROL_DEPARTMENT_NAME,
  MAINTENANCE_DEPARTMENT_NAME,
} from '../../constants/departments';

// Departamente cu acces
const ALLOWED_DEPARTMENTS = [CONTROL_DEPARTMENT_NAME, MAINTENANCE_DEPARTMENT_NAME];

// Culori pentru tipuri de sesizari
const TYPE_COLORS: Record<ControlSesizareType, { main: string; bg: string }> = {
  MARCAJ: { main: '#8b5cf6', bg: '#8b5cf615' },
  PANOU: { main: '#2563eb', bg: '#2563eb15' },
};

// Icons pentru tipuri
const TYPE_ICONS: Record<ControlSesizareType, React.ReactNode> = {
  MARCAJ: <MarkingIcon />,
  PANOU: <SignpostIcon />,
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
    <div role="tabpanel" id={`control-tabpanel-${index}`} aria-labelledby={`control-tab-${index}`} {...other}>
      <Fade in={true} timeout={400}>
        <Box sx={{ pt: { xs: 1.5, sm: 2 } }}>{children}</Box>
      </Fade>
    </div>
  );
}

// ============== ZONE CHIP SELECTOR ==============
interface ZoneChipSelectorProps {
  value: ControlSesizareZone;
  onChange: (zone: ControlSesizareZone) => void;
}

const ZoneChipSelector: React.FC<ZoneChipSelectorProps> = ({ value, onChange }) => {
  const zones: ControlSesizareZone[] = ['ROSU', 'GALBEN', 'ALB'];
  return (
    <Box>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 0.75, fontWeight: 500 }}>Zona *</Typography>
      <Stack direction="row" spacing={1}>
        {zones.map((zone) => (
          <Chip
            key={zone}
            label={CONTROL_SESIZARE_ZONE_LABELS[zone]}
            onClick={() => onChange(zone)}
            sx={{
              bgcolor: value === zone ? ZONE_COLORS[zone].main : 'transparent',
              color: value === zone ? 'white' : ZONE_COLORS[zone].main,
              border: `2px solid ${ZONE_COLORS[zone].main}`,
              fontWeight: 600,
              cursor: 'pointer',
              '&:hover': { bgcolor: value === zone ? ZONE_COLORS[zone].main : ZONE_COLORS[zone].bg },
            }}
          />
        ))}
      </Stack>
    </Box>
  );
};

// ============== ORIENTATION CHIP SELECTOR ==============
interface OrientationChipSelectorProps {
  value: ControlParkingLayoutType;
  onChange: (orientation: ControlParkingLayoutType) => void;
}

const OrientationChipSelector: React.FC<OrientationChipSelectorProps> = ({ value, onChange }) => {
  const orientations: ControlParkingLayoutType[] = ['PARALEL', 'PERPENDICULAR', 'SPIC'];
  return (
    <Box>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 0.75, fontWeight: 500 }}>Orientare *</Typography>
      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
        {orientations.map((o) => (
          <Chip
            key={o}
            label={CONTROL_PARKING_LAYOUT_LABELS[o]}
            onClick={() => onChange(o)}
            sx={{
              bgcolor: value === o ? '#7c3aed' : 'transparent',
              color: value === o ? 'white' : '#7c3aed',
              border: '2px solid #7c3aed',
              fontWeight: 600,
              cursor: 'pointer',
              '&:hover': { bgcolor: value === o ? '#7c3aed' : '#7c3aed15' },
            }}
          />
        ))}
      </Stack>
    </Box>
  );
};

// ============== CREATE DIALOG ==============
interface CreateDialogProps {
  open: boolean;
  onClose: () => void;
  sesizareType: ControlSesizareType;
}

const CreateControlSesizareDialog: React.FC<CreateDialogProps> = ({ open, onClose, sesizareType }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [createSesizare, { isLoading }] = useCreateControlSesizareMutation();
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState<CreateControlSesizareDto>({
    type: sesizareType,
    zone: 'ROSU',
    orientation: sesizareType === 'MARCAJ' ? 'PARALEL' : undefined,
    location: '',
    googleMapsLink: '',
    description: '',
  });

  useEffect(() => {
    if (open) {
      setFormData({
        type: sesizareType,
        zone: 'ROSU',
        orientation: sesizareType === 'MARCAJ' ? 'PARALEL' : undefined,
        location: '',
        googleMapsLink: '',
        description: '',
      });
      setError(null);
    }
  }, [open, sesizareType]);

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

  const handleSubmit = async () => {
    setError(null);
    try {
      await createSesizare(formData).unwrap();
      onClose();
    } catch (err: any) {
      const errorMessage =
        err?.data?.message ||
        (Array.isArray(err?.data?.message) ? err.data.message.join(', ') : null) ||
        err?.message ||
        'A aparut o eroare la crearea sesizarii';
      setError(errorMessage);
    }
  };

  const isFormValid = () => {
    if (!formData.location || !formData.description || !formData.zone) return false;
    if (sesizareType === 'MARCAJ' && !formData.orientation) return false;
    return true;
  };

  const typeColor = TYPE_COLORS[sesizareType].main;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth fullScreen={isMobile}
      PaperProps={{ sx: { borderRadius: isMobile ? 0 : 2, m: isMobile ? 0 : 2 } }}>
      <DialogTitle sx={{ bgcolor: typeColor, color: 'white', display: 'flex', alignItems: 'center', gap: 1.5, py: 2 }}>
        {TYPE_ICONS[sesizareType]}
        <Box sx={{ flex: 1 }}>
          <Typography variant="h6" sx={{ fontWeight: 600, fontSize: { xs: '1.1rem', sm: '1.25rem' } }}>
            Sesizare {CONTROL_SESIZARE_TYPE_LABELS[sesizareType]}
          </Typography>
        </Box>
        <IconButton onClick={onClose} sx={{ color: 'white' }}><CloseIcon /></IconButton>
      </DialogTitle>

      <DialogContent dividers sx={{ p: { xs: 2, sm: 3 }, pt: '20px !important' }}>
        <Stack spacing={2.5}>
          {error && <Alert severity="error" onClose={() => setError(null)} sx={{ borderRadius: 2 }}>{error}</Alert>}

          <ZoneChipSelector value={formData.zone} onChange={(zone) => setFormData(prev => ({ ...prev, zone }))} />

          {sesizareType === 'MARCAJ' && (
            <OrientationChipSelector
              value={formData.orientation || 'PARALEL'}
              onChange={(orientation) => setFormData(prev => ({ ...prev, orientation }))}
            />
          )}

          <TextField
            label="Locatie (Strada, Numar) *"
            value={formData.location}
            onChange={(e) => handleLocationChange(e.target.value)}
            fullWidth size="medium"
            placeholder="Ex: Str. Republicii nr. 10"
            InputProps={{
              startAdornment: <InputAdornment position="start"><PlaceIcon color="action" /></InputAdornment>,
            }}
          />

          {formData.googleMapsLink && (
            <Button variant="outlined" startIcon={<MapIcon />}
              href={formData.googleMapsLink} target="_blank" rel="noopener noreferrer" fullWidth
              sx={{
                justifyContent: 'flex-start', textTransform: 'none', py: 1.25,
                borderColor: 'divider', color: 'primary.main', fontWeight: 500,
                fontSize: { xs: '0.8rem', sm: '0.875rem' },
                '&:hover': { borderColor: 'primary.main', bgcolor: alpha(theme.palette.primary.main, 0.04) },
              }}>
              Deschide in Google Maps
            </Button>
          )}

          <TextField
            label="Descriere *"
            value={formData.description}
            onChange={(e) => setFormData(prev => ({ ...prev, description: removeDiacritics(e.target.value) }))}
            fullWidth multiline rows={3} size="medium"
            placeholder={sesizareType === 'MARCAJ'
              ? 'Descrieti detaliile sesizarii pentru marcaj...'
              : 'Descrieti detaliile sesizarii pentru panou...'}
          />
        </Stack>
      </DialogContent>

      <DialogActions sx={{ p: 2, gap: 1 }}>
        <Button onClick={onClose} disabled={isLoading}>Anuleaza</Button>
        <Button variant="contained" onClick={handleSubmit} disabled={!isFormValid() || isLoading}
          startIcon={isLoading ? <CircularProgress size={20} color="inherit" /> : <AddIcon />}
          sx={{ bgcolor: typeColor, '&:hover': { bgcolor: alpha(typeColor, 0.85) } }}>
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
  sesizareId: string | null;
}

const ControlSesizareDetailsDialog: React.FC<DetailsDialogProps> = ({ open, onClose, sesizareId }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { user } = useAppSelector((state) => state.auth);

  const { data: sesizare, isLoading, refetch } = useGetControlSesizareQuery(sesizareId!, { skip: !sesizareId });
  const { data: history = [] } = useGetControlHistoryQuery(sesizareId!, { skip: !sesizareId });
  const [addComment] = useAddControlCommentMutation();
  const [updateSesizare, { isLoading: isUpdating }] = useUpdateControlSesizareMutation();
  const [resolveSesizare] = useResolveControlSesizareMutation();
  const [deleteSesizare] = useDeleteControlSesizareMutation();

  const [showHistory, setShowHistory] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [showResolveDialog, setShowResolveDialog] = useState(false);
  const [resolutionDescription, setResolutionDescription] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<{
    zone: ControlSesizareZone;
    orientation: ControlParkingLayoutType | undefined;
    location: string;
    googleMapsLink: string;
    description: string;
  }>({ zone: 'ROSU', orientation: undefined, location: '', googleMapsLink: '', description: '' });

  const isAdmin = user?.role === 'ADMIN';
  const isMaintenanceUser = user?.department?.name === MAINTENANCE_DEPARTMENT_NAME;
  const canResolve = isAdmin || isMaintenanceUser;
  const canEdit = isAdmin;

  useEffect(() => {
    if (sesizare && !isEditing) {
      setEditData({
        zone: sesizare.zone,
        orientation: sesizare.orientation,
        location: sesizare.location || '',
        googleMapsLink: sesizare.googleMapsLink || '',
        description: sesizare.description || '',
      });
    }
  }, [sesizare, isEditing]);

  const handleStartEdit = () => {
    if (sesizare) {
      setEditData({
        zone: sesizare.zone,
        orientation: sesizare.orientation,
        location: sesizare.location || '',
        googleMapsLink: sesizare.googleMapsLink || '',
        description: sesizare.description || '',
      });
      setIsEditing(true);
    }
  };

  const handleSaveEdit = async () => {
    if (!sesizareId) return;
    try {
      await updateSesizare({ id: sesizareId, data: editData }).unwrap();
      setIsEditing(false);
      refetch();
    } catch (error) {
      console.error('Error updating sesizare:', error);
    }
  };

  const handleAddComment = async () => {
    if (!sesizareId || !newComment.trim()) return;
    try {
      await addComment({ sesizareId, data: { content: newComment } }).unwrap();
      setNewComment('');
    } catch (error) {
      console.error('Error adding comment:', error);
    }
  };

  const handleResolve = async () => {
    if (!sesizareId || !resolutionDescription.trim()) return;
    try {
      await resolveSesizare({ id: sesizareId, data: { resolutionDescription } }).unwrap();
      setShowResolveDialog(false);
      setResolutionDescription('');
      onClose();
    } catch (error) {
      console.error('Error resolving sesizare:', error);
    }
  };

  const handleDelete = async () => {
    if (!sesizareId) return;
    if (window.confirm('Sigur doriti sa stergeti aceasta sesizare?')) {
      try {
        await deleteSesizare(sesizareId).unwrap();
        onClose();
      } catch (error) {
        console.error('Error deleting sesizare:', error);
      }
    }
  };

  if (!sesizareId) return null;

  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth fullScreen={isMobile}
        PaperProps={{ sx: { borderRadius: isMobile ? 0 : 3 } }}>
        {isLoading ? (
          <Box sx={{ p: 4, textAlign: 'center' }}><CircularProgress /></Box>
        ) : sesizare ? (
          <>
            <DialogTitle sx={{
              display: 'flex', alignItems: 'center', gap: 1,
              background: `linear-gradient(135deg, ${TYPE_COLORS[sesizare.type].main}, ${alpha(TYPE_COLORS[sesizare.type].main, 0.7)})`,
              color: 'white',
            }}>
              {TYPE_ICONS[sesizare.type]}
              <Box sx={{ flex: 1 }}>
                <Typography variant="h6" component="span">
                  Sesizare {CONTROL_SESIZARE_TYPE_LABELS[sesizare.type]}
                </Typography>
                <Chip label={CONTROL_SESIZARE_STATUS_LABELS[sesizare.status]} size="small"
                  sx={{
                    ml: 1,
                    bgcolor: sesizare.status === 'ACTIVE' ? '#ef444420' : '#10b98120',
                    color: sesizare.status === 'ACTIVE' ? '#ef4444' : '#10b981',
                    fontWeight: 600,
                  }}
                />
              </Box>
              <IconButton onClick={onClose} sx={{ color: 'white' }}><CloseIcon /></IconButton>
            </DialogTitle>

            <DialogContent sx={{ pt: 3 }}>
              <Stack spacing={3}>
                {canEdit && sesizare.status === 'ACTIVE' && (
                  <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                    {!isEditing ? (
                      <Button variant="outlined" startIcon={<EditIcon />} onClick={handleStartEdit} size="small">Editeaza</Button>
                    ) : (
                      <Stack direction="row" spacing={1}>
                        <Button variant="outlined" startIcon={<CancelIcon />} onClick={() => setIsEditing(false)} size="small" color="inherit">Anuleaza</Button>
                        <Button variant="contained" startIcon={isUpdating ? <CircularProgress size={16} /> : <SaveIcon />}
                          onClick={handleSaveEdit} size="small" disabled={isUpdating}>Salveaza</Button>
                      </Stack>
                    )}
                  </Box>
                )}

                <Card variant="outlined" sx={{ borderRadius: 2 }}>
                  <CardContent>
                    <Stack spacing={2}>
                      {isEditing ? (
                        <>
                          <ZoneChipSelector value={editData.zone} onChange={(zone) => setEditData(prev => ({ ...prev, zone }))} />
                          {sesizare.type === 'MARCAJ' && (
                            <OrientationChipSelector
                              value={editData.orientation || 'PARALEL'}
                              onChange={(orientation) => setEditData(prev => ({ ...prev, orientation }))}
                            />
                          )}
                          <TextField label="Locatie" value={editData.location}
                            onChange={(e) => setEditData(prev => ({ ...prev, location: e.target.value }))}
                            fullWidth required
                            InputProps={{ startAdornment: <InputAdornment position="start"><PlaceIcon color="action" /></InputAdornment> }}
                          />
                          <TextField label="Link Google Maps" value={editData.googleMapsLink}
                            onChange={(e) => setEditData(prev => ({ ...prev, googleMapsLink: e.target.value }))}
                            fullWidth
                            InputProps={{ startAdornment: <InputAdornment position="start"><MapIcon color="action" /></InputAdornment> }}
                          />
                          <TextField label="Descriere" value={editData.description}
                            onChange={(e) => setEditData(prev => ({ ...prev, description: e.target.value }))}
                            fullWidth multiline rows={3} required
                          />
                        </>
                      ) : (
                        <>
                          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                            <Chip label={`Zona ${CONTROL_SESIZARE_ZONE_LABELS[sesizare.zone]}`}
                              sx={{ bgcolor: ZONE_COLORS[sesizare.zone].main, color: 'white', fontWeight: 600 }}
                            />
                            {sesizare.orientation && (
                              <Chip label={CONTROL_PARKING_LAYOUT_LABELS[sesizare.orientation]}
                                sx={{ bgcolor: '#7c3aed', color: 'white', fontWeight: 600 }}
                              />
                            )}
                          </Stack>

                          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                            <PlaceIcon color="primary" sx={{ mt: 0.3 }} />
                            <Box>
                              <Typography variant="body2" color="text.secondary">Locatie</Typography>
                              <Typography variant="body1" fontWeight={500}>{sesizare.location}</Typography>
                              {sesizare.googleMapsLink && (
                                <Button size="small" startIcon={<MapIcon />}
                                  href={sesizare.googleMapsLink} target="_blank"
                                  sx={{ mt: 0.5, textTransform: 'none' }}>
                                  Deschide in Maps
                                </Button>
                              )}
                            </Box>
                          </Box>

                          <Divider />
                          <Box>
                            <Typography variant="body2" color="text.secondary">Descriere</Typography>
                            <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>{sesizare.description}</Typography>
                          </Box>
                        </>
                      )}

                      {sesizare.status === 'FINALIZAT' && sesizare.resolutionDescription && (
                        <>
                          <Divider />
                          <Box sx={{ bgcolor: '#10b98115', p: 2, borderRadius: 2 }}>
                            <Typography variant="body2" color="success.main" fontWeight={600}>
                              Rezolvat de {sesizare.resolver?.fullName} la {format(new Date(sesizare.resolvedAt!), 'dd MMM yyyy, HH:mm', { locale: ro })}
                            </Typography>
                            <Typography variant="body1" sx={{ mt: 1 }}>{sesizare.resolutionDescription}</Typography>
                          </Box>
                        </>
                      )}

                      <Divider />
                      <Stack direction="row" spacing={2} sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>
                        <Box>
                          <Typography variant="caption" color="text.secondary">Creat de</Typography>
                          <Typography variant="body2">{sesizare.creator?.fullName}</Typography>
                        </Box>
                        <Box>
                          <Typography variant="caption" color="text.secondary">Data</Typography>
                          <Typography variant="body2">
                            {format(new Date(sesizare.createdAt), 'dd MMM yyyy, HH:mm', { locale: ro })}
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
                      Comentarii ({sesizare.comments?.length || 0})
                    </Typography>
                    <Button size="small" startIcon={<HistoryIcon />} onClick={() => setShowHistory(!showHistory)}>
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

                  {sesizare.comments && sesizare.comments.length > 0 && (
                    <Stack spacing={1.5} sx={{ mb: 2 }}>
                      {sesizare.comments.map((comment) => (
                        <Card key={comment.id} variant="outlined" sx={{ borderRadius: 2 }}>
                          <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                              <Avatar sx={{ width: 28, height: 28, fontSize: '0.75rem' }}>
                                {comment.user?.fullName?.charAt(0) || '?'}
                              </Avatar>
                              <Typography variant="body2" fontWeight={600}>{comment.user?.fullName}</Typography>
                              <Typography variant="caption" color="text.secondary">
                                {format(new Date(comment.createdAt), 'dd MMM, HH:mm', { locale: ro })}
                              </Typography>
                            </Box>
                            <Typography variant="body2" sx={{ pl: 4.5 }}>{comment.content}</Typography>
                          </CardContent>
                        </Card>
                      ))}
                    </Stack>
                  )}

                  <Stack direction="row" spacing={1}>
                    <TextField fullWidth size="small" placeholder="Adauga un comentariu..."
                      value={newComment} onChange={(e) => setNewComment(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleAddComment()}
                    />
                    <IconButton color="primary" onClick={handleAddComment} disabled={!newComment.trim()}>
                      <SendIcon />
                    </IconButton>
                  </Stack>
                </Box>
              </Stack>
            </DialogContent>

            <DialogActions sx={{ p: 2, pt: 1, justifyContent: 'space-between' }}>
              <Box>
                {isAdmin && (
                  <Button color="error" startIcon={<DeleteIcon />} onClick={handleDelete}>Sterge</Button>
                )}
              </Box>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button onClick={onClose}>Inchide</Button>
                {canResolve && sesizare.status === 'ACTIVE' && (
                  <Button variant="contained" color="success" startIcon={<CheckIcon />}
                    onClick={() => setShowResolveDialog(true)}>Finalizeaza</Button>
                )}
              </Box>
            </DialogActions>
          </>
        ) : (
          <Box sx={{ p: 4, textAlign: 'center' }}>
            <Typography>Sesizarea nu a fost gasita</Typography>
          </Box>
        )}
      </Dialog>

      {/* Resolve Dialog */}
      <Dialog open={showResolveDialog} onClose={() => setShowResolveDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Finalizeaza sesizarea</DialogTitle>
        <DialogContent>
          <TextField fullWidth multiline rows={3} label="Descrierea rezolutiei"
            value={resolutionDescription} onChange={(e) => setResolutionDescription(e.target.value)}
            placeholder="Descrieti cum a fost rezolvata sesizarea..." sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowResolveDialog(false)}>Anuleaza</Button>
          <Button variant="contained" color="success" onClick={handleResolve}
            disabled={!resolutionDescription.trim()}>Finalizeaza</Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

// ============== SESIZARE CARD ==============
interface SesizareCardProps {
  sesizare: ControlSesizare;
  onClick: () => void;
}

const ControlSesizareCard: React.FC<SesizareCardProps> = ({ sesizare, onClick }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const zoneColor = ZONE_COLORS[sesizare.zone];

  return (
    <Card onClick={onClick}
      sx={{
        cursor: 'pointer', borderRadius: { xs: 2, sm: 2.5 },
        borderLeft: `4px solid ${zoneColor.main}`,
        transition: 'all 0.2s ease', touchAction: 'manipulation',
        WebkitTapHighlightColor: 'transparent',
        '&:hover': { transform: { xs: 'none', sm: 'translateY(-2px)' }, boxShadow: theme.shadows[4] },
        '&:active': { transform: 'scale(0.98)' },
      }}>
      <CardContent sx={{ py: { xs: 1.5, sm: 2 }, px: { xs: 1.5, sm: 2 }, '&:last-child': { pb: { xs: 1.5, sm: 2 } } }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 1, flexWrap: 'wrap', gap: 0.5 }}>
          <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
            <Chip label={`Zona ${CONTROL_SESIZARE_ZONE_LABELS[sesizare.zone]}`} size="small"
              sx={{ bgcolor: zoneColor.main, color: 'white', fontWeight: 600, fontSize: { xs: '0.65rem', sm: '0.7rem' }, height: { xs: 22, sm: 24 } }}
            />
            {sesizare.orientation && (
              <Chip label={CONTROL_PARKING_LAYOUT_LABELS[sesizare.orientation]} size="small"
                sx={{ bgcolor: '#7c3aed', color: 'white', fontWeight: 600, fontSize: { xs: '0.65rem', sm: '0.7rem' }, height: { xs: 22, sm: 24 } }}
              />
            )}
          </Stack>
          <Chip label={CONTROL_SESIZARE_STATUS_LABELS[sesizare.status]} size="small"
            sx={{
              bgcolor: sesizare.status === 'ACTIVE' ? '#ef444420' : '#10b98120',
              color: sesizare.status === 'ACTIVE' ? '#ef4444' : '#10b981',
              fontWeight: 600, fontSize: { xs: '0.65rem', sm: '0.7rem' }, height: { xs: 22, sm: 24 }, flexShrink: 0,
            }}
          />
        </Box>

        <Typography variant="body2" sx={{
          mb: 0.5, display: 'flex', alignItems: 'flex-start', gap: 0.5,
          fontSize: { xs: '0.8rem', sm: '0.875rem' }, lineHeight: 1.4, wordBreak: 'break-word',
        }}>
          <PlaceIcon sx={{ fontSize: { xs: 14, sm: 16 }, color: 'text.secondary', flexShrink: 0, mt: 0.2 }} />
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{sesizare.location}</span>
        </Typography>

        <Typography variant="body2" color="text.secondary" sx={{
          fontSize: { xs: '0.75rem', sm: '0.8rem' },
          overflow: 'hidden', textOverflow: 'ellipsis',
          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
        }}>
          {sesizare.description}
        </Typography>

        <Box sx={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          mt: { xs: 1, sm: 1.5 }, pt: { xs: 0.75, sm: 1 },
          borderTop: '1px solid', borderColor: 'divider', flexWrap: 'wrap', gap: 0.5,
        }}>
          <Typography variant="caption" color="text.secondary" sx={{ fontSize: { xs: '0.65rem', sm: '0.75rem' } }}>
            {sesizare.creator?.fullName} • {format(new Date(sesizare.createdAt), isMobile ? 'dd/MM/yy' : 'dd MMM yyyy', { locale: ro })}
          </Typography>
          {sesizare.comments && sesizare.comments.length > 0 && (
            <Chip icon={<CommentIcon sx={{ fontSize: { xs: 12, sm: 14 } }} />}
              label={sesizare.comments.length} size="small" variant="outlined"
              sx={{ height: { xs: 20, sm: 22 }, fontSize: { xs: '0.65rem', sm: '0.7rem' }, '& .MuiChip-label': { px: 0.5 } }}
            />
          )}
        </Box>
      </CardContent>
    </Card>
  );
};

// ============== MAIN PAGE ==============
const ControlSesizariPage: React.FC = () => {
  const theme = useTheme();
  const isCompact = useMediaQuery(theme.breakpoints.down('md'));
  const [tabValue, setTabValue] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<ControlSesizareStatus | ''>('');
  const [createDialogType, setCreateDialogType] = useState<ControlSesizareType | null>(null);
  const [selectedSesizareId, setSelectedSesizareId] = useState<string | null>(null);

  const { user } = useAppSelector((state) => state.auth);

  // Access control
  const hasAccess =
    user?.role === 'ADMIN' ||
    user?.role === 'MANAGER' ||
    (user?.department?.name && ALLOWED_DEPARTMENTS.includes(user.department.name));

  const isAdmin = user?.role === 'ADMIN';
  const isMaintenanceUser = user?.role === 'USER' && user?.department?.name === MAINTENANCE_DEPARTMENT_NAME;
  const canCreate = !isMaintenanceUser; // Intretinere Parcari users cannot create sesizari

  if (!hasAccess) {
    return <Navigate to="/dashboard" replace />;
  }

  const { data: sesizari = [], isLoading } = useGetControlSesizariQuery(
    statusFilter ? { status: statusFilter } : undefined
  );

  const tabConfig: { type: ControlSesizareType; label: string; shortLabel: string; icon: React.ReactNode; color: string }[] = [
    { type: 'MARCAJ', label: 'Marcaje', shortLabel: 'Marcaje', icon: <MarkingIcon />, color: TYPE_COLORS.MARCAJ.main },
    { type: 'PANOU', label: 'Panouri', shortLabel: 'Panouri', icon: <SignpostIcon />, color: TYPE_COLORS.PANOU.main },
  ];

  const filteredSesizari = useMemo(() => {
    if (tabValue >= tabConfig.length) return [];
    const currentType = tabConfig[tabValue].type;
    return sesizari.filter((s) => {
      const matchesType = s.type === currentType;
      const matchesSearch = searchQuery
        ? s.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
          s.description.toLowerCase().includes(searchQuery.toLowerCase())
        : true;
      return matchesType && matchesSearch;
    });
  }, [sesizari, tabValue, searchQuery, tabConfig]);

  return (
    <Box sx={{ p: { xs: 0, sm: 1 }, maxWidth: '100%', overflow: 'hidden' }}>
      {/* Header */}
      <Grow in={true} timeout={500}>
        <Box sx={{
          mb: { xs: 2, sm: 3 }, p: { xs: 2, sm: 2.5, md: 3 },
          background: theme.palette.mode === 'light'
            ? 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)'
            : 'linear-gradient(135deg, #c2410c 0%, #9a3412 100%)',
          borderRadius: { xs: 2, sm: 3 }, color: 'white', position: 'relative', overflow: 'hidden',
          boxShadow: '0 4px 20px rgba(249, 115, 22, 0.3)',
        }}>
          <Box sx={{ position: 'absolute', top: -50, right: -50, width: 150, height: 150, borderRadius: '50%', background: 'rgba(255,255,255,0.1)' }} />
          <Box sx={{ position: 'absolute', bottom: -30, left: -30, width: 100, height: 100, borderRadius: '50%', background: 'rgba(255,255,255,0.05)' }} />
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, position: 'relative' }}>
            <ReportProblemIcon sx={{ fontSize: { xs: 28, sm: 32 } }} />
            <Box sx={{ flex: 1 }}>
              <Typography variant="h4" sx={{ fontWeight: 700, fontSize: { xs: '1.25rem', sm: '1.5rem', md: '1.75rem' }, mb: 0.5 }}>
                Control - Sesizari
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.9, fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                Gestioneaza sesizarile de marcaje si panouri
              </Typography>
            </Box>
          </Box>
        </Box>
      </Grow>

      {/* Filters */}
      <Paper sx={{ mb: 2, p: { xs: 1, sm: 1.5, md: 2 }, borderRadius: 2 }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={{ xs: 1, md: 2 }} alignItems={{ xs: 'stretch', md: 'center' }}>
          <TextField
            placeholder={isCompact ? 'Cauta...' : 'Cauta dupa locatie sau descriere...'}
            value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
            size="small" fullWidth sx={{ maxWidth: { md: 400 } }}
            InputProps={{
              startAdornment: <InputAdornment position="start"><SearchIcon color="action" sx={{ fontSize: 18 }} /></InputAdornment>,
            }}
          />
          <Stack direction="row" spacing={1} alignItems="center">
            <FormControl size="small" sx={{ minWidth: 120, flex: 1 }}>
              <InputLabel>Status</InputLabel>
              <Select value={statusFilter} label="Status"
                onChange={(e) => setStatusFilter(e.target.value as ControlSesizareStatus | '')}>
                <MenuItem value="">Toate</MenuItem>
                <MenuItem value="ACTIVE">Active</MenuItem>
                <MenuItem value="FINALIZAT">Finalizate</MenuItem>
              </Select>
            </FormControl>

            {canCreate && tabValue < tabConfig.length && (
              <Button variant="contained" startIcon={<AddIcon />}
                onClick={() => setCreateDialogType(tabConfig[tabValue].type)} size="small"
                sx={{
                  bgcolor: tabConfig[tabValue].color,
                  '&:hover': { bgcolor: alpha(tabConfig[tabValue].color, 0.9) },
                  whiteSpace: 'nowrap', px: 2, py: 0.75, fontWeight: 600, borderRadius: 2,
                  boxShadow: `0 2px 8px ${alpha(tabConfig[tabValue].color, 0.3)}`,
                }}>
                Adauga
              </Button>
            )}
          </Stack>
        </Stack>
      </Paper>

      {/* Tabs */}
      <Paper sx={{ mb: { xs: 1.5, sm: 2 }, borderRadius: { xs: 2, sm: 3 }, overflow: 'hidden' }}>
        <Tabs value={tabValue} onChange={(_e, v) => setTabValue(v)} variant="fullWidth"
          sx={{
            minHeight: 44,
            '& .MuiTabs-indicator': {
              height: 3, borderRadius: '3px 3px 0 0',
              background: tabConfig[tabValue]?.color || TYPE_COLORS.MARCAJ.main,
            },
            '& .MuiTab-root': {
              minHeight: 44, fontSize: '0.85rem', fontWeight: 500, textTransform: 'none',
              '&.Mui-selected': { fontWeight: 700 },
            },
          }}>
          {tabConfig.map((tab) => (
            <Tab key={tab.type} label={isCompact ? tab.shortLabel : tab.label}
              sx={{ '&.Mui-selected': { color: tab.color } }}
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
          ) : filteredSesizari.length === 0 ? (
            <Paper sx={{ p: 4, textAlign: 'center', borderRadius: 3, bgcolor: alpha(tab.color, 0.05) }}>
              <ReportProblemIcon sx={{ fontSize: 64, color: alpha(tab.color, 0.3), mb: 2 }} />
              <Typography variant="h6" color="text.secondary" gutterBottom>Nu exista sesizari</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                {searchQuery
                  ? 'Nu s-au gasit rezultate pentru cautarea ta'
                  : isMaintenanceUser
                    ? 'Nu exista sesizari de acest tip'
                    : 'Nu exista sesizari de acest tip inca'}
              </Typography>
              {canCreate && (
                <Button variant="contained" startIcon={<AddIcon />}
                  onClick={() => setCreateDialogType(tab.type)}
                  sx={{ bgcolor: tab.color, '&:hover': { bgcolor: alpha(tab.color, 0.9) } }}>
                  Creeaza prima sesizare
                </Button>
              )}
            </Paper>
          ) : (
            <Stack spacing={1.5}>
              {filteredSesizari.map((sesizare) => (
                <ControlSesizareCard key={sesizare.id} sesizare={sesizare}
                  onClick={() => setSelectedSesizareId(sesizare.id)}
                />
              ))}
            </Stack>
          )}
        </TabPanel>
      ))}

      {/* Dialogs */}
      {canCreate && createDialogType && (
        <CreateControlSesizareDialog open={!!createDialogType} onClose={() => setCreateDialogType(null)}
          sesizareType={createDialogType}
        />
      )}

      <ControlSesizareDetailsDialog open={!!selectedSesizareId} onClose={() => setSelectedSesizareId(null)}
        sesizareId={selectedSesizareId}
      />
    </Box>
  );
};

export default ControlSesizariPage;
