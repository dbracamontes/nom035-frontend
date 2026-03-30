import React from "react";
import {
  Alert,
  Box,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import { getContractMovementLog, getDocgenTemplates } from "../api/nom035";

const STATUS_LABELS = {
  UPLOADED: "Cargado",
  OCR_RUNNING: "OCR en proceso",
  OCR_COMPLETED: "OCR completado",
  INTERPRETING: "Interpretando",
  INTERPRETED: "Interpretado",
  GENERATING_WORD: "Generando documento",
  DONE: "Completado",
  FAILED: "Fallido",
};

function formatDate(dateValue) {
  if (!dateValue) return "-";
  if (typeof dateValue === "string") {
    const isoDateMatch = dateValue.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (isoDateMatch) {
      const [, y, m, d] = isoDateMatch;
      const localDate = new Date(Number(y), Number(m) - 1, Number(d));
      return new Intl.DateTimeFormat("es-MX", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(localDate);
    }
  }
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("es-MX", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function formatDateTime(dateTimeValue) {
  if (!dateTimeValue) return "-";
  const date = new Date(dateTimeValue);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("es-MX", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function getStatusChipColor(status) {
  if (status === "DONE") return "success";
  if (status === "FAILED") return "error";
  if (status === "GENERATING_WORD") return "warning";
  if (status === "OCR_RUNNING" || status === "INTERPRETING") return "info";
  return "default";
}

export default function ContractMovementLogPage() {
  const [rows, setRows] = React.useState([]);
  const [templateNameByType, setTemplateNameByType] = React.useState({});
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");
  const [columnFilters, setColumnFilters] = React.useState({
    createdByUser: "",
    clientName: "",
    templateType: "",
    contractDate: "",
    vigenciaStartDate: "",
    vigenciaEndDate: "",
    createdAt: "",
    status: "",
  });

  React.useEffect(() => {
    let isMounted = true;

    const fetchMovements = async () => {
      setLoading(true);
      setError("");
      try {
        const [movementsResponse, templatesResponse] = await Promise.all([
          getContractMovementLog(),
          getDocgenTemplates(),
        ]);

        const templates = templatesResponse?.data || [];
        const map = {};
        templates.forEach((template) => {
          if (template?.type && template?.name) {
            map[template.type] = template.name;
          }
        });

        if (isMounted) {
          setRows(movementsResponse?.data || []);
          setTemplateNameByType(map);
        }
      } catch (err) {
        if (isMounted) {
          setError(err?.response?.data || err?.message || "No se pudo cargar la bitácora.");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchMovements();

    return () => {
      isMounted = false;
    };
  }, []);

  const statusToSpanish = React.useCallback((status) => {
    if (!status) return "-";
    return STATUS_LABELS[status] || status;
  }, []);

  const getTemplateDisplayName = React.useCallback(
    (templateType) => {
      if (!templateType) return "-";
      return templateNameByType[templateType] || templateType;
    },
    [templateNameByType]
  );

  const templateOptions = React.useMemo(() => {
    const names = new Set();
    rows.forEach((row) => {
      const display = getTemplateDisplayName(row?.templateType);
      if (display && display !== "-") {
        names.add(display);
      }
    });
    return Array.from(names).sort((a, b) => a.localeCompare(b, "es"));
  }, [rows, getTemplateDisplayName]);

  const statusOptions = React.useMemo(() => {
    const names = new Set();
    rows.forEach((row) => {
      const display = statusToSpanish(row?.status);
      if (display && display !== "-") {
        names.add(display);
      }
    });
    return Array.from(names).sort((a, b) => a.localeCompare(b, "es"));
  }, [rows, statusToSpanish]);

  const onFilterChange = React.useCallback((key, value) => {
    setColumnFilters((prev) => ({ ...prev, [key]: value }));
  }, []);

  const normalize = React.useCallback((value) => String(value || "").toLowerCase(), []);

  const filteredRows = React.useMemo(() => {
    return rows.filter((row) => {
      const creatorText = normalize(row?.createdByUser || "-");
      const clientText = normalize(row?.clientName || "-");
      const typeText = normalize(getTemplateDisplayName(row?.templateType));
      const contractText = normalize(formatDate(row?.contractDate));
      const startText = normalize(formatDate(row?.vigenciaStartDate));
      const endText = normalize(formatDate(row?.vigenciaEndDate));
      const createdText = normalize(formatDateTime(row?.createdAt));
      const statusText = normalize(statusToSpanish(row?.status));

      return (
        creatorText.includes(normalize(columnFilters.createdByUser)) &&
        clientText.includes(normalize(columnFilters.clientName)) &&
        typeText.includes(normalize(columnFilters.templateType)) &&
        contractText.includes(normalize(columnFilters.contractDate)) &&
        startText.includes(normalize(columnFilters.vigenciaStartDate)) &&
        endText.includes(normalize(columnFilters.vigenciaEndDate)) &&
        createdText.includes(normalize(columnFilters.createdAt)) &&
        statusText.includes(normalize(columnFilters.status))
      );
    });
  }, [columnFilters, rows, getTemplateDisplayName, normalize, statusToSpanish]);

  return (
    <Card
      sx={{
        borderRadius: 3,
        border: "1px solid",
        borderColor: "divider",
        boxShadow: "0 14px 30px rgba(0, 0, 0, 0.08)",
        overflow: "hidden",
      }}
    >
      <CardContent sx={{ p: { xs: 2, md: 3 } }}>
        <Typography variant="h5" sx={{ mb: 1, fontWeight: 700, letterSpacing: 0.3 }}>
          Bitácora de Movimientos
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Historial de contratos generados con fecha del contrato y vigencia.
        </Typography>

        <Box
          sx={{
            mb: 2,
            px: 1.5,
            py: 1,
            borderRadius: 2,
            background: "linear-gradient(90deg, rgba(10,91,144,0.10) 0%, rgba(24,142,88,0.08) 100%)",
            border: "1px solid rgba(10,91,144,0.14)",
          }}
        >
          <Typography variant="body2" sx={{ fontWeight: 600, color: "text.primary" }}>
            Registros: {filteredRows.length} de {rows.length}
          </Typography>
        </Box>

        {loading ? (
          <Box sx={{ py: 4, display: "flex", justifyContent: "center" }}>
            <CircularProgress />
          </Box>
        ) : (
          <>
            {error ? <Alert severity="error" sx={{ mb: 2 }}>{String(error)}</Alert> : null}
            <TableContainer
              sx={{
                border: "1px solid",
                borderColor: "divider",
                borderRadius: 2,
                maxHeight: "70vh",
              }}
            >
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700, backgroundColor: "#895dda", color: "#fff" }}>Creador</TableCell>
                    <TableCell sx={{ fontWeight: 700, backgroundColor: "#895dda", color: "#fff" }}>Cliente</TableCell>
                    <TableCell sx={{ fontWeight: 700, backgroundColor: "#895dda", color: "#fff" }}>Tipo</TableCell>
                    <TableCell sx={{ fontWeight: 700, backgroundColor: "#895dda", color: "#fff" }}>Fecha contrato</TableCell>
                    <TableCell sx={{ fontWeight: 700, backgroundColor: "#895dda", color: "#fff" }}>Inicio vigencia</TableCell>
                    <TableCell sx={{ fontWeight: 700, backgroundColor: "#895dda", color: "#fff" }}>Término vigencia</TableCell>
                    <TableCell sx={{ fontWeight: 700, backgroundColor: "#895dda", color: "#fff" }}>Generado</TableCell>
                    <TableCell sx={{ fontWeight: 700, backgroundColor: "#895dda", color: "#fff" }}>Estatus</TableCell>
                  </TableRow>
                  <TableRow sx={{ backgroundColor: "#F5F9FC" }}>
                    <TableCell>
                      <TextField
                        size="small"
                        placeholder="Filtrar"
                        value={columnFilters.createdByUser}
                        onChange={(event) => onFilterChange("createdByUser", event.target.value)}
                        fullWidth
                        sx={{ backgroundColor: "#fff", borderRadius: 1 }}
                      />
                    </TableCell>
                    <TableCell>
                      <TextField
                        size="small"
                        placeholder="Filtrar"
                        value={columnFilters.clientName}
                        onChange={(event) => onFilterChange("clientName", event.target.value)}
                        fullWidth
                        sx={{ backgroundColor: "#fff", borderRadius: 1 }}
                      />
                    </TableCell>
                    <TableCell>
                      <TextField
                        select
                        size="small"
                        value={columnFilters.templateType}
                        onChange={(event) => onFilterChange("templateType", event.target.value)}
                        fullWidth
                        sx={{ backgroundColor: "#fff", borderRadius: 1 }}
                      >
                        <MenuItem value="">Todos</MenuItem>
                        {templateOptions.map((templateName) => (
                          <MenuItem key={templateName} value={templateName}>
                            {templateName}
                          </MenuItem>
                        ))}
                      </TextField>
                    </TableCell>
                    <TableCell>
                      <TextField
                        size="small"
                        placeholder="dd/mm/aaaa"
                        value={columnFilters.contractDate}
                        onChange={(event) => onFilterChange("contractDate", event.target.value)}
                        fullWidth
                        sx={{ backgroundColor: "#fff", borderRadius: 1 }}
                      />
                    </TableCell>
                    <TableCell>
                      <TextField
                        size="small"
                        placeholder="dd/mm/aaaa"
                        value={columnFilters.vigenciaStartDate}
                        onChange={(event) => onFilterChange("vigenciaStartDate", event.target.value)}
                        fullWidth
                        sx={{ backgroundColor: "#fff", borderRadius: 1 }}
                      />
                    </TableCell>
                    <TableCell>
                      <TextField
                        size="small"
                        placeholder="dd/mm/aaaa"
                        value={columnFilters.vigenciaEndDate}
                        onChange={(event) => onFilterChange("vigenciaEndDate", event.target.value)}
                        fullWidth
                        sx={{ backgroundColor: "#fff", borderRadius: 1 }}
                      />
                    </TableCell>
                    <TableCell>
                      <TextField
                        size="small"
                        placeholder="dd/mm/aaaa hh:mm"
                        value={columnFilters.createdAt}
                        onChange={(event) => onFilterChange("createdAt", event.target.value)}
                        fullWidth
                        sx={{ backgroundColor: "#fff", borderRadius: 1 }}
                      />
                    </TableCell>
                    <TableCell>
                      <TextField
                        select
                        size="small"
                        value={columnFilters.status}
                        onChange={(event) => onFilterChange("status", event.target.value)}
                        fullWidth
                        sx={{ backgroundColor: "#fff", borderRadius: 1 }}
                      >
                        <MenuItem value="">Todos</MenuItem>
                        {statusOptions.map((statusName) => (
                          <MenuItem key={statusName} value={statusName}>
                            {statusName}
                          </MenuItem>
                        ))}
                      </TextField>
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredRows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} align="center">
                        No hay movimientos registrados todavía.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredRows.map((row) => (
                      <TableRow
                        key={row.jobId}
                        hover
                        sx={{
                          "&:nth-of-type(odd)": {
                            backgroundColor: "#FCFDFE",
                          },
                          "&:hover": {
                            backgroundColor: "#EAF3F9",
                          },
                        }}
                      >
                        <TableCell>{row.createdByUser || "-"}</TableCell>
                        <TableCell>{row.clientName || "-"}</TableCell>
                        <TableCell>{getTemplateDisplayName(row.templateType)}</TableCell>
                        <TableCell>{formatDate(row.contractDate)}</TableCell>
                        <TableCell>{formatDate(row.vigenciaStartDate)}</TableCell>
                        <TableCell>{formatDate(row.vigenciaEndDate)}</TableCell>
                        <TableCell>{formatDateTime(row.createdAt)}</TableCell>
                        <TableCell>
                          <Chip
                            size="small"
                            label={statusToSpanish(row.status)}
                            color={getStatusChipColor(row.status)}
                            variant="outlined"
                          />
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </>
        )}
      </CardContent>
    </Card>
  );
}
