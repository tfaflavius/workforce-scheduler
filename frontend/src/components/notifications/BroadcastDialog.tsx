import { useState } from 'react';
import {
  Alert,
  Button,
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

/** Textul pregatit pentru anuntul despre modulele noi (Sarbatori + Chat). */
const TEMPLATE_TITLE = 'Noutati in aplicatie: Sarbatori si Chat';
const TEMPLATE_MESSAGE = `Am adaugat doua module noi in aplicatie:

SARBATORI - din meniul "Sarbatori" iti alegi, pentru Craciun, Revelion si Paste, ce preferi in fiecare zi: Concediu, Zi, Noapte sau Orice. Vezi si ce au ales colegii din departament, iar pe baza preferintelor se fac programul si concediile. Fiecare perioada are si un chat unde poti scrie daca ai obiectii.

CHAT - din meniul "Chat" poti trimite mesaje private oricarui coleg, poti scrie in grupul departamentului tau si poti citi canalul de Anunturi. Din grupul departamentului poti trimite un mesaj si catre alt departament, alegand la "Catre".

La fiecare mesaj nou primesti notificare in aplicatie.`;

export default function BroadcastDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('md'));
  const [title, setTitle] = useState(TEMPLATE_TITLE);
  const [message, setMessage] = useState(TEMPLATE_MESSAGE);
  const [confirm, setConfirm] = useState(false);
  const [broadcast, { isLoading }] = useBroadcastNotificationMutation();
  const { notifySuccess, notifyError } = useSnackbar();

  const close = () => {
    setConfirm(false);
    onClose();
  };

  const send = async () => {
    try {
      const res = await broadcast({ title: title.trim(), message: message.trim() }).unwrap();
      notifySuccess(`Anuntul a fost trimis la ${res.sent} utilizatori (in aplicatie si pe email)`);
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
            Toti utilizatorii activi primesc anuntul ca notificare in aplicatie (cu push pe telefon) si pe email.
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
          {confirm && (
            <Alert severity="warning">Sigur trimiti? Emailurile nu mai pot fi retrase dupa trimitere.</Alert>
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
