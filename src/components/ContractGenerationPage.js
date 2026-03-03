import React from "react";
import {
  Alert,
  Box,
  Button,
  Card,
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
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import DownloadIcon from "@mui/icons-material/Download";
import {
  downloadDocgenPdf,
  downloadDocgenWord,
  generateContract,
  getDocgenPreview,
  prepareContractFromDocuments,
} from "../api/nom035";

const DEFAULT_TEMPLATE = "DOCUMENTO_04_1";

export default function ContractGenerationPage() {
  const [docFiles, setDocFiles] = React.useState({
    ACTA: null,
    ASAMBLEA: null,
    CONSTANCIA_SITUACION_FISCAL: null,
  });
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState(null);
  const [sourceJobIds, setSourceJobIds] = React.useState([]);
  const [fields, setFields] = React.useState([]);
  const [values, setValues] = React.useState({});
  const [contractJobId, setContractJobId] = React.useState(null);
  const [preview, setPreview] = React.useState("");
  const [combinedPreview, setCombinedPreview] = React.useState("");
  const [missingDialogOpen, setMissingDialogOpen] = React.useState(false);
  const [missingDocs, setMissingDocs] = React.useState([]);

  const requiredDocs = React.useMemo(
    () => [
      { key: "ACTA", label: "ACTA CONSTITUTIVA" },
      { key: "ASAMBLEA", label: "ASAMBLEA" },
      { key: "CONSTANCIA_SITUACION_FISCAL", label: "CONSTANCIA SITUACIÓN FISCAL" },
    ],
    []
  );

  const withTaggedFilename = (file, tag) => {
    if (!file) return null;
    return new File([file], `${tag.toLowerCase()}-${file.name}`, {
      type: file.type || "application/octet-stream",
      lastModified: file.lastModified || Date.now(),
    });
  };

  const handlePrepare = async () => {
    const missing = requiredDocs.filter((doc) => !docFiles[doc.key]);
    if (missing.length > 0) {
      setMissingDocs(missing.map((doc) => doc.label));
      setMissingDialogOpen(true);
      return;
    }

    setLoading(true);
    setError(null);
    setSourceJobIds([]);
    setFields([]);
    setValues({});
    setContractJobId(null);
    setPreview("");
    setCombinedPreview("");

    try {
      const orderedFiles = [
        withTaggedFilename(docFiles.ACTA, "acta"),
        withTaggedFilename(docFiles.ASAMBLEA, "asamblea"),
        withTaggedFilename(docFiles.CONSTANCIA_SITUACION_FISCAL, "constancia_situacion_fiscal"),
      ].filter(Boolean);

      const resp = await prepareContractFromDocuments(orderedFiles, "ACTA", DEFAULT_TEMPLATE);
      const data = resp.data || {};
      setSourceJobIds(data.sourceJobIds || []);
      const loadedFields = data.fields || [];
      setFields(loadedFields);
      const suggested = data.suggestedValues || {};
      setValues(suggested);
      setCombinedPreview(data.combinedPreview || "");
    } catch (e) {
      setError(e.response?.data || e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    try {
      const resp = await generateContract(DEFAULT_TEMPLATE, values);
      const createdJobId = resp.data?.jobId;
      setContractJobId(createdJobId);
      const previewResp = await getDocgenPreview(createdJobId);
      setPreview(previewResp.data?.text || "");
    } catch (e) {
      setError(e.response?.data || e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadWord = async () => {
    if (!contractJobId) return;
    setLoading(true);
    setError(null);
    try {
      const resp = await downloadDocgenWord(contractJobId);
      const blob = new Blob([resp.data], {
        type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `contrato-${contractJobId}.docx`;
      link.click();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      setError(e.response?.data || e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPdf = async () => {
    if (!contractJobId) return;
    setLoading(true);
    setError(null);
    try {
      const resp = await downloadDocgenPdf(contractJobId);
      const blob = new Blob([resp.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `contrato-${contractJobId}.pdf`;
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
        Genera Contrato
      </Typography>

      {loading && <LinearProgress />}
      {error && <Alert severity="error">{String(error)}</Alert>}

      <Card>
        <CardContent>
          <Stack spacing={2}>
            <Typography variant="subtitle1" fontWeight={600}>
              Paso 1: Adjunta los 3 documentos obligatorios
            </Typography>

            <Stack spacing={1.5}>
              {requiredDocs.map((doc) => {
                const file = docFiles[doc.key];
                return (
                  <Stack
                    key={doc.key}
                    direction={{ xs: "column", sm: "row" }}
                    spacing={1}
                    alignItems={{ xs: "flex-start", sm: "center" }}
                  >
                    <Typography sx={{ minWidth: 300, fontWeight: 600 }}>{doc.label}</Typography>
                    <Chip
                      size="small"
                      label={file ? "Adjuntado" : "Pendiente"}
                      color={file ? "success" : "default"}
                    />
                    <Button
                      variant="contained"
                      component="label"
                      size="small"
                      startIcon={<CloudUploadIcon />}
                      disabled={loading}
                    >
                      {file ? "Reemplazar" : "Adjuntar"}
                      <input
                        hidden
                        type="file"
                        accept=".pdf,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.txt"
                        onChange={(e) => {
                          const selected = e.target.files?.[0] || null;
                          setDocFiles((prev) => ({ ...prev, [doc.key]: selected }));
                        }}
                      />
                    </Button>
                    <Typography variant="body2" color="text.secondary">
                      {file ? file.name : "Sin archivo"}
                    </Typography>
                  </Stack>
                );
              })}
            </Stack>

            <Button variant="outlined" onClick={handlePrepare} disabled={loading} sx={{ alignSelf: "flex-start" }}>
              Preparar contrato
            </Button>

            {sourceJobIds.length > 0 && (
              <Typography variant="body2" color="text.secondary">
                Jobs de interpretación: {sourceJobIds.join(", ")}
              </Typography>
            )}
          </Stack>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Stack spacing={2}>
            <Typography variant="subtitle1" fontWeight={600}>
              Paso 2: Ajustar campos y generar contrato 4.1 (MORAL)
            </Typography>

            {fields.length === 0 ? (
              <Alert severity="info">Primero prepara el contrato con 3 o más documentos.</Alert>
            ) : (
              <>
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
                <Button variant="contained" onClick={handleGenerate} disabled={loading} sx={{ alignSelf: "flex-start" }}>
                  Generar contrato
                </Button>
              </>
            )}
          </Stack>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1} alignItems="center" justifyContent="space-between">
            <Typography variant="h6">Resultado generado</Typography>
            <Stack direction="row" spacing={1}>
              <Button startIcon={<DownloadIcon />} onClick={handleDownloadWord} disabled={!contractJobId || loading}>
                Descarga Word
              </Button>
              <Button startIcon={<DownloadIcon />} onClick={handleDownloadPdf} disabled={!contractJobId || loading}>
                Descarga PDF
              </Button>
            </Stack>
          </Stack>

          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Job contrato: {contractJobId || "-"}
          </Typography>

          <TextField
            fullWidth
            multiline
            minRows={8}
            sx={{ mt: 2 }}
            label="Vista previa combinada de documentos interpretados"
            value={combinedPreview}
            InputProps={{ readOnly: true }}
          />

          <TextField
            fullWidth
            multiline
            minRows={12}
            sx={{ mt: 2 }}
            label="Vista previa del contrato generado"
            value={preview}
            InputProps={{ readOnly: true }}
          />
        </CardContent>
      </Card>

      <Dialog open={missingDialogOpen} onClose={() => setMissingDialogOpen(false)}>
        <DialogTitle>Faltan documentos obligatorios</DialogTitle>
        <DialogContent>
          <Typography>
            Tienes que adjuntar los 3 documentos mínimo para proseguir.
          </Typography>
          {missingDocs.length > 0 && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Pendientes: {missingDocs.join(", ")}
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setMissingDialogOpen(false)} autoFocus>
            Entendido
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
