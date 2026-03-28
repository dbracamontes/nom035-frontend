import React from "react";
import {
  Alert,
  Box,
  Card,
  CardContent,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import { getContractMovementLog } from "../api/nom035";

function formatDate(dateValue) {
  if (!dateValue) return "-";
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

export default function ContractMovementLogPage() {
  const [rows, setRows] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");

  React.useEffect(() => {
    let isMounted = true;

    const fetchMovements = async () => {
      setLoading(true);
      setError("");
      try {
        const response = await getContractMovementLog();
        if (isMounted) {
          setRows(response.data || []);
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

  return (
    <Card>
      <CardContent>
        <Typography variant="h5" sx={{ mb: 1, fontWeight: 600 }}>
          Bitácora de Movimientos
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Historial de contratos generados con fecha del contrato y vigencia.
        </Typography>

        {loading ? (
          <Box sx={{ py: 4, display: "flex", justifyContent: "center" }}>
            <CircularProgress />
          </Box>
        ) : (
          <>
            {error ? <Alert severity="error" sx={{ mb: 2 }}>{String(error)}</Alert> : null}
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>ID</TableCell>
                    <TableCell>Plantilla</TableCell>
                    <TableCell>Fecha contrato</TableCell>
                    <TableCell>Inicio vigencia</TableCell>
                    <TableCell>Término vigencia</TableCell>
                    <TableCell>Generado</TableCell>
                    <TableCell>Estatus</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {rows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} align="center">
                        No hay movimientos registrados todavía.
                      </TableCell>
                    </TableRow>
                  ) : (
                    rows.map((row) => (
                      <TableRow key={row.jobId} hover>
                        <TableCell>{row.jobId}</TableCell>
                        <TableCell>{row.templateType || "-"}</TableCell>
                        <TableCell>{formatDate(row.contractDate)}</TableCell>
                        <TableCell>{formatDate(row.vigenciaStartDate)}</TableCell>
                        <TableCell>{formatDate(row.vigenciaEndDate)}</TableCell>
                        <TableCell>{formatDateTime(row.createdAt)}</TableCell>
                        <TableCell>{row.status || "-"}</TableCell>
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
