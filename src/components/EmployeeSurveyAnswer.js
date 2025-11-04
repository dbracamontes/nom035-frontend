import React, { useState, useEffect, useCallback } from "react";
import { getSurveys, submitSurveyResponse, getSurveyById, getSurveyWithQuestions, createSurveyApplication, getSurveyApplications, getSurveyResponsesByApplication, getCompanySurveyById, getSurveyApplicationCheck } from "../api/nom035";
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
    setFormDisabled(false);

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

        const st = match.status ?? '';
        const completed = match.completedAt || st.toLowerCase() === 'completada' || st.toLowerCase() === 'completed';
        if (completed || (surveyObj.questions && filtered.length >= surveyObj.questions.length)) {
          setFormDisabled(true);
        }
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

  const handleSurveyChange = (e) => {
    const surveyId = e.target.value;
    const survey = surveys.find(s => s.id === surveyId);
    setSelectedSurvey(survey || null);
    setAnswers({});
    setExpandedModule(null);
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
        const appRes = await createSurveyApplication({
          surveyId: selectedSurvey.id,
          status: 'en_progreso'
        });
        appId = appRes.data?.id ?? appRes.data?.applicationId;
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

      await submitSurveyResponse(responsesPayload);
      alert('¡Encuesta enviada exitosamente!');
      setAnswers({});
      setSelectedSurvey(null);
      setExistingApplication(null);
      setFormDisabled(false);
    } catch (err) {
      console.error('Error submitting survey:', err);
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
      <Paper elevation={3} sx={{ p: 4 }}>
        <Typography variant="h4" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <AssignmentIcon color="primary" />
          Responder Encuesta
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
            disabled={formDisabled}
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
          <Alert severity={formDisabled ? "success" : "info"} sx={{ mb: 3 }}>
            {formDisabled ? (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <CheckCircleIcon />
                <span>Esta encuesta ya ha sido completada.</span>
              </Box>
            ) : (
              'Continuando con una encuesta en progreso...'
            )}
          </Alert>
        )}

        {/* Barra de Progreso */}
        {selectedSurvey && (
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

        {/* Preguntas Agrupadas por Categoría */}
        {selectedSurvey && Object.keys(groupedQuestions).length > 0 && (
          <Box sx={{ mt: 3 }}>
            {Object.entries(groupedQuestions).map(([category, questions]) => (
              <Accordion 
                key={category}
                expanded={expandedModule === category}
                onChange={() => setExpandedModule(expandedModule === category ? null : category)}
                sx={{ mb: 2 }}
              >
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
                    <Typography variant="h6">{category}</Typography>
                    <Chip 
                      label={`${questions.filter(q => getAnswer(q.id)).length}/${questions.length}`} 
                      size="small" 
                      color={questions.every(q => getAnswer(q.id)) ? "success" : "default"}
                    />
                  </Box>
                </AccordionSummary>
                <AccordionDetails>
                  {questions.map((question, idx) => (
                    <Card key={question.id} sx={{ mb: 2, bgcolor: getAnswer(question.id) ? '#f0f9ff' : 'white' }}>
                      <CardContent>
                        <Typography variant="body1" sx={{ mb: 2, fontWeight: 500 }}>
                          {idx + 1}. {question.text}
                        </Typography>
                        <FormControl component="fieldset" fullWidth disabled={formDisabled}>
                          <RadioGroup
                            value={getAnswer(question.id)}
                            onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                          >
                            {canonicalLabels.map(label => (
                              <FormControlLabel
                                key={label}
                                value={label}
                                control={<Radio />}
                                label={label}
                              />
                            ))}
                          </RadioGroup>
                        </FormControl>
                      </CardContent>
                    </Card>
                  ))}
                </AccordionDetails>
              </Accordion>
            ))}
          </Box>
        )}

        {/* Botón de Envío */}
        {selectedSurvey && !formDisabled && (
          <Button 
            variant="contained" 
            color="primary" 
            fullWidth 
            size="large"
            onClick={handleSubmit}
            disabled={answeredCount < totalQuestions}
            sx={{ mt: 3 }}
          >
            Enviar Encuesta
          </Button>
        )}
      </Paper>
    </Box>
  );
}
