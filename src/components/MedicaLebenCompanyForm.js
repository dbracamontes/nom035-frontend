import React, { useEffect, useState } from "react";
import {
  Box,
  Button,
  Grid,
  Paper,
  Typography,
  TextField,
  Alert,
  Chip,
  List,
  ListItem,
  ListItemText,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from "@mui/material";
import {
  Save as SaveIcon,
  Cancel as CancelIcon,
  UploadFile as UploadFileIcon,
  Delete as DeleteIcon
} from "@mui/icons-material";
import {
  getMedicaLebenDocs,
  uploadMedicaLebenDocs,
  getMedicaLebenPhotos,
  uploadMedicaLebenPhoto,
  updateCompany,
  deleteMedicaLebenDoc,
  deleteMedicaLebenPhoto
} from "../api/nom035";
import axios from "axios";

// Use the same env-configured API root as the rest of the frontend (falls back to localhost:8080)
const API_ROOT = process.env.REACT_APP_API_URL || 'http://localhost:8080';
const API_BASE = `${API_ROOT}/api`;

// Utilidad para descargar un archivo respetando el header Authorization global de axios
// Attempts API download endpoints used by the backend first (so downloads use /api/medica-leben/companies/:id/...)
const downloadFileWithAxios = async (url, suggestedName, companyId = null, resourceType = null) => {
  const toTrimmed = (u) => (u ? String(u).trim() : null);
  const trimmed = toTrimmed(url);
  if (!trimmed) {
    alert("No hay URL válida para descargar el archivo.");
    return;
  }

  // Prefer backend API download endpoints (these return 200 in your example)
  const candidates = [];
  // If the input already looks absolute, try it first
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('//')) {
    candidates.push(trimmed);
  }

  // If we have a company id, try the medica-leben API download endpoints used for docs/photos
  if (companyId) {
    // Order endpoints based on resourceType hint: 'photo' should try photos first, 'doc' try docs first.
    if (resourceType === 'photo') {
      candidates.push(`${API_BASE}/medica-leben/companies/${companyId}/photos/${encodeURIComponent(trimmed)}`);
      candidates.push(`${API_BASE}/medica-leben/companies/${companyId}/docs/${encodeURIComponent(trimmed)}`);
    } else {
      candidates.push(`${API_BASE}/medica-leben/companies/${companyId}/docs/${encodeURIComponent(trimmed)}`);
      candidates.push(`${API_BASE}/medica-leben/companies/${companyId}/photos/${encodeURIComponent(trimmed)}`);
    }
  }

  // If the backend returned a root-relative path or bare filename, try common upload/static locations on the API host
  const apiRoot = API_BASE.replace(/\/api\/?$/, '');
  if (trimmed.startsWith('/')) {
    candidates.push(`${API_BASE}${trimmed}`); // /api + returned path
    candidates.push(`${apiRoot}${trimmed}`); // host + returned path
    candidates.push(`${apiRoot}/uploads${trimmed}`);
  } else {
    candidates.push(`${API_BASE}/medica-leben/companies/${companyId || '0'}/photos/${encodeURIComponent(trimmed)}`);
    candidates.push(`${API_BASE}/medica-leben/companies/${companyId || '0'}/docs/${encodeURIComponent(trimmed)}`);
    candidates.push(`${apiRoot}/uploads/${trimmed}`);
    candidates.push(`${apiRoot}/uploads/medica-leben/${trimmed}`);
    candidates.push(`${apiRoot}/${trimmed}`);
  }

  // Deduplicate preserving order
  const seen = new Set();
  const unique = candidates.filter((c) => c && !seen.has(c) && (seen.add(c), true));

  let lastErr = null;
  for (const candidate of unique) {
    try {
      const res = await axios.get(candidate, { responseType: 'blob' });
      const blobUrl = window.URL.createObjectURL(res.data);
      const filename = suggestedName || decodeURIComponent(candidate.split('/').pop() || 'archivo');
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(blobUrl);
      return;
    } catch (err) {
      lastErr = err;
      // try next candidate
    }
  }

  console.error('Error descargando archivo, intentadas URLs:', unique, lastErr);
  if (lastErr && lastErr.response && (lastErr.response.status === 401 || lastErr.response.status === 403)) {
    alert('Acceso denegado al descargar el archivo (401/403). Verifica tu sesión.');
  } else {
    alert('No se pudo descargar el archivo. Verifica la ruta y tu sesión.');
  }
};

export default function MedicaLebenCompanyForm({ company, onClose, isNewCompany }) {
  const [docs, setDocs] = useState(null);
  const [photos, setPhotos] = useState([]);
  const [photoPreviewUrls, setPhotoPreviewUrls] = useState({});
  const normalizeDocFieldName = (field) =>
    String(field)
      .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
      .replace(/-/g, '_')
      .toLowerCase();

  const getSelectedDocFile = (field) => {
    const normalizedField = normalizeDocFieldName(field);
    return docFiles[field] ?? docFiles[normalizedField] ?? null;
  };

  const setSelectedDocFile = (field, file) => {
    const normalizedField = normalizeDocFieldName(field);
    setDocFiles((prev) => ({
      ...prev,
      [field]: file,
      [normalizedField]: file,
    }));
  };

  const [docFiles, setDocFiles] = useState({
    acta_constitutiva: null,
    asamblea: null,
    constancia_situacion_fiscal: null,
    poder_notarial: null,
    identificacion_representante: null,
    comprobante_domicilio: null,
    estado_cuenta_bancaria: null,
    comprobante_ema_eba: null,
  });
  const [photoSelections, setPhotoSelections] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  // nuevo: lista de documentos que fallaron por tamaño
  const [failedDocs, setFailedDocs] = useState([]);
  const [success, setSuccess] = useState("");
  const [companyName, setCompanyName] = useState(company?.name || "");
  const [companyTaxId, setCompanyTaxId] = useState(company?.taxId || "");
  const [companyFolioMercantil, setCompanyFolioMercantil] = useState(company?.folioMercantil || "");
  const [companyValidationError, setCompanyValidationError] = useState("");
  const [previewDialog, setPreviewDialog] = useState({ open: false, title: '', url: '', type: 'image' });

  useEffect(() => {
    if (!company) return;
    const load = async () => {
      try {
        const [docsRes, photosRes] = await Promise.all([
          getMedicaLebenDocs(company.id).catch(() => null),
          getMedicaLebenPhotos(company.id).catch(() => ({ data: [] })),
        ]);
        setDocs(docsRes ? docsRes.data : null);
        setPhotos(photosRes?.data || []);
      } catch (e) {
        console.error("Error loading Médica LEBEN data", e);
      }
    };
    load();
  }, [company]);

  useEffect(() => {
    const objectUrls = [];
    let isCurrent = true;

    const loadPhotoPreviews = async () => {
      const previews = await Promise.all(photos.map(async (photo) => {
        const url = buildMediaUrl(photo.url, 'photos');
        if (!url) return null;
        try {
          const response = await axios.get(url, { responseType: 'blob' });
          const objectUrl = URL.createObjectURL(response.data);
          objectUrls.push(objectUrl);
          return [photo.id, objectUrl];
        } catch (error) {
          console.error('Error loading protected photo preview', error);
          return null;
        }
      }));

      if (isCurrent) {
        setPhotoPreviewUrls(Object.fromEntries(previews.filter(Boolean)));
      }
    };

    loadPhotoPreviews();
    return () => {
      isCurrent = false;
      objectUrls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [company?.id, photos]);

  useEffect(() => {
    setCompanyName(company?.name || "");
    setCompanyTaxId(company?.taxId || "");
    setCompanyFolioMercantil(company?.folioMercantil || "");
  }, [company]);

  const handleDocFileChange = (field) => (e) => {
    const file = e.target.files && e.target.files[0] ? e.target.files[0] : null;
    if (!file) {
      setSelectedDocFile(field, null);
      return;
    }
    const maxBytes = 5 * 1024 * 1024; // 5 MB
    if (file.size > maxBytes) {
      const friendlyNameMap = {
        acta_constitutiva: "Acta constitutiva",
        asamblea: "Asamblea",
        constancia_situacion_fiscal: "Constancia de situación fiscal",
        poder_notarial: "Poder notarial otorgado",
        identificacion_representante: "Identificación representante legal",
        comprobante_domicilio: "Comprobante de domicilio",
        estado_cuenta_bancaria: "Estado de cuenta bancaria",
        comprobante_ema_eba: "Comprobante EMA/EBA último periodo",
      };
      const label = friendlyNameMap[normalizeDocFieldName(field)] || field;
      setError(`El archivo para "${label}" es demasiado grande. Tamaño máximo: 5 MB.`);
      setFailedDocs((prev) => Array.from(new Set([...prev, label])));
      e.target.value = "";
      return;
    }
    setSelectedDocFile(field, file);
  };

  const ensureCompanyExists = async () => {
    if (!isNewCompany || company?.id) {
      return company;
    }
    if (!companyName || companyName.trim() === "") {
      setCompanyValidationError("El nombre de la empresa es obligatorio");
      throw new Error("Company validation error");
    }
    setCompanyValidationError("");
    const payload = {
      name: companyName.trim(),
      taxId: companyTaxId.trim() || null,
      folioMercantil: companyFolioMercantil.trim() || null,
    };
    const resp = await axios.post(`${API_BASE}/companies`, payload);
    return resp.data;
  };

  const handleSaveSingleDoc = async (field) => {
    try {
      const singleFile = getSelectedDocFile(field);
      if (!singleFile) {
        setError("Selecciona un documento antes de guardar.");
        return;
      }

      setLoading(true);
      setError("");
      setSuccess("");
      setFailedDocs([]);

      const ensuredCompany = await ensureCompanyExists();
      const maxBytes = 5 * 1024 * 1024;
      if (singleFile.size > maxBytes) {
        setError(`El archivo seleccionado excede el tamaño máximo permitido de 5 MB.`);
        setLoading(false);
        return;
      }

      const normalizedField = normalizeDocFieldName(field);
      const resp = await uploadMedicaLebenDocs(ensuredCompany.id, {
        [field]: singleFile,
        [normalizedField]: singleFile,
      });
      setDocs(resp.data);
      setSelectedDocFile(field, null);
      setSuccess("Documento guardado correctamente");
    } catch (e) {
      if (e.message === "Company validation error") {
        return;
      }
      console.error(e);
      const resp = e?.response;
      const isMaxSizeError =
        resp?.status === 413 ||
        (typeof resp?.data === "string" && resp.data.includes("Maximum upload size exceeded"));
      const validationMessage =
        typeof resp?.data === "string"
          ? resp.data
          : (resp?.data?.error || resp?.data?.message || "");

      if (isMaxSizeError) {
        setError("La carga del documento excede el tamaño máximo permitido de 5 MB.");
      } else if (validationMessage) {
        setError(validationMessage.replace(/^Error de validación:\s*/i, ""));
      } else {
        setError("Error al guardar documentos Médica LEBEN");
      }
    } finally {
      setLoading(false);
    }
  };

  const photoRequirements = [
    {
      id: 'area_actividad',
      title: 'I.- Fotos del área en donde se encuentran realizando las actividades los trabajadores.',
      description: 'Fotos del área en donde se encuentran realizando las actividades los trabajadores.'
    },
    {
      id: 'salidas_emergencia',
      title: 'II.- Fotos de las salidas de emergencia.',
      description: 'Fotos de las salidas de emergencia.'
    },
    {
      id: 'area_comida',
      title: 'III.- Fotos del área de comida.',
      description: 'Fotos del área de comida.'
    },
    {
      id: 'instalaciones_empresa_entrada',
      title: 'IV.- Fotos de las instalaciones de la empresa (entrada).',
      description: 'Fotos de las instalaciones de la empresa (entrada).'
    },
    {
      id: 'instalaciones_empresa_salida',
      title: 'IV.- Fotos de las instalaciones de la empresa (salida).',
      description: 'Fotos de las instalaciones de la empresa (salida).'
    },
    {
      id: 'instalaciones_empresa_escaleras',
      title: 'IV.- Fotos de las instalaciones de la empresa (escaleras).',
      description: 'Fotos de las instalaciones de la empresa (escaleras).'
    },
    {
      id: 'equipo_seguridad',
      title: 'V.- Foto de los equipos de seguridad con que cuentan.',
      description: 'Foto de los equipos de seguridad con que cuentan.'
    }
  ];

  const handleAddPhoto = async (photoRequirement) => {
    try {
      const selectedFile = photoSelections[photoRequirement.id];
      if (!selectedFile) return;
      setLoading(true);
      setError("");
      setSuccess("");
      const ensuredCompany = await ensureCompanyExists();
      const sortOrder = photos.length;
      const resp = await uploadMedicaLebenPhoto(ensuredCompany.id, selectedFile, photoRequirement.description, sortOrder);
      setPhotos((prev) => {
        const filtered = prev.filter((p) => p.description !== photoRequirement.description);
        return [...filtered, resp.data];
      });
      setPhotoSelections((prev) => ({ ...prev, [photoRequirement.id]: null }));
      setSuccess(`Foto guardada correctamente: ${photoRequirement.title}`);
    } catch (e) {
      if (e.message === "Company validation error") {
        return;
      }
      console.error(e);
      setError("Error al subir la foto del área de trabajo");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveCompanyInfo = async () => {
    try {
      if (!company || !company.id) {
        return; // Nothing to update on backend if company doesn't exist yet
      }
      
      // Validar campos obligatorios
      if (!companyName.trim()) {
        setCompanyValidationError("El nombre de la empresa es obligatorio");
        return;
      }
      if (!companyTaxId.trim()) {
        setError("El RFC / Tax ID es obligatorio");
        return;
      }
      if (!companyFolioMercantil.trim()) {
        setError("El Folio Mercantil es obligatorio");
        return;
      }
      
      setLoading(true);
      setError("");
      setSuccess("");
      setCompanyValidationError("");

      const payload = {
        ...company,
        name: companyName.trim(),
        taxId: companyTaxId.trim(),
        folioMercantil: companyFolioMercantil.trim(),
      };

      await updateCompany(company.id, payload);
      setSuccess("Datos de la empresa guardados correctamente");
    } catch (e) {
      console.error("Error al guardar datos de la empresa", e);
      setError("Error al guardar los datos de la empresa");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteDoc = async (field) => {
    if (!company || !company.id) return;
    if (!window.confirm("\u00bfEliminar este documento?")) return;
    try {
      setLoading(true);
      setError("");
      setSuccess("");
      const resp = await deleteMedicaLebenDoc(company.id, field);
      setDocs(resp.data);
      setSuccess("Documento eliminado correctamente");
    } catch (e) {
      console.error("Error al eliminar documento", e);
      setError("Error al eliminar el documento");
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePhoto = async (photoId) => {
    if (!company || !company.id) return;
    if (!window.confirm("\u00bfEliminar esta foto?")) return;
    try {
      setLoading(true);
      setError("");
      setSuccess("");
      await deleteMedicaLebenPhoto(company.id, photoId);
      setPhotos((prev) => prev.filter((p) => p.id !== photoId));
      setSuccess("Foto eliminada correctamente");
    } catch (e) {
      console.error("Error al eliminar foto", e);
      setError("Error al eliminar la foto");
    } finally {
      setLoading(false);
    }
  };

  const openPreviewDialog = (title, url, type = 'image') => {
    if (!url) return;
    setPreviewDialog({ open: true, title, url, type });
  };

  const buildMediaUrl = (resourcePath, resourceType) => {
    if (!company?.id || !resourcePath) return null;
    const encoded = encodeURIComponent(resourcePath);
    return `${API_ROOT}/api/medica-leben/companies/${company.id}/${resourceType}/${encoded}`;
  };

  const normalizeCompanyDocStatus = (status) => {
    const value = String(status || '').trim();
    if (!value) return 'Pendiente';
    if (['APPROVED', 'Aprobado', 'approved', 'ACTIVE', 'Activo', 'active'].includes(value)) return 'Aprobado';
    if (['REJECTED', 'Rechazado', 'rejected', 'INACTIVE', 'Inactivo', 'inactive'].includes(value)) return 'Rechazado';
    return 'Pendiente';
  };

  const getDocFieldStatus = (field) => {
    const snakeToCamel = (value) => value.replace(/_([a-z])/g, (_, char) => char.toUpperCase());
    const camelKey = `${snakeToCamel(field)}Status`;
    return docs?.[camelKey] ?? docs?.status ?? 'PENDING';
  };

  const actionButtonSx = { minWidth: 0, px: 1.25, py: 0.75, fontSize: '0.75rem' };

  const renderDocStatus = (label, field) => {
    const hasValue = !!(docs && docs[field]);
    const url = hasValue ? String(docs[field]) : null;
    const selectedFile = getSelectedDocFile(field);
    const filename = hasValue ? String(docs[field]).split("/").pop() : (selectedFile ? selectedFile.name : "Sin archivo");
    const fieldStatus = normalizeCompanyDocStatus(getDocFieldStatus(field));
    const statusLabel = selectedFile ? 'Pendiente' : fieldStatus;
    const statusColor = fieldStatus === 'Aprobado' ? 'success' : (fieldStatus === 'Rechazado' ? 'error' : 'warning');

    const handleDocDoubleClick = async () => {
      if (!url) return;
      await downloadFileWithAxios(url, filename === "Sin archivo" ? undefined : filename, company?.id, 'doc');
    };

    return (
      <ListItem
        onDoubleClick={handleDocDoubleClick}
        sx={{
          cursor: hasValue ? "pointer" : "default",
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 1.5,
          py: 1.5,
          borderBottom: '1px solid #f1f5f9'
        }}
      >
        <ListItemText
          primary={label}
          secondary={hasValue || selectedFile ? filename : "Sin archivo"}
          sx={{ mr: 2 }}
        />
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
          <Chip
            label={statusLabel}
            color={statusColor}
            size="small"
          />
          {!hasValue ? (
            <>
              <Button
                variant="outlined"
                size="small"
                component="label"
                startIcon={<UploadFileIcon />}
                sx={actionButtonSx}
              >
                {selectedFile ? "Listo para subir" : "Elegir"}
                <input
                  type="file"
                  hidden
                  onChange={handleDocFileChange(field)}
                />
              </Button>
              {selectedFile && (
                <Button
                  variant="contained"
                  size="small"
                  startIcon={<SaveIcon />}
                  onClick={() => handleSaveSingleDoc(field)}
                  disabled={loading}
                  sx={actionButtonSx}
                >
                  Guardar
                </Button>
              )}
            </>
          ) : (
            <>
              <Button
                variant="outlined"
                size="small"
                onClick={async () => {
                  if (!url) return;
                  await downloadFileWithAxios(url, filename, company?.id, 'doc');
                }}
                sx={actionButtonSx}
              >
                Descargar
              </Button>
              <IconButton
                size="small"
                color="error"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteDoc(field);
                }}
                sx={{ p: 0.75 }}
              >
                <DeleteIcon fontSize="small" />
              </IconButton>
            </>
          )}
        </Box>
      </ListItem>
    );
  };

  const renderPhotoStatus = (photoRequirement) => {
    const uploadedPhoto = photos.find((photo) => photo.description === photoRequirement.description);
    const selectedFile = photoSelections[photoRequirement.id];
    const previewUrl = selectedFile ? URL.createObjectURL(selectedFile) : photoPreviewUrls[uploadedPhoto?.id];
    const photoStatus = uploadedPhoto ? normalizeCompanyDocStatus(uploadedPhoto.status) : 'Pendiente';
    const statusLabel = uploadedPhoto ? photoStatus : (selectedFile ? 'Listo para subir' : 'Pendiente');
    const statusColor = uploadedPhoto
      ? (photoStatus === 'Aprobado' ? 'success' : (photoStatus === 'Rechazado' ? 'error' : 'warning'))
      : 'warning';

    return (
      <ListItem
        key={photoRequirement.id}
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 1.5,
          py: 1.5,
          borderBottom: '1px solid #f1f5f9'
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flex: 1 }}>
          {previewUrl ? (
            <Box
              component="img"
              src={previewUrl}
              alt={photoRequirement.title}
              sx={{
                width: 52,
                height: 52,
                objectFit: 'cover',
                borderRadius: 1,
                border: '1px solid #e2e8f0',
                backgroundColor: '#f8fafc'
              }}
            />
          ) : (
            <Box
              sx={{
                width: 52,
                height: 52,
                borderRadius: 1,
                border: '1px dashed #cbd5e1',
                backgroundColor: '#f8fafc',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#64748b',
                fontSize: 12,
                fontWeight: 600
              }}
            >
              IMG
            </Box>
          )}
          <ListItemText
            primary={photoRequirement.title}
            secondary={uploadedPhoto ? (uploadedPhoto.url || 'Foto cargada') : (selectedFile ? selectedFile.name : 'Sin foto')}
            sx={{ mr: 2 }}
          />
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Chip label={statusLabel} color={statusColor} size="small" />
          {!uploadedPhoto ? (
            <>
              <Button
                variant="outlined"
                size="small"
                component="label"
                startIcon={<UploadFileIcon />}
                sx={actionButtonSx}
              >
                {selectedFile ? 'Listo' : 'Elegir'}
                <input
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={(e) => {
                    const file = e.target.files && e.target.files[0] ? e.target.files[0] : null;
                    setPhotoSelections((prev) => ({ ...prev, [photoRequirement.id]: file }));
                  }}
                />
              </Button>
              {selectedFile && (
                <Button
                  variant="contained"
                  size="small"
                  startIcon={<SaveIcon />}
                  onClick={() => handleAddPhoto(photoRequirement)}
                  disabled={loading}
                  sx={actionButtonSx}
                >
                  Guardar
                </Button>
              )}
            </>
          ) : (
            <>
              <Button
                variant="outlined"
                size="small"
                onClick={() => openPreviewDialog(photoRequirement.title, photoPreviewUrls[uploadedPhoto.id], 'image')}
                sx={actionButtonSx}
              >
                Vista previa
              </Button>
              <IconButton
                size="small"
                color="error"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeletePhoto(uploadedPhoto.id);
                }}
              >
                <DeleteIcon fontSize="small" />
              </IconButton>
            </>
          )}
        </Box>
      </ListItem>
    );
  };

  return (
    <Paper sx={{ p: 3, boxShadow: 2 }}>
      {/* Datos de la empresa (editable tanto para nueva como existente) */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>
          Datos de la empresa
        </Typography>
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, md: 6 }}>
            <TextField
              fullWidth
              required
              label="Nombre de la empresa"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              error={!!companyValidationError}
              helperText={companyValidationError || "Nombre legal o comercial de la empresa"}
              size="small"
            />
          </Grid>
          <Grid size={{ xs: 12, md: 3 }}>
            <TextField
              fullWidth
              required
              label="RFC / Tax ID"
              value={companyTaxId}
              onChange={(e) => setCompanyTaxId(e.target.value)}
              size="small"
              helperText="RFC de la empresa"
              inputProps={{ maxLength: 20 }}
            />
          </Grid>
          <Grid size={{ xs: 12, md: 3 }}>
            <TextField
              fullWidth
              required
              label="Folio mercantil"
              value={companyFolioMercantil}
              onChange={(e) => setCompanyFolioMercantil(e.target.value)}
              size="small"
              helperText="Folio mercantil de la empresa"
              inputProps={{ maxLength: 50 }}
            />
          </Grid>
        </Grid>
        <Box sx={{ mt: 2, display: "flex", justifyContent: "flex-end", gap: 2 }}>
          <Button
            variant="contained"
            color="primary"
            startIcon={<SaveIcon />}
            onClick={handleSaveCompanyInfo}
            disabled={loading || !company || !company.id}
          >
            Guardar datos de empresa
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
          {failedDocs.length > 0 && (
            <>
              <br />
              <strong>Documentos afectados:</strong> {failedDocs.join(", ")}
            </>
          )}
        </Alert>
      )}
      {success && (
        <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>
      )}

      <Grid container spacing={3}>
        <Grid size={{ xs: 12 }}>
          <Typography variant="subtitle1" sx={{ mb: 1 }}>
            Documentos requeridos
          </Typography>
          <List dense>
            {renderDocStatus("Acta constitutiva", "actaConstitutiva")}
            {renderDocStatus("Asamblea", "asamblea")}
            {renderDocStatus("Constancia de situación fiscal", "constanciaSituacionFiscal")}
            {renderDocStatus("Poder notarial otorgado", "poderNotarial")}
            {renderDocStatus("Identificación oficial del representante legal", "identificacionRepresentante")}
            {renderDocStatus("Comprobante de domicilio", "comprobanteDomicilio")}
            {renderDocStatus("Estado de cuenta bancaria", "estadoCuentaBancaria")}
            {renderDocStatus("Comprobante EMA/EBA último periodo", "comprobanteEmaEba")}
          </List>
        </Grid>

        <Grid size={{ xs: 12 }}>
          <Box sx={{ mt: 4 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>
              Fotos del área de trabajo
            </Typography>
            <List dense>
              {photoRequirements.map((photoRequirement) => renderPhotoStatus(photoRequirement))}
            </List>
          </Box>
        </Grid>
      </Grid>

      <Dialog
        open={previewDialog.open}
        onClose={() => setPreviewDialog({ open: false, title: '', url: '', type: 'image' })}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>{previewDialog.title || 'Vista previa'}</DialogTitle>
        <DialogContent>
          {previewDialog.url ? (
            previewDialog.type === 'image' ? (
              <Box
                component="img"
                src={previewDialog.url}
                alt={previewDialog.title}
                sx={{ display: 'block', width: '100%', maxHeight: 560, objectFit: 'contain', borderRadius: 2, bgcolor: '#f8fafc' }}
              />
            ) : (
              <Box
                component="iframe"
                src={previewDialog.url}
                title={previewDialog.title}
                sx={{ width: '100%', minHeight: 560, border: 0, borderRadius: 2 }}
              />
            )
          ) : (
            <Typography variant="body1">No hay vista previa disponible.</Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPreviewDialog({ open: false, title: '', url: '', type: 'image' })}>Cerrar</Button>
        </DialogActions>
      </Dialog>

      <Box sx={{ mt: 4, display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
        <Button
          variant="contained"
          color="inherit"
          startIcon={<CancelIcon />}
          onClick={onClose}
          disabled={loading}
        >
          Cerrar
        </Button>
      </Box>
    </Paper>
  );
}