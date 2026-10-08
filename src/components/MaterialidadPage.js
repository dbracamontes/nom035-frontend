import React from "react";
import { useTranslation } from 'react-i18next';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Divider,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import DownloadIcon from "@mui/icons-material/Download";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
import PreviewIcon from "@mui/icons-material/Preview";
import {
  generateMedicaLebenMaterialidad,
  getCompanies,
  getDocgenPreview,
  downloadDocgenPdf,
  downloadDocgenWord,
} from "../api/nom035";

export default function MaterialidadPage() {
  const { t } = useTranslation();
  const [companies, setCompanies] = React.useState([]);
  const [companyId, setCompanyId] = React.useState("");
  const [jobId, setJobId] = React.useState(null);
  const [preview, setPreview] = React.useState("");
  const [previewPdfUrl, setPreviewPdfUrl] = React.useState("");
  const [loading, setLoading] = React.useState(true);
  const [generating, setGenerating] = React.useState(false);
  const [error, setError] = React.useState("");
  const [success, setSuccess] = React.useState("");

  React.useEffect(() => {
    getCompanies()
      .then((response) => setCompanies(Array.isArray(response.data) ? response.data : []))
      .catch(() => setError(t("materialidad.errors.loadCompanies", "No se pudieron cargar las empresas disponibles.")))
      .finally(() => setLoading(false));
  }, []);

  React.useEffect(() => () => {
    if (previewPdfUrl) URL.revokeObjectURL(previewPdfUrl);
  }, [previewPdfUrl]);

  const handleGenerate = async () => {
    if (!companyId) {
      setError(t("materialidad.errors.selectCompany", "Selecciona una empresa antes de generar la materialidad."));
      return;
    }
    setGenerating(true);
    setError("");
    setSuccess("");
    setPreview("");
    try {
      const response = await generateMedicaLebenMaterialidad(companyId);
      const generatedJobId = response.data?.jobId;
      setJobId(generatedJobId);
      setSuccess(t("materialidad.success.generated", "Materialidad generada correctamente con las fotografías disponibles."));
      if (generatedJobId) {
        const previewResponse = await getDocgenPreview(generatedJobId);
        setPreview(previewResponse.data?.text || "");
        const pdfResponse = await downloadDocgenPdf(generatedJobId);
        setPreviewPdfUrl(URL.createObjectURL(pdfResponse.data));
      }
    } catch (requestError) {
      setError(requestError?.response?.data?.message || t("materialidad.errors.generate", "No se pudo generar la materialidad."));
    } finally {
      setGenerating(false);
    }
  };

  const download = async (format) => {
    if (!jobId) return;
    const response = await (format === "pdf" ? downloadDocgenPdf(jobId) : downloadDocgenWord(jobId));
    const blobUrl = URL.createObjectURL(response.data);
    const link = document.createElement("a");
    link.href = blobUrl;
    link.download = format === "pdf" ? "materialidad-medica-leben.pdf" : "materialidad-medica-leben.docx";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(blobUrl);
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
      <Box>
        <Typography variant="h4" sx={{ fontWeight: 700 }}>{t('navigation.photoGenerator', 'Generador Alta Fotografías')}</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          {t("materialidad.subtitle", "Genera el expediente fotográfico usando las imágenes cargadas en Gestión de Empresas.")}
        </Typography>
      </Box>

      <Paper sx={{ p: { xs: 2, md: 3 }, borderRadius: 3 }}>
        <Stack spacing={2}>
          {/* Título oculto temporalmente; quitar `display: 'none'` para mostrarlo de nuevo. */}
          <Typography variant="h6" sx={{ display: 'none' }}>{t('materialidad.newTitle', 'Nueva materialidad')}</Typography>
          <TextField
            select
            label={t("materialidad.companyLabel", "Empresa Medica Leben")}
            value={companyId}
            onChange={(event) => setCompanyId(event.target.value)}
            disabled={loading || generating}
            fullWidth
          >
            {companies.map((company) => (
              <MenuItem key={company.id} value={company.id}>{company.name}</MenuItem>
            ))}
          </TextField>
          <Button
            variant="contained"
            startIcon={generating ? <CircularProgress size={18} color="inherit" /> : <AutoAwesomeIcon />}
            onClick={handleGenerate}
            disabled={loading || generating || !companyId}
            sx={{ alignSelf: { xs: "stretch", sm: "flex-start" } }}
          >
            {generating ? t("materialidad.generating", "Generando...") : t("materialidad.generate", "GENERA REQUISITOS FOTOS")}
          </Button>
        </Stack>
      </Paper>

      {error && <Alert severity="error">{error}</Alert>}
      {success && <Alert severity="success">{success}</Alert>}

      {jobId && (
        <Paper sx={{ p: { xs: 2, md: 3 }, borderRadius: 3 }}>
          <Stack spacing={2}>
            <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" gap={2}>
              <Box>
                <Typography variant="h6">{t('materialidad.generatedDocument', 'Documento generado')}</Typography>
              </Box>
              <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
                <Button variant="outlined" startIcon={<DownloadIcon />} onClick={() => download("word")}>Word</Button>
                <Button variant="contained" color="error" startIcon={<PictureAsPdfIcon />} onClick={() => download("pdf")}>PDF</Button>
              </Stack>
            </Stack>
            <Divider />
            <Stack direction="row" spacing={1} alignItems="center">
              <PreviewIcon color="primary" />
              <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>{t('materialidad.preview', 'Vista previa')}</Typography>
            </Stack>
            {previewPdfUrl ? (
              <Box sx={{ height: { xs: 460, md: 680 }, border: "1px solid", borderColor: "divider", borderRadius: 2, overflow: "hidden" }}>
                <iframe title={t("materialidad.previewTitle", "Vista previa de materialidad")} src={previewPdfUrl} style={{ width: "100%", height: "100%", border: 0 }} />
              </Box>
            ) : (
              <Box sx={{ backgroundColor: "grey.50", p: 2, borderRadius: 2, whiteSpace: "pre-wrap", maxHeight: 420, overflow: "auto" }}>
                {preview || t("materialidad.previewUnavailable", "La vista previa no está disponible.")}
              </Box>
            )}
          </Stack>
        </Paper>
      )}
    </Box>
  );
}