import { useState } from 'react';
import {
  Alert,
  Button,
  Checkbox,
  FormControlLabel,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { Campaign as CampaignIcon } from '@mui/icons-material';
import { useBroadcastNotificationMutation } from '../../store/api/notifications.api';
import { useSnackbar } from '../../contexts/SnackbarContext';

/** Textul pregatit pentru anuntul cu noutatile (chat, notificari, program, sarbatori, aspect). */
const TEMPLATE_TITLE = 'Noutati in aplicatie';
const TEMPLATE_MESSAGE = `Am facut cateva modificari in aplicatie:

CHAT
- La "Catre" alegi departamentul apasand pe butoane.
- In lista de conversatii ai filtre: Toate, Necitite, Departamente, Private si butonul "Mesaj nou".
- Raspuns la un mesaj: pe telefon glisezi mesajul spre dreapta sau il atingi si alegi "Raspunde"; mesajul apare citat deasupra.
- Reactii: atingi un mesaj si alegi 👍 ❤️ 😂 😮 🙏 ✅.
- La mesajele private vezi "Trimis" / "Vazut".
- Mesajele si notificarile apar instant, fara reincarcare.

NOTIFICARI SI EMAIL
- In timpul zilei primesti doar notificari in aplicatie, fara email la fiecare problema sau solicitare.
- In fiecare seara la 20:00 primesti pe email "Rezumatul zilei" cu tot ce s-a intamplat (probleme create si rezolvate, solicitari, finalizari) si o notificare cu rezumatul.

PROGRAM
- Fiecare isi vede doar propriul program.
- Dispecerat: pe pagina principala vezi, pentru ziua de azi, colegii din tura ta si cine intra in tura urmatoare.
- Control: vezi colegii din tura ta de azi.

SARBATORI
- Daca dupa o sarbatoare urmeaza weekend, zilele de weekend sunt incluse in perioada (ex: Revelion 31.12.2026 - 03.01.2027).

ASPECT
- Aplicatia are un design nou si se incarca mai repede. Trage in jos pe ecran ca sa reincarci datele.`;

export default function BroadcastDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('md'));
  const [title, setTitle] = useState(TEMPLATE_TITLE);
  const [message, setMessage] = useState(TEMPLATE_MESSAGE);
  const [confirm, setConfirm] = useState(false);
  // Implicit doar in aplicatie (push); emailul e optional
  const [withEmail, setWithEmail] = useState(false);
  const [broadcast, { isLoading }] = useBroadcastNotificationMutation();
  const { notifySuccess, notifyError } = useSnackbar();

  const close = () => {
    setConfirm(false);
    onClose();
  };

  const send = async () => {
    try {
      const res = await broadcast({ title: title.trim(), message: message.trim(), sendEmail: withEmail }).unwrap();
      notifySuccess(`Anuntul a fost trimis la ${res.sent} utilizatori (in aplicatie${withEmail ? ' si pe email' : ''})`);
      close();
    } catch (err) {
      notifyError((err as { data?: { message?: string } })?.data?.message || 'Anuntul nu a putut fi trimis');
    }
  };

  const valid = title.trim().length > 0 && message.trim().length > 0;

  return (
    <Dialog open={open} onClose={close} fullWidth maxWidth="sm" fullScreen={fullScreen}>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <CampaignIcon color="primary" /> Anunt catre toti utilizatorii
      </DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2}>
          <Alert severity="info">
            Toti utilizatorii activi primesc anuntul ca notificare in aplicatie (cu push pe telefon)
            {withEmail ? ' si pe email' : ''}.
          </Alert>
          <TextField label="Titlu" value={title} onChange={(e) => setTitle(e.target.value)} fullWidth inputProps={{ maxLength: 150 }} />
          <TextField
            label="Mesaj"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            fullWidth
            multiline
            minRows={8}
            inputProps={{ maxLength: 4000 }}
          />
          <FormControlLabel
            control={<Checkbox checked={withEmail} onChange={(e) => setWithEmail(e.target.checked)} />}
            label="Trimite si pe email"
          />
          {confirm && (
            <Alert severity="warning">
              Sigur trimiti la toti? Anuntul nu mai poate fi retras dupa trimitere.
            </Alert>
          )}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 1.5 }}>
        <Button onClick={close} disabled={isLoading}>
          Renunta
        </Button>
        {confirm ? (
          <Button variant="contained" color="warning" onClick={send} disabled={isLoading || !valid}>
            {isLoading ? 'Se trimite...' : 'Da, trimite la toti'}
          </Button>
        ) : (
          <Button variant="contained" onClick={() => setConfirm(true)} disabled={!valid} startIcon={<CampaignIcon />}>
            Trimite
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
