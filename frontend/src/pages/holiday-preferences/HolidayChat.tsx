import { memo, useEffect, useRef, useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  CircularProgress,
  IconButton,
  Stack,
  TextField,
  Tooltip,
  Typography,
  alpha,
  useTheme,
} from '@mui/material';
import { Send as SendIcon, DeleteOutline as DeleteIcon, Forum as ChatIcon } from '@mui/icons-material';
import { useSnackbar } from '../../contexts/SnackbarContext';
import {
  useGetHolidayMessagesQuery,
  usePostHolidayMessageMutation,
  useDeleteHolidayMessageMutation,
} from '../../store/api/holidayPreferences.api';

const formatTime = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleString('ro-RO', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
};

/**
 * Chat-ul unei perioade de sarbatori: dispecerii isi scriu obiectiile / se inteleg
 * intre ei, iar managerul raspunde. Mesajele raman salvate permanent pe perioada.
 */
const HolidayChat = ({
  periodId,
  group,
  groupName,
  currentUserId,
  canModerate,
}: {
  periodId: string;
  group: string;
  groupName: string;
  currentUserId: string;
  canModerate: boolean;
}) => {
  const theme = useTheme();
  const { notifyError } = useSnackbar();
  const { data: messages = [], isLoading } = useGetHolidayMessagesQuery({ periodId, group }, { skipPollingIfUnfocused: true, pollingInterval: 10000 });
  const [postMessage, { isLoading: sending }] = usePostHolidayMessageMutation();
  const [deleteMessage] = useDeleteHolidayMessageMutation();
  const [text, setText] = useState('');
  const isTouch = typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches;
  const listRef = useRef<HTMLDivElement>(null);

  // Deruleaza la ultimul mesaj cand apar mesaje noi
  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length, periodId, group]);

  const send = async () => {
    const clean = text.trim();
    if (!clean || sending) return;
    try {
      await postMessage({ periodId, group, message: clean }).unwrap();
      setText('');
    } catch (err: unknown) {
      notifyError((err as { data?: { message?: string } })?.data?.message || 'Mesajul nu a putut fi trimis');
    }
  };

  return (
    <Card>
      <CardContent>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
          <ChatIcon color="primary" />
          <Typography variant="h6" fontWeight={700} sx={{ fontSize: { xs: '1.05rem', md: '1.25rem' } }}>
            Discutie
          </Typography>
          {messages.length > 0 && (
            <Typography variant="body2" color="text.secondary">
              ({messages.length})
            </Typography>
          )}
        </Stack>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
          Discutia colegilor din {groupName} pentru aceasta perioada. Mesajele raman salvate aici.
        </Typography>

        <Box
          ref={listRef}
          sx={{
            maxHeight: { xs: '55vh', md: 380 },
            minHeight: 120,
            p: { xs: 1, md: 1.5 },
            WebkitOverflowScrolling: 'touch',
            overflowY: 'auto',
            borderRadius: 2,
            bgcolor: alpha(theme.palette.primary.main, 0.03),
            border: `1px solid ${theme.palette.divider}`,
          }}
        >
          {isLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
              <CircularProgress size={24} />
            </Box>
          ) : messages.length === 0 ? (
            <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 3 }}>
              Niciun mesaj inca. Scrie primul daca ai o obiectie sau vrei sa schimbi o zi cu un coleg.
            </Typography>
          ) : (
            <Stack spacing={1.25}>
              {messages.map((m) => {
                const mine = m.userId === currentUserId;
                const isBoss = m.userRole && m.userRole !== 'USER';
                return (
                  <Box key={m.id} sx={{ display: 'flex', justifyContent: mine ? 'flex-end' : 'flex-start' }}>
                    <Box
                      sx={{
                        maxWidth: { xs: '88%', md: '75%' },
                        px: 1.5,
                        py: 1,
                        borderRadius: 2.5,
                        borderTopRightRadius: mine ? 6 : undefined,
                        borderTopLeftRadius: mine ? undefined : 6,
                        bgcolor: mine ? 'primary.main' : 'background.paper',
                        color: mine ? 'primary.contrastText' : 'text.primary',
                        border: mine ? 'none' : `1px solid ${theme.palette.divider}`,
                        '&:hover .msg-del': { opacity: 1 },
                      }}
                    >
                      <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
                        <Typography variant="caption" fontWeight={700} sx={{ opacity: 0.9 }}>
                          {mine ? 'Tu' : m.userName}
                          {isBoss && !mine && ' (coordonator)'}
                        </Typography>
                        <Stack direction="row" spacing={0.25} alignItems="center">
                          <Typography variant="caption" sx={{ opacity: 0.7, whiteSpace: 'nowrap' }}>
                            {formatTime(m.createdAt)}
                          </Typography>
                          {(mine || canModerate) && (
                            <Tooltip title="Sterge mesajul">
                              <IconButton
                                className="msg-del"
                                size="small"
                                aria-label="Sterge mesajul"
                                onClick={() =>
                                  deleteMessage({ periodId, group, messageId: m.id })
                                    .unwrap()
                                    .catch(() => notifyError('Mesajul nu a putut fi sters'))
                                }
                                sx={{
                                  p: 0.25,
                                  ml: 0.25,
                                  color: 'inherit',
                                  opacity: isTouch ? 0.6 : 0,
                                  transition: 'opacity 0.15s',
                                  '&:hover': { opacity: 1 },
                                }}
                              >
                                <DeleteIcon sx={{ fontSize: 16 }} />
                              </IconButton>
                            </Tooltip>
                          )}
                        </Stack>
                      </Stack>
                      <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', mt: 0.25 }}>
                        {m.message}
                      </Typography>
                    </Box>
                  </Box>
                );
              })}
            </Stack>
          )}
        </Box>

        <Stack direction="row" spacing={1} alignItems="flex-end" sx={{ mt: 1.5 }}>
          <TextField
            fullWidth
            multiline
            maxRows={4}
            size="small"
            placeholder={isTouch ? 'Scrie un mesaj...' : 'Scrie un mesaj... (Enter trimite, Shift+Enter rand nou)'}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              // Pe telefon Enter face rand nou; trimiterea se face cu butonul
              if (e.key === 'Enter' && !e.shiftKey && !isTouch) {
                e.preventDefault();
                send();
              }
            }}
            inputProps={{ maxLength: 2000, enterKeyHint: 'send' }}
            sx={{ '& .MuiInputBase-input': { fontSize: 16 } }}
          />
          <IconButton
            color="primary"
            onClick={send}
            disabled={!text.trim() || sending}
            sx={{ bgcolor: alpha(theme.palette.primary.main, 0.1), width: 44, height: 44 }}
          >
            {sending ? <CircularProgress size={20} /> : <SendIcon />}
          </IconButton>
        </Stack>
      </CardContent>
    </Card>
  );
};

export default memo(HolidayChat);
