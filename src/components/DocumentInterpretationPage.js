import React, { useState } from "react";
import { Box, Paper, Typography, Stack, Button, LinearProgress, Divider, Alert, List, ListItem, ListItemText, Chip, ToggleButton, ToggleButtonGroup } from "@mui/material";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import DownloadIcon from "@mui/icons-material/Download";
import {
  interpretDocument,
  getDocumentPreview,
  getDocumentJobStatus,
  downloadDocumentWord,
  downloadDocumentPdf,
} from "../api/nom035";

export default function DocumentInterpretationPage() {
  const [file, setFile] = useState(null);
  const [jobId, setJobId] = useState(null);
  const [status, setStatus] = useState(null);
  const [documentType, setDocumentType] = useState('ACTA');
  const [preview, setPreview] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const interpretingStartAtRef = React.useRef(null);
  const [phasePercent, setPhasePercent] = useState(0);
  const phaseIntervalRef = React.useRef(null);
  const prevStatusRef = React.useRef(null);

  const statusLabels = {
    UPLOADED: "Cargado",
    OCR_RUNNING: "OCR en progreso",
    OCR_COMPLETED: "OCR completado",
    INTERPRETING: "Interpretando",
    INTERPRETED: "Interpretado",
    GENERATING_WORD: "Generando Word",
    DONE: "Completado",
    FAILED: "Fallido",
  };

  const handleUpload = async () => {
    if (!file) {
      setError("Selecciona un PDF para interpretar");
      return;
    }
    setError(null);
    setLoading(true);
    setPreview([]);
    try {
      const resp = await interpretDocument(file, documentType);
      setJobId(resp.data.jobId);
      setStatus({ status: resp.data.status, documentType });
      // start polling for job status
      startPollingStatus(resp.data.jobId);
    } catch (e) {
      setError(e.response?.data || e.message);
    } finally {
      setLoading(false);
    }
  };

  // Polling logic
  const pollingRef = React.useRef(null);
  const pollingIntervalRef = React.useRef(1000);

  const startPollingStatus = (id) => {
    if (!id) return;
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }

    // Run one immediate check, then schedule interval
    const check = async () => {
      try {
        const resp = await getDocumentJobStatus(id);
        const s = resp.data;
        // Log status updates so user can see progress in browser console
        console.debug('Document job status update', s);
        setStatus((prev) => ({ ...prev, ...s }));
        // record when interpreting starts
        if (s.status === 'INTERPRETING' && !interpretingStartAtRef.current) {
          interpretingStartAtRef.current = Date.now();
        }
        if (s.status !== 'INTERPRETING' && interpretingStartAtRef.current) {
          interpretingStartAtRef.current = null;
        }
        // phase-based fallback progress (does not rely on pages)
        const baseByStatus = {
          UPLOADED: 5,
          OCR_RUNNING: 15,
          OCR_COMPLETED: 30,
          INTERPRETING: 40,
          INTERPRETED: 90,
          GENERATING_WORD: 95,
          DONE: 100,
          FAILED: 0,
        };
        const prev = prevStatusRef.current;
        if (s.status !== prev) {
          prevStatusRef.current = s.status;
          const base = baseByStatus[s.status] || 0;
          setPhasePercent(base);
          if (phaseIntervalRef.current) {
            clearInterval(phaseIntervalRef.current);
            phaseIntervalRef.current = null;
          }
          if (s.status === 'INTERPRETING') {
            phaseIntervalRef.current = setInterval(() => {
              setPhasePercent((p) => Math.min(90, p + Math.floor(Math.random() * 4) + 1));
            }, 1000);
          }
        }
        if (s.status === "INTERPRETED" || s.status === "DONE") {
          clearInterval(pollingRef.current);
          pollingRef.current = null;
          // load preview automatically using the known id
          handleLoadPreview(id);
        }
        // Increase polling frequency while OCR/interpretation is running
        if (s.status === "OCR_RUNNING" || s.status === "INTERPRETING") {
          if (pollingIntervalRef.current !== 500) {
            if (pollingRef.current) clearInterval(pollingRef.current);
            pollingIntervalRef.current = 500;
            pollingRef.current = setInterval(check, pollingIntervalRef.current);
          }
        } else {
          // restore default polling interval
          if (pollingIntervalRef.current !== 1000 && pollingRef.current) {
            clearInterval(pollingRef.current);
            pollingIntervalRef.current = 1000;
            pollingRef.current = setInterval(check, pollingIntervalRef.current);
          }
        }
        if (s.status === "FAILED") {
          clearInterval(pollingRef.current);
          pollingRef.current = null;
        }
      } catch (e) {
        console.error('Polling status failed', e);
      }
    };

    check();
    pollingRef.current = setInterval(check, pollingIntervalRef.current);
    
  };

  React.useEffect(() => {
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, []);

  const handleLoadPreview = async (idParam) => {
    const idToUse = idParam || jobId;
    if (!idToUse) return;
    setLoading(true);
    setError(null);
    try {
      const resp = await getDocumentPreview(idToUse);
      setPreview(resp.data || []);
      // Si hay vista previa, asumimos que el documento está listo para descarga.
      setStatus((prev) => ({ ...prev, outputReady: true, status: prev?.status || "DONE" }));
    } catch (e) {
      setError(e.response?.data || e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!jobId) return;
    setLoading(true);
    setError(null);
    try {
      const resp = await downloadDocumentWord(jobId);
      const blob = new Blob([resp.data], {
        type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `interpreted-${jobId}.docx`;
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
      const resp = await downloadDocumentPdf(jobId);
      if (resp.status === 200) {
        const blob = new Blob([resp.data], { type: 'application/pdf' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `interpreted-${jobId}.pdf`;
        link.click();
        window.URL.revokeObjectURL(url);
      } else {
        // server returned non-OK with blob body (error page). Try to read text and show.
        try {
          const text = await resp.data.text();
          setError(text);
        } catch (e) {
          setError('Error al descargar PDF (status ' + resp.status + ')');
        }
      }
    } catch (e) {
      // If responseType was blob and server returned HTML error, extract text
      if (e.response && e.response.data && e.response.data instanceof Blob) {
        try {
          const txt = await e.response.data.text();
          setError(txt);
        } catch (_) {
          setError('Error al descargar PDF: ' + e.message);
        }
      } else {
        setError(e.response?.data || e.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const statusText = status?.status ? statusLabels[status.status] || status.status : "-";
  const isDownloadReady = Boolean(status?.outputReady || preview.length > 0);
  // Compute a single display percent to show always (real if available, otherwise phase fallback)
  const displayPercent = React.useMemo(() => {
    if (status && typeof status.processedPages === 'number' && typeof status.totalPages === 'number' && status.totalPages > 0) {
      return Math.round((status.processedPages / Math.max(1, status.totalPages)) * 100);
    }
    return phasePercent || 0;
  }, [status, phasePercent]);

  return (
    <Box sx={{ p: 3, display: "flex", gap: 3, flexDirection: "column" }}>
      <Typography variant="h5" fontWeight={600}>
        Interpretación de Documento
      </Typography>
      <Paper sx={{ p: 2, display: "flex", flexDirection: "column", gap: 2 }}>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems="center">
          <ToggleButtonGroup
            value={documentType}
            exclusive
            onChange={(e, val) => val && setDocumentType(val)}
            aria-label="Tipo de documento"
            size="small"
          >
            <ToggleButton value="ACTA">Acta Constitutiva</ToggleButton>
            <ToggleButton value="ASAMBLEA">Asamblea</ToggleButton>
            <ToggleButton value="CONSTANCIA_SITUACION_FISCAL">Constancia Situación Fiscal</ToggleButton>
          </ToggleButtonGroup>
          <Button
            variant="contained"
            component="label"
            startIcon={<CloudUploadIcon />}
            disabled={loading}
          >
            Seleccionar PDF
            <input
              hidden
              accept="application/pdf"
              type="file"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
          </Button>
          <Typography variant="body2" color="text.secondary">
            {file ? file.name : "Ningún archivo seleccionado"}
          </Typography>
          <Button
            variant="outlined"
            onClick={handleUpload}
            disabled={loading || !file}
          >
            Interpretar
          </Button>
        </Stack>
        {loading && <LinearProgress />}
        {error && <Alert severity="error">{String(error)}</Alert>}
        {status && (
          <Stack direction="row" spacing={2} alignItems="center">
            <Chip label={`Trabajo ${jobId || "-"}`} />
            <Chip label={`Estado: ${statusText}`} color="primary" />
            <Chip label={`Tipo: ${status?.documentType === 'ASAMBLEA' ? 'Asamblea' : 'Acta'}`} />
            {/** Show pages if available; always show a progress percent chip (real or fallback) */}
            {status?.processedPages != null && status?.totalPages != null && status.processedPages > 0 ? (
              <Chip label={`Páginas: ${status.processedPages}/${status.totalPages}`} />
            ) : (
              <Chip label={`Páginas: -/${status?.totalPages || '-'}`} />
            )}
            {status?.status ? (
              <Chip label={`Progreso: ${displayPercent}%`} />
            ) : null}
            {status.failureReason && <Chip label={`Error: ${status.failureReason}`} color="error" />}
          </Stack>
        )}
        <Stack direction="row" spacing={1}>
          <Button
            startIcon={<DownloadIcon />}
            onClick={handleDownload}
            disabled={!jobId || loading || !isDownloadReady}
          >
            Descargar Word
          </Button>
          <Button
            startIcon={<DownloadIcon />}
            onClick={handleDownloadPdf}
            disabled={!jobId || loading || !isDownloadReady}
          >
            Descargar PDF
          </Button>
        </Stack>
        {/* Always show a progress percent and determinate bar (real or fallback) */}
        {status?.status ? (
          <Box sx={{ mt: 1 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
              Progreso de interpretación: {displayPercent}%
            </Typography>
            <LinearProgress variant="determinate" value={displayPercent} />
          </Box>
        ) : null}
      </Paper>

      <Paper sx={{ p: 2, maxWidth: 900, mx: 'auto' }}>
        <Typography variant="h6" gutterBottom>
          Vista previa
        </Typography>
        <Divider sx={{ mb: 2 }} />
        {/* Preview loads automatically; no helper message needed */}
        <List>
          {preview.map((chunk) => (
            <ListItem key={chunk.chunkIndex} alignItems="flex-start">
              <ListItemText
                disableTypography
                primary={
                  <Typography variant="subtitle1" component="div">
                    {`Sección ${chunk.chunkIndex + 1} (pág. ${chunk.pageStart}-${chunk.pageEnd})`}
                  </Typography>
                }
                secondary={
                  <div>
                    <Typography variant="subtitle2" color="text.secondary" component="div">
                      Texto interpretado
                    </Typography>
                    <Typography variant="body2" sx={{ whiteSpace: "pre-wrap" }} component="div">
                      {chunk.interpretedText || chunk.rawText}
                    </Typography>
                  </div>
                }
              />
            </ListItem>
          ))}
        </List>
      </Paper>
    </Box>
  );
}
