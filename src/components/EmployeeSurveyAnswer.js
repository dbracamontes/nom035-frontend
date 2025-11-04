import React, { useState, useEffect, useCallback } from "react";
import { getSurveys, submitSurveyResponse, getSurveyById, getSurveyWithQuestions, createSurveyApplication, getSurveyApplications, getSurveyResponsesByApplication, getCompanySurveyById, getSurveyApplicationCheck, completeSurveyApplication } from "../api/nom035";
import { 
  Box, Button, Paper, MenuItem, Typography, 
  Card, CardContent, LinearProgress,
  Chip, FormControl, RadioGroup, FormControlLabel, 
  Radio, Accordion, AccordionSummary, AccordionDetails, Alert, Select, InputLabel
} from "@mui/material";
import { 
  ExpandMore as ExpandMoreIcon, 
  CheckCircle as CheckCircleIcon,
  Assignment as AssignmentIcon 
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';

const MENU_PROPS = {
  PaperProps: {
    style: {
      minWidth: 520,
      maxHeight: 600,
      padding: '8px'
    }
  }
};

export default function EmployeeSurveyAnswer() {
  const { t } = useTranslation();
  const [surveys, setSurveys] = useState([]);
  const [selectedSurvey, setSelectedSurvey] = useState(null);
  const [answers, setAnswers] = useState({});
  const [expandedModule, setExpandedModule] = useState(null);
  const [existingApplication, setExistingApplication] = useState(null);
  const [formDisabled, setFormDisabled] = useState(false);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);

  const getAnswer = (qid) => answers[String(qid)] || "";

  const canonicalLabels = ['Siempre','Casi siempre','Algunas veces','Casi nunca','Nunca'];
  const labelSynonyms = {
    'siempre': 'Siempre',
    'casi siempre': 'Casi siempre',
    'frecuente': 'Casi siempre',
    'frecuentemente': 'Casi siempre',
    'muy frecuente': 'Casi siempre',
    'algunas veces': 'Algunas veces',
    'a veces': 'Algunas veces',
    'ocasionalmente': 'Algunas veces',
    'regularmente': 'Algunas veces',
    'casi nunca': 'Casi nunca',
    'rara vez': 'Casi nunca',
    'raramente': 'Casi nunca',
    'pocas veces': 'Casi nunca',
    'nunca': 'Nunca',
    'always': 'Siempre',
    'almost always': 'Casi siempre',
    'sometimes': 'Algunas veces',
    'almost never': 'Casi nunca',
    'never': 'Nunca',
    '1': 'Siempre',
    '2': 'Casi siempre',
    '3': 'Algunas veces',
    '4': 'Casi nunca',
    '5': 'Nunca'
  };

  const canonicalizeLabel = (input) => {
    if (input == null) return null;
    const s = String(input).trim();
    if (s === '') return '';
    if (canonicalLabels.includes(s)) return s;
    const lower = s.toLowerCase();
    if (labelSynonyms[lower]) return labelSynonyms[lower];
    const n = Number(s);
    if (!Number.isNaN(n) && n >= 1 && n <= 5) return canonicalLabels[n - 1];
    return s;
  };

  const normalizeResponseLabel = (question, optId, free, val) => {
    if (free) return String(free);
    if (optId != null) {
      const canon = canonicalizeLabel(optId);
      if (canon != null) return canon;
    }
    if (val != null) {
      const canon = canonicalizeLabel(val);
      if (canon != null) return canon;
    }
    return null;
  };
  
  useEffect(() => {
    const loadData = async () => {
      try {
        const surveysRes = await getSurveys();
        const surveysData = surveysRes.data || [];

        const surveysWithQuestions = await Promise.all(surveysData.map(async (s) => {
          try {
            const qRes = await getSurveyWithQuestions(s.id);
            const qs = Array.isArray(qRes.data) ? qRes.data : (qRes.data?.questions || []);
            return { ...s, questions: qs };
          } catch (err) {
            try {
              const sRes = await getSurveyById(s.id);
              const sd = sRes.data || {};
              const qs = sd.questions || [];
              return { ...s, questions: qs };
            } catch (err2) {
              return { ...s, questions: s.questions || [] };
            }
          }
        }));

        console.log('Surveys loaded with questions:', surveysWithQuestions);
        setSurveys(surveysWithQuestions);
      } catch (err) {
        console.error('Error loading surveys:', err);
        setSurveys([]);
      }
    };

    loadData();
  }, []);
  
  const checkExistingSubmission = useCallback(async (surveyObj = selectedSurvey) => {
    setExistingApplication(null);
    // NO resetear formDisabled aquí - solo se debe establecer en true si está completada
    // setFormDisabled(false); ← REMOVIDO

    if (!surveyObj) return;

    try {
      const appsRes = await getSurveyApplications();
      const apps = appsRes.data || [];

      const csIds = apps.map(a => a.companySurveyId ?? a.company_survey_id ?? a.companySurvey ?? a.company_survey).filter(Boolean).map(id => parseInt(id));
      const uniqueCsIds = [...new Set(csIds)];
      const csIdToSurveyId = {};
      if (uniqueCsIds.length > 0) {
        await Promise.all(uniqueCsIds.map(async (csId) => {
          try {
            const csRes = await getCompanySurveyById(csId);
            const cs = csRes.data || csRes;
            csIdToSurveyId[csId] = cs.surveyId ?? cs.survey_id ?? (cs.survey?.id);
          } catch (err) {
            console.warn('Could not fetch companySurvey for id', csId, err?.message || err);
          }
        }));
      }

      const match = apps.find(a => {
        let appSurveyId = a.surveyId ?? a.survey_id ?? null;
        const csId = a.companySurveyId ?? a.company_survey_id ?? a.companySurvey ?? a.company_survey;
        if (!appSurveyId && csId) {
          const parsed = parseInt(csId);
          if (!isNaN(parsed)) appSurveyId = csIdToSurveyId[parsed] ?? null;
        }

        try {
          return parseInt(appSurveyId) === parseInt(surveyObj.id);
        } catch (e) {
          return false;
        }
      });

      if (match) {
        setExistingApplication(match);

        const appId = match.id ?? match.applicationId ?? match.surveyApplicationId;
        const responsesRes = await getSurveyResponsesByApplication(appId);
        const filtered = responsesRes.data || [];

        const prevAnswers = {};
        filtered.forEach(r => {
          const qid = r.questionId ?? r.question_id ?? r.question?.id;
          const optId = r.optionAnswerId ?? r.option_answer_id ?? r.optionAnswer?.id ?? r.option_answer;
          const free = r.free_text ?? r.textAnswer ?? r.freeText ?? r.text_answer ?? r.freeTextAnswer ?? r.textAnswer;
          const val = r.value ?? r.valueAnswer ?? r.score;

          const q = surveyObj.questions?.find(qq => String(qq.id) === String(qid));
          const label = normalizeResponseLabel(q, optId, free, val);
          if (label != null) prevAnswers[String(qid)] = label;
        });
        setAnswers(prevAnswers);

        // Verificar si está completada - mejorado para detectar el enum COMPLETADO del backend
        const st = (match.status ?? '').toLowerCase();
        const hasCompletedAt = !!match.completedAt;
        const statusIsCompleted = st === 'completado' || st === 'completada' || st === 'completed';
        const allQuestionsAnswered = surveyObj.questions && filtered.length >= surveyObj.questions.length;
        
        if (hasCompletedAt || statusIsCompleted || allQuestionsAnswered) {
          console.log('✅ Survey marked as completed:', { 
            status: match.status, 
            hasCompletedAt, 
            statusIsCompleted, 
            allQuestionsAnswered 
          });
          setFormDisabled(true);
        } else {
          // Solo establecer en false si NO está completada
          setFormDisabled(false);
        }
      } else {
        // No hay aplicación existente, habilitar el formulario
        setFormDisabled(false);
      }
    } catch (err) {
      console.error('Error checking existing submission:', err);
    }
  }, [selectedSurvey]);

  useEffect(() => {
    if (selectedSurvey) {
      checkExistingSubmission(selectedSurvey);
    }
  }, [selectedSurvey, checkExistingSubmission]);

  const handleSurveyChange = async (e) => {
    const surveyId = e.target.value;
    const survey = surveys.find(s => s.id === surveyId);
    setSelectedSurvey(survey || null);
    setAnswers({});
    setExpandedModule(null);
    setShowSuccessMessage(false);
    
    // Verificar si esta encuesta ya tiene respuestas guardadas
    if (survey) {
      await checkExistingSubmission(survey);
    }
  };

  const handleAnswerChange = (questionId, value) => {
    setAnswers(prev => ({ ...prev, [String(questionId)]: value }));
  };

  const handleSubmit = async () => {
    if (!selectedSurvey) {
      alert('Por favor selecciona una encuesta');
      return;
    }

    const allQuestions = selectedSurvey.questions || [];
    const unanswered = allQuestions.filter(q => !getAnswer(q.id));
    if (unanswered.length > 0) {
      alert(`Por favor responde todas las preguntas. Faltan ${unanswered.length} respuestas.`);
      return;
    }

    try {
      let appId = existingApplication?.id ?? existingApplication?.applicationId ?? existingApplication?.surveyApplicationId;
      
      if (!appId) {
        console.log('📝 Creating new survey application...');
        const appRes = await createSurveyApplication({
          surveyId: selectedSurvey.id,
          status: 'en_progreso'
        });
        appId = appRes.data?.id ?? appRes.data?.applicationId;
        console.log('✅ Created application with ID:', appId);
      }

      const responsesPayload = allQuestions.map(q => {
        const answerVal = getAnswer(q.id);
        const score = canonicalLabels.indexOf(answerVal) + 1;
        return {
          surveyApplicationId: appId,
          questionId: q.id,
          value: score > 0 ? score : null,
          freeText: score > 0 ? null : answerVal
        };
      });

      // Paso 1: Enviar las respuestas
      console.log('📤 Sending responses...');
      await submitSurveyResponse(responsesPayload);
      console.log('✅ Responses sent successfully');
      
      // Paso 2: Marcar la aplicación como completada
      console.log('🏁 Marking application as completed...');
      const completeRes = await completeSurveyApplication(appId);
      console.log('✅ Application marked as completed:', completeRes.data);
      
      // Paso 3: Actualizar el estado local INMEDIATAMENTE
      console.log('🔒 Setting formDisabled to true...');
      setShowSuccessMessage(true);
      setFormDisabled(true);
      
      // Paso 4: Recargar la información de la encuesta para reflejar el estado completado
      console.log('🔄 Reloading survey application data...');
      await checkExistingSubmission(selectedSurvey);
      console.log('✅ Survey application reloaded');
    } catch (err) {
      console.error('❌ Error submitting survey:', err);
      alert('Error al enviar la encuesta: ' + (err.response?.data?.message || err.message));
    }
  };

  const groupedQuestions = (selectedSurvey?.questions || []).reduce((acc, q) => {
    const cat = q.category || 'General';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(q);
    return acc;
  }, {});

  const totalQuestions = selectedSurvey?.questions?.length || 0;
  const answeredCount = Object.keys(answers).filter(k => answers[k]).length;
  const progress = totalQuestions > 0 ? (answeredCount / totalQuestions) * 100 : 0;

  return (
    <Box sx={{ maxWidth: 900, mx: 'auto', mt: 4 }}>
      <Paper elevation={3} sx={{ p: 4, position: 'relative', overflow: 'visible' }}>
        {/* Indicador visual de encuesta completada */}
        {formDisabled && (
          <Box
            sx={{
              position: 'absolute',
              top: -10,
              right: 20,
              bgcolor: 'success.main',
              color: 'white',
              px: 2,
              py: 1,
              borderRadius: 2,
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              boxShadow: 2,
              zIndex: 1
            }}
          >
            <CheckCircleIcon fontSize="small" />
            <Typography variant="body2" fontWeight="bold">COMPLETADA</Typography>
          </Box>
        )}

        <Typography variant="h4" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <AssignmentIcon color="primary" />
          {formDisabled ? 'Encuesta Completada' : 'Responder Encuesta'}
        </Typography>

        {/* Dropdown de Selección de Encuesta */}
        <FormControl fullWidth sx={{ mt: 3, mb: 3 }}>
          <InputLabel id="survey-select-label">Seleccionar Encuesta</InputLabel>
          <Select
            labelId="survey-select-label"
            value={selectedSurvey?.id || ''}
            onChange={handleSurveyChange}
            label="Seleccionar Encuesta"
            MenuProps={MENU_PROPS}
          >
            <MenuItem value="">
              <em>-- Selecciona una encuesta --</em>
            </MenuItem>
            {surveys.map(survey => (
              <MenuItem key={survey.id} value={survey.id}>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                  <Typography variant="body1" sx={{ fontWeight: 500 }}>
                    {survey.title}
                  </Typography>
                  {survey.description && (
                    <Typography variant="caption" color="text.secondary">
                      {survey.description}
                    </Typography>
                  )}
                  <Box sx={{ display: 'flex', gap: 1, mt: 0.5 }}>
                    <Chip label={`${survey.questions?.length || 0} preguntas`} size="small" color="primary" variant="outlined" />
                    {survey.guideType && (
                      <Chip label={survey.guideType} size="small" color="secondary" variant="outlined" />
                    )}
                  </Box>
                </Box>
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {/* Estado de la Encuesta */}
        {existingApplication && (
          <Alert 
            severity={formDisabled ? "success" : "info"} 
            sx={{ 
              mb: 3,
              '& .MuiAlert-icon': {
                fontSize: '28px'
              }
            }}
          >
            {formDisabled ? (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="body1" fontWeight="bold">
                    ¡Encuesta completada exitosamente!
                  </Typography>
                </Box>
                <Typography variant="body2">
                  Puedes revisar tus respuestas a continuación. Esta encuesta ya no puede ser modificada.
                </Typography>
                {existingApplication.completedAt && (
                  <Typography variant="caption" color="text.secondary">
                    Completada el: {new Date(existingApplication.completedAt).toLocaleDateString('es-MX', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </Typography>
                )}
              </Box>
            ) : (
              <Typography variant="body1">
                Continuando con una encuesta en progreso... Puedes seguir contestando donde lo dejaste.
              </Typography>
            )}
          </Alert>
        )}

        {/* Mensaje de éxito al enviar */}
        {showSuccessMessage && (
          <Alert severity="success" sx={{ mb: 3 }} onClose={() => setShowSuccessMessage(false)}>
            <Typography variant="body1" fontWeight="bold">
              ¡Gracias por completar la encuesta!
            </Typography>
            <Typography variant="body2">
              Tus respuestas han sido registradas correctamente.
            </Typography>
          </Alert>
        )}

        {/* Barra de Progreso */}
        {selectedSurvey && !formDisabled && (
          <Box sx={{ mb: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="body2" color="text.secondary">
                Progreso: {answeredCount} / {totalQuestions} preguntas
              </Typography>
              <Typography variant="body2" color="primary" sx={{ fontWeight: 500 }}>
                {Math.round(progress)}%
              </Typography>
            </Box>
            <LinearProgress variant="determinate" value={progress} sx={{ height: 8, borderRadius: 4 }} />
          </Box>
        )}

        {/* Resumen de completitud para encuestas terminadas */}
        {selectedSurvey && formDisabled && (
          <Box sx={{ mb: 3, p: 2, bgcolor: 'success.light', borderRadius: 2, border: '2px solid', borderColor: 'success.main' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="body1" fontWeight="bold" color="success.dark">
                Todas las preguntas han sido respondidas
              </Typography>
              <Chip 
                label={`${totalQuestions}/${totalQuestions}`} 
                color="success" 
                size="medium"
                sx={{ fontWeight: 'bold' }}
              />
            </Box>
          </Box>
        )}

        {/* Preguntas Agrupadas por Categoría */}
        {selectedSurvey && Object.keys(groupedQuestions).length > 0 && (
          <Box sx={{ mt: 3 }}>
            {Object.entries(groupedQuestions).map(([category, questions]) => (
              <Accordion 
                key={category}
                expanded={expandedModule === category}
                onChange={() => setExpandedModule(expandedModule === category ? null : category)}
                sx={{ 
                  mb: 2,
                  ...(formDisabled && {
                    bgcolor: '#f8f9fa',
                    '&:before': {
                      display: 'none',
                    }
                  })
                }}
              >
                <AccordionSummary 
                  expandIcon={<ExpandMoreIcon />}
                  sx={{
                    ...(formDisabled && {
                      bgcolor: '#e9ecef',
                      '&:hover': {
                        bgcolor: '#dee2e6'
                      }
                    })
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
                    <Typography variant="h6" sx={{ fontWeight: formDisabled ? 600 : 500 }}>
                      {category}
                    </Typography>
                    <Chip 
                      label={`${questions.filter(q => getAnswer(q.id)).length}/${questions.length}`} 
                      size="small" 
                      color={questions.every(q => getAnswer(q.id)) ? "success" : "default"}
                    />
                  </Box>
                </AccordionSummary>
                <AccordionDetails>
                  {questions.map((question, idx) => {
                    const hasAnswer = getAnswer(question.id);
                    return (
                      <Card 
                        key={question.id} 
                        sx={{ 
                          mb: 2, 
                          bgcolor: formDisabled 
                            ? (hasAnswer ? '#e8f5e9' : '#f5f5f5')
                            : (hasAnswer ? '#f0f9ff' : 'white'),
                          border: formDisabled ? '2px solid' : '1px solid',
                          borderColor: formDisabled 
                            ? (hasAnswer ? 'success.light' : 'grey.300')
                            : (hasAnswer ? 'primary.light' : 'grey.300'),
                          position: 'relative',
                          ...(formDisabled && {
                            '&::before': hasAnswer ? {
                              content: '""',
                              position: 'absolute',
                              top: 10,
                              right: 10,
                              width: 24,
                              height: 24,
                              borderRadius: '50%',
                              bgcolor: 'success.main',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            } : {}
                          })
                        }}
                      >
                        <CardContent>
                          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, mb: 2 }}>
                            <Typography 
                              variant="body1" 
                              sx={{ 
                                fontWeight: 500,
                                color: formDisabled ? 'text.primary' : 'text.primary',
                                flex: 1
                              }}
                            >
                              {idx + 1}. {question.text}
                            </Typography>
                            {formDisabled && hasAnswer && (
                              <CheckCircleIcon color="success" fontSize="small" />
                            )}
                          </Box>
                          <FormControl component="fieldset" fullWidth disabled={formDisabled}>
                            <RadioGroup
                              value={getAnswer(question.id)}
                              onChange={(e) => !formDisabled && handleAnswerChange(question.id, e.target.value)}
                            >
                              {canonicalLabels.map(label => (
                                <FormControlLabel
                                  key={label}
                                  value={label}
                                  disabled={formDisabled}
                                  control={
                                    <Radio 
                                      disabled={formDisabled}
                                      sx={{
                                        ...(formDisabled && getAnswer(question.id) === label && {
                                          color: 'success.main',
                                          '&.Mui-checked': {
                                            color: 'success.main',
                                          },
                                          '&.Mui-disabled': {
                                            color: 'success.main',
                                          }
                                        }),
                                        ...(formDisabled && getAnswer(question.id) !== label && {
                                          '&.Mui-disabled': {
                                            color: 'rgba(0, 0, 0, 0.26)',
                                          }
                                        })
                                      }}
                                    />
                                  }
                                  label={
                                    <Typography 
                                      sx={{ 
                                        fontWeight: formDisabled && getAnswer(question.id) === label ? 600 : 400,
                                        color: formDisabled && getAnswer(question.id) === label ? 'success.dark' : 'inherit',
                                        ...(formDisabled && getAnswer(question.id) !== label && {
                                          color: 'text.disabled'
                                        })
                                      }}
                                    >
                                      {label}
                                    </Typography>
                                  }
                                  sx={{
                                    ...(formDisabled && {
                                      opacity: getAnswer(question.id) === label ? 1 : 0.5,
                                      py: 0.5,
                                      cursor: 'not-allowed',
                                      pointerEvents: 'none'
                                    })
                                  }}
                                />
                              ))}
                            </RadioGroup>
                          </FormControl>
                        </CardContent>
                      </Card>
                    );
                  })}
                </AccordionDetails>
              </Accordion>
            ))}
          </Box>
        )}

        {/* Botón de Envío - Solo se muestra si no está completada */}
        {selectedSurvey && !formDisabled && (
          <Button 
            variant="contained" 
            color="primary" 
            fullWidth 
            size="large"
            onClick={handleSubmit}
            disabled={answeredCount < totalQuestions}
            sx={{ 
              mt: 3,
              py: 1.5,
              fontWeight: 'bold',
              fontSize: '1.1rem'
            }}
          >
            {answeredCount < totalQuestions 
              ? `Completa todas las preguntas (${answeredCount}/${totalQuestions})`
              : 'Enviar Encuesta'
            }
          </Button>
        )}

        {/* Información adicional para encuestas completadas */}
        {selectedSurvey && formDisabled && (
          <Box sx={{ mt: 3, p: 3, bgcolor: 'info.light', borderRadius: 2, textAlign: 'center' }}>
            <Typography variant="body1" color="info.dark">
              Esta encuesta ya ha sido enviada y no puede ser modificada.
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Si necesitas hacer cambios, contacta a tu administrador.
            </Typography>
          </Box>
        )}
      </Paper>
    </Box>
  );
}