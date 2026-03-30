import React from "react";
import {
  Alert,
  Autocomplete,
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
  getCompanies,
  getDocgenPreview,
  prepareContractFromDocuments,
} from "../api/nom035";

const DEFAULT_TEMPLATE = "DOCUMENTO_04_1";

export default function ContractGenerationPage() {
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

  const [docFiles, setDocFiles] = React.useState({
    ACTA: null,
    ASAMBLEA: null,
    CONSTANCIA_SITUACION_FISCAL: null,
  });
  const [templateType, setTemplateType] = React.useState(DEFAULT_TEMPLATE);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState(null);
  const [sourceJobIds, setSourceJobIds] = React.useState([]);
  const [fields, setFields] = React.useState([]);
  const [values, setValues] = React.useState({});
  const [companies, setCompanies] = React.useState([]);
  const [contractJobId, setContractJobId] = React.useState(null);
  const [preview, setPreview] = React.useState("");
  const [combinedPreview, setCombinedPreview] = React.useState("");
  const [missingDialogOpen, setMissingDialogOpen] = React.useState(false);
  const [missingDocs, setMissingDocs] = React.useState([]);
  const vigenciaAutoFillLockRef = React.useRef({
    legacyEndDateManuallyEdited: false,
    currentEndDateManuallyEdited: false,
  });

  const requiredDocs = React.useMemo(
    () => [
      { key: "ACTA", label: "ACTA CONSTITUTIVA" },
      { key: "ASAMBLEA", label: "ASAMBLEA" },
      { key: "CONSTANCIA_SITUACION_FISCAL", label: "CONSTANCIA SITUACIÓN FISCAL" },
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
    (group, dateValue, options = {}) => {
      if (!group || !dateValue) return;
      const isManualEdit = Boolean(options.manual);
      if (isManualEdit && group.day === dateGroups.FECHA_TERMINO_VIGENCIA_LEGACY.day) {
        vigenciaAutoFillLockRef.current.legacyEndDateManuallyEdited = true;
      }
      if (isManualEdit && group.day === dateGroups.FECHA_TERMINO_VIGENCIA.day) {
        vigenciaAutoFillLockRef.current.currentEndDateManuallyEdited = true;
      }

      setValues((prev) => ({
        ...prev,
        [group.day]: String(dateValue.getDate()),
        [group.month]: MONTH_NAMES[dateValue.getMonth()],
        [group.year]: String(dateValue.getFullYear()),
      }));
    },
    [MONTH_NAMES, dateGroups]
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
      const hasAnyTargetValue = Boolean(
        prev[targetGroup.day] || prev[targetGroup.month] || prev[targetGroup.year]
      );
      if (
        vigenciaAutoFillLockRef.current.legacyEndDateManuallyEdited &&
        hasAnyTargetValue
      ) {
        return prev;
      }

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
      const hasAnyTargetValue = Boolean(
        prev[terminoGroup.day] || prev[terminoGroup.month] || prev[terminoGroup.year]
      );
      if (
        vigenciaAutoFillLockRef.current.currentEndDateManuallyEdited &&
        hasAnyTargetValue
      ) {
        return prev;
      }

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

  React.useEffect(() => {
    getCompanies()
      .then((resp) => setCompanies(resp.data || []))
      .catch(() => setCompanies([]));
  }, []);

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
    vigenciaAutoFillLockRef.current = {
      legacyEndDateManuallyEdited: false,
      currentEndDateManuallyEdited: false,
    };
    setContractJobId(null);
    setPreview("");
    setCombinedPreview("");

    try {
      const orderedFiles = [
        withTaggedFilename(docFiles.ACTA, "acta"),
        withTaggedFilename(docFiles.ASAMBLEA, "asamblea"),
        withTaggedFilename(docFiles.CONSTANCIA_SITUACION_FISCAL, "constancia_situacion_fiscal"),
      ].filter(Boolean);

      const resp = await prepareContractFromDocuments(orderedFiles, "ACTA", templateType);
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
      const resp = await generateContract(templateType, values);
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
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
              <Typography variant="body2" color="text.secondary" sx={{ alignSelf: "center" }}>
                Plantilla:
              </Typography>
              <Button
                variant={templateType === "DOCUMENTO_04" ? "contained" : "outlined"}
                onClick={() => setTemplateType("DOCUMENTO_04")}
                disabled={loading}
              >
                Persona fisica (4.0)
              </Button>
              <Button
                variant={templateType === "DOCUMENTO_04_1" ? "contained" : "outlined"}
                onClick={() => setTemplateType("DOCUMENTO_04_1")}
                disabled={loading}
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
              {templateType === "DOCUMENTO_04"
                ? "Paso 2: Ajustar campos y generar contrato 4.0 (FISICA)"
                : "Paso 2: Ajustar campos y generar contrato 4.1 (MORAL)"}
            </Typography>

            {fields.length === 0 ? (
              <Alert severity="info">Primero prepara el contrato con 3 o más documentos.</Alert>
            ) : (
              <>
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
                              applyDateToGroup(dateGroup, selectedDate, { manual: true });
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
