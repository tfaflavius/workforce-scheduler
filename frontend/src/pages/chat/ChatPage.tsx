import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import {
  Avatar,
  Box,
  Button,
  Card,
  CircularProgress,
  Checkbox,
  Divider,
  FormControl,
  MenuItem,
  Select,
  IconButton,
  InputAdornment,
  List,
  ListItemAvatar,
  ListItemButton,
  ListItemText,
  Stack,
  TextField,
  Tooltip,
  Typography,
  alpha,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import {
  Campaign as AnnouncementIcon,
  Groups as GroupIcon,
  Send as SendIcon,
  ArrowBack as BackIcon,
  Search as SearchIcon,
  Edit as NewIcon,
  DeleteOutline as DeleteIcon,
  Forum as ChatIcon,
  SubdirectoryArrowRight as RouteIcon,
} from '@mui/icons-material';
import { FriendlyDialog, EmptyState } from '../../components/common';
import { useSnackbar } from '../../contexts/SnackbarContext';
import {
  useGetConversationsQuery,
  useGetChatMessagesQuery,
  useSendChatMessageMutation,
  useDeleteChatMessageMutation,
  useGetChatUsersQuery,
  useStartDirectChatMutation,
  type ChatConversationSummary,
} from '../../store/api/chat.api';
import { useAppSelector } from '../../store/hooks';

/** Eticheta "De la -> Catre" pentru mesajele trimise intre departamente. */
const routeLabel = (
  m: { fromDepartment?: string | null; toDepartments?: string[]; alsoVisibleTo?: string[] },
  groupName: string,
) => {
  const to = m.toDepartments || [];
  if (to.length === 0) return '';
  const internal = to.length === 1 && to[0] === groupName && (!m.fromDepartment || m.fromDepartment === groupName);
  const also = m.alsoVisibleTo?.length ? ` · vad si: ${m.alsoVisibleTo.join(', ')}` : '';
  if (internal && !also) return '';
  const toText = to.length > 3 ? `${to.length} departamente` : to.join(', ');
  const sameDept = to.length === 1 && m.fromDepartment === to[0];
  if (sameDept) return `In ${toText}${also}`;
  return `${m.fromDepartment ? `${m.fromDepartment} → ` : '→ '}${toText}${also}`;
};

const initials = (name: string) =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');

/** "14:05" azi, "ieri", altfel "12.11" */
const shortTime = (iso?: string | null) => {
  if (!iso) return '';
  const d = new Date(iso);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) return d.toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' });
  const y = new Date(now);
  y.setDate(now.getDate() - 1);
  if (d.toDateString() === y.toDateString()) return 'ieri';
  return d.toLocaleDateString('ro-RO', { day: '2-digit', month: '2-digit' });
};

const ConvAvatar = ({ conv }: { conv: ChatConversationSummary }) => {
  const theme = useTheme();
  if (conv.type === 'ANNOUNCEMENTS') {
    return (
      <Avatar sx={{ bgcolor: alpha(theme.palette.warning.main, 0.15), color: 'warning.dark' }}>
        <AnnouncementIcon />
      </Avatar>
    );
  }
  if (conv.type === 'DEPARTMENT') {
    return (
      <Avatar sx={{ bgcolor: alpha(theme.palette.primary.main, 0.12), color: 'primary.main' }}>
        <GroupIcon />
      </Avatar>
    );
  }
  return <Avatar sx={{ bgcolor: 'primary.main', fontSize: '0.95rem' }}>{initials(conv.title)}</Avatar>;
};

// ---------------- Lista conversatii ----------------
const ConversationList = ({
  conversations,
  selectedId,
  onSelect,
  onNew,
  loading,
}: {
  conversations: ChatConversationSummary[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  loading: boolean;
}) => {
  const [search, setSearch] = useState('');
  const filtered = useMemo(
    () => conversations.filter((c) => c.title.toLowerCase().includes(search.trim().toLowerCase())),
    [conversations, search],
  );
  return (
    <Stack sx={{ height: '100%', minHeight: 0 }}>
      <Stack direction="row" spacing={1} alignItems="center" sx={{ p: 1.5 }}>
        <TextField
          size="small"
          fullWidth
          placeholder="Cauta conversatie"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" />
              </InputAdornment>
            ),
          }}
          sx={{ '& .MuiInputBase-input': { fontSize: 16 } }}
        />
        <Tooltip title="Mesaj nou">
          <IconButton color="primary" onClick={onNew} sx={{ bgcolor: (t) => alpha(t.palette.primary.main, 0.1) }}>
            <NewIcon />
          </IconButton>
        </Tooltip>
      </Stack>
      <Divider />
      <Box sx={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress size={24} />
          </Box>
        ) : (
          <List disablePadding>
            {filtered.map((c) => (
              <ListItemButton
                key={c.id}
                selected={c.id === selectedId}
                onClick={() => onSelect(c.id)}
                sx={{ py: 1.25, alignItems: 'flex-start' }}
              >
                <ListItemAvatar sx={{ mt: 0.25 }}>
                  <ConvAvatar conv={c} />
                </ListItemAvatar>
                <ListItemText
                  disableTypography
                  primary={
                    <Stack direction="row" justifyContent="space-between" alignItems="baseline" spacing={1}>
                      <Typography fontWeight={c.unreadCount ? 700 : 600} noWrap>
                        {c.title}
                      </Typography>
                      <Typography
                        variant="caption"
                        color={c.unreadCount ? 'primary.main' : 'text.secondary'}
                        fontWeight={c.unreadCount ? 700 : 400}
                        sx={{ flexShrink: 0 }}
                      >
                        {shortTime(c.lastMessage?.createdAt || null)}
                      </Typography>
                    </Stack>
                  }
                  secondary={
                    <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1}>
                      <Typography
                        variant="body2"
                        color={c.unreadCount ? 'text.primary' : 'text.secondary'}
                        noWrap
                        sx={{ minWidth: 0 }}
                      >
                        {c.lastMessage
                          ? `${c.type !== 'DIRECT' ? `${c.lastMessage.userName.split(' ')[0]}: ` : ''}${c.lastMessage.text}`
                          : c.subtitle || 'Niciun mesaj inca'}
                      </Typography>
                      {c.unreadCount > 0 && (
                        <Box
                          sx={{
                            minWidth: 22,
                            height: 22,
                            px: 0.75,
                            borderRadius: 11,
                            bgcolor: 'primary.main',
                            color: 'primary.contrastText',
                            fontSize: 12,
                            fontWeight: 700,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                          }}
                        >
                          {c.unreadCount > 99 ? '99+' : c.unreadCount}
                        </Box>
                      )}
                    </Stack>
                  }
                />
              </ListItemButton>
            ))}
          </List>
        )}
      </Box>
    </Stack>
  );
};

// ---------------- Conversatia deschisa ----------------
const ChatThread = ({
  conv,
  onBack,
  showBack,
}: {
  conv: ChatConversationSummary;
  onBack: () => void;
  showBack: boolean;
}) => {
  const theme = useTheme();
  const { notifyError } = useSnackbar();
  const { user } = useAppSelector((s) => s.auth);
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'MASTER_ADMIN';
  const { data, isLoading } = useGetChatMessagesQuery(conv.id, { pollingInterval: 5000 });
  const [send, { isLoading: sending }] = useSendChatMessageMutation();
  const [del] = useDeleteChatMessageMutation();
  const [text, setText] = useState('');
  const listRef = useRef<HTMLDivElement>(null);
  const isTouch = typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches;
  const messages = data?.messages ?? [];
  const canWrite = data?.canWrite ?? conv.canWrite;
  const compose = data?.compose ?? null;
  // Destinatarii alesi (doar in grupurile de departament); implicit grupul curent
  const [picked, setPicked] = useState<{ convId: string; ids: string[] } | null>(null);
  const targetIds = picked?.convId === conv.id ? picked.ids : (compose?.defaultTargetIds ?? []);
  const setTargets = (ids: string[]) => setPicked({ convId: conv.id, ids });
  const optionName = (id: string) => compose?.options.find((o) => o.id === id)?.name || '';

  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length, conv.id]);

  const submit = async () => {
    const clean = text.trim();
    if (!clean || sending) return;
    try {
      if (compose && targetIds.length === 0) {
        notifyError('Alege departamentul catre care trimiti');
        return;
      }
      await send({ id: conv.id, message: clean, targetDepartmentIds: compose ? targetIds : undefined }).unwrap();
      setText('');
    } catch (err: unknown) {
      notifyError((err as { data?: { message?: string } })?.data?.message || 'Mesajul nu a putut fi trimis');
    }
  };

  // Separatoare pe zile
  const dayLabel = (iso: string) => {
    const d = new Date(iso);
    const t = shortTime(iso);
    if (t.includes(':')) return 'Azi';
    if (t === 'ieri') return 'Ieri';
    return d.toLocaleDateString('ro-RO', { weekday: 'long', day: 'numeric', month: 'long' });
  };

  return (
    <Stack sx={{ height: '100%', minHeight: 0 }}>
      {/* Antet */}
      <Stack direction="row" spacing={1.25} alignItems="center" sx={{ px: 1.5, py: 1.25 }}>
        {showBack && (
          <IconButton onClick={onBack} edge="start" aria-label="Inapoi la conversatii">
            <BackIcon />
          </IconButton>
        )}
        <ConvAvatar conv={conv} />
        <Box sx={{ minWidth: 0 }}>
          <Typography fontWeight={700} noWrap>
            {conv.title}
          </Typography>
          {conv.subtitle && (
            <Typography variant="caption" color="text.secondary" noWrap component="div">
              {conv.subtitle}
            </Typography>
          )}
        </Box>
      </Stack>
      <Divider />

      {/* Mesaje */}
      <Box
        ref={listRef}
        sx={{
          flex: 1,
          minHeight: 0,
          overflowY: 'auto',
          px: { xs: 1, md: 2 },
          py: 1.5,
          bgcolor: alpha(theme.palette.primary.main, 0.025),
          WebkitOverflowScrolling: 'touch',
        }}
      >
        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress size={24} />
          </Box>
        ) : messages.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
            {conv.type === 'ANNOUNCEMENTS' && !canWrite
              ? 'Inca nu exista anunturi.'
              : 'Niciun mesaj inca. Scrie primul mesaj.'}
          </Typography>
        ) : (
          <Stack spacing={1}>
            {messages.map((m, i) => {
              const mine = m.userId === user?.id;
              const prev = messages[i - 1];
              const newDay = !prev || new Date(prev.createdAt).toDateString() !== new Date(m.createdAt).toDateString();
              const showName = !mine && conv.type !== 'DIRECT' && (newDay || prev?.userId !== m.userId);
              return (
                <Box key={m.id}>
                  {newDay && (
                    <Box sx={{ display: 'flex', justifyContent: 'center', my: 1 }}>
                      <Typography
                        variant="caption"
                        sx={{ px: 1.5, py: 0.25, borderRadius: 2, bgcolor: 'background.paper', color: 'text.secondary', boxShadow: 1 }}
                      >
                        {dayLabel(m.createdAt)}
                      </Typography>
                    </Box>
                  )}
                  <Box sx={{ display: 'flex', justifyContent: mine ? 'flex-end' : 'flex-start' }}>
                    <Box
                      sx={{
                        maxWidth: { xs: '85%', md: '70%' },
                        px: 1.5,
                        py: 0.75,
                        borderRadius: 2.5,
                        borderTopRightRadius: mine ? 6 : undefined,
                        borderTopLeftRadius: mine ? undefined : 6,
                        bgcolor: mine ? 'primary.main' : 'background.paper',
                        color: mine ? 'primary.contrastText' : 'text.primary',
                        border: mine ? 'none' : `1px solid ${theme.palette.divider}`,
                        '&:hover .msg-del': { opacity: 1 },
                      }}
                    >
                      {showName && (
                        <Typography variant="caption" fontWeight={700} color="primary.main" component="div">
                          {m.userName}
                        </Typography>
                      )}
                      {routeLabel(m, conv.title) && (
                        <Stack direction="row" spacing={0.5} alignItems="flex-start" sx={{ opacity: mine ? 0.85 : 0.75, mb: 0.25 }}>
                          <RouteIcon sx={{ fontSize: 13, mt: '2px' }} />
                          <Typography variant="caption" sx={{ fontSize: 11, lineHeight: 1.35 }}>
                            {routeLabel(m, conv.title)}
                          </Typography>
                        </Stack>
                      )}
                      <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                        {m.message}
                      </Typography>
                      <Stack direction="row" justifyContent="flex-end" alignItems="center" spacing={0.25}>
                        {/* Pe telefon coșul apare doar la mesajele proprii (adminul sterge din calculator) */}
                        {(mine || (isAdmin && !isTouch)) && (
                          <IconButton
                            className="msg-del"
                            size="small"
                            aria-label="Sterge mesajul"
                            onClick={() =>
                              del({ id: m.id, conversationId: conv.id })
                                .unwrap()
                                .catch(() => notifyError('Mesajul nu a putut fi sters'))
                            }
                            sx={{ p: 0.25, color: 'inherit', opacity: isTouch ? 0.5 : 0, transition: 'opacity 0.15s' }}
                          >
                            <DeleteIcon sx={{ fontSize: 15 }} />
                          </IconButton>
                        )}
                        <Typography variant="caption" sx={{ opacity: 0.7, fontSize: 11 }}>
                          {new Date(m.createdAt).toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' })}
                        </Typography>
                      </Stack>
                    </Box>
                  </Box>
                </Box>
              );
            })}
          </Stack>
        )}
      </Box>
      <Divider />

      {/* Scriere */}
      {canWrite ? (
        <Box>
          {compose && compose.options.length > 0 && (
            <Stack direction="row" spacing={1} alignItems="center" sx={{ px: 1.25, pt: 1 }}>
              <Typography variant="caption" color="text.secondary" sx={{ flexShrink: 0 }}>
                Catre:
              </Typography>
              <FormControl size="small" sx={{ flex: 1, minWidth: 0 }}>
                <Select
                  multiple={compose.multi}
                  displayEmpty
                  value={compose.multi ? targetIds : targetIds[0] || ''}
                  onChange={(e) => {
                    const v = e.target.value as string | string[];
                    if (!compose.multi) return setTargets(v ? [v as string] : []);
                    const arr = v as string[];
                    if (arr.includes('__all')) {
                      setTargets(targetIds.length === compose.options.length ? [] : compose.options.map((o) => o.id));
                    } else {
                      setTargets(arr);
                    }
                  }}
                  renderValue={(sel) => {
                    const ids = Array.isArray(sel) ? sel : sel ? [sel] : [];
                    if (ids.length === 0) return <em>Alege departamentul</em>;
                    if (compose.multi && ids.length > 1 && ids.length === compose.options.length) return 'Toate departamentele';
                    return ids.map(optionName).join(', ');
                  }}
                  sx={{ fontSize: 14, '& .MuiSelect-select': { py: 0.75 } }}
                  MenuProps={{ PaperProps: { sx: { maxHeight: 360 } } }}
                >
                  {compose.multi && compose.options.length > 1 && (
                    <MenuItem value="__all" dense>
                      <Checkbox size="small" checked={targetIds.length === compose.options.length} />
                      <strong>Toate departamentele</strong>
                    </MenuItem>
                  )}
                  {compose.options.map((o) => (
                    <MenuItem key={o.id} value={o.id} dense>
                      {compose.multi && <Checkbox size="small" checked={targetIds.includes(o.id)} />}
                      {o.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Stack>
          )}
        <Stack direction="row" spacing={1} alignItems="flex-end" sx={{ p: 1.25 }}>
          <TextField
            fullWidth
            multiline
            maxRows={4}
            size="small"
            placeholder={isTouch ? 'Scrie un mesaj...' : 'Scrie un mesaj... (Enter trimite, Shift+Enter rand nou)'}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey && !isTouch) {
                e.preventDefault();
                submit();
              }
            }}
            inputProps={{ maxLength: 4000, enterKeyHint: 'send' }}
            sx={{ '& .MuiInputBase-input': { fontSize: 16 } }}
          />
          <IconButton
            color="primary"
            onClick={submit}
            disabled={!text.trim() || sending}
            aria-label="Trimite"
            sx={{ bgcolor: alpha(theme.palette.primary.main, 0.1), width: 44, height: 44, flexShrink: 0 }}
          >
            {sending ? <CircularProgress size={20} /> : <SendIcon />}
          </IconButton>
        </Stack>
        </Box>
      ) : (
        <Typography variant="body2" color="text.secondary" sx={{ p: 1.5, textAlign: 'center' }}>
          Doar managerii si adminii pot scrie in Anunturi.
        </Typography>
      )}
    </Stack>
  );
};

// ---------------- Pagina ----------------
const ChatPage = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const location = useLocation();
  const navState = location.state as { conversationId?: string } | null;
  const { notifyError } = useSnackbar();

  const { data: conversations = [], isLoading } = useGetConversationsQuery(undefined, { pollingInterval: 15000 });
  const [selectedId, setSelectedId] = useState<string | null>(navState?.conversationId || null);
  const [newOpen, setNewOpen] = useState(false);
  const [userSearch, setUserSearch] = useState('');
  const { data: users = [] } = useGetChatUsersQuery(undefined, { skip: !newOpen });
  const [startDirect, { isLoading: starting }] = useStartDirectChatMutation();
  const [pendingConv, setPendingConv] = useState<ChatConversationSummary | null>(null);

  useEffect(() => {
    if (navState?.conversationId) window.history.replaceState({}, document.title);
  }, [navState?.conversationId]);

  // Conversatie privata noua (fara mesaje) nu apare inca in lista -> o tinem local
  // Pe desktop, fara selectie, se deschide automat prima conversatie
  const activeId = selectedId ?? (!isMobile ? conversations[0]?.id ?? null : null);
  const selected =
    conversations.find((c) => c.id === activeId) || (pendingConv?.id === activeId ? pendingConv : null);

  const filteredUsers = useMemo(
    () =>
      users.filter((u) =>
        `${u.fullName} ${u.departmentName || ''}`.toLowerCase().includes(userSearch.trim().toLowerCase()),
      ),
    [users, userSearch],
  );

  const openDirect = async (userId: string) => {
    try {
      const conv = await startDirect(userId).unwrap();
      setPendingConv(conv);
      setSelectedId(conv.id);
      setNewOpen(false);
      setUserSearch('');
    } catch {
      notifyError('Conversatia nu a putut fi deschisa');
    }
  };

  const list = (
    <ConversationList
      conversations={conversations}
      selectedId={activeId}
      onSelect={setSelectedId}
      onNew={() => setNewOpen(true)}
      loading={isLoading}
    />
  );

  // Inaltimea zonei de chat: ecran minus antetul aplicatiei (si bara de jos pe telefon)
  const paneHeight = isMobile
    ? 'calc(100dvh - 64px - 56px - env(safe-area-inset-bottom) - 100px)'
    : 'calc(100vh - 64px - 88px)';

  return (
    <Box>
      <Card sx={{ height: paneHeight, minHeight: 380, display: 'flex', overflow: 'hidden' }}>
        {isMobile ? (
          selected ? (
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <ChatThread conv={selected} onBack={() => setSelectedId(null)} showBack />
            </Box>
          ) : (
            <Box sx={{ flex: 1, minWidth: 0 }}>{list}</Box>
          )
        ) : (
          <>
            <Box sx={{ width: { md: 300, lg: 340 }, flexShrink: 0, borderRight: `1px solid ${theme.palette.divider}` }}>
              {list}
            </Box>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              {selected ? (
                <ChatThread conv={selected} onBack={() => setSelectedId(null)} showBack={false} />
              ) : (
                <EmptyState
                  icon={<ChatIcon sx={{ fontSize: 56 }} />}
                  title="Alege o conversatie"
                  description="Sau apasa pe creion ca sa scrii cuiva."
                />
              )}
            </Box>
          </>
        )}
      </Card>

      {/* Mesaj nou */}
      <FriendlyDialog
        open={newOpen}
        onClose={() => setNewOpen(false)}
        icon={<NewIcon />}
        variant="primary"
        title="Mesaj nou"
        subtitle="Alege colegul caruia vrei sa ii scrii"
        maxWidth="xs"
        actions={<Button onClick={() => setNewOpen(false)}>Inchide</Button>}
      >
        <TextField
          autoFocus={!isMobile}
          size="small"
          fullWidth
          placeholder="Cauta dupa nume sau departament"
          value={userSearch}
          onChange={(e) => setUserSearch(e.target.value)}
          sx={{ mb: 1, '& .MuiInputBase-input': { fontSize: 16 } }}
        />
        <List dense sx={{ maxHeight: 360, overflowY: 'auto' }}>
          {filteredUsers.map((u) => (
            <ListItemButton key={u.id} onClick={() => openDirect(u.id)} disabled={starting}>
              <ListItemAvatar>
                <Avatar sx={{ bgcolor: 'primary.main', width: 34, height: 34, fontSize: '0.85rem' }}>
                  {initials(u.fullName)}
                </Avatar>
              </ListItemAvatar>
              <ListItemText primary={u.fullName} secondary={u.departmentName || (u.role === 'ADMIN' || u.role === 'MASTER_ADMIN' ? 'Administrator' : u.role === 'MANAGER' ? 'Manager' : '')} />
            </ListItemButton>
          ))}
          {filteredUsers.length === 0 && (
            <Typography variant="body2" color="text.secondary" sx={{ p: 2, textAlign: 'center' }}>
              Niciun coleg gasit
            </Typography>
          )}
        </List>
      </FriendlyDialog>
    </Box>
  );
};

export default memo(ChatPage);
