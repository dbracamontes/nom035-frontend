import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Box, Typography, Paper, CircularProgress, Alert, Grid, Chip, List, ListItem, ListItemText, Divider, Button } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { getMedicaLebenApplicationReport } from '../api/nom035';

export default function MedicaLebenReportPage() {
  const { t } = useTranslation();
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
        const fallbackMsg = t('medicaLeben.report.loadError', 'Error al cargar el reporte');
        const msg = err.response?.data || err.message || fallbackMsg;
        setError(typeof msg === 'string' ? msg : fallbackMsg);
      })
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
        <Button variant="outlined" onClick={() => navigate(-1)}>{t('medicaLeben.report.back', 'Volver')}</Button>
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
        ◀ {t('medicaLeben.report.back', 'Volver')}
      </Button>

      <Typography variant="h5" gutterBottom>
        {t('medicaLeben.report.title', 'Reporte individual Médica Leben')}
      </Typography>

      <Typography variant="subtitle1" gutterBottom>
        {t('medicaLeben.report.company', 'Empresa:')} <strong>{data.companyName}</strong>
      </Typography>
      <Typography variant="subtitle1" gutterBottom>
        {t('medicaLeben.report.employee', 'Empleado:')} <strong>{data.employeeName}</strong>
      </Typography>

      <Grid container spacing={2} sx={{ mt: 1, mb: 2 }}>
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="subtitle2" gutterBottom>{t('medicaLeben.report.globalScore', 'Puntaje global')}</Typography>
            <Typography variant="h4">{data.globalScore} / {data.globalMaxPossible}</Typography>
            <Typography variant="body2" color="text.secondary">
              {t('medicaLeben.report.minMaxPossible', 'Mínimo posible: {{min}} · Máximo posible: {{max}}', { min: data.globalMinPossible, max: data.globalMaxPossible })}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {t('medicaLeben.report.globalAverage', 'Promedio global: {{value}}', { value: data.globalAverage?.toFixed?.(2) ?? data.globalAverage })}
            </Typography>
            {/* NUEVO: Factor de ajuste calculado en el backend */}
            {typeof data.adjustmentFactor === 'number' && (
              <Typography variant="body2" color="text.secondary">
                {t('medicaLeben.report.adjustmentFactor', 'Factor de ajuste: {{value}}', { value: data.adjustmentFactor.toFixed(3) })}
              </Typography>
            )}
            {data.globalLevel && (
              <Chip
                label={data.globalLevel}
                color={levelColor(data.globalLevel)}
                size="small"
                sx={{ mt: 1 }}
              />
            )}
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              {t('medicaLeben.report.responses', 'Respuestas:')} {data.totalResponses}{data.totalQuestions != null && <> / {data.totalQuestions}</>}
            </Typography>
          </Paper>
        </Grid>

        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="subtitle2" gutterBottom>{t('medicaLeben.report.criticalEvents', 'Eventos críticos')}</Typography>
            <Typography variant="h4">{data.criticalEventsCount}</Typography>
            <Typography variant="body2" color="text.secondary">
              {data.hasHighRiskEvents
                ? t('medicaLeben.report.highRiskDetected', 'Se detectan eventos de alto riesgo')
                : t('medicaLeben.report.noHighRisk', 'Sin eventos de alto riesgo registrados')}
            </Typography>
          </Paper>
        </Grid>

        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="subtitle2"             gutterBottom>{t('medicaLeben.report.generalNotes', 'Notas generales')}</Typography>
                        <Typography variant="body2" color="text.secondary">
                          {t('medicaLeben.report.generalNotesText', 'Este reporte resume la información clínica y de riesgo detectada en el cuestionario Médica Leben para este empleado.')}
            </Typography>
          </Paper>
        </Grid>
      </Grid>

      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2, mb: 2 }}>
            <Typography variant="h6" gutterBottom>{t('medicaLeben.report.categories', 'Categorías')}</Typography>
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
                              {t('medicaLeben.report.categoryScore', 'Puntaje: {{score}} / {{max}} (mín {{min}} · máx {{max}})', { score: c.score, max: c.maxPossible, min: c.minPossible })}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              {t('medicaLeben.report.categoryAverage', 'Promedio: {{average}} · Respuestas: {{count}} / {{total}}', { average: c.average?.toFixed?.(2) ?? c.average, count: c.count, total: c.totalQuestionsInCategory ?? 'N/A' })}
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
              <Typography variant="body2" color="text.secondary">{t('medicaLeben.report.noCategories', 'Sin datos de categorías.')}</Typography>
            )}
          </Paper>

          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>{t('medicaLeben.report.symptoms', 'Síntomas')}</Typography>
            {data.symptomCounts && Object.keys(data.symptomCounts).length > 0 ? (
              <List dense>
                {Object.entries(data.symptomCounts).map(([symptom, count]) => (
                  <ListItem key={symptom}>
                    <ListItemText
                      primary={symptom}
                      secondary={t('medicaLeben.report.occurrences', 'Apariciones: {{count}}', { count })}
                    />
                  </ListItem>
                ))}
              </List>
            ) : (
              <Typography variant="body2" color="text.secondary">{t('medicaLeben.report.noSymptoms', 'Sin síntomas registrados.')}</Typography>
            )}
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2, mb: 2 }}>
            <Typography variant="h6" gutterBottom>{t('medicaLeben.report.criticalEventsDetected', 'Eventos críticos detectados')}</Typography>
            {Array.isArray(data.criticalEvents) && data.criticalEvents.length > 0 ? (
              <List dense>
                {data.criticalEvents.map((ev, idx) => (
                  <ListItem key={idx}>
                    <ListItemText primary={ev} />
                  </ListItem>
                ))}
              </List>
            ) : (
              <Typography variant="body2" color="text.secondary">{t('medicaLeben.report.noCriticalEvents', 'No se registran eventos críticos específicos.')}</Typography>
            )}
          </Paper>

          <Paper sx={{ p: 2, mb: 2 }}>
            <Typography variant="h6" gutterBottom>{t('medicaLeben.report.recommendations', 'Recomendaciones')}</Typography>
            {Array.isArray(data.recommendations) && data.recommendations.length > 0 ? (
              <List dense>
                {data.recommendations.map((rec, idx) => (
                  <ListItem key={idx}>
                    <ListItemText primary={rec} />
                  </ListItem>
                ))}
              </List>
            ) : (
              <Typography variant="body2" color="text.secondary">{t('medicaLeben.report.noRecommendations', 'Sin recomendaciones específicas.')}</Typography>
            )}
          </Paper>

          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>{t('medicaLeben.report.clinicalNotes', 'Notas clínicas')}</Typography>
            {Array.isArray(data.notas) && data.notas.length > 0 ? (
              <List dense>
                {data.notas.map((nota, idx) => (
                  <ListItem key={idx}>
                    <ListItemText primary={nota} />
                  </ListItem>
                ))}
              </List>
            ) : (
              <Typography variant="body2" color="text.secondary">{t('medicaLeben.report.noNotes', 'Sin notas adicionales.')}</Typography>
            )}
          </Paper>

          <Paper sx={{ p: 2, mt: 2 }}>
            <Typography variant="h6" gutterBottom>{t('medicaLeben.report.unanswered', 'Preguntas no contestadas')}</Typography>
            {Array.isArray(data.unansweredQuestions) && data.unansweredQuestions.length > 0 ? (
              <>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  {t('medicaLeben.report.unansweredTotal', 'Total: {{count}}', { count: data.unansweredQuestions.length })}
                </Typography>
                <List dense sx={{ maxHeight: 240, overflow: 'auto' }}>
                  {data.unansweredQuestions.map((q, idx) => (
                    <ListItem key={q.id ?? idx} alignItems="flex-start">
                      <ListItemText
                        primary={
                          <Typography variant="subtitle2">
                            #{q.id}: {q.text}
                          </Typography>
                        }
                      />
                    </ListItem>
                  ))}
                </List>
              </>
            ) : (
              <Typography variant="body2" color="text.secondary">
                {t('medicaLeben.report.allAnswered', 'Todas las preguntas se encuentran respondidas según el backend.')}
              </Typography>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}