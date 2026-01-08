import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Box, Typography, Paper, CircularProgress, Alert, Grid, Chip, List, ListItem, ListItemText, Divider, Button } from '@mui/material';
import { getMedicaLebenApplicationReport } from '../api/nom035';

export default function MedicaLebenReportPage() {
  const { applicationId } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!applicationId) return;
    setLoading(true);
    setError(null);
    getMedicaLebenApplicationReport(applicationId)
      .then(res => setData(res.data))
      .catch(err => {
        console.error('Error loading MedicaLeben report', err);
        const msg = err.response?.data || err.message || 'Error al cargar el reporte';
        setError(typeof msg === 'string' ? msg : 'Error al cargar el reporte');
      })
      .finally(() => setLoading(false));
  }, [applicationId]);

  if (loading) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
        <Button variant="outlined" onClick={() => navigate(-1)}>Volver</Button>
      </Box>
    );
  }

  if (!data) {
    return null;
  }

  const levelColor = (level) => {
    if (!level) return 'default';
    const l = level.toLowerCase();
    if (l.includes('alto') || l.includes('crítico')) return 'error';
    if (l.includes('medio')) return 'warning';
    return 'success';
  };

  return (
    <Box sx={{ p: 3 }}>
      <Button variant="text" onClick={() => navigate(-1)} sx={{ mb: 2 }}>
        ◀ Volver
      </Button>

      <Typography variant="h5" gutterBottom>
        Reporte individual Médica Leben
      </Typography>

      <Typography variant="subtitle1" gutterBottom>
        Empresa: <strong>{data.companyName}</strong>
      </Typography>
      <Typography variant="subtitle1" gutterBottom>
        Empleado: <strong>{data.employeeName}</strong>
      </Typography>

      <Grid container spacing={2} sx={{ mt: 1, mb: 2 }}>
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="subtitle2" gutterBottom>Puntaje global</Typography>
            <Typography variant="h4">{data.globalScore} / {data.globalMaxPossible}</Typography>
            <Typography variant="body2" color="text.secondary">
              Mínimo posible: {data.globalMinPossible} · Máximo posible: {data.globalMaxPossible}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Promedio global: {data.globalAverage?.toFixed?.(2) ?? data.globalAverage}
            </Typography>
            {data.globalLevel && (
              <Chip
                label={data.globalLevel}
                color={levelColor(data.globalLevel)}
                size="small"
                sx={{ mt: 1 }}
              />
            )}
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Respuestas: {data.totalResponses}{data.totalQuestions != null && <> / {data.totalQuestions}</>}
            </Typography>
          </Paper>
        </Grid>

        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="subtitle2" gutterBottom>Eventos críticos</Typography>
            <Typography variant="h4">{data.criticalEventsCount}</Typography>
            <Typography variant="body2" color="text.secondary">
              {data.hasHighRiskEvents
                ? 'Se detectan eventos de alto riesgo'
                : 'Sin eventos de alto riesgo registrados'}
            </Typography>
          </Paper>
        </Grid>

        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="subtitle2" gutterBottom>Notas generales</Typography>
            <Typography variant="body2" color="text.secondary">
              Este reporte resume la información clínica y de riesgo detectada en el
              cuestionario Médica Leben para este empleado.
            </Typography>
          </Paper>
        </Grid>
      </Grid>

      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2, mb: 2 }}>
            <Typography variant="h6" gutterBottom>Categorías</Typography>
            {Array.isArray(data.categories) && data.categories.length > 0 ? (
              <List dense>
                {data.categories.map((c, idx) => (
                  <React.Fragment key={idx}>
                    <ListItem alignItems="flex-start">
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <Typography variant="subtitle1">{c.name}</Typography>
                            {c.level && (
                              <Chip
                                label={c.level}
                                size="small"
                                color={levelColor(c.level)}
                              />
                            )}
                          </Box>
                        }
                        secondary={
                          <>
                            <Typography variant="body2" color="text.secondary">
                              Puntaje: {c.score} / {c.maxPossible} (mín {c.minPossible} · máx {c.maxPossible})
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              Promedio: {c.average?.toFixed?.(2) ?? c.average} · Respuestas: {c.count} / {c.totalQuestionsInCategory ?? 'N/A'}
                            </Typography>
                          </>
                        }
                      />
                    </ListItem>
                    {idx < data.categories.length - 1 && <Divider component="li" />}
                  </React.Fragment>
                ))}
              </List>
            ) : (
              <Typography variant="body2" color="text.secondary">Sin datos de categorías.</Typography>
            )}
          </Paper>

          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>Síntomas</Typography>
            {data.symptomCounts && Object.keys(data.symptomCounts).length > 0 ? (
              <List dense>
                {Object.entries(data.symptomCounts).map(([symptom, count]) => (
                  <ListItem key={symptom}>
                    <ListItemText
                      primary={symptom}
                      secondary={`Apariciones: ${count}`}
                    />
                  </ListItem>
                ))}
              </List>
            ) : (
              <Typography variant="body2" color="text.secondary">Sin síntomas registrados.</Typography>
            )}
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2, mb: 2 }}>
            <Typography variant="h6" gutterBottom>Eventos críticos detectados</Typography>
            {Array.isArray(data.criticalEvents) && data.criticalEvents.length > 0 ? (
              <List dense>
                {data.criticalEvents.map((ev, idx) => (
                  <ListItem key={idx}>
                    <ListItemText primary={ev} />
                  </ListItem>
                ))}
              </List>
            ) : (
              <Typography variant="body2" color="text.secondary">No se registran eventos críticos específicos.</Typography>
            )}
          </Paper>

          <Paper sx={{ p: 2, mb: 2 }}>
            <Typography variant="h6" gutterBottom>Recomendaciones</Typography>
            {Array.isArray(data.recommendations) && data.recommendations.length > 0 ? (
              <List dense>
                {data.recommendations.map((rec, idx) => (
                  <ListItem key={idx}>
                    <ListItemText primary={rec} />
                  </ListItem>
                ))}
              </List>
            ) : (
              <Typography variant="body2" color="text.secondary">Sin recomendaciones específicas.</Typography>
            )}
          </Paper>

          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>Notas clínicas</Typography>
            {Array.isArray(data.notas) && data.notas.length > 0 ? (
              <List dense>
                {data.notas.map((nota, idx) => (
                  <ListItem key={idx}>
                    <ListItemText primary={nota} />
                  </ListItem>
                ))}
              </List>
            ) : (
              <Typography variant="body2" color="text.secondary">Sin notas adicionales.</Typography>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}