import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Stack,
  Chip,
  Divider,
  TextField,
  CircularProgress,
  Alert,
  Paper,
  Tabs,
  Tab,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  Send as SendIcon,
  History as HistoryIcon,
  Comment as CommentIcon,
} from '@mui/icons-material';
import {
  useGetDamageHistoryQuery,
  useGetDamageCommentsQuery,
  useAddDamageCommentMutation,
} from '../../../store/api/parking.api';
import type { ParkingDamage } from '../../../types/parking.types';
import { DAMAGE_STATUS_LABELS, RESOLUTION_TYPE_LABELS, HISTORY_ACTION_LABELS } from '../../../types/parking.types';

interface DamageDetailsDialogProps {
  open: boolean;
  onClose: () => void;
  damage: ParkingDamage;
  canComment: boolean;
}

const DamageDetailsDialog: React.FC<DamageDetailsDialogProps> = ({
  open,
  onClose,
  damage,
  canComment,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const [activeTab, setActiveTab] = useState(0);
  const [newComment, setNewComment] = useState('');

  const { data: history = [], isLoading: historyLoading } = useGetDamageHistoryQuery(damage.id, { skip: !open });
  const { data: comments = [], isLoading: commentsLoading } = useGetDamageCommentsQuery(damage.id, { skip: !open });
  const [addComment, { isLoading: addingComment }] = useAddDamageCommentMutation();

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ro-RO', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) return;

    try {
      await addComment({
        damageId: damage.id,
        data: { content: newComment.trim() },
      }).unwrap();
      setNewComment('');
    } catch (error) {
      console.error('Error adding comment:', error);
    }
  };

  const getStatusColor = (status: string) => {
    return status === 'ACTIVE' ? 'warning' : 'success';
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth fullScreen={isMobile}>
      <DialogTitle>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">Detalii Prejudiciu</Typography>
          <Chip
            label={DAMAGE_STATUS_LABELS[damage.status]}
            color={getStatusColor(damage.status)}
            size="small"
          />
        </Box>
      </DialogTitle>

      <DialogContent dividers>
        {/* Damage Details */}
        <Paper sx={{ p: 2, mb: 2 }}>
          <Stack spacing={1}>
            <Typography variant="subtitle1" fontWeight="bold">
              {damage.parkingLot?.name}
            </Typography>
            <Typography variant="body2">
              <strong>Echipament avariat:</strong> {damage.damagedEquipment}
            </Typography>
            <Typography variant="body2">
              <strong>Persoana:</strong> {damage.personName}
            </Typography>
            <Typography variant="body2">
              <strong>Telefon:</strong> {damage.phone}
            </Typography>
            <Typography variant="body2">
              <strong>Nr. Masina:</strong> {damage.carPlate}
            </Typography>
            <Typography variant="body2">
              <strong>Descriere:</strong> {damage.description}
            </Typography>
            <Divider sx={{ my: 1 }} />
            <Typography variant="caption" color="text.secondary">
              <strong>Creat:</strong> {formatDate(damage.createdAt)} de {damage.creator?.fullName}
            </Typography>
            {damage.lastModifier && damage.lastModifiedBy !== damage.createdBy && (
              <Typography variant="caption" color="text.secondary">
                <strong>Ultima modificare:</strong> de {damage.lastModifier?.fullName}
              </Typography>
            )}
            {damage.status === 'FINALIZAT' && damage.resolver && damage.resolutionType && (
              <Alert severity="success" sx={{ mt: 1 }}>
                <Typography variant="body2">
                  <strong>Finalizat de {damage.resolver.fullName}</strong><br />
                  <strong>{RESOLUTION_TYPE_LABELS[damage.resolutionType]}:</strong> {damage.resolutionDescription}
                </Typography>
                <Typography variant="caption">
                  {damage.resolvedAt && formatDate(damage.resolvedAt)}
                </Typography>
              </Alert>
            )}
          </Stack>
        </Paper>

        {/* Tabs */}
        <Tabs
          value={activeTab}
          onChange={(_, v) => setActiveTab(v)}
          sx={{ mb: 2 }}
        >
          <Tab icon={<CommentIcon />} label="Comentarii" iconPosition="start" />
          <Tab icon={<HistoryIcon />} label="Istoric" iconPosition="start" />
        </Tabs>

        {/* Comments Tab */}
        {activeTab === 0 && (
          <Box>
            {canComment && (
              <Box sx={{ mb: 2, display: 'flex', gap: 1 }}>
                <TextField
                  fullWidth
                  size="small"
                  placeholder="Adauga un comentariu..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  disabled={addingComment}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleAddComment();
                    }
                  }}
                />
                <Button
                  variant="contained"
                  onClick={handleAddComment}
                  disabled={addingComment || !newComment.trim()}
                  startIcon={addingComment ? <CircularProgress size={16} /> : <SendIcon />}
                >
                  Trimite
                </Button>
              </Box>
            )}

            {commentsLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
                <CircularProgress size={24} />
              </Box>
            ) : comments.length === 0 ? (
              <Alert severity="info">Nu exista comentarii.</Alert>
            ) : (
              <Stack spacing={1}>
                {comments.map((comment) => (
                  <Paper key={comment.id} sx={{ p: 1.5 }} variant="outlined">
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                      <Typography variant="subtitle2" fontWeight="bold">
                        {comment.user?.fullName}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {formatDate(comment.createdAt)}
                      </Typography>
                    </Box>
                    <Typography variant="body2">{comment.content}</Typography>
                  </Paper>
                ))}
              </Stack>
            )}
          </Box>
        )}

        {/* History Tab */}
        {activeTab === 1 && (
          <Box>
            {historyLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
                <CircularProgress size={24} />
              </Box>
            ) : history.length === 0 ? (
              <Alert severity="info">Nu exista istoric.</Alert>
            ) : (
              <Stack spacing={1}>
                {history.map((item) => (
                  <Paper key={item.id} sx={{ p: 1.5 }} variant="outlined">
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                      <Chip
                        label={HISTORY_ACTION_LABELS[item.action]}
                        size="small"
                        color={item.action === 'CREATED' ? 'primary' : item.action === 'RESOLVED' ? 'success' : 'default'}
                      />
                      <Typography variant="caption" color="text.secondary">
                        {formatDate(item.createdAt)}
                      </Typography>
                    </Box>
                    <Typography variant="body2">
                      <strong>{item.user?.fullName}</strong>
                    </Typography>
                    {item.changes && Object.keys(item.changes).length > 0 && (
                      <Box sx={{ mt: 1 }}>
                        {Object.entries(item.changes).map(([key, value]) => (
                          <Typography key={key} variant="caption" display="block" color="text.secondary">
                            {typeof value === 'object' && value !== null && 'from' in value
                              ? `${key}: "${value.from}" → "${value.to}"`
                              : `${key}: ${JSON.stringify(value)}`}
                          </Typography>
                        ))}
                      </Box>
                    )}
                  </Paper>
                ))}
              </Stack>
            )}
          </Box>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Inchide</Button>
      </DialogActions>
    </Dialog>
  );
};

export default DamageDetailsDialog;
