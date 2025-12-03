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

const API_BASE = "http://localhost:8080/api";

// Utilidad para descargar un archivo respetando el header Authorization global de axios
const downloadFileWithAxios = async (url, suggestedName) => {
  try {
    const response = await axios.get(url, { responseType: "blob" });
    const blobUrl = window.URL.createObjectURL(response.data);

    // Intentar usar el nombre sugerido; si no hay, extraer del path
    let filename = suggestedName;
    if (!filename) {
      const parts = url.split("/");
      filename = parts[parts.length - 1] || "archivo";
    }

    const link = document.createElement("a");
    link.href = blobUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(blobUrl);
  } catch (e) {
    console.error("Error descargando archivo", e);
    alert("No se pudo descargar el archivo. Verifica tu sesión e inténtalo de nuevo.");
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
      await downloadFileWithAxios(url, filename === "Sin archivo" ? undefined : filename);
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
                        await downloadFileWithAxios(photoUrl, photoFilename || undefined);
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