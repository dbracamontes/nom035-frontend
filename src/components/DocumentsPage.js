import React from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Grid,
  IconButton,
  InputAdornment,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import {
  Article as ArticleIcon,
  Download as DownloadIcon,
  FilterList as FilterListIcon,
  OpenInNew as OpenInNewIcon,
  Search as SearchIcon,
  Visibility as VisibilityIcon,
  CheckCircle as CheckCircleIcon,
  PendingActions as PendingActionsIcon,
  WarningAmber as WarningIcon,
  ShieldOutlined as ShieldIcon,
} from '@mui/icons-material';
import { getDocumentCenterDocuments } from '../api/nom035';
import axios from 'axios';

const statusConfig = {
  Aprobado: { color: 'success', icon: <CheckCircleIcon fontSize="small" /> },
  'En revisión': { color: 'warning', icon: <PendingActionsIcon fontSize="small" /> },
  Pendiente: { color: 'info', icon: <WarningIcon fontSize="small" /> },
  Rechazado: { color: 'error', icon: <WarningIcon fontSize="small" /> },
};

export default function DocumentsPage() {
  const [documents, setDocuments] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [search, setSearch] = React.useState('');
  const [divisionFilter, setDivisionFilter] = React.useState('Todos');
  const [statusFilter, setStatusFilter] = React.useState('Todos');
  const [selectedDoc, setSelectedDoc] = React.useState(null);
  const [previewBlobUrl, setPreviewBlobUrl] = React.useState('');
  const [previewLoading, setPreviewLoading] = React.useState(false);
  const [approvedDocs, setApprovedDocs] = React.useState({});

  React.useEffect(() => {
    let isMounted = true;

    const loadDocuments = async () => {
      try {
        const response = await getDocumentCenterDocuments();
        const nextDocuments = Array.isArray(response?.data) ? response.data : [];

        if (isMounted) {
          setDocuments(nextDocuments);
        }
      } catch (error) {
        if (isMounted) {
          setDocuments([]);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadDocuments();

    return () => {
      isMounted = false;
    };
  }, []);

  const divisionOptions = ['Todos', 'NOM-035', 'MedicaLeben', 'Administración'];
  const statusOptions = ['Todos', 'Aprobado', 'En revisión', 'Pendiente', 'Rechazado'];

  const normalizeDocStatus = (status) => {
    const value = String(status || '').trim();
    if (!value) return 'Pendiente';
    if (['Aprobado', 'approved', 'DONE', 'COMPLETED'].includes(value)) return 'Aprobado';
    if (['Rechazado', 'rejected', 'FAILED'].includes(value)) return 'Rechazado';
    if (['En revisión', 'in_review', 'OCR_RUNNING', 'OCR_COMPLETED', 'INTERPRETING', 'INTERPRETED', 'GENERATING_WORD'].includes(value)) return 'En revisión';
    return 'Pendiente';
  };

  const resolveDocStatus = (doc) => {
    if (approvedDocs[doc.id]) return 'Aprobado';
    return normalizeDocStatus(doc.status);
  };

  const canApproveDoc = (doc) => Boolean(doc?.requiresApproval) && resolveDocStatus(doc) !== 'Aprobado';

  const filteredDocuments = documents.filter((doc) => {
    const normalizedStatus = resolveDocStatus(doc);
    const tagsText = Array.isArray(doc.tags) ? doc.tags.join(' ') : '';
    const matchesSearch = [doc.title, doc.module, doc.relatedTo, doc.owner, tagsText].join(' ').toLowerCase().includes(search.toLowerCase());
    const matchesDivision = divisionFilter === 'Todos' || doc.division === divisionFilter;
    const matchesStatus = statusFilter === 'Todos' || normalizedStatus === statusFilter;
    return matchesSearch && matchesDivision && matchesStatus;
  });

  const summary = {
    total: documents.length,
    approved: documents.filter((doc) => doc?.requiresApproval && resolveDocStatus(doc) === 'Aprobado').length,
    pending: documents.filter((doc) => doc?.requiresApproval && ['En revisión', 'Pendiente'].includes(resolveDocStatus(doc))).length,
    rejected: documents.filter((doc) => doc?.requiresApproval && resolveDocStatus(doc) === 'Rechazado').length,
  };

  const quickActions = [
    { label: 'Todos', value: 'Todos' },
    { label: 'Aprobados', value: 'Aprobado' },
    { label: 'Pendientes', value: 'Pendiente' },
    { label: 'En revisión', value: 'En revisión' },
  ];

  const getAuthHeaders = () => {
    const auth = sessionStorage.getItem('auth');
    return auth ? { Authorization: `Basic ${auth}` } : {};
  };

  const openDocument = async (url, options = {}) => {
    if (!url) return;

    const { inline = false, title = 'Vista previa del documento' } = options;
    const baseUrl = process.env.REACT_APP_API_URL || '';
    const fullUrl = url.startsWith('http') ? url : `${baseUrl}${url}`;

    if (inline) {
      setSelectedDoc({ title, previewUrl: url, status: 'Pendiente' });
      return;
    }

    try {
      const response = await axios.get(fullUrl, {
        responseType: 'blob',
        headers: getAuthHeaders(),
      });
      const blobUrl = URL.createObjectURL(response.data);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = title || 'documento';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error('Error downloading document', error);
      window.open(fullUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const isWordPreviewFile = (doc) => {
    const value = String(doc?.fileType || doc?.title || doc?.name || '').toLowerCase();
    const wordExtensions = ['.doc', '.docx', '.rtf'];
    return wordExtensions.some((ext) => value.includes(ext));
  };

  const supportsInlinePreview = (doc) => {
    if (!doc) return false;
    const fileType = String(doc.fileType || doc.title || doc.name || '').toLowerCase();
    return ['pdf', 'png', 'jpg', 'jpeg', 'gif', 'bmp', 'webp', 'txt', 'html', 'csv'].some((type) => fileType.includes(type));
  };

  React.useEffect(() => {
    let isActive = true;

    if (!selectedDoc?.previewUrl) {
      setPreviewBlobUrl('');
      setPreviewLoading(false);
      return undefined;
    }

    const loadPreview = async () => {
      setPreviewLoading(true);
      try {
        if (isWordPreviewFile(selectedDoc) || !supportsInlinePreview(selectedDoc)) {
          if (isActive) {
            setPreviewBlobUrl('');
          }
          return;
        }

        const baseUrl = process.env.REACT_APP_API_URL || '';
        const fullUrl = selectedDoc.previewUrl.startsWith('http') ? selectedDoc.previewUrl : `${baseUrl}${selectedDoc.previewUrl}`;
        const response = await axios.get(fullUrl, {
          responseType: 'blob',
          headers: getAuthHeaders(),
        });

        if (isActive) {
          setPreviewBlobUrl(URL.createObjectURL(response.data));
        }
      } catch (error) {
        if (isActive) {
          setPreviewBlobUrl('');
        }
        console.error('Error loading preview in modal', error);
      } finally {
        if (isActive) {
          setPreviewLoading(false);
        }
      }
    };

    loadPreview();

    return () => {
      isActive = false;
      setPreviewBlobUrl((current) => {
        if (current && current.startsWith('blob:')) {
          URL.revokeObjectURL(current);
        }
        return '';
      });
    };
  }, [selectedDoc?.previewUrl, selectedDoc?.fileType, selectedDoc?.title, selectedDoc?.name]);

  const handleApproveDocument = async (doc, decision = 'APPROVED') => {
    if (!doc?.id) return;

    try {
      const ownerDoc = doc.source === 'EMPLOYEE_DOC' && doc.employeeId ? doc : null;
      const employeeId = ownerDoc?.employeeId || null;
      const url = employeeId ? `/api/documents-center/${doc.id}/decision?decision=${encodeURIComponent(decision)}&message=${encodeURIComponent(decision === 'APPROVED' ? 'Documento aprobado correctamente.' : 'Documento rechazado. Debes volver a cargar la información correcta.')}` : null;

      if (url) {
        await axios.put(`${process.env.REACT_APP_API_URL || ''}${url}`, {}, {
          headers: { 'Content-Type': 'application/json' }
        });
      }

      if (decision === 'APPROVED') {
        setApprovedDocs((prev) => ({ ...prev, [doc.id]: true }));
      }

      setDocuments((prev) => prev.map((item) => item.id === doc.id
        ? { ...item, status: decision === 'APPROVED' ? 'Aprobado' : 'Rechazado', requiresApproval: false }
        : item));

      setSelectedDoc((current) => (current && current.id === doc.id ? { ...current, status: decision === 'APPROVED' ? 'Aprobado' : 'Rechazado' } : current));
    } catch (error) {
      console.error('Error updating document decision', error);
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', md: 'center' }} spacing={2}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700, mb: 0.5 }}>Centro de Documentos</Typography>
          <Typography variant="body2" color="text.secondary">
            Consulta, valida, revisa y descarga todos los documentos de la operación y las divisiones activas.
          </Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <Button variant="contained" startIcon={<ArticleIcon />}>Nuevo documento</Button>
          <Button variant="outlined" startIcon={<DownloadIcon />}>Descargar lote</Button>
        </Stack>
      </Stack>

      <Grid container spacing={2}>
        <Grid key="summary-total" size={{ xs: 12, sm: 6, md: 3 }}>
          <Card sx={{ borderRadius: 3, boxShadow: '0 10px 30px rgba(15, 23, 42, 0.06)' }}>
            <CardContent>
              <Typography variant="caption" color="text.secondary">Total</Typography>
              <Typography variant="h4" sx={{ fontWeight: 700, mt: 1 }}>{summary.total}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid key="summary-approved" size={{ xs: 12, sm: 6, md: 3 }}>
          <Card sx={{ borderRadius: 3, boxShadow: '0 10px 30px rgba(15, 23, 42, 0.06)' }}>
            <CardContent>
              <Typography variant="caption" color="text.secondary">Aprobados</Typography>
              <Typography variant="h4" sx={{ fontWeight: 700, mt: 1, color: 'success.main' }}>{summary.approved}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid key="summary-pending" size={{ xs: 12, sm: 6, md: 3 }}>
          <Card sx={{ borderRadius: 3, boxShadow: '0 10px 30px rgba(15, 23, 42, 0.06)' }}>
            <CardContent>
              <Typography variant="caption" color="text.secondary">Pendientes</Typography>
              <Typography variant="h4" sx={{ fontWeight: 700, mt: 1, color: 'warning.main' }}>{summary.pending}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid key="summary-rejected" size={{ xs: 12, sm: 6, md: 3 }}>
          <Card sx={{ borderRadius: 3, boxShadow: '0 10px 30px rgba(15, 23, 42, 0.06)' }}>
            <CardContent>
              <Typography variant="caption" color="text.secondary">Rechazados</Typography>
              <Typography variant="h4" sx={{ fontWeight: 700, mt: 1, color: 'error.main' }}>{summary.rejected}</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Paper sx={{ p: 2, borderRadius: 3, boxShadow: '0 12px 36px rgba(15, 23, 42, 0.06)' }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ xs: 'stretch', md: 'center' }}>
          <TextField
            fullWidth
            size="small"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            label="Buscar documento"
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
          />
          <TextField
            select
            size="small"
            label="División"
            value={divisionFilter}
            onChange={(e) => setDivisionFilter(e.target.value)}
            sx={{ minWidth: 170 }}
          >
            {divisionOptions.map((option) => (
              <MenuItem key={option} value={option}>{option}</MenuItem>
            ))}
          </TextField>
          <TextField
            select
            size="small"
            label="Estado"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            sx={{ minWidth: 170 }}
          >
            {statusOptions.map((option) => (
              <MenuItem key={option} value={option}>{option}</MenuItem>
            ))}
          </TextField>
        </Stack>

        <Stack direction="row" spacing={1} sx={{ mt: 2, flexWrap: 'wrap', gap: 1 }}>
          {quickActions.map((action) => (
            <Chip
              key={action.label}
              label={action.label}
              variant={statusFilter === action.value || (action.value === 'Todos' && statusFilter === 'Todos') ? 'filled' : 'outlined'}
              color={action.value === 'Todos' ? 'primary' : statusConfig[action.value]?.color || 'default'}
              onClick={() => setStatusFilter(action.value)}
              clickable
            />
          ))}
        </Stack>
      </Paper>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress />
        </Box>
      ) : (
        <Stack spacing={2}>
          {filteredDocuments.length === 0 ? (
            <Alert severity="info">No se encontraron documentos con los filtros aplicados.</Alert>
          ) : (
            filteredDocuments.map((doc) => (
              <Card key={doc.id} sx={{ borderRadius: 3, boxShadow: '0 12px 32px rgba(15, 23, 42, 0.06)' }}>
              <CardContent sx={{ p: 3 }}>
                <Grid container spacing={2} alignItems="center">
                  <Grid size={{ xs: 12, md: 1 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', width: 52, height: 52, borderRadius: 2, bgcolor: 'rgba(6, 182, 212, 0.12)', color: 'primary.main' }}>
                      <ArticleIcon />
                    </Box>
                  </Grid>
                  <Grid size={{ xs: 12, md: 5 }}>
                    <Typography variant="h6" sx={{ fontWeight: 700 }}>{doc.title}</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                      {doc.relatedTo} · {doc.module}
                    </Typography>
                    <Stack direction="row" spacing={1} sx={{ mt: 1, flexWrap: 'wrap', gap: 1 }}>
                      {doc.tags.map((tag) => (
                        <Chip key={tag} label={tag} size="small" variant="outlined" />
                      ))}
                    </Stack>
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6, md: 2 }}>
                    <Typography variant="caption" color="text.secondary">División</Typography>
                    <Typography variant="body1" sx={{ fontWeight: 600 }}>{doc.division}</Typography>
                    <Typography variant="caption" color="text.secondary">Tipo</Typography>
                    <Typography variant="body2">{doc.fileType}</Typography>
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6, md: 2 }}>
                    <Typography variant="caption" color="text.secondary">Responsable</Typography>
                    <Typography variant="body1" sx={{ fontWeight: 600 }}>{doc.owner}</Typography>
                    <Typography variant="caption" color="text.secondary">Fecha</Typography>
                    <Typography variant="body2">{doc.uploadedAt}</Typography>
                  </Grid>
                  <Grid size={{ xs: 12, md: 2 }}>
                    <Stack spacing={1} alignItems={{ xs: 'flex-start', md: 'flex-end' }}>
                      <Chip
                        icon={statusConfig[resolveDocStatus(doc)]?.icon || <FilterListIcon />}
                        label={resolveDocStatus(doc)}
                        color={statusConfig[resolveDocStatus(doc)]?.color || 'default'}
                        variant="filled"
                      />
                      <Stack direction="row" spacing={1}>
                        <IconButton aria-label="Vista previa" onClick={() => setSelectedDoc({ ...doc, status: resolveDocStatus(doc) })} color="primary">
                          <VisibilityIcon />
                        </IconButton>
                        <IconButton aria-label="Descargar" onClick={() => openDocument(doc.downloadUrl)} color="secondary">
                          <DownloadIcon />
                        </IconButton>
                        <IconButton aria-label="Abrir vista previa modal" onClick={() => setSelectedDoc({ ...doc, status: resolveDocStatus(doc), previewUrl: doc.previewUrl || doc.downloadUrl })} color="inherit">
                          <OpenInNewIcon />
                        </IconButton>
                        {canApproveDoc(doc) && (
                          <>
                            <Button size="small" variant="contained" color="success" onClick={() => handleApproveDocument(doc, 'APPROVED')}>
                              Aprobar
                            </Button>
                            <Button size="small" variant="outlined" color="error" onClick={() => handleApproveDocument(doc, 'REJECTED')}>
                              Rechazar
                            </Button>
                          </>
                        )}
                      </Stack>
                    </Stack>
                  </Grid>
                </Grid>
                <Divider sx={{ my: 2 }} />
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center" justifyContent="space-between">
                  <Stack direction="row" spacing={1} alignItems="center">
                    <ShieldIcon fontSize="small" color="action" />
                    <Typography variant="body2" color="text.secondary">Seguridad: {doc.security}</Typography>
                  </Stack>
                  <Typography variant="caption" color="text.secondary">Tamaño: {doc.size}</Typography>
                </Stack>
              </CardContent>
              </Card>
            ))
          )}
        </Stack>
      )}

      <Dialog open={Boolean(selectedDoc)} onClose={() => setSelectedDoc(null)} maxWidth="md" fullWidth>
        <DialogTitle>{selectedDoc?.title || 'Vista previa del documento'}</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2}>
            <Typography variant="body2" color="text.secondary">
              {selectedDoc?.relatedTo} · {selectedDoc?.division} · {selectedDoc?.module}
            </Typography>

            {selectedDoc?.previewUrl ? (
              isWordPreviewFile(selectedDoc) || !supportsInlinePreview(selectedDoc) ? (
                <Paper sx={{ p: 3, bgcolor: 'grey.50', borderRadius: 2 }}>
                  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2, minHeight: 220, textAlign: 'center' }}>
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>Vista previa no disponible para este tipo de archivo</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {isWordPreviewFile(selectedDoc)
                        ? 'Word no puede renderizarse inline en este navegador. Descarga el archivo para abrirlo con Word.'
                        : 'Este tipo de archivo no tiene una vista previa embebida segura en el navegador.'}
                    </Typography>
                    <Button variant="contained" startIcon={<DownloadIcon />} onClick={() => openDocument(selectedDoc?.downloadUrl || selectedDoc?.previewUrl, { title: selectedDoc?.title || 'documento' })}>
                      Descargar archivo
                    </Button>
                  </Box>
                </Paper>
              ) : (
                <Paper sx={{ p: 1, bgcolor: 'grey.50', borderRadius: 2, overflow: 'hidden' }}>
                  <Box sx={{ width: '100%', height: 620, border: '1px solid rgba(0,0,0,0.08)', borderRadius: 2, overflow: 'hidden', background: '#fff' }}>
                    {previewLoading ? (
                      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                        <CircularProgress />
                      </Box>
                    ) : previewBlobUrl ? (
                      <iframe
                        title={selectedDoc?.title || 'Vista previa'}
                        src={previewBlobUrl}
                        style={{ width: '100%', height: '100%', border: 'none' }}
                      />
                    ) : (
                      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: 'text.secondary' }}>
                        No se pudo cargar la vista previa.
                      </Box>
                    )}
                  </Box>
                </Paper>
              )
            ) : (
              <Paper sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 2 }}>
                <Typography variant="body1" whiteSpace="pre-line">
                  {selectedDoc?.previewText || 'No hay texto de vista previa disponible para este documento.'}
                </Typography>
              </Paper>
            )}

            <Typography variant="caption" color="text.secondary">
              Responsable: {selectedDoc?.owner} · Fecha: {selectedDoc?.uploadedAt} · Tamaño: {selectedDoc?.size}
            </Typography>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, justifyContent: 'space-between' }}>
          <Button onClick={() => setSelectedDoc(null)}>Cerrar</Button>
          <Stack direction="row" spacing={1}>
            {selectedDoc && canApproveDoc(selectedDoc) && (
              <>
                <Button variant="contained" color="success" onClick={() => handleApproveDocument(selectedDoc, 'APPROVED')}>
                  Aprobar documento
                </Button>
                <Button variant="outlined" color="error" onClick={() => handleApproveDocument(selectedDoc, 'REJECTED')}>
                  Rechazar documento
                </Button>
              </>
            )}
            <Button variant="contained" startIcon={<DownloadIcon />} onClick={() => openDocument(selectedDoc?.downloadUrl)}>Descargar</Button>
          </Stack>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
