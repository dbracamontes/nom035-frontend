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
  uploadMedicaLebenPhoto
} from "../api/nom035";

export default function MedicaLebenCompanyForm({ company, onClose }) {
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

  const handleDocFileChange = (field) => (e) => {
    const file = e.target.files && e.target.files[0] ? e.target.files[0] : null;
    setDocFiles((prev) => ({ ...prev, [field]: file }));
  };

  const handleSaveDocs = async () => {
    if (!company) return;
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      const resp = await uploadMedicaLebenDocs(company.id, docFiles);
      setDocs(resp.data);
      setSuccess("Documentos guardados correctamente");
    } catch (e) {
      console.error(e);
      setError("Error al guardar documentos Médica LEBEN");
    } finally {
      setLoading(false);
    }
  };

  const handleAddPhoto = async () => {
    if (!company || !photoFile) return;
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      const sortOrder = photos.length;
      const resp = await uploadMedicaLebenPhoto(company.id, photoFile, photoDescription, sortOrder);
      setPhotos((prev) => [...prev, resp.data]);
      setPhotoFile(null);
      setPhotoDescription("");
      setSuccess("Foto agregada correctamente");
    } catch (e) {
      console.error(e);
      setError("Error al subir la foto del área de trabajo");
    } finally {
      setLoading(false);
    }
  };

  const renderDocStatus = (label, field) => {
    const hasValue = docs && docs[field];
    const filename = hasValue ? String(docs[field]).split("/").pop() : "Sin archivo";
    return (
      <ListItem>
        <ListItemText
          primary={label}
          secondary={filename}
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
      <Typography variant="subtitle1" sx={{ mb: 3 }}>
        Empresa: <strong>{company?.name}</strong> (ID: {company?.id})
      </Typography>

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
                    {photos.map((p) => (
                      <ListItem key={p.id}>
                        <ListItemText
                          primary={p.description || `Foto #${p.sortOrder + 1}`}
                          secondary={String(p.url).split("/").pop()}
                        />
                      </ListItem>
                    ))}
                  </List>
                )}
              </Grid>
            </Grid>
          </Box>
        </Grid>
      </Grid>

      <Box sx={{ mt: 4, display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
        <Button
          variant="outlined"
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
