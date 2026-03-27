import React, { useState } from "react";
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Chip,
  Divider,
  LinearProgress,
  List,
  ListItem,
  ListItemText,
  Paper,
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
  getCompanies,
  getDocgenPreview,
  prepareContractFromDocuments,
} from "../api/nom035";

export default function DocumentInterpretationPage() {
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

  const [templateType, setTemplateType] = useState("DOCUMENTO_04_1");
  const [docFiles, setDocFiles] = useState({
    ACTA: null,
    ASAMBLEA: null,
    CONSTANCIA_SITUACION_FISCAL: null,
  });
  const [companies, setCompanies] = useState([]);
  const [templateFields, setTemplateFields] = useState([]);
  const [sourceJobIds, setSourceJobIds] = useState([]);
  const [combinedPreview, setCombinedPreview] = useState("");
  const [suggestedValues, setSuggestedValues] = useState({});
  const [contractJobId, setContractJobId] = useState(null);
  const [contractPreview, setContractPreview] = useState("");
  const [generatingContract, setGeneratingContract] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const requiredDocs = React.useMemo(
    () => [
      { key: "ACTA", label: "ACTA CONSTITUTIVA" },
      { key: "ASAMBLEA", label: "ASAMBLEA" },
      { key: "CONSTANCIA_SITUACION_FISCAL", label: "CONSTANCIA SITUACION FISCAL" },
    ],
    []
  );

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
      setSuggestedValues((prev) => ({
        ...prev,
        [group.day]: String(dateValue.getDate()),
        [group.month]: MONTH_NAMES[dateValue.getMonth()],
        [group.year]: String(dateValue.getFullYear()),
      }));
    },
    [MONTH_NAMES]
  );

  React.useEffect(() => {
    getCompanies()
      .then((resp) => setCompanies(resp.data || []))
      .catch(() => setCompanies([]));
  }, []);

  React.useEffect(() => {
    const baseGroup = dateGroups.FECHA_VIGENCIA_BASE_LEGACY;
    const targetGroup = dateGroups.FECHA_TERMINO_VIGENCIA_LEGACY;
    const baseDate = parseDateFromParts(
      suggestedValues[baseGroup.day],
      suggestedValues[baseGroup.month],
      suggestedValues[baseGroup.year]
    );
    if (!baseDate) return;
    const plus365 = new Date(baseDate);
    plus365.setDate(plus365.getDate() + 365);
    const targetDay = String(plus365.getDate());
    const targetMonth = MONTH_NAMES[plus365.getMonth()];
    const targetYear = String(plus365.getFullYear());

    setSuggestedValues((prev) => {
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
    suggestedValues[dateGroups.FECHA_VIGENCIA_BASE_LEGACY.day],
    suggestedValues[dateGroups.FECHA_VIGENCIA_BASE_LEGACY.month],
    suggestedValues[dateGroups.FECHA_VIGENCIA_BASE_LEGACY.year],
    MONTH_NAMES,
    parseDateFromParts,
    dateGroups,
  ]);

  React.useEffect(() => {
    const inicioGroup = dateGroups.FECHA_INICIO_VIGENCIA;
    const terminoGroup = dateGroups.FECHA_TERMINO_VIGENCIA;
    const inicioDate = parseDateFromParts(
      suggestedValues[inicioGroup.day],
      suggestedValues[inicioGroup.month],
      suggestedValues[inicioGroup.year]
    );
    if (!inicioDate) return;

    const plus365 = new Date(inicioDate);
    plus365.setDate(plus365.getDate() + 365);
    const targetDay = String(plus365.getDate());
    const targetMonth = MONTH_NAMES[plus365.getMonth()];
    const targetYear = String(plus365.getFullYear());

    setSuggestedValues((prev) => {
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
    suggestedValues[dateGroups.FECHA_INICIO_VIGENCIA.day],
    suggestedValues[dateGroups.FECHA_INICIO_VIGENCIA.month],
    suggestedValues[dateGroups.FECHA_INICIO_VIGENCIA.year],
    MONTH_NAMES,
    parseDateFromParts,
    dateGroups,
  ]);

  const withTaggedFilename = (file, tag) => {
    if (!file) return null;
    return new File([file], `${tag.toLowerCase()}-${file.name}`, {
      type: file.type || "application/octet-stream",
      lastModified: file.lastModified || Date.now(),
    });
  };

  const handleInterpretPackage = async () => {
    const missing = requiredDocs.filter((doc) => !docFiles[doc.key]);
    if (missing.length > 0) {
      const missingNames = missing.map((doc) => doc.label).join(", ");
      setError(`Faltan documentos obligatorios: ${missingNames}`);
      return;
    }

    setError(null);
    setLoading(true);
    setSourceJobIds([]);
    setCombinedPreview("");
    setSuggestedValues({});
    setTemplateFields([]);
    setContractJobId(null);
    setContractPreview("");

    try {
      const orderedFiles = [
        withTaggedFilename(docFiles.ACTA, "acta"),
        withTaggedFilename(docFiles.ASAMBLEA, "asamblea"),
        withTaggedFilename(docFiles.CONSTANCIA_SITUACION_FISCAL, "constancia_situacion_fiscal"),
      ].filter(Boolean);

      const resp = await prepareContractFromDocuments(orderedFiles, "ACTA", templateType);
      const data = resp.data || {};
      setSourceJobIds(data.sourceJobIds || []);
      setCombinedPreview(data.combinedPreview || "");
      setSuggestedValues(data.suggestedValues || {});
      setTemplateFields(data.fields || []);
    } catch (e) {
      setError(e.response?.data || e.message);
    } finally {
      setLoading(false);
    }
  };
  const fieldRows = React.useMemo(() => {
    return Object.entries(suggestedValues || {}).filter(([, value]) =>
      String(value || "").trim().length > 0
    );
  }, [suggestedValues]);

  const editableFields = React.useMemo(() => {
    if (Array.isArray(templateFields) && templateFields.length > 0) {
      return templateFields.filter((field) => {
        const key = field?.key;
        const hasValue = String((key && suggestedValues?.[key]) || "").trim().length > 0;
        return Boolean(field?.required) || hasValue;
      });
    }
    return Object.keys(suggestedValues || {}).map((key) => ({ key, label: key, required: false }));
  }, [templateFields, suggestedValues]);

  const missingRequiredFields = React.useMemo(() => {
    if (!Array.isArray(templateFields) || templateFields.length === 0) return [];
    return templateFields.filter((field) => {
      if (!field?.required) return false;
      const current = String((suggestedValues || {})[field.key] || "").trim();
      return current.length === 0;
    });
  }, [templateFields, suggestedValues]);

  const handleGenerateContract = async () => {
    setError(null);

    if (missingRequiredFields.length > 0) {
      const labels = missingRequiredFields
        .map((f) => `${f.label || f.key} (${f.key})`)
        .join(", ");
      setError(`Faltan campos requeridos: ${labels}`);
      return;
    }

    setGeneratingContract(true);
    try {
      const resp = await generateContract(templateType, suggestedValues || {});
      const createdJobId = resp.data?.jobId;
      setContractJobId(createdJobId || null);
      if (createdJobId) {
        const previewResp = await getDocgenPreview(createdJobId);
        setContractPreview(previewResp.data?.text || "");
      }
    } catch (e) {
      setError(e.response?.data || e.message);
    } finally {
      setGeneratingContract(false);
    }
  };

  const handleDownloadWord = async () => {
    if (!contractJobId) return;
    setError(null);
    setGeneratingContract(true);
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
      setGeneratingContract(false);
    }
  };

  const handleDownloadPdf = async () => {
    if (!contractJobId) return;
    setError(null);
    setGeneratingContract(true);
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
      setGeneratingContract(false);
    }
  };

  return (
    <Box sx={{ p: 3, display: "flex", gap: 3, flexDirection: "column" }}>
      <Typography variant="h5" fontWeight={600}>
        Interpretacion de Paquete Documental
      </Typography>
      <Paper sx={{ p: 2, display: "flex", flexDirection: "column", gap: 2 }}>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
          <Typography variant="body2" color="text.secondary" sx={{ alignSelf: "center" }}>
            Plantilla:
          </Typography>
          <Button
            variant={templateType === "DOCUMENTO_04" ? "contained" : "outlined"}
            onClick={() => setTemplateType("DOCUMENTO_04")}
            disabled={loading || generatingContract}
          >
            Persona fisica (4.0)
          </Button>
          <Button
            variant={templateType === "DOCUMENTO_04_1" ? "contained" : "outlined"}
            onClick={() => setTemplateType("DOCUMENTO_04_1")}
            disabled={loading || generatingContract}
          >
            Persona moral (4.1)
          </Button>
        </Stack>

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
                  disabled={loading || generatingContract}
                >
                  {file ? "Reemplazar" : "Adjuntar"}
                  <input
                    hidden
                    accept="application/pdf,.pdf,.docx,.txt,.jpg,.jpeg,.png,.xls,.xlsx"
                    type="file"
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

        <Stack direction="row" spacing={1}>
          <Button variant="outlined" onClick={handleInterpretPackage} disabled={loading}>
            Interpretar paquete (3 documentos)
          </Button>
        </Stack>

        {loading && <LinearProgress />}
        {error && <Alert severity="error">{String(error)}</Alert>}

        {sourceJobIds.length > 0 && (
          <Stack direction="row" spacing={2} alignItems="center">
            <Chip label={`Jobs OCR/IA: ${sourceJobIds.join(", ")}`} color="primary" />
          </Stack>
        )}
      </Paper>

      <Paper sx={{ p: 2, maxWidth: 900, mx: 'auto', width: "100%" }}>
        <Typography variant="h6" gutterBottom>
          Vista previa consolidada
        </Typography>
        <Divider sx={{ mb: 2 }} />
        <TextField
          fullWidth
          multiline
          minRows={18}
          label="Texto consolidado"
          value={combinedPreview}
          InputProps={{ readOnly: true }}
        />
      </Paper>

      <Paper sx={{ p: 2, maxWidth: 900, mx: 'auto', width: "100%" }}>
        <Typography variant="h6" gutterBottom>
          Campos sugeridos por IA
        </Typography>
        <Divider sx={{ mb: 2 }} />

        {missingRequiredFields.length > 0 && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            Faltan {missingRequiredFields.length} campos requeridos. Completa los campos en la lista para poder generar el contrato.
          </Alert>
        )}

        {editableFields.length > 0 && (
          <Stack spacing={1} sx={{ mb: 2 }}>
            {editableFields.map((field) => {
              const key = String(field.key || "").toUpperCase();
              const isCompanySelector = ["EL_CLIENTE", "REPRESENTANTE_DE"].includes(key);
              const dateGroup = getDateGroupByKey(key);

              if (isCompanySelector) {
                return (
                  <Autocomplete
                    key={field.key}
                    options={companies.map((company) => company.name).filter(Boolean)}
                    value={suggestedValues[field.key] || null}
                    freeSolo
                    onChange={(_, selectedValue) => {
                      setSuggestedValues((prev) => ({ ...prev, [field.key]: selectedValue || "" }));
                    }}
                    onInputChange={(_, inputValue, reason) => {
                      if (reason === "input") {
                        setSuggestedValues((prev) => ({ ...prev, [field.key]: inputValue || "" }));
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
                  suggestedValues[dateGroup.day],
                  suggestedValues[dateGroup.month],
                  suggestedValues[dateGroup.year]
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
                      helperText="Este selector llena DIA, MES y AÑO del grupo automaticamente."
                    />
                  );
                }

                return (
                  <TextField
                    key={field.key}
                    label={field.label || field.key}
                    value={suggestedValues?.[field.key] || ""}
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
                  value={suggestedValues?.[field.key] || ""}
                  onChange={(e) =>
                    setSuggestedValues((prev) => ({
                      ...(prev || {}),
                      [field.key]: e.target.value,
                    }))
                  }
                  required={Boolean(field.required)}
                  fullWidth
                />
              );
            })}
          </Stack>
        )}

        {fieldRows.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            Aun no hay valores sugeridos.
          </Typography>
        ) : (
          <List>
            {fieldRows.map(([key, value]) => (
              <ListItem key={key} alignItems="flex-start">
                <ListItemText
                  primary={<Typography variant="subtitle2">{key}</Typography>}
                  secondary={<Typography variant="body2" sx={{ whiteSpace: "pre-wrap" }}>{String(value)}</Typography>}
                />
              </ListItem>
            ))}
          </List>
        )}

        <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ mt: 2 }}>
          <Button
            variant="contained"
            onClick={handleGenerateContract}
            disabled={loading || generatingContract || Object.keys(suggestedValues || {}).length === 0}
          >
            Generar contrato de prestacion de servicios
          </Button>
          <Button
            startIcon={<DownloadIcon />}
            onClick={handleDownloadWord}
            disabled={!contractJobId || generatingContract}
          >
            Descargar Word
          </Button>
          <Button
            startIcon={<DownloadIcon />}
            onClick={handleDownloadPdf}
            disabled={!contractJobId || generatingContract}
          >
            Descargar PDF
          </Button>
        </Stack>

        {contractJobId && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Job contrato: {contractJobId}
          </Typography>
        )}

        <TextField
          fullWidth
          multiline
          minRows={10}
          sx={{ mt: 2 }}
          label="Vista previa del contrato generado"
          value={contractPreview}
          InputProps={{ readOnly: true }}
        />
      </Paper>
    </Box>
  );
}
