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
  ListItemText
} from "@mui/material";
import { Save as SaveIcon, Cancel as CancelIcon, UploadFile as UploadFileIcon, Image as ImageIcon } from "@mui/icons-material";
import {
  getMedicaLebenDocs,
  uploadMedicaLebenDocs,
  getMedicaLebenPhotos,
  uploadMedicaLebenPhoto,
  updateCompany
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
  const [docFiles, setDocFiles] = useState({
    acta_constitutiva: null,
    constancia_situacion_fiscal: null,
    poder_notarial: null,
    identificacion_representante: null,
    comprobante_domicilio: null,
    estado_cuenta_bancaria: null,
    comprobante_ema_eba: null,
  });
  const [photoFile, setPhotoFile] = useState(null);
  const [photoDescription, setPhotoDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [companyName, setCompanyName] = useState(company?.name || "");
  const [companyTaxId, setCompanyTaxId] = useState(company?.taxId || "");
  const [companyFolioMercantil, setCompanyFolioMercantil] = useState(company?.folioMercantil || "");
  const [companyValidationError, setCompanyValidationError] = useState("");

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
    setCompanyName(company?.name || "");
    setCompanyTaxId(company?.taxId || "");
    setCompanyFolioMercantil(company?.folioMercantil || "");
  }, [company]);

  const handleDocFileChange = (field) => (e) => {
    const file = e.target.files && e.target.files[0] ? e.target.files[0] : null;
    setDocFiles((prev) => ({ ...prev, [field]: file }));
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

  const handleSaveDocs = async () => {
    try {
      setLoading(true);
      setError("");
      setSuccess("");
      const ensuredCompany = await ensureCompanyExists();
      const resp = await uploadMedicaLebenDocs(ensuredCompany.id, docFiles);
      setDocs(resp.data);
      setSuccess("Documentos guardados correctamente");
    } catch (e) {
      if (e.message === "Company validation error") {
        return;
      }
      console.error(e);
      setError("Error al guardar documentos Médica LEBEN");
    } finally {
      setLoading(false);
    }
  };

  const handleAddPhoto = async () => {
    try {
      if (!photoFile) return;
      setLoading(true);
      setError("");
      setSuccess("");
      const ensuredCompany = await ensureCompanyExists();
      const sortOrder = photos.length;
      const resp = await uploadMedicaLebenPhoto(ensuredCompany.id, photoFile, photoDescription, sortOrder);
      setPhotos((prev) => [...prev, resp.data]);
      setPhotoFile(null);
      setPhotoDescription("");
      setSuccess("Foto agregada correctamente");
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
      setLoading(true);
      setError("");
      setSuccess("");

      const payload = {
        ...company,
        name: companyName.trim(),
        taxId: companyTaxId.trim() || null,
        folioMercantil: companyFolioMercantil.trim() || null,
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

  const renderDocStatus = (label, field) => {
    const hasValue = docs && docs[field];
    const url = hasValue ? String(docs[field]) : null;
    const filename = hasValue ? String(docs[field]).split("/").pop() : "Sin archivo";

    const handleDocDoubleClick = async () => {
      if (!url) return;
      // Forzar descarga vía axios para que incluya Authorization y evitar redirección a login
      // Pass company id so downloader will try the /api/medica-leben/companies/:id/docs/:file endpoint first
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
        }}
      >
        <ListItemText
          primary={label}
          secondary={filename}
          sx={{ mr: 2 }}
        />
        <Chip
          label={hasValue ? "Cargado" : "Pendiente"}
          color={hasValue ? "success" : "default"}
          size="small"
        />
      </ListItem>
    );
  };

  return (
    <Paper sx={{ p: 3, boxShadow: 2 }}>
      <Typography variant="h5" sx={{ mb: 2, fontWeight: 600 }}>
        Documentación Médica LEBEN
      </Typography>

      {/* Datos de la empresa (editable tanto para nueva como existente) */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>
          Datos de la empresa
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
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
          <Grid item xs={12} md={3}>
            <TextField
              fullWidth
              label="RFC / Tax ID"
              value={companyTaxId}
              onChange={(e) => setCompanyTaxId(e.target.value)}
              size="small"
              helperText="Opcional"
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <TextField
              fullWidth
              label="Folio mercantil"
              value={companyFolioMercantil}
              onChange={(e) => setCompanyFolioMercantil(e.target.value)}
              size="small"
              helperText="Opcional"
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
        <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
      )}
      {success && (
        <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>
      )}

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Typography variant="subtitle1" sx={{ mb: 1 }}>
            Documentos requeridos
          </Typography>
          <List dense>
            {renderDocStatus("Acta constitutiva", "actaConstitutiva")}
            {renderDocStatus("Constancia de situación fiscal", "constanciaSituacionFiscal")}
            {renderDocStatus("Poder notarial otorgado", "poderNotarial")}
            {renderDocStatus("Identificación oficial del representante legal", "identificacionRepresentante")}
            {renderDocStatus("Comprobante de domicilio", "comprobanteDomicilio")}
            {renderDocStatus("Estado de cuenta bancaria", "estadoCuentaBancaria")}
            {renderDocStatus("Comprobante EMA/EBA último periodo", "comprobanteEmaEba")}
          </List>
        </Grid>

        <Grid item xs={12} md={6}>
          <Typography variant="subtitle1" sx={{ mb: 1 }}>
            Cargar / actualizar documentos
          </Typography>
          <Grid container spacing={2}>
            {Object.entries({
              acta_constitutiva: "Acta constitutiva",
              constancia_situacion_fiscal: "Constancia de situación fiscal",
              poder_notarial: "Poder notarial otorgado",
              identificacion_representante: "Identificación representante legal",
              comprobante_domicilio: "Comprobante de domicilio",
              estado_cuenta_bancaria: "Estado de cuenta bancaria",
              comprobante_ema_eba: "Comprobante EMA/EBA último periodo",
            }).map(([field, label]) => (
              <Grid item xs={12} key={field}>
                <Button
                  variant="outlined"
                  component="label"
                  startIcon={<UploadFileIcon />}
                  fullWidth
                  disabled={loading}
                >
                  {docFiles[field]?.name || label}
                  <input
                    type="file"
                    hidden
                    onChange={handleDocFileChange(field)}
                  />
                </Button>
              </Grid>
            ))}
          </Grid>
          <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
            <Button
              variant="contained"
              startIcon={<SaveIcon />}
              onClick={handleSaveDocs}
              disabled={loading}
            >
              Guardar documentos
            </Button>
          </Box>
        </Grid>

        <Grid item xs={12}>
          <Box sx={{ mt: 4 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>
              Fotos del área de trabajo
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Descripción de la foto"
                  value={photoDescription}
                  onChange={(e) => setPhotoDescription(e.target.value)}
                  size="small"
                  sx={{ mb: 2 }}
                />
                <Button
                  variant="outlined"
                  component="label"
                  startIcon={<ImageIcon />}
                  disabled={loading}
                  sx={{ mb: 2 }}
                >
                  {photoFile?.name || "Seleccionar foto"}
                  <input
                    type="file"
                    accept="image/*"
                    hidden
                    onChange={(e) => {
                      const file = e.target.files && e.target.files[0] ? e.target.files[0] : null;
                      setPhotoFile(file);
                    }}
                  />
                </Button>
                <Box>
                  <Button
                    variant="contained"
                    startIcon={<SaveIcon />}
                    onClick={handleAddPhoto}
                    disabled={loading || !photoFile}
                  >
                    Agregar foto
                  </Button>
                </Box>
              </Grid>
              <Grid item xs={12} md={6}>
                {photos.length === 0 ? (
                  <Typography variant="body2" color="text.secondary">
                    No hay fotos registradas.
                  </Typography>
                ) : (
                  <List dense>
                    {photos.map((p) => {
                      const photoUrl = p.url ? String(p.url) : null;
                      const photoFilename = photoUrl ? photoUrl.split("/").pop() : "";

                      const handlePhotoDoubleClick = async () => {
                        if (!photoUrl) return;
                        // Pass company id so downloader will try /api/medica-leben/companies/:id/photos/:file
                        await downloadFileWithAxios(photoUrl, photoFilename || undefined, company?.id, 'photo');
                      };

                      return (
                        <ListItem
                          key={p.id}
                          onDoubleClick={handlePhotoDoubleClick}
                          sx={{ cursor: photoUrl ? "pointer" : "default" }}
                        >
                          <ListItemText
                            primary={p.description || `Foto #${(p.sortOrder ?? 0) + 1}`}
                            secondary={photoFilename}
                          />
                        </ListItem>
                      );
                    })}
                  </List>
                )}
              </Grid>
            </Grid>
          </Box>
        </Grid>
      </Grid>

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