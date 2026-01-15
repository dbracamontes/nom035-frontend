import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Paper,
  Grid,
  Divider,
  CircularProgress,
  Chip
} from '@mui/material';
import { getSurveyResponses, getSurveyApplications, getEmployeeById, getSurveyWithQuestions } from '../api/nom035';

export default function EmployeeSurveyResponseReport({ open, onClose, applicationId }) {
  const [loading, setLoading] = useState(true);
  const [reportData, setReportData] = useState(null);

  useEffect(() => {
    if (!open || !applicationId) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        // Obtener la aplicación de encuesta
        const appsRes = await getSurveyApplications();
        const application = appsRes.data.find(app => app.id === applicationId);
        
        if (!application) {
          console.error('Application not found');
          setLoading(false);
          return;
        }

        // Obtener respuestas
        const responsesRes = await getSurveyResponses();
        const responses = responsesRes.data.filter(r => r.surveyApplicationId === applicationId);

        // Obtener empleado
        const employeeRes = await getEmployeeById(application.employeeId);
        const employee = employeeRes.data;

        // Obtener preguntas de la encuesta
        const surveyRes = await getSurveyWithQuestions(application.surveyId);
        console.log('Survey API response:', surveyRes.data);
        
        // La respuesta puede ser directamente un array o tener una propiedad questions
        const questions = Array.isArray(surveyRes.data) ? surveyRes.data : (surveyRes.data.questions || []);

        console.log('Survey questions:', questions.length);
        console.log('Survey responses:', responses.length);

        // Procesar respuestas por categoría
        const processedData = processResponses(responses, questions, employee, application);
        console.log('Processed data:', processedData);
        setReportData(processedData);
      } catch (error) {
        console.error('Error fetching report data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [open, applicationId]);

  const processResponses = (responses, questions, employee, application) => {
    const data = {
      employee,
      application,
      allQuestions: [],
      totalQuestions: questions.length,
      totalResponses: responses.length
    };

    // Crear un mapa de opciones por questionId para búsqueda rápida
    const optionsMap = new Map();
    questions.forEach(question => {
      if (question.options && question.options.length > 0) {
        const optionsById = new Map();
        question.options.forEach(opt => {
          optionsById.set(opt.id, opt.text);
        });
        optionsMap.set(question.id, optionsById);
      }
    });

    // Crear un mapa de respuestas por questionId para búsqueda rápida
    const responseMap = new Map();
    responses.forEach(response => {
      let answerText = '';
      
      // Intentar parsear si la respuesta parece ser JSON
      let parsedAnswer = null;
      if (response.textAnswer && typeof response.textAnswer === 'string' && response.textAnswer.startsWith('{')) {
        try {
          parsedAnswer = JSON.parse(response.textAnswer);
        } catch (e) {
          // Si falla el parseo, usar el texto tal cual
        }
      }
      
      // Si parseamos un objeto tipo matrix
      if (parsedAnswer && parsedAnswer.kind === 'matrix' && parsedAnswer.rows) {
        answerText = Object.entries(parsedAnswer.rows)
          .map(([row, value]) => `  • ${row}: ${value}`)
          .join('\n');
      }
      // Si parseamos un objeto tipo multi_select
      else if (parsedAnswer && parsedAnswer.kind === 'multi_select' && parsedAnswer.optionLabels) {
        if (parsedAnswer.optionLabels.length === 1) {
          answerText = parsedAnswer.optionLabels[0];
        } else {
          answerText = parsedAnswer.optionLabels
            .map(label => `  • ${label}`)
            .join('\n');
        }
        // Agregar texto adicional si existe
        if (parsedAnswer.otherText && parsedAnswer.otherText !== null && parsedAnswer.otherText !== '') {
          answerText += `\n  • Otro: ${parsedAnswer.otherText}`;
        }
      }
      // Si hay optionAnswerId, buscar el texto de la opción
      else if (response.optionAnswerId) {
        const questionOptions = optionsMap.get(response.questionId);
        if (questionOptions) {
          answerText = questionOptions.get(response.optionAnswerId) || response.optionAnswerId;
        } else {
          answerText = response.optionAnswerId;
        }
      }
      // Si hay textAnswer directo
      else if (response.textAnswer) {
        answerText = response.textAnswer;
      }
      // Si hay freeText
      else if (response.freeText) {
        answerText = response.freeText;
      }
      // Si es respuesta múltiple (JSON)
      else if (response.multipleAnswers) {
        try {
          const multiAnswers = typeof response.multipleAnswers === 'string' 
            ? JSON.parse(response.multipleAnswers) 
            : response.multipleAnswers;
          
          if (Array.isArray(multiAnswers)) {
            const questionOptions = optionsMap.get(response.questionId);
            answerText = multiAnswers.map(id => {
              if (questionOptions) {
                return questionOptions.get(id) || id;
              }
              return id;
            }).join(', ');
          } else if (typeof multiAnswers === 'object') {
            // Verificar si es una respuesta de tipo matrix
            if (multiAnswers.kind === 'matrix' && multiAnswers.rows) {
              answerText = Object.entries(multiAnswers.rows)
                .map(([row, value]) => `  • ${row}: ${value}`)
                .join('\n');
            } else {
              answerText = Object.entries(multiAnswers)
                .map(([key, value]) => `${key}: ${value}`)
                .join(', ');
            }
          }
        } catch (e) {
          answerText = response.multipleAnswers;
        }
      }

      responseMap.set(response.questionId, answerText);
    });

    // Procesar TODAS las preguntas, tengan o no respuesta
    questions.forEach(question => {
      const sortOrder = question.sortOrder;
      const answer = responseMap.get(question.id) || ''; // Vacío si no hay respuesta

      data.allQuestions.push({
        sortOrder,
        question: question.text,
        answer
      });
    });

    // Ordenar por sortOrder para mostrar del 1 al 183
    data.allQuestions.sort((a, b) => a.sortOrder - b.sortOrder);

    return data;
  };

  const renderSection = (title, data, bgColor) => {
    if (!data || data.length === 0) return null;

    return (
      <Paper elevation={2} sx={{ p: 3, mb: 3, borderLeft: `5px solid ${bgColor}` }}>
        <Typography variant="h6" gutterBottom sx={{ mb: 2, color: bgColor, fontWeight: 600 }}>
          {title}
        </Typography>
        <Divider sx={{ mb: 2, borderColor: bgColor, opacity: 0.3 }} />
        <Grid container spacing={2}>
          {data.map((item, idx) => (
            <Grid item xs={12} key={idx}>
              <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                <Typography variant="body2" sx={{ 
                  minWidth: 35, 
                  fontWeight: 600, 
                  color: bgColor,
                  fontSize: '0.85rem'
                }}>
                  {item.sortOrder}.
                </Typography>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500, mb: 0.5 }}>
                    {item.question}
                  </Typography>
                  <Typography variant="body1" sx={{ 
                    ml: 2, 
                    color: item.answer ? 'text.primary' : 'text.disabled',
                    fontStyle: item.answer ? 'normal' : 'italic'
                  }}>
                    {typeof item.answer === 'string' && item.answer.startsWith('{') ? 
                      'Respuesta múltiple (ver detalle en JSON)' : 
                      item.answer || '(Sin respuesta)'}
                  </Typography>
                </Box>
              </Box>
            </Grid>
          ))}
        </Grid>
      </Paper>
    );
  };

  if (!open) return null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle>
        <Box>
          <Typography variant="h5" component="div">
            Reporte Individual de Respuestas
          </Typography>
          {reportData && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Encuesta completada • {reportData.totalResponses} respuestas de {reportData.totalQuestions} preguntas
            </Typography>
          )}
        </Box>
      </DialogTitle>

      <DialogContent dividers sx={{ maxHeight: '70vh', overflowY: 'auto' }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 8 }}>
            <CircularProgress sx={{ color: '#667eea' }} />
          </Box>
        ) : reportData ? (
          <Box>
            {/* Información del Empleado */}
            <Paper elevation={3} sx={{ p: 3, mb: 3, background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white' }}>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                Información del Empleado
              </Typography>
              <Grid container spacing={2} sx={{ mt: 1 }}>
                <Grid item xs={12} md={6}>
                  <Typography variant="body2" sx={{ opacity: 0.9 }}>Nombre:</Typography>
                  <Typography variant="h6">{reportData.employee.name}</Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="body2" sx={{ opacity: 0.9 }}>Email:</Typography>
                  <Typography variant="body1">{reportData.employee.email}</Typography>
                </Grid>
                <Grid item xs={12} md={4}>
                  <Typography variant="body2" sx={{ opacity: 0.9 }}>Puesto:</Typography>
                  <Typography variant="body1">{reportData.employee.position || 'N/A'}</Typography>
                </Grid>
                <Grid item xs={12} md={4}>
                  <Typography variant="body2" sx={{ opacity: 0.9 }}>Departamento:</Typography>
                  <Typography variant="body1">{reportData.employee.department || 'N/A'}</Typography>
                </Grid>
                <Grid item xs={12} md={4}>
                  <Typography variant="body2" sx={{ opacity: 0.9 }}>Estado:</Typography>
                  <Chip 
                    label="Completada" 
                    color="success"
                    size="small"
                    sx={{ mt: 0.5, backgroundColor: 'white', color: '#4caf50' }}
                  />
                </Grid>
                {reportData.application.completedAt && (
                  <Grid item xs={12}>
                    <Typography variant="body2" sx={{ opacity: 0.9 }}>
                      Fecha de completado: {new Date(reportData.application.completedAt).toLocaleString('es-MX')}
                    </Typography>
                  </Grid>
                )}
                {reportData.application.score !== null && (
                  <Grid item xs={12} md={6}>
                    <Typography variant="body2" sx={{ opacity: 0.9 }}>Puntuación:</Typography>
                    <Typography variant="h6">{reportData.application.score}</Typography>
                  </Grid>
                )}
                {reportData.application.riskLevel && (
                  <Grid item xs={12} md={6}>
                    <Typography variant="body2" sx={{ opacity: 0.9 }}>Nivel de Riesgo:</Typography>
                    <Typography variant="h6">{reportData.application.riskLevel}</Typography>
                  </Grid>
                )}
              </Grid>
            </Paper>

            {/* Todas las preguntas del 1 al 183 */}
            <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
              <Typography variant="h6" gutterBottom sx={{ mb: 3, color: '#667eea', fontWeight: 600 }}>
                Respuestas de la Encuesta
              </Typography>
              <Divider sx={{ mb: 3, borderColor: '#667eea', opacity: 0.3 }} />
              {reportData.allQuestions && reportData.allQuestions.length > 0 ? (
                <Grid container spacing={2}>
                  {reportData.allQuestions.map((item, idx) => (
                    <Grid item xs={12} key={idx}>
                      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, pb: 2, borderBottom: '1px solid #f0f0f0' }}>
                        <Typography variant="body2" sx={{ 
                          minWidth: 35, 
                          fontWeight: 600, 
                          color: '#667eea',
                          fontSize: '0.9rem'
                        }}>
                          {item.sortOrder}.
                        </Typography>
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500, mb: 0.5 }}>
                            {item.question}
                          </Typography>
                          <Typography variant="body1" sx={{ 
                            ml: 2, 
                            color: item.answer ? 'text.primary' : 'text.disabled',
                            fontStyle: item.answer ? 'normal' : 'italic',
                            whiteSpace: 'pre-wrap'
                          }}>
                            {item.answer || '(Sin respuesta)'}
                          </Typography>
                        </Box>
                      </Box>
                    </Grid>
                  ))}
                </Grid>
              ) : (
                <Typography color="text.secondary">No se encontraron preguntas en la encuesta</Typography>
              )}
            </Paper>

            <Box sx={{ mt: 3, p: 2, backgroundColor: '#f8f9ff', borderRadius: 1, border: '1px solid #e0e7ff' }}>
              <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
                Reporte completo: {reportData.totalQuestions} preguntas • {reportData.totalResponses} respuestas registradas
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                Las preguntas sin respuesta aparecen como "(Sin respuesta)" - esto puede deberse a preguntas condicionales que no aplicaban al empleado.
              </Typography>
            </Box>
          </Box>
        ) : (
          <Typography>No se pudo cargar la información del reporte</Typography>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} variant="contained" sx={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
          Cerrar
        </Button>
      </DialogActions>
    </Dialog>
  );
}
