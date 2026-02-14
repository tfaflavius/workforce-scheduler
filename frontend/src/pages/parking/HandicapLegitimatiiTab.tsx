import React, { useState, useMemo, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
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
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  CircularProgress,
  alpha,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  CardMembership as LegitimationIcon,
  AddCircle as AddIcon,
  Person as PersonIcon,
  Phone as PhoneIcon,
  DirectionsCar as CarIcon,
  Badge as CertificateIcon,
  Close as CloseIcon,
  Delete as DeleteIcon,
  Comment as CommentIcon,
  History as HistoryIcon,
  Send as SendIcon,
  CreditCard as CnpIcon,
  Edit as EditIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
} from '@mui/icons-material';
import { format } from 'date-fns';
import { ro } from 'date-fns/locale';
import {
  useGetHandicapLegitimationsQuery,
  useCreateHandicapLegitimationMutation,
  useUpdateHandicapLegitimationMutation,
  useDeleteHandicapLegitimationMutation,
  useAddHandicapLegitimationCommentMutation,
  useGetHandicapLegitimationHistoryQuery,
  useGetHandicapLegitimationQuery,
} from '../../store/api/handicap.api';
import type {
  HandicapLegitimation,
  HandicapLegitimationStatus,
  CreateHandicapLegitimationDto,
} from '../../types/handicap.types';
import { HANDICAP_LEGITIMATION_STATUS_LABELS } from '../../types/handicap.types';
import { HISTORY_ACTION_LABELS } from '../../types/parking.types';

// Culori
const LEGITIMATION_COLOR = { main: '#059669', bg: '#05966915' };

interface HandicapLegitimatiiTabProps {
  isAdmin: boolean;
  canEdit: boolean;
  searchQuery: string;
  statusFilter: HandicapLegitimationStatus | '';
  initialOpenId?: string | null;
  onOpenIdHandled?: () => void;
}

// ============== LEGITIMATION CARD ==============
interface LegitimationCardProps {
  legitimation: HandicapLegitimation;
  onClick: () => void;
}

const LegitimationCard: React.FC<LegitimationCardProps> = ({ legitimation, onClick }) => {
  const theme = useTheme();
  const isFinalizat = legitimation.status === 'FINALIZAT';

  return (
    <Card
      onClick={onClick}
      sx={{
        cursor: 'pointer',
        borderRadius: 2,
        border: `1px solid ${alpha(LEGITIMATION_COLOR.main, 0.2)}`,
        transition: 'all 0.2s ease',
        bgcolor: isFinalizat ? alpha(theme.palette.success.main, 0.05) : 'background.paper',
        '&:hover': {
          transform: 'translateY(-2px)',
          boxShadow: `0 4px 12px ${alpha(LEGITIMATION_COLOR.main, 0.15)}`,
          borderColor: LEGITIMATION_COLOR.main,
        },
        '&:active': {
          transform: 'translateY(0)',
        },
      }}
    >
      <CardContent sx={{ p: { xs: 1.5, sm: 2 } }}>
        <Stack spacing={1}>
          {/* Header */}
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box
                sx={{
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  bgcolor: LEGITIMATION_COLOR.bg,
                  color: LEGITIMATION_COLOR.main,
                }}
              >
                <LegitimationIcon sx={{ fontSize: 18 }} />
              </Box>
              <Typography variant="subtitle2" fontWeight={600}>
                {legitimation.personName}
              </Typography>
            </Box>
            <Chip
              label={HANDICAP_LEGITIMATION_STATUS_LABELS[legitimation.status]}
              size="small"
              sx={{
                bgcolor: isFinalizat ? alpha(theme.palette.success.main, 0.1) : alpha(theme.palette.error.main, 0.1),
                color: isFinalizat ? 'success.dark' : 'error.dark',
                fontWeight: 500,
                fontSize: '0.7rem',
              }}
            />
          </Box>

          {/* Details */}
          <Stack direction="row" spacing={2} flexWrap="wrap">
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <CarIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
              <Typography variant="body2" color="text.secondary">
                {legitimation.carPlate}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <CertificateIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
              <Typography variant="body2" color="text.secondary">
                {legitimation.handicapCertificateNumber}
              </Typography>
            </Box>
          </Stack>

          {/* Footer */}
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pt: 0.5 }}>
            <Typography variant="caption" color="text.secondary">
              {format(new Date(legitimation.createdAt), 'd MMM yyyy, HH:mm', { locale: ro })}
            </Typography>
            {legitimation.comments && legitimation.comments.length > 0 && (
              <Chip
                icon={<CommentIcon sx={{ fontSize: '14px !important' }} />}
                label={legitimation.comments.length}
                size="small"
                variant="outlined"
                sx={{ height: 22, '& .MuiChip-label': { px: 0.75 } }}
              />
            )}
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );
};

// ============== CREATE DIALOG ==============
interface CreateLegitimationDialogProps {
  open: boolean;
  onClose: () => void;
}

const CreateLegitimationDialog: React.FC<CreateLegitimationDialogProps> = ({ open, onClose }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [createLegitimation, { isLoading }] = useCreateHandicapLegitimationMutation();

  const [formData, setFormData] = useState<CreateHandicapLegitimationDto>({
    personName: '',
    cnp: '',
    handicapCertificateNumber: '',
    carPlate: '',
    autoNumber: '',
    phone: '',
    description: '',
  });

  const handleSubmit = async () => {
    try {
      await createLegitimation(formData).unwrap();
      onClose();
      setFormData({
        personName: '',
        cnp: '',
        handicapCertificateNumber: '',
        carPlate: '',
        autoNumber: '',
        phone: '',
        description: '',
      });
    } catch (error) {
      console.error('Error creating legitimation:', error);
    }
  };

  const isFormValid = () => {
    return !!(formData.personName && formData.handicapCertificateNumber && formData.carPlate);
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
      <DialogTitle
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          background: `linear-gradient(135deg, ${LEGITIMATION_COLOR.main}, ${alpha(LEGITIMATION_COLOR.main, 0.7)})`,
          color: 'white',
        }}
      >
        <LegitimationIcon />
        <Typography variant="h6" component="span">
          Solicitare legitimatie handicap
        </Typography>
        <IconButton onClick={onClose} sx={{ ml: 'auto', color: 'white' }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ pt: 3 }}>
        <Stack spacing={2.5}>
          <Divider sx={{ my: 1 }}>
            <Chip label="Date persoana" size="small" />
          </Divider>

          <TextField
            label="Nume si prenume"
            value={formData.personName}
            onChange={(e) => setFormData({ ...formData, personName: e.target.value })}
            required
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
            label="CNP"
            value={formData.cnp}
            onChange={(e) => setFormData({ ...formData, cnp: e.target.value })}
            fullWidth
            placeholder="Optional"
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <CnpIcon color="action" />
                </InputAdornment>
              ),
            }}
          />

          <TextField
            label="Numar certificat handicap"
            value={formData.handicapCertificateNumber}
            onChange={(e) => setFormData({ ...formData, handicapCertificateNumber: e.target.value })}
            required
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
              value={formData.carPlate}
              onChange={(e) => setFormData({ ...formData, carPlate: e.target.value.toUpperCase() })}
              required
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
              label="Numar legitimatie"
              value={formData.autoNumber}
              onChange={(e) => setFormData({ ...formData, autoNumber: e.target.value })}
              fullWidth
              placeholder="Optional"
            />
          </Stack>

          <TextField
            label="Telefon"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            fullWidth
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <PhoneIcon color="action" />
                </InputAdornment>
              ),
            }}
          />

          <TextField
            label="Descriere (optional)"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            fullWidth
            multiline
            rows={3}
            placeholder="Informatii suplimentare..."
          />
        </Stack>
      </DialogContent>

      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose} disabled={isLoading}>
          Anuleaza
        </Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={!isFormValid() || isLoading}
          startIcon={isLoading ? <CircularProgress size={20} color="inherit" /> : <AddIcon />}
          sx={{
            bgcolor: LEGITIMATION_COLOR.main,
            '&:hover': { bgcolor: alpha(LEGITIMATION_COLOR.main, 0.9) },
          }}
        >
          {isLoading ? 'Se creeaza...' : 'Creeaza'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

// ============== DETAILS DIALOG ==============
interface LegitimationDetailsDialogProps {
  open: boolean;
  onClose: () => void;
  legitimationId: string | null;
  isAdmin: boolean;
  canEdit: boolean;
}

const LegitimationDetailsDialog: React.FC<LegitimationDetailsDialogProps> = ({
  open,
  onClose,
  legitimationId,
  isAdmin,
  canEdit,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [activeSection, setActiveSection] = useState<'details' | 'comments' | 'history'>('details');
  const [newComment, setNewComment] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({
    personName: '',
    cnp: '',
    handicapCertificateNumber: '',
    carPlate: '',
    autoNumber: '',
    phone: '',
    description: '',
  });

  const { data: legitimation, isLoading, refetch } = useGetHandicapLegitimationQuery(legitimationId || '', {
    skip: !legitimationId,
  });
  const { data: history = [] } = useGetHandicapLegitimationHistoryQuery(legitimationId || '', {
    skip: !legitimationId || activeSection !== 'history',
  });

  const [addComment, { isLoading: isAddingComment }] = useAddHandicapLegitimationCommentMutation();
  const [updateLegitimation, { isLoading: isUpdating }] = useUpdateHandicapLegitimationMutation();
  const [deleteLegitimation, { isLoading: isDeleting }] = useDeleteHandicapLegitimationMutation();

  // Populate edit data when legitimation loads
  useEffect(() => {
    if (legitimation && !isEditing) {
      setEditData({
        personName: legitimation.personName || '',
        cnp: legitimation.cnp || '',
        handicapCertificateNumber: legitimation.handicapCertificateNumber || '',
        carPlate: legitimation.carPlate || '',
        autoNumber: legitimation.autoNumber || '',
        phone: legitimation.phone || '',
        description: legitimation.description || '',
      });
    }
  }, [legitimation, isEditing]);

  const handleStartEdit = () => {
    if (legitimation) {
      setEditData({
        personName: legitimation.personName || '',
        cnp: legitimation.cnp || '',
        handicapCertificateNumber: legitimation.handicapCertificateNumber || '',
        carPlate: legitimation.carPlate || '',
        autoNumber: legitimation.autoNumber || '',
        phone: legitimation.phone || '',
        description: legitimation.description || '',
      });
      setIsEditing(true);
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
  };

  const handleSaveEdit = async () => {
    if (!legitimationId) return;
    try {
      await updateLegitimation({ id: legitimationId, data: editData }).unwrap();
      setIsEditing(false);
      refetch();
    } catch (error) {
      console.error('Error updating legitimation:', error);
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim() || !legitimationId) return;
    try {
      await addComment({ legitimationId, data: { content: newComment } }).unwrap();
      setNewComment('');
    } catch (error) {
      console.error('Error adding comment:', error);
    }
  };

  const handleDelete = async () => {
    if (!legitimationId) return;
    if (window.confirm('Sigur doriti sa stergeti aceasta legitimatie?')) {
      try {
        await deleteLegitimation(legitimationId).unwrap();
        onClose();
      } catch (error) {
        console.error('Error deleting legitimation:', error);
      }
    }
  };

  if (!legitimationId) return null;

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
        <DialogTitle
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            background: `linear-gradient(135deg, ${LEGITIMATION_COLOR.main}, ${alpha(LEGITIMATION_COLOR.main, 0.7)})`,
            color: 'white',
          }}
        >
          <LegitimationIcon />
          <Typography variant="h6" component="span" sx={{ flex: 1 }}>
            Detalii legitimatie
          </Typography>
          {legitimation && (
            <Chip
              label={HANDICAP_LEGITIMATION_STATUS_LABELS[legitimation.status]}
              size="small"
              sx={{
                bgcolor: legitimation.status === 'FINALIZAT' ? 'success.light' : 'warning.light',
                color: legitimation.status === 'FINALIZAT' ? 'success.dark' : 'warning.dark',
              }}
            />
          )}
          <IconButton onClick={onClose} sx={{ color: 'white' }}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>

        <DialogContent sx={{ p: 0 }}>
          {isLoading ? (
            <Box sx={{ p: 3 }}>
              <Stack spacing={2}>
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} variant="rounded" height={60} />
                ))}
              </Stack>
            </Box>
          ) : legitimation ? (
            <>
              {/* Section Tabs */}
              <Box
                sx={{
                  display: 'flex',
                  borderBottom: 1,
                  borderColor: 'divider',
                  bgcolor: 'background.default',
                }}
              >
                {(['details', 'comments', 'history'] as const).map((section) => (
                  <Button
                    key={section}
                    onClick={() => setActiveSection(section)}
                    sx={{
                      flex: 1,
                      py: 1.5,
                      borderRadius: 0,
                      borderBottom: activeSection === section ? 2 : 0,
                      borderColor: LEGITIMATION_COLOR.main,
                      color: activeSection === section ? LEGITIMATION_COLOR.main : 'text.secondary',
                      fontWeight: activeSection === section ? 600 : 400,
                    }}
                    startIcon={
                      section === 'details' ? (
                        <PersonIcon />
                      ) : section === 'comments' ? (
                        <CommentIcon />
                      ) : (
                        <HistoryIcon />
                      )
                    }
                  >
                    {section === 'details' ? 'Detalii' : section === 'comments' ? 'Comentarii' : 'Istoric'}
                  </Button>
                ))}
              </Box>

              {/* Details Section */}
              {activeSection === 'details' && (
                <Box sx={{ p: 3 }}>
                  <Stack spacing={2}>
                    {/* Edit/View toggle button */}
                    {canEdit && legitimation.status === 'ACTIVE' && (
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
                              sx={{ bgcolor: LEGITIMATION_COLOR.main }}
                            >
                              Salveaza
                            </Button>
                          </Stack>
                        )}
                      </Box>
                    )}

                    {isEditing ? (
                      // Edit mode
                      <Paper sx={{ p: 2 }}>
                        <Stack spacing={2}>
                          <TextField
                            label="Nume persoana"
                            value={editData.personName}
                            onChange={(e) => setEditData({ ...editData, personName: e.target.value })}
                            fullWidth
                            required
                            InputProps={{
                              startAdornment: (
                                <InputAdornment position="start">
                                  <PersonIcon color="action" />
                                </InputAdornment>
                              ),
                            }}
                          />
                          <TextField
                            label="CNP"
                            value={editData.cnp}
                            onChange={(e) => setEditData({ ...editData, cnp: e.target.value })}
                            fullWidth
                            InputProps={{
                              startAdornment: (
                                <InputAdornment position="start">
                                  <CnpIcon color="action" />
                                </InputAdornment>
                              ),
                            }}
                          />
                          <TextField
                            label="Nr. certificat handicap"
                            value={editData.handicapCertificateNumber}
                            onChange={(e) => setEditData({ ...editData, handicapCertificateNumber: e.target.value })}
                            fullWidth
                            required
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
                              required
                              InputProps={{
                                startAdornment: (
                                  <InputAdornment position="start">
                                    <CarIcon color="action" />
                                  </InputAdornment>
                                ),
                              }}
                            />
                            <TextField
                              label="Nr. legitimatie"
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
                          <TextField
                            label="Descriere"
                            value={editData.description}
                            onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                            fullWidth
                            multiline
                            rows={3}
                          />
                        </Stack>
                      </Paper>
                    ) : (
                      // View mode
                      <>
                        <Paper sx={{ p: 2, bgcolor: LEGITIMATION_COLOR.bg }}>
                          <Stack spacing={1.5}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <PersonIcon sx={{ color: LEGITIMATION_COLOR.main }} />
                              <Typography variant="body1" fontWeight={600}>
                                {legitimation.personName}
                              </Typography>
                            </Box>
                            {legitimation.cnp && (
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <CnpIcon sx={{ color: 'text.secondary' }} />
                                <Typography variant="body2">CNP: {legitimation.cnp}</Typography>
                              </Box>
                            )}
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <CertificateIcon sx={{ color: 'text.secondary' }} />
                              <Typography variant="body2">
                                Certificat: {legitimation.handicapCertificateNumber}
                              </Typography>
                            </Box>
                            <Divider />
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <CarIcon sx={{ color: 'text.secondary' }} />
                              <Typography variant="body2">
                                Inmatriculare: {legitimation.carPlate}
                                {legitimation.autoNumber && ` • Legitimatie: ${legitimation.autoNumber}`}
                              </Typography>
                            </Box>
                            {legitimation.phone && (
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <PhoneIcon sx={{ color: 'text.secondary' }} />
                                <Typography variant="body2">{legitimation.phone}</Typography>
                              </Box>
                            )}
                          </Stack>
                        </Paper>

                        {legitimation.description && (
                          <Paper sx={{ p: 2 }}>
                            <Typography variant="subtitle2" gutterBottom>
                              Descriere
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              {legitimation.description}
                            </Typography>
                          </Paper>
                        )}

                        {legitimation.resolutionDescription && (
                          <Paper sx={{ p: 2, bgcolor: alpha(theme.palette.success.main, 0.1) }}>
                            <Typography variant="subtitle2" gutterBottom color="success.dark">
                              Rezolutie
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              {legitimation.resolutionDescription}
                            </Typography>
                            {legitimation.resolvedAt && (
                              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                                Finalizat la:{' '}
                                {format(new Date(legitimation.resolvedAt), 'd MMMM yyyy, HH:mm', { locale: ro })}
                                {legitimation.resolver && ` de ${legitimation.resolver.fullName}`}
                              </Typography>
                            )}
                          </Paper>
                        )}
                      </>
                    )}

                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'text.secondary' }}>
                      <Typography variant="caption">
                        Creat de {legitimation.creator?.fullName || 'Necunoscut'} la{' '}
                        {format(new Date(legitimation.createdAt), 'd MMMM yyyy, HH:mm', { locale: ro })}
                      </Typography>
                    </Box>
                  </Stack>
                </Box>
              )}

              {/* Comments Section */}
              {activeSection === 'comments' && (
                <Box sx={{ p: 3 }}>
                  <Stack spacing={2}>
                    {/* Add comment */}
                    <Paper sx={{ p: 2 }}>
                      <TextField
                        fullWidth
                        multiline
                        rows={2}
                        placeholder="Adauga un comentariu..."
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        disabled={isAddingComment}
                      />
                      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1 }}>
                        <Button
                          variant="contained"
                          size="small"
                          onClick={handleAddComment}
                          disabled={!newComment.trim() || isAddingComment}
                          startIcon={
                            isAddingComment ? <CircularProgress size={16} color="inherit" /> : <SendIcon />
                          }
                          sx={{ bgcolor: LEGITIMATION_COLOR.main }}
                        >
                          Trimite
                        </Button>
                      </Box>
                    </Paper>

                    {/* Comments list */}
                    <List>
                      {legitimation.comments && legitimation.comments.length > 0 ? (
                        legitimation.comments.map((comment) => (
                          <ListItem key={comment.id} alignItems="flex-start" sx={{ px: 0 }}>
                            <ListItemAvatar>
                              <Avatar sx={{ bgcolor: LEGITIMATION_COLOR.main }}>
                                {comment.user?.fullName?.charAt(0) || 'U'}
                              </Avatar>
                            </ListItemAvatar>
                            <ListItemText
                              primary={
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                  <Typography variant="subtitle2">
                                    {comment.user?.fullName || 'Utilizator'}
                                  </Typography>
                                  <Typography variant="caption" color="text.secondary">
                                    {format(new Date(comment.createdAt), 'd MMM, HH:mm', { locale: ro })}
                                  </Typography>
                                </Box>
                              }
                              secondary={comment.content}
                            />
                          </ListItem>
                        ))
                      ) : (
                        <Typography variant="body2" color="text.secondary" textAlign="center" py={2}>
                          Nu exista comentarii inca
                        </Typography>
                      )}
                    </List>
                  </Stack>
                </Box>
              )}

              {/* History Section */}
              {activeSection === 'history' && (
                <Box sx={{ p: 3 }}>
                  <List>
                    {history.length > 0 ? (
                      history.map((entry) => (
                        <ListItem key={entry.id} sx={{ px: 0 }}>
                          <ListItemAvatar>
                            <Avatar
                              sx={{
                                bgcolor:
                                  entry.action === 'CREATED'
                                    ? 'info.light'
                                    : entry.action === 'RESOLVED'
                                      ? 'success.light'
                                      : 'warning.light',
                              }}
                            >
                              <HistoryIcon />
                            </Avatar>
                          </ListItemAvatar>
                          <ListItemText
                            primary={
                              <Typography variant="subtitle2">
                                {HISTORY_ACTION_LABELS[entry.action] || entry.action}
                              </Typography>
                            }
                            secondary={
                              <>
                                <Typography variant="caption" color="text.secondary">
                                  {entry.user?.fullName || 'Utilizator'} •{' '}
                                  {format(new Date(entry.createdAt), 'd MMM yyyy, HH:mm', { locale: ro })}
                                </Typography>
                              </>
                            }
                          />
                        </ListItem>
                      ))
                    ) : (
                      <Typography variant="body2" color="text.secondary" textAlign="center" py={2}>
                        Nu exista istoric
                      </Typography>
                    )}
                  </List>
                </Box>
              )}
            </>
          ) : (
            <Box sx={{ p: 3, textAlign: 'center' }}>
              <Typography color="text.secondary">Legitimatia nu a fost gasita</Typography>
            </Box>
          )}
        </DialogContent>

        {legitimation && legitimation.status === 'ACTIVE' && (
          <DialogActions sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
            {isAdmin && (
              <Button
                color="error"
                onClick={handleDelete}
                disabled={isDeleting}
                startIcon={isDeleting ? <CircularProgress size={16} /> : <DeleteIcon />}
              >
                Sterge
              </Button>
            )}
            <Box sx={{ flex: 1 }} />
            <Button onClick={onClose} variant="outlined">
              Inchide
            </Button>
          </DialogActions>
        )}
      </Dialog>
    </>
  );
};

// ============== MAIN TAB COMPONENT ==============
const HandicapLegitimatiiTab: React.FC<HandicapLegitimatiiTabProps> = ({
  isAdmin,
  canEdit,
  searchQuery,
  statusFilter,
  initialOpenId,
  onOpenIdHandled,
}) => {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedLegitimationId, setSelectedLegitimationId] = useState<string | null>(null);

  const { data: legitimations = [], isLoading } = useGetHandicapLegitimationsQuery(
    statusFilter ? { status: statusFilter as HandicapLegitimationStatus } : undefined
  );

  // Handle initial open from notification
  useEffect(() => {
    if (initialOpenId && legitimations.length > 0) {
      const legitimation = legitimations.find(l => l.id === initialOpenId);
      if (legitimation) {
        setSelectedLegitimationId(legitimation.id);
        onOpenIdHandled?.();
      }
    }
  }, [initialOpenId, legitimations, onOpenIdHandled]);

  // Filter by search
  const filteredLegitimations = useMemo(() => {
    if (!searchQuery) return legitimations;
    return legitimations.filter(
      (l) =>
        l.personName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        l.carPlate.toLowerCase().includes(searchQuery.toLowerCase()) ||
        l.handicapCertificateNumber.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [legitimations, searchQuery]);

  const activeCount = useMemo(() => legitimations.filter((l) => l.status === 'ACTIVE').length, [legitimations]);

  return (
    <Box>
      {/* Header with create button */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <LegitimationIcon sx={{ color: LEGITIMATION_COLOR.main }} />
          Legitimatii Handicap ({activeCount} active)
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setCreateDialogOpen(true)}
          sx={{
            bgcolor: LEGITIMATION_COLOR.main,
            '&:hover': { bgcolor: alpha(LEGITIMATION_COLOR.main, 0.9) },
          }}
        >
          Adauga
        </Button>
      </Box>

      {/* Content */}
      {isLoading ? (
        <Stack spacing={2}>
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} variant="rounded" height={100} sx={{ borderRadius: 2 }} />
          ))}
        </Stack>
      ) : filteredLegitimations.length === 0 ? (
        <Paper
          sx={{
            p: 4,
            textAlign: 'center',
            borderRadius: 3,
            bgcolor: LEGITIMATION_COLOR.bg,
          }}
        >
          <LegitimationIcon sx={{ fontSize: 64, color: alpha(LEGITIMATION_COLOR.main, 0.3), mb: 2 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            Nu exista legitimatii handicap
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {searchQuery ? 'Nu s-au gasit rezultate pentru cautarea ta' : 'Nu exista legitimatii handicap inca'}
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setCreateDialogOpen(true)}
            sx={{
              bgcolor: LEGITIMATION_COLOR.main,
              '&:hover': { bgcolor: alpha(LEGITIMATION_COLOR.main, 0.9) },
            }}
          >
            Creeaza prima legitimatie handicap
          </Button>
        </Paper>
      ) : (
        <Stack spacing={1.5}>
          {filteredLegitimations.map((legitimation) => (
            <LegitimationCard
              key={legitimation.id}
              legitimation={legitimation}
              onClick={() => setSelectedLegitimationId(legitimation.id)}
            />
          ))}
        </Stack>
      )}

      {/* Dialogs */}
      <CreateLegitimationDialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} />

      <LegitimationDetailsDialog
        open={!!selectedLegitimationId}
        onClose={() => setSelectedLegitimationId(null)}
        legitimationId={selectedLegitimationId}
        isAdmin={isAdmin}
        canEdit={canEdit}
      />
    </Box>
  );
};

export default HandicapLegitimatiiTab;
