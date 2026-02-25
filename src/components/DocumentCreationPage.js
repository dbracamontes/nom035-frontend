import React from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardActions,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  LinearProgress,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import DownloadIcon from "@mui/icons-material/Download";
import {
  downloadDocgenPdf,
  downloadDocgenWord,
  generateDocgenManual,
  getDocgenPreview,
  getDocgenTemplateFields,
  getDocgenTemplates,
} from "../api/nom035";

export default function DocumentCreationPage() {
  const [templates, setTemplates] = React.useState([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState(null);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [selectedTemplate, setSelectedTemplate] = React.useState(null);
  const [fields, setFields] = React.useState([]);
  const [values, setValues] = React.useState({});
  const [jobId, setJobId] = React.useState(null);
  const [preview, setPreview] = React.useState("");

  const loadTemplates = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const resp = await getDocgenTemplates();
      setTemplates(resp.data || []);
    } catch (e) {
      setError(e.response?.data || e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  const handleOpenSemi = async (template) => {
    setSelectedTemplate(template);
    setDialogOpen(true);
    setValues({});
    setError(null);

    const templateFields = template.fields || [];
    if (templateFields.length > 0) {
      setFields(templateFields);
      return;
    }

    try {
      const resp = await getDocgenTemplateFields(template.type);
      setFields(resp.data || []);
    } catch (e) {
      setError(e.response?.data || e.message);
      setFields([]);
    }
  };

  const handleGenerateSemi = async () => {
    if (!selectedTemplate) return;

    setLoading(true);
    setError(null);
    try {
      const resp = await generateDocgenManual(selectedTemplate.type, values);
      const createdJobId = resp.data?.jobId;
      setJobId(createdJobId);

      const previewResp = await getDocgenPreview(createdJobId);
      setPreview(previewResp.data?.text || "");
      setDialogOpen(false);
    } catch (e) {
      setError(e.response?.data || e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadWord = async () => {
    if (!jobId) return;
    setLoading(true);
    setError(null);
    try {
      const resp = await downloadDocgenWord(jobId);
      const blob = new Blob([resp.data], {
        type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `documento-${jobId}.docx`;
      link.click();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      setError(e.response?.data || e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPdf = async () => {
    if (!jobId) return;
    setLoading(true);
    setError(null);
    try {
      const resp = await downloadDocgenPdf(jobId);
      const blob = new Blob([resp.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `documento-${jobId}.pdf`;
      link.click();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      setError(e.response?.data || e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ p: 3, display: "flex", flexDirection: "column", gap: 3 }}>
      <Typography variant="h5" fontWeight={600}>
        Crear Documento
      </Typography>

      {loading && <LinearProgress />}
      {error && <Alert severity="error">{String(error)}</Alert>}

      <Box sx={{ display: "flex", justifyContent: "center" }}>
        <Stack spacing={2} sx={{ width: "100%", maxWidth: 900 }}>
          {templates.map((template) => (
            <Card key={template.type} sx={{ display: "flex", flexDirection: "column", minHeight: 170 }}>
              <CardContent>
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                  <Typography variant="subtitle1" fontWeight={600} sx={{ minHeight: 48, display: "flex", alignItems: "center" }}>
                    {template.name}
                  </Typography>
                  <Chip
                    size="small"
                    color={template.enabled ? "success" : "default"}
                    label={template.enabled ? "Disponible" : "Próximamente"}
                  />
                </Stack>
                <Typography variant="body2" color="text.secondary">
                  Tipo: {template.displayType || template.type}
                </Typography>
              </CardContent>
              <CardActions sx={{ mt: "auto" }}>
                <Button
                  variant="outlined"
                  disabled={!template.enabled || loading}
                  onClick={() => handleOpenSemi(template)}
                  sx={{ minWidth: 190 }}
                >
                  Genera semiautomático
                </Button>
                <Button variant="contained" disabled sx={{ minWidth: 170 }}>
                  Genera automático
                </Button>
              </CardActions>
            </Card>
          ))}
        </Stack>
      </Box>

      <Card>
        <CardContent>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1} alignItems="center" justifyContent="space-between">
            <Typography variant="h6">Resultado generado</Typography>
            <Stack direction="row" spacing={1}>
              <Button
                startIcon={<DownloadIcon />}
                onClick={handleDownloadWord}
                disabled={!jobId || loading}
              >
                Descarga Word
              </Button>
              <Button
                startIcon={<DownloadIcon />}
                onClick={handleDownloadPdf}
                disabled={!jobId || loading}
              >
                Descarga PDF
              </Button>
            </Stack>
          </Stack>

          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Job: {jobId || "-"}
          </Typography>

          <TextField
            fullWidth
            multiline
            minRows={12}
            sx={{ mt: 2 }}
            label="Vista previa"
            value={preview}
            InputProps={{ readOnly: true }}
          />
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} fullWidth maxWidth="md">
        <DialogTitle>
          {selectedTemplate ? selectedTemplate.name : "Genera semiautomático"}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {fields.map((field) => (
              <TextField
                key={field.key}
                label={field.label || field.key}
                value={values[field.key] || ""}
                onChange={(e) => setValues((prev) => ({ ...prev, [field.key]: e.target.value }))}
                required={Boolean(field.required)}
                fullWidth
              />
            ))}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancelar</Button>
          <Button variant="contained" onClick={handleGenerateSemi} disabled={loading || !selectedTemplate}>
            Generar documento
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
