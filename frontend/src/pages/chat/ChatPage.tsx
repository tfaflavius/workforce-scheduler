import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import {
  Avatar,
  Box,
  Button,
  Card,
  Chip,
  CircularProgress,
  Divider,
  Fab,
  IconButton,
  InputAdornment,
  List,
  ListItemAvatar,
  ListItemButton,
  ListItemText,
  Stack,
  TextField,
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
  Reply as ReplyIcon,
  Close as CloseIcon,
  DoneAll as SeenIcon,
  Done as SentIcon,
  KeyboardArrowDown as DownIcon,
  Check as CheckIcon,
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
  type ChatMessageItem,
} from '../../store/api/chat.api';
import { useAppSelector } from '../../store/hooks';

/** Eticheta "De la -> Catre" pentru mesajele trimise intre departamente. */

/** Ciornele de mesaje, pe conversatie (cat timp aplicatia e deschisa). */
const drafts = new Map<string, string>();

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
type ConvFilter = 'all' | 'unread' | 'groups' | 'direct';

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
  const [filter, setFilter] = useState<ConvFilter>('all');
  const unreadConvs = conversations.filter((c) => c.unreadCount > 0).length;
  const filtered = useMemo(
    () =>
      conversations.filter((c) => {
        if (!c.title.toLowerCase().includes(search.trim().toLowerCase())) return false;
        if (filter === 'unread') return c.unreadCount > 0;
        if (filter === 'groups') return c.type !== 'DIRECT';
        if (filter === 'direct') return c.type === 'DIRECT';
        return true;
      }),
    [conversations, search, filter],
  );
  const filters: Array<{ key: ConvFilter; label: string }> = [
    { key: 'all', label: 'Toate' },
    { key: 'unread', label: unreadConvs ? `Necitite (${unreadConvs})` : 'Necitite' },
    { key: 'groups', label: 'Departamente' },
    { key: 'direct', label: 'Private' },
  ];
  return (
    <Stack sx={{ height: '100%', minHeight: 0, position: 'relative' }}>
      <Box sx={{ p: 1.5, pb: 1 }}>
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
        <Stack
          direction="row"
          spacing={0.75}
          sx={{ mt: 1, overflowX: 'auto', scrollbarWidth: 'none', '&::-webkit-scrollbar': { display: 'none' } }}
        >
          {filters.map((f) => (
            <Chip
              key={f.key}
              label={f.label}
              size="small"
              clickable
              color={filter === f.key ? 'primary' : 'default'}
              variant={filter === f.key ? 'filled' : 'outlined'}
              onClick={() => setFilter(f.key)}
              sx={{ flexShrink: 0, fontWeight: 600 }}
            />
          ))}
        </Stack>
      </Box>
      <Divider />
      <Box sx={{ flex: 1, overflowY: 'auto', minHeight: 0, pb: 9 }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress size={24} />
          </Box>
        ) : filtered.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4, px: 2 }}>
            {filter === 'unread' ? 'Ai citit tot. Nicio conversatie necitita.' : 'Nicio conversatie gasita.'}
          </Typography>
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
      <Fab
        variant="extended"
        color="primary"
        onClick={onNew}
        sx={{ position: 'absolute', right: 16, bottom: 16, textTransform: 'none', fontWeight: 700 }}
      >
        <NewIcon sx={{ mr: 1 }} />
        Mesaj nou
      </Fab>
    </Stack>
  );
};

// ---------------- Conversatia deschisa ----------------
/** Mesajele aceluiasi om la mai putin de 5 minute se lipesc intr-un singur bloc. */
const GROUP_GAP_MS = 5 * 60 * 1000;

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
  const { data, isLoading } = useGetChatMessagesQuery(conv.id, { skipPollingIfUnfocused: true, pollingInterval: 15000 });
  const [send, { isLoading: sending }] = useSendChatMessageMutation();
  const [del] = useDeleteChatMessageMutation();
  // Ciorna se pastreaza pe conversatie (nu se pierde daca ecranul se reincarca/redeseneaza)
  const [text, setTextState] = useState(() => drafts.get(conv.id) || '');
  const setText = (v: string) => {
    if (v) drafts.set(conv.id, v);
    else drafts.delete(conv.id);
    setTextState(v);
  };
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const isTouch = typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches;
  const messages = useMemo(() => data?.messages ?? [], [data?.messages]);
  const canWrite = data?.canWrite ?? conv.canWrite;
  const compose = data?.compose ?? null;
  // Destinatarii alesi (doar in grupurile de departament); implicit grupul curent
  const [picked, setPicked] = useState<{ convId: string; ids: string[] } | null>(null);
  const targetIds = picked?.convId === conv.id ? picked.ids : (compose?.defaultTargetIds ?? []);
  const setTargets = (ids: string[]) => setPicked({ convId: conv.id, ids });
  // Raspuns la un mesaj
  const [reply, setReply] = useState<{ convId: string; msg: ChatMessageItem } | null>(null);
  const replyTo = reply?.convId === conv.id ? reply.msg : null;
  const [highlightId, setHighlightId] = useState<string | null>(null);
  // Pe telefon: atingi un mesaj -> apar butoanele Raspunde / Sterge
  const [actionId, setActionId] = useState<string | null>(null);
  // Butonul "mesaje noi" cand omul a derulat in sus
  const [atBottom, setAtBottom] = useState(true);
  const [newBelow, setNewBelow] = useState(0);
  const lastCount = useRef({ convId: conv.id, count: 0 });

  const scrollToBottom = (smooth = false) => {
    const el = listRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: smooth ? 'smooth' : 'auto' });
    setNewBelow(0);
  };

  useEffect(() => {
    const prev = lastCount.current;
    const switched = prev.convId !== conv.id;
    const added = switched ? 0 : messages.length - prev.count;
    lastCount.current = { convId: conv.id, count: messages.length };
    const last = messages[messages.length - 1];
    // Derulam jos la deschidere, cand esti deja jos sau cand ai scris tu mesajul
    if (switched || prev.count === 0 || atBottom || last?.userId === user?.id) {
      requestAnimationFrame(() => scrollToBottom());
    } else if (added > 0) {
      setNewBelow((n) => n + added);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages.length, conv.id]);

  const onScroll = () => {
    const el = listRef.current;
    if (!el) return;
    const bottom = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
    if (bottom !== atBottom) setAtBottom(bottom);
    if (bottom && newBelow) setNewBelow(0);
  };

  const jumpTo = (id: string) => {
    const el = document.getElementById(`msg-${id}`);
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setHighlightId(id);
    window.setTimeout(() => setHighlightId((h) => (h === id ? null : h)), 1600);
  };

  const startReply = (m: ChatMessageItem) => {
    setReply({ convId: conv.id, msg: m });
    inputRef.current?.focus();
  };

  const submit = async () => {
    const clean = text.trim();
    if (!clean || sending) return;
    try {
      if (compose && targetIds.length === 0) {
        notifyError('Alege departamentul catre care trimiti');
        return;
      }
      await send({
        id: conv.id,
        message: clean,
        targetDepartmentIds: compose ? targetIds : undefined,
        replyToId: replyTo?.id,
      }).unwrap();
      setText('');
      setReply(null);
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

  // "Vazut" / "Trimis" doar sub ultimul mesaj al meu, in conversatiile private
  const myLastId = conv.type === 'DIRECT' ? [...messages].reverse().find((m) => m.userId === user?.id)?.id : undefined;
  const otherReadAt = data?.otherReadAt ? new Date(data.otherReadAt).getTime() : 0;
  const showAvatars = conv.type !== 'DIRECT';

  const toggleTarget = (id: string) => {
    if (!compose) return;
    if (!compose.multi) return setTargets([id]);
    setTargets(targetIds.includes(id) ? targetIds.filter((x) => x !== id) : [...targetIds, id]);
  };
  const allSelected = !!compose && compose.options.length > 0 && targetIds.length === compose.options.length;

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
      <Box sx={{ flex: 1, minHeight: 0, position: 'relative' }}>
        <Box
          ref={listRef}
          onScroll={onScroll}
          sx={{
            height: '100%',
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
            <Box>
              {messages.map((m, i) => {
                const mine = m.userId === user?.id;
                const prev = messages[i - 1];
                const next = messages[i + 1];
                const newDay = !prev || new Date(prev.createdAt).toDateString() !== new Date(m.createdAt).toDateString();
                const nextNewDay = !next || new Date(next.createdAt).toDateString() !== new Date(m.createdAt).toDateString();
                const joinPrev =
                  !newDay && prev?.userId === m.userId && +new Date(m.createdAt) - +new Date(prev.createdAt) < GROUP_GAP_MS;
                const joinNext =
                  !nextNewDay && next?.userId === m.userId && +new Date(next.createdAt) - +new Date(m.createdAt) < GROUP_GAP_MS;
                const showName = !mine && conv.type !== 'DIRECT' && !joinPrev;
                const route = routeLabel(m, conv.title);
                const seen = m.id === myLastId && otherReadAt >= +new Date(m.createdAt);
                const corner = 6;
                return (
                  <Box key={m.id} id={`msg-${m.id}`} sx={{ mt: newDay ? 0 : joinPrev ? 0.25 : 1.25 }}>
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
                    <Box sx={{ display: 'flex', justifyContent: mine ? 'flex-end' : 'flex-start', alignItems: 'flex-end', gap: 0.75 }}>
                      {showAvatars && !mine && (
                        <Box sx={{ width: 28, flexShrink: 0 }}>
                          {!joinNext && (
                            <Avatar sx={{ width: 28, height: 28, fontSize: '0.7rem', bgcolor: 'primary.main' }}>
                              {initials(m.userName)}
                            </Avatar>
                          )}
                        </Box>
                      )}
                      <Box
                        onDoubleClick={() => !isTouch && canWrite && startReply(m)}
                        onClick={() => isTouch && (canWrite || mine) && setActionId((a) => (a === m.id ? null : m.id))}
                        sx={{
                          cursor: isTouch ? 'pointer' : 'default',
                          WebkitTapHighlightColor: 'transparent',
                          maxWidth: { xs: '82%', md: '70%' },
                          minWidth: 0,
                          px: 1.5,
                          py: 0.75,
                          borderRadius: 2.5,
                          ...(mine
                            ? { borderTopRightRadius: corner, borderBottomRightRadius: joinNext ? corner : undefined }
                            : { borderTopLeftRadius: corner, borderBottomLeftRadius: joinNext ? corner : undefined }),
                          bgcolor: mine ? 'primary.main' : 'background.paper',
                          color: mine ? 'primary.contrastText' : 'text.primary',
                          border: mine ? 'none' : `1px solid ${theme.palette.divider}`,
                          boxShadow: highlightId === m.id ? `0 0 0 3px ${alpha(theme.palette.warning.main, 0.7)}` : 'none',
                          transition: 'box-shadow 0.3s',
                          '&:hover .msg-act': { opacity: 1 },
                        }}
                      >
                        {showName && (
                          <Typography variant="caption" fontWeight={700} color="primary.main" component="div">
                            {m.userName}
                          </Typography>
                        )}
                        {route && (
                          <Stack direction="row" spacing={0.5} alignItems="flex-start" sx={{ opacity: mine ? 0.85 : 0.75, mb: 0.25 }}>
                            <RouteIcon sx={{ fontSize: 13, mt: '2px' }} />
                            <Typography variant="caption" sx={{ fontSize: 11, lineHeight: 1.35 }}>
                              {route}
                            </Typography>
                          </Stack>
                        )}
                        {m.replyTo && (
                          <Box
                            onClick={(e) => {
                              e.stopPropagation();
                              if (!m.replyTo?.deleted) jumpTo(m.replyTo!.id);
                            }}
                            sx={{
                              cursor: m.replyTo.deleted ? 'default' : 'pointer',
                              borderLeft: '3px solid',
                              borderColor: mine ? 'primary.contrastText' : 'primary.main',
                              bgcolor: mine ? alpha('#fff', 0.15) : alpha(theme.palette.primary.main, 0.07),
                              borderRadius: 1,
                              px: 1,
                              py: 0.5,
                              mb: 0.5,
                            }}
                          >
                            {m.replyTo.deleted ? (
                              <Typography variant="caption" sx={{ fontStyle: 'italic', opacity: 0.8 }}>
                                Mesaj sters
                              </Typography>
                            ) : (
                              <>
                                <Typography variant="caption" fontWeight={700} component="div" sx={{ opacity: 0.9 }}>
                                  {m.replyTo.userName}
                                </Typography>
                                <Typography
                                  variant="caption"
                                  component="div"
                                  sx={{
                                    opacity: 0.85,
                                    display: '-webkit-box',
                                    WebkitLineClamp: 2,
                                    WebkitBoxOrient: 'vertical',
                                    overflow: 'hidden',
                                    wordBreak: 'break-word',
                                  }}
                                >
                                  {m.replyTo.text}
                                </Typography>
                              </>
                            )}
                          </Box>
                        )}
                        <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                          {m.message}
                        </Typography>
                        <Stack direction="row" justifyContent="flex-end" alignItems="center" spacing={0.25}>
                          {canWrite && !isTouch && (
                            <IconButton
                              className="msg-act"
                              size="small"
                              aria-label="Raspunde"
                              onClick={() => startReply(m)}
                              sx={{ p: 0.25, color: 'inherit', opacity: 0, transition: 'opacity 0.15s' }}
                            >
                              <ReplyIcon sx={{ fontSize: 16 }} />
                            </IconButton>
                          )}
                          {/* Pe calculator: butoanele apar cand treci cu mouse-ul peste mesaj */}
                          {!isTouch && (mine || isAdmin) && (
                            <IconButton
                              className="msg-act"
                              size="small"
                              aria-label="Sterge mesajul"
                              onClick={() =>
                                del({ id: m.id, conversationId: conv.id })
                                  .unwrap()
                                  .catch(() => notifyError('Mesajul nu a putut fi sters'))
                              }
                              sx={{ p: 0.25, color: 'inherit', opacity: 0, transition: 'opacity 0.15s' }}
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
                    {isTouch && actionId === m.id && (
                      <Stack
                        direction="row"
                        spacing={0.75}
                        justifyContent={mine ? 'flex-end' : 'flex-start'}
                        sx={{ mt: 0.5, pl: showAvatars && !mine ? 4.5 : 0 }}
                      >
                        {canWrite && (
                          <Chip
                            size="small"
                            icon={<ReplyIcon />}
                            label="Raspunde"
                            clickable
                            onClick={() => {
                              setActionId(null);
                              startReply(m);
                            }}
                            sx={{ bgcolor: 'background.paper', boxShadow: 1, fontWeight: 600 }}
                          />
                        )}
                        {mine && (
                          <Chip
                            size="small"
                            icon={<DeleteIcon />}
                            label="Sterge"
                            clickable
                            color="error"
                            variant="outlined"
                            onClick={() => {
                              setActionId(null);
                              del({ id: m.id, conversationId: conv.id })
                                .unwrap()
                                .catch(() => notifyError('Mesajul nu a putut fi sters'));
                            }}
                            sx={{ bgcolor: 'background.paper', boxShadow: 1, fontWeight: 600 }}
                          />
                        )}
                      </Stack>
                    )}
                    {m.id === myLastId && (
                      <Stack
                        direction="row"
                        spacing={0.5}
                        alignItems="center"
                        justifyContent="flex-end"
                        sx={{ mt: 0.25, pr: 0.5, color: seen ? 'primary.main' : 'text.secondary' }}
                      >
                        {seen ? <SeenIcon sx={{ fontSize: 14 }} /> : <SentIcon sx={{ fontSize: 14 }} />}
                        <Typography variant="caption" sx={{ fontSize: 11, fontWeight: 600 }}>
                          {seen ? 'Vazut' : 'Trimis'}
                        </Typography>
                      </Stack>
                    )}
                  </Box>
                );
              })}
            </Box>
          )}
        </Box>
        {(!atBottom || newBelow > 0) && messages.length > 0 && (
          <Chip
            icon={<DownIcon />}
            label={newBelow > 0 ? `${newBelow} ${newBelow === 1 ? 'mesaj nou' : 'mesaje noi'}` : 'Jos'}
            color={newBelow > 0 ? 'primary' : 'default'}
            onClick={() => scrollToBottom(true)}
            sx={{
              position: 'absolute',
              bottom: 12,
              left: '50%',
              transform: 'translateX(-50%)',
              boxShadow: 3,
              fontWeight: 700,
              bgcolor: newBelow > 0 ? undefined : 'background.paper',
            }}
          />
        )}
      </Box>
      <Divider />

      {/* Scriere */}
      {canWrite ? (
        <Box>
          {compose && compose.options.length > 0 && (
            <Box sx={{ px: 1.25, pt: 1 }}>
              <Typography variant="caption" color="text.secondary" component="div" sx={{ mb: 0.5 }}>
                {compose.multi ? 'Catre (atinge unul sau mai multe):' : 'Catre:'}
              </Typography>
              <Stack
                direction="row"
                spacing={0.75}
                sx={{ overflowX: 'auto', pb: 0.25, scrollbarWidth: 'none', '&::-webkit-scrollbar': { display: 'none' } }}
              >
                {compose.multi && compose.options.length > 1 && (
                  <Chip
                    label="Toate"
                    size="small"
                    clickable
                    icon={allSelected ? <CheckIcon /> : undefined}
                    color={allSelected ? 'primary' : 'default'}
                    variant={allSelected ? 'filled' : 'outlined'}
                    onClick={() => setTargets(allSelected ? [] : compose.options.map((o) => o.id))}
                    sx={{ flexShrink: 0, fontWeight: 700 }}
                  />
                )}
                {compose.options.map((o) => {
                  const on = targetIds.includes(o.id);
                  return (
                    <Chip
                      key={o.id}
                      label={o.name}
                      size="small"
                      clickable
                      icon={on ? <CheckIcon /> : undefined}
                      color={on ? 'primary' : 'default'}
                      variant={on ? 'filled' : 'outlined'}
                      onClick={() => toggleTarget(o.id)}
                      sx={{ flexShrink: 0 }}
                    />
                  );
                })}
              </Stack>
            </Box>
          )}
          {replyTo && (
            <Stack
              direction="row"
              alignItems="center"
              spacing={1}
              sx={{
                mx: 1.25,
                mt: 1,
                px: 1,
                py: 0.5,
                borderLeft: '3px solid',
                borderColor: 'primary.main',
                bgcolor: alpha(theme.palette.primary.main, 0.07),
                borderRadius: 1,
              }}
            >
              <ReplyIcon sx={{ fontSize: 18, color: 'primary.main' }} />
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography variant="caption" fontWeight={700} color="primary.main" component="div" noWrap>
                  Raspunzi lui {replyTo.userName}
                </Typography>
                <Typography variant="caption" color="text.secondary" component="div" noWrap>
                  {replyTo.message}
                </Typography>
              </Box>
              <IconButton size="small" aria-label="Anuleaza raspunsul" onClick={() => setReply(null)}>
                <CloseIcon fontSize="small" />
              </IconButton>
            </Stack>
          )}
          <Stack direction="row" spacing={1} alignItems="flex-end" sx={{ p: 1.25 }}>
            <TextField
              fullWidth
              multiline
              maxRows={4}
              size="small"
              inputRef={inputRef}
              placeholder={isTouch ? 'Scrie un mesaj...' : 'Scrie un mesaj... (Enter trimite, Shift+Enter rand nou)'}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                // Pe telefon tasta Enter scrie "Trimite" (enterKeyHint) -> trimite mesajul
                if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                  e.preventDefault();
                  submit();
                }
                if (e.key === 'Escape' && replyTo) setReply(null);
              }}
              inputProps={{ maxLength: 4000, enterKeyHint: 'send' }}
              sx={{
                flex: 1,
                minWidth: 0,
                '& .MuiInputBase-root': { borderRadius: 3 },
                '& .MuiInputBase-input': { fontSize: '16px !important' },
              }}
            />
            <IconButton
              color="primary"
              onClick={submit}
              disabled={!text.trim() || sending}
              aria-label="Trimite"
              sx={{
                width: 44,
                height: 44,
                flexShrink: 0,
                bgcolor: text.trim() ? 'primary.main' : alpha(theme.palette.primary.main, 0.1),
                color: text.trim() ? 'primary.contrastText' : undefined,
                '&:hover': { bgcolor: text.trim() ? 'primary.dark' : alpha(theme.palette.primary.main, 0.15) },
                '&.Mui-disabled': { bgcolor: alpha(theme.palette.primary.main, 0.08) },
              }}
            >
              {sending ? <CircularProgress size={20} color="inherit" /> : <SendIcon />}
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

  const { data: conversations = [], isLoading } = useGetConversationsQuery(undefined, { skipPollingIfUnfocused: true, pollingInterval: 30000 });
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
    ? 'calc(100dvh - 64px - 60px - env(safe-area-inset-bottom) - 100px)'
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
