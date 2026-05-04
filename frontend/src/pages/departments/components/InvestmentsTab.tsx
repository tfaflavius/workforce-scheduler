import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Stack,
  Typography,
  Button,
  Alert,
  CircularProgress,
  Chip,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  alpha,
  useTheme,
} from '@mui/material';
import {
  Upload as UploadIcon,
  Download as DownloadIcon,
  TableChart as ExcelIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import * as XLSX from 'xlsx';
import {
  useGetInvestmentDocumentQuery,
  useUploadInvestmentDocumentMutation,
} from '../../../store/api/investments.api';
import { useAppSelector } from '../../../store/hooks';
import { isAdminOrAbove } from '../../../utils/roleHelpers';
import { useSnackbar } from '../../../contexts/SnackbarContext';

interface ParsedSheet {
  name: string;
  rows: any[][];
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const InvestmentsTab: React.FC = () => {
  const theme = useTheme();
  const { user, token } = useAppSelector((state) => state.auth);
  const { notifySuccess, notifyError } = useSnackbar();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const isAdmin = isAdminOrAbove(user?.role);
  const isManager = user?.role === 'MANAGER';
  const canUpload = isAdmin || isManager;

  const { data: metadata, isLoading: metaLoading, refetch: refetchMeta } = useGetInvestmentDocumentQuery();
  const [uploadDocument, { isLoading: uploading }] = useUploadInvestmentDocumentMutation();

  const [sheets, setSheets] = useState<ParsedSheet[]>([]);
  const [activeSheet, setActiveSheet] = useState<number>(0);
  const [parsing, setParsing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);

  // Fetch the raw Excel file as ArrayBuffer and parse it client-side with SheetJS.
  // This way the original spreadsheet stays byte-identical on the backend and
  // the client renders it without ever transforming the source data.
  const fetchAndParseFile = async () => {
    if (!metadata) {
      setSheets([]);
      return;
    }
    try {
      setParsing(true);
      setParseError(null);
      const resp = await fetch(`${API_URL}/investments/document/file`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        cache: 'no-cache',
      });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const buffer = await resp.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });
      const parsed: ParsedSheet[] = workbook.SheetNames.map((name) => {
        const sheet = workbook.Sheets[name];
        const rows: any[][] = XLSX.utils.sheet_to_json(sheet, {
          header: 1,
          defval: '',
          blankrows: true,
          raw: false, // formatted text values to preserve display formatting
        });
        return { name, rows };
      });
      setSheets(parsed);
      if (parsed.length > 0 && activeSheet >= parsed.length) {
        setActiveSheet(0);
      }
    } catch (err: any) {
      setParseError(err?.message || 'Eroare la incarcarea fisierului');
    } finally {
      setParsing(false);
    }
  };

  useEffect(() => {
    fetchAndParseFile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [metadata?.id, metadata?.updatedAt]);

  const handleUploadClick = () => {
    if (!canUpload) return;
    fileInputRef.current?.click();
  };

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Reset input so selecting the same file twice still triggers onChange
    e.target.value = '';

    const isXlsx = /\.(xlsx|xls)$/i.test(file.name);
    if (!isXlsx) {
      notifyError('Doar fisiere Excel (.xlsx, .xls) sunt acceptate');
      return;
    }

    try {
      await uploadDocument(file).unwrap();
      notifySuccess(`Document incarcat: ${file.name}`);
      await refetchMeta();
    } catch (err: any) {
      const msg = err?.data?.message || err?.message || 'Eroare la incarcarea fisierului';
      notifyError(typeof msg === 'string' ? msg : JSON.stringify(msg));
    }
  };

  const handleDownload = () => {
    if (!metadata) return;
    // Build a temporary anchor with the auth token in a fetch-then-blob flow
    fetch(`${API_URL}/investments/document/file`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then((r) => r.blob())
      .then((blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = metadata.fileName;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
      })
      .catch(() => notifyError('Eroare la descarcarea fisierului'));
  };

  const formatBytes = (n: number) => {
    if (n < 1024) return `${n} B`;
    if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
    return `${(n / 1024 / 1024).toFixed(2)} MB`;
  };

  const currentSheet = sheets[activeSheet];

  // Compute the maximum number of columns in the current sheet so each row
  // is rendered with a consistent column count even if some rows are short.
  const maxCols = useMemo(() => {
    if (!currentSheet) return 0;
    return currentSheet.rows.reduce((m, r) => Math.max(m, r.length), 0);
  }, [currentSheet]);

  return (
    <Box>
      {/* Header card */}
      <Card sx={{ mb: 2, borderRadius: 2 }}>
        <CardContent>
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={2}
            alignItems={{ xs: 'flex-start', sm: 'center' }}
            justifyContent="space-between"
          >
            <Stack direction="row" spacing={1.5} alignItems="center">
              <ExcelIcon sx={{ fontSize: 32, color: theme.palette.success.main }} />
              <Box>
                <Typography variant="subtitle1" fontWeight={700}>
                  Investitii Parcari
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {metadata
                    ? `${metadata.fileName} • ${formatBytes(metadata.fileSize)} • Actualizat ${new Date(
                        metadata.updatedAt,
                      ).toLocaleDateString('ro-RO')}`
                    : 'Niciun document incarcat'}
                </Typography>
              </Box>
            </Stack>

            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              <Button
                size="small"
                variant="outlined"
                startIcon={<RefreshIcon />}
                onClick={() => {
                  refetchMeta();
                  fetchAndParseFile();
                }}
                disabled={parsing}
                sx={{ textTransform: 'none', borderRadius: 2 }}
              >
                Reincarca
              </Button>
              {metadata && (
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<DownloadIcon />}
                  onClick={handleDownload}
                  sx={{ textTransform: 'none', borderRadius: 2 }}
                >
                  Descarca Excel
                </Button>
              )}
              {canUpload && (
                <Button
                  size="small"
                  variant="contained"
                  color="success"
                  startIcon={<UploadIcon />}
                  onClick={handleUploadClick}
                  disabled={uploading}
                  sx={{ textTransform: 'none', borderRadius: 2 }}
                >
                  {uploading ? 'Se incarca...' : metadata ? 'Inlocuieste Excel' : 'Incarca Excel'}
                </Button>
              )}
              <input
                type="file"
                ref={fileInputRef}
                accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
                onChange={handleFileSelected}
                style={{ display: 'none' }}
              />
            </Stack>
          </Stack>

          {metadata?.uploadedBy?.fullName && (
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
              Incarcat de {metadata.uploadedBy.fullName}
            </Typography>
          )}
        </CardContent>
      </Card>

      {/* Sheet tabs */}
      {sheets.length > 1 && (
        <Stack direction="row" spacing={1} sx={{ mb: 1.5, overflowX: 'auto', flexWrap: 'wrap' }} useFlexGap>
          {sheets.map((s, i) => (
            <Chip
              key={s.name}
              label={s.name}
              onClick={() => setActiveSheet(i)}
              color={i === activeSheet ? 'primary' : 'default'}
              variant={i === activeSheet ? 'filled' : 'outlined'}
              sx={{ fontWeight: 600 }}
            />
          ))}
        </Stack>
      )}

      {/* Loading + error states */}
      {(metaLoading || parsing) && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      )}

      {parseError && !parsing && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {parseError}
        </Alert>
      )}

      {!metaLoading && !metadata && (
        <Card sx={{ p: 4, textAlign: 'center', borderRadius: 2 }}>
          <ExcelIcon sx={{ fontSize: 64, color: alpha(theme.palette.success.main, 0.3), mb: 2 }} />
          <Typography variant="h6" color="text.secondary">
            Nu exista niciun document incarcat
          </Typography>
          {canUpload && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Foloseste butonul "Incarca Excel" pentru a adauga lista de investitii parcari.
            </Typography>
          )}
        </Card>
      )}

      {/* Excel table */}
      {currentSheet && !parsing && (
        <TableContainer
          component={Paper}
          sx={{
            borderRadius: 2,
            maxHeight: { xs: 'calc(100dvh - 320px)', sm: 'calc(100dvh - 280px)' },
            overflowX: 'auto',
            '-webkit-overflow-scrolling': 'touch',
          }}
        >
          <Table stickyHeader size="small">
            <TableHead>
              <TableRow>
                {Array.from({ length: maxCols }, (_, c) => (
                  <TableCell
                    key={c}
                    sx={{
                      fontWeight: 700,
                      bgcolor: alpha(theme.palette.success.main, 0.08),
                      whiteSpace: 'nowrap',
                      fontSize: { xs: '0.7rem', sm: '0.8rem' },
                    }}
                  >
                    {String(currentSheet.rows[0]?.[c] ?? '').trim() || `Col ${c + 1}`}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {currentSheet.rows.slice(1).map((row, rIdx) => {
                const isEmpty = row.every((c) => c === '' || c == null);
                if (isEmpty) return null;
                return (
                  <TableRow
                    key={rIdx}
                    hover
                    sx={{
                      '&:nth-of-type(odd)': { bgcolor: alpha(theme.palette.action.hover, 0.3) },
                    }}
                  >
                    {Array.from({ length: maxCols }, (_, c) => {
                      const value = row[c];
                      const isNumberCol = c >= 2 && c <= 8; // Sumă, AN, TRIM. I-IV
                      return (
                        <TableCell
                          key={c}
                          sx={{
                            whiteSpace: c === 1 ? 'normal' : 'nowrap',
                            fontSize: { xs: '0.7rem', sm: '0.8rem' },
                            textAlign: isNumberCol && value !== '' ? 'right' : 'left',
                            verticalAlign: 'top',
                            minWidth: c === 1 ? 240 : undefined,
                          }}
                        >
                          {value === null || value === undefined ? '' : String(value)}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
};

export default InvestmentsTab;
