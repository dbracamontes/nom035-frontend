import React from "react";
import {
  Alert,
  Autocomplete,
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
  getCompanies,
  getDocgenPreview,
  getDocgenTemplateFields,
  getDocgenTemplates,
} from "../api/nom035";

export default function DocumentCreationPage() {
  const MONTH_NAMES = React.useMemo(
    () => [
      "ENERO",
      "FEBRERO",
      "MARZO",
      "ABRIL",
      "MAYO",
      "JUNIO",
      "JULIO",
      "AGOSTO",
      "SEPTIEMBRE",
      "OCTUBRE",
      "NOVIEMBRE",
      "DICIEMBRE",
    ],
    []
  );

  const [templates, setTemplates] = React.useState([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState(null);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [selectedTemplate, setSelectedTemplate] = React.useState(null);
  const [fields, setFields] = React.useState([]);
  const [values, setValues] = React.useState({});
  const [companies, setCompanies] = React.useState([]);
  const [jobId, setJobId] = React.useState(null);
  const [preview, setPreview] = React.useState("");

  const dateGroups = React.useMemo(
    () => ({
      FECHA_CONTRATO: {
        day: "DIA",
        month: "MES",
        year: "AÑO",
      },
      FECHA_VIGENCIA_BASE_LEGACY: {
        day: "VID",
        month: "VIM",
        year: "VIA",
      },
      FECHA_TERMINO_VIGENCIA_LEGACY: {
        day: "VTD",
        month: "VTM",
        year: "VTA",
      },
      FECHA_INICIO_VIGENCIA: {
        day: "DIA_INICIO_VIGENCIA",
        month: "MES_INICIO_VIGENCIA",
        year: "AÑO_INICIO_VIGENCIA",
      },
      FECHA_TERMINO_VIGENCIA: {
        day: "DIA_TERMINO_VIGENCIA",
        month: "MES_TERMINO_VIGENCIA",
        year: "AÑO_TERMINO_VIGENCIA",
      },
    }),
    []
  );

  const getDateGroupByKey = React.useCallback(
    (fieldKey) => {
      const key = String(fieldKey || "").toUpperCase();
      return (
        Object.values(dateGroups).find(
          (group) => key === group.day || key === group.month || key === group.year
        ) || null
      );
    },
    [dateGroups]
  );

  const getMonthIndex = React.useCallback(
    (monthValue) => {
      if (!monthValue) return null;
      const normalized = String(monthValue).trim().toUpperCase();
      const fromName = MONTH_NAMES.indexOf(normalized);
      if (fromName >= 0) return fromName;
      const numeric = Number.parseInt(normalized, 10);
      if (!Number.isNaN(numeric) && numeric >= 1 && numeric <= 12) {
        return numeric - 1;
      }
      return null;
    },
    [MONTH_NAMES]
  );

  const parseDateFromParts = React.useCallback(
    (day, month, year) => {
      const d = Number.parseInt(day, 10);
      const y = Number.parseInt(year, 10);
      const m = getMonthIndex(month);
      if (Number.isNaN(d) || Number.isNaN(y) || m === null) return null;
      const candidate = new Date(y, m, d);
      if (
        candidate.getFullYear() !== y ||
        candidate.getMonth() !== m ||
        candidate.getDate() !== d
      ) {
        return null;
      }
      return candidate;
    },
    [getMonthIndex]
  );

  const toInputDate = React.useCallback((dateValue) => {
    if (!dateValue) return "";
    const y = dateValue.getFullYear();
    const m = String(dateValue.getMonth() + 1).padStart(2, "0");
    const d = String(dateValue.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }, []);

  const fromInputDate = React.useCallback((raw) => {
    if (!raw) return null;
    const [yearText, monthText, dayText] = raw.split("-");
    if (!yearText || !monthText || !dayText) return null;
    const y = Number.parseInt(yearText, 10);
    const m = Number.parseInt(monthText, 10) - 1;
    const d = Number.parseInt(dayText, 10);
    if (Number.isNaN(y) || Number.isNaN(m) || Number.isNaN(d)) return null;
    const candidate = new Date(y, m, d);
    if (
      candidate.getFullYear() !== y ||
      candidate.getMonth() !== m ||
      candidate.getDate() !== d
    ) {
      return null;
    }
    return candidate;
  }, []);

  const applyDateToGroup = React.useCallback(
    (group, dateValue) => {
      if (!group || !dateValue) return;
      setValues((prev) => ({
        ...prev,
        [group.day]: String(dateValue.getDate()),
        [group.month]: MONTH_NAMES[dateValue.getMonth()],
        [group.year]: String(dateValue.getFullYear()),
      }));
    },
    [MONTH_NAMES]
  );

  React.useEffect(() => {
    const baseGroup = dateGroups.FECHA_VIGENCIA_BASE_LEGACY;
    const targetGroup = dateGroups.FECHA_TERMINO_VIGENCIA_LEGACY;
    const baseDate = parseDateFromParts(
      values[baseGroup.day],
      values[baseGroup.month],
      values[baseGroup.year]
    );
    if (!baseDate) return;
    const plus365 = new Date(baseDate);
    plus365.setDate(plus365.getDate() + 365);
    const targetDay = String(plus365.getDate());
    const targetMonth = MONTH_NAMES[plus365.getMonth()];
    const targetYear = String(plus365.getFullYear());

    setValues((prev) => {
      if (
        prev[targetGroup.day] === targetDay &&
        prev[targetGroup.month] === targetMonth &&
        prev[targetGroup.year] === targetYear
      ) {
        return prev;
      }
      return {
        ...prev,
        [targetGroup.day]: targetDay,
        [targetGroup.month]: targetMonth,
        [targetGroup.year]: targetYear,
      };
    });
  }, [
    values[dateGroups.FECHA_VIGENCIA_BASE_LEGACY.day],
    values[dateGroups.FECHA_VIGENCIA_BASE_LEGACY.month],
    values[dateGroups.FECHA_VIGENCIA_BASE_LEGACY.year],
    MONTH_NAMES,
    parseDateFromParts,
    dateGroups,
  ]);

  React.useEffect(() => {
    const inicioGroup = dateGroups.FECHA_INICIO_VIGENCIA;
    const terminoGroup = dateGroups.FECHA_TERMINO_VIGENCIA;
    const inicioDate = parseDateFromParts(
      values[inicioGroup.day],
      values[inicioGroup.month],
      values[inicioGroup.year]
    );
    if (!inicioDate) return;

    const plus365 = new Date(inicioDate);
    plus365.setDate(plus365.getDate() + 365);
    const targetDay = String(plus365.getDate());
    const targetMonth = MONTH_NAMES[plus365.getMonth()];
    const targetYear = String(plus365.getFullYear());

    setValues((prev) => {
      if (
        prev[terminoGroup.day] === targetDay &&
        prev[terminoGroup.month] === targetMonth &&
        prev[terminoGroup.year] === targetYear
      ) {
        return prev;
      }
      return {
        ...prev,
        [terminoGroup.day]: targetDay,
        [terminoGroup.month]: targetMonth,
        [terminoGroup.year]: targetYear,
      };
    });
  }, [
    values[dateGroups.FECHA_INICIO_VIGENCIA.day],
    values[dateGroups.FECHA_INICIO_VIGENCIA.month],
    values[dateGroups.FECHA_INICIO_VIGENCIA.year],
    MONTH_NAMES,
    parseDateFromParts,
    dateGroups,
  ]);

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

  React.useEffect(() => {
    getCompanies()
      .then((resp) => setCompanies(resp.data || []))
      .catch(() => setCompanies([]));
  }, []);

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
            {fields.map((field) => {
              const key = String(field.key || "").toUpperCase();
              const isCompanySelector = ["EL_CLIENTE", "REPRESENTANTE_DE"].includes(key);
              const dateGroup = getDateGroupByKey(key);

              if (isCompanySelector) {
                return (
                <Autocomplete
                  key={field.key}
                  options={companies.map((company) => company.name).filter(Boolean)}
                  value={values[field.key] || null}
                  freeSolo
                  onChange={(_, selectedValue) => {
                    setValues((prev) => ({ ...prev, [field.key]: selectedValue || "" }));
                  }}
                  onInputChange={(_, inputValue, reason) => {
                    if (reason === "input") {
                      setValues((prev) => ({ ...prev, [field.key]: inputValue || "" }));
                    }
                  }}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label={field.label || field.key}
                      required={Boolean(field.required)}
                      fullWidth
                    />
                  )}
                />
                );
              }

              if (dateGroup) {
                const parsedDate = parseDateFromParts(
                  values[dateGroup.day],
                  values[dateGroup.month],
                  values[dateGroup.year]
                );

                if (key === dateGroup.day) {
                  return (
                    <TextField
                      key={field.key}
                      label={field.label || field.key}
                      type="date"
                      value={toInputDate(parsedDate)}
                      onChange={(e) => {
                        const selectedDate = fromInputDate(e.target.value);
                        if (selectedDate) {
                          applyDateToGroup(dateGroup, selectedDate);
                        }
                      }}
                      required={Boolean(field.required)}
                      fullWidth
                      InputLabelProps={{ shrink: true }}
                      helperText="Este selector llena DIA, MES y AÑO del grupo automáticamente."
                    />
                  );
                }

                return (
                  <TextField
                    key={field.key}
                    label={field.label || field.key}
                    value={values[field.key] || ""}
                    required={Boolean(field.required)}
                    fullWidth
                    InputProps={{ readOnly: true }}
                  />
                );
              }

              return (
                <TextField
                  key={field.key}
                  label={field.label || field.key}
                  value={values[field.key] || ""}
                  onChange={(e) => setValues((prev) => ({ ...prev, [field.key]: e.target.value }))}
                  required={Boolean(field.required)}
                  fullWidth
                />
              );
            })}
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
