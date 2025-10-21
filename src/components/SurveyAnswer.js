import React, { useState, useEffect, useCallback } from "react";
import { getSurveys, getEmployees, submitSurveyResponse, getSurveyById, getSurveyWithQuestions, createSurveyApplication, getSurveyApplications, getSurveyResponses, getCompanySurveyById, getSurveyApplicationCheck } from "../api/nom035";
import { 
  Box, Button, TextField, Paper, MenuItem, Typography, 
  Card, CardContent, LinearProgress,
  Chip, Grid, FormControl, RadioGroup, FormControlLabel, 
  Radio, Accordion, AccordionSummary, AccordionDetails, Alert
} from "@mui/material";
import { 
  ExpandMore as ExpandMoreIcon, 
  CheckCircle as CheckCircleIcon,
  Assignment as AssignmentIcon 
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';

// Definición de módulos NOM-035
const NOM035_MODULES = {
  1: {
    name: "Condiciones en el ambiente de trabajo",
    description: "Condiciones peligrosas e inseguras, deficientes e insalubres",
    color: "#e3f2fd",
    questionRange: [1, 8]
  },
  2: {
    name: "Cargas de trabajo", 
    description: "Cargas cuantitativas, ritmo de trabajo, cargas mentales",
    color: "#f3e5f5",
    questionRange: [9, 20]
  },
  3: {
    name: "Falta de control y autonomía",
    description: "Iniciativa, influencia, participación y manejo del cambio",
    color: "#e8f5e8", 
    questionRange: [21, 32]
  },
  4: {
    name: "Jornada de trabajo y rotación de turnos",
    description: "Jornadas extensas, trabajo nocturno, rotación de turnos",
    color: "#fff3e0",
    questionRange: [33, 40]
  },
  5: {
    name: "Interferencia en la relación trabajo-familia", 
    description: "Tiempo limitado, atención a responsabilidades familiares",
    color: "#fce4ec",
    questionRange: [41, 48]
  },
  6: {
    name: "Liderazgo y relaciones en el trabajo",
    description: "Características del liderazgo, relaciones sociales",
    color: "#e1f5fe",
    questionRange: [49, 65]
  },
  7: {
    name: "Violencia laboral",
    description: "Violencia psicológica, acoso, malos tratos",
    color: "#ffebee", 
    questionRange: [66, 73]
  }
};

// Menu props to make select dropdowns wider and taller so content is visible
const MENU_PROPS = {
  PaperProps: {
    style: {
      minWidth: 520, // increased width so long content is visible
      maxHeight: 600, // allow taller dropdowns
      padding: '8px'
    }
  }
};

export default function SurveyAnswer() {
  const { t } = useTranslation();
  const [surveys, setSurveys] = useState([]);
  const [selectedSurvey, setSelectedSurvey] = useState(null);
  const [answers, setAnswers] = useState({});
  const [employees, setEmployees] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState("");
  const [expandedModule, setExpandedModule] = useState(null);
  const [existingApplication, setExistingApplication] = useState(null);
  const [formDisabled, setFormDisabled] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        const surveysRes = await getSurveys();
        const surveysData = surveysRes.data || [];

        // Fetch questions for each survey so we can show accurate counts in the dropdown
        const surveysWithQuestions = await Promise.all(surveysData.map(async (s) => {
          try {
            const qRes = await getSurveyWithQuestions(s.id);
            const qs = Array.isArray(qRes.data) ? qRes.data : (qRes.data?.questions || []);
            return { ...s, questions: qs };
          } catch (err) {
            // Fallback: try the regular survey endpoint which may include questions
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

      try {
        const empRes = await getEmployees();
        console.log('Employees loaded:', empRes.data);
        setEmployees(empRes.data);
      } catch (err) {
        console.error('Error loading employees:', err);
        setEmployees([]);
      }
    };

    loadData();
  }, []);
  
  // Check if the selected employee already has an application for the selected survey
  // const checkExistingSubmission = async (employeeId = selectedEmployee, surveyObj = selectedSurvey) => {
  const checkExistingSubmission = useCallback(async (employeeId = selectedEmployee, surveyObj = selectedSurvey) => {
    setExistingApplication(null);
    setFormDisabled(false);

    if (!employeeId || !surveyObj) return;

    try {
      // Fast path: ask backend to resolve existence/completion
      try {
        const chk = await getSurveyApplicationCheck(employeeId, surveyObj.id);
        const data = chk.data || {};
        if (data.found) {
          const appLite = {
            id: data.applicationId,
            status: data.status,
            completedAt: data.completedAt,
          };
          setExistingApplication(appLite);

          // If backend says completed or counts show all answered, disable immediately
          if (data.completed || (data.questionsCount > 0 && data.responsesCount >= data.questionsCount)) {
            setFormDisabled(true);
          }

          // Load responses for this application to prefill
          const responsesRes = await getSurveyResponses();
          const responses = responsesRes.data || [];
          const filtered = responses.filter(r => {
            const rid = r.surveyApplicationId ?? r.survey_application_id ?? r.surveyApplication?.id ?? r.survey_application;
            return parseInt(rid) === parseInt(data.applicationId);
          });

          const prevAnswers = {};
          filtered.forEach(r => {
            const qid = r.questionId ?? r.question_id ?? r.question?.id;
            const optId = r.optionAnswerId ?? r.option_answer_id ?? r.optionAnswer?.id ?? r.option_answer;
            const free = r.free_text ?? r.textAnswer ?? r.freeText ?? r.text_answer ?? r.freeTextAnswer ?? r.textAnswer;
            const val = r.value ?? r.valueAnswer ?? r.score;
            if (optId) {
              const q = surveyObj.questions?.find(qq => String(qq.id) === String(qid));
              let optText = null;
              if (q) {
                if (Array.isArray(q.options)) {
                  const found = q.options.find(o => String(o.id) === String(optId) || String(o.value) === String(optId));
                  if (found) optText = found.text ?? found.value ?? String(found);
                } else if (typeof q.options === 'string') {
                  const mapping = {1: 'Siempre', 2: 'Casi siempre', 3: 'Algunas veces', 4: 'Casi nunca', 5: 'Nunca'};
                  optText = mapping[optId] || mapping[val] || String(optId);
                }
              }
              prevAnswers[qid] = optText || String(optId);
            } else if (free) {
              prevAnswers[qid] = free;
            } else if (val) {
              const mapping = {1: 'Siempre', 2: 'Casi siempre', 3: 'Algunas veces', 4: 'Casi nunca', 5: 'Nunca'};
              prevAnswers[qid] = mapping[val] || String(val);
            }
          });
          setAnswers(prevAnswers);

          // Done with fast path
          return;
        }
      } catch (ignored) {}

      // Fallback: scan applications and derive surveyId via companySurvey if needed
       const appsRes = await getSurveyApplications();
       const apps = appsRes.data || [];

       // Build mapping from companySurveyId -> surveyId for apps that reference companySurvey
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

       // Try to find matching application by employee + survey
       const match = apps.find(a => {
         const appEmployeeId = a.employeeId ?? a.employee_id ?? a.employee?.id;
         let appSurveyId = a.surveyId ?? a.survey_id ?? null;

         const csId = a.companySurveyId ?? a.company_survey_id ?? a.companySurvey ?? a.company_survey;
         if (!appSurveyId && csId) {
           const parsed = parseInt(csId);
           if (!isNaN(parsed)) appSurveyId = csIdToSurveyId[parsed] ?? null;
         }

         try {
           return parseInt(appEmployeeId) === parseInt(employeeId) && parseInt(appSurveyId) === parseInt(surveyObj.id);
         } catch (e) {
           return false;
         }
       });

       if (match) {
         setExistingApplication(match);

         // Load responses and filter by application id
         const responsesRes = await getSurveyResponses();
         const responses = responsesRes.data || [];
         const appId = match.id ?? match.applicationId ?? match.surveyApplicationId;
         const filtered = responses.filter(r => {
           const rid = r.surveyApplicationId ?? r.survey_application_id ?? r.surveyApplication?.id ?? r.survey_application;
           return parseInt(rid) === parseInt(appId);
         });

         // Prefill answers map so fields show existing values
         const prevAnswers = {};
         filtered.forEach(r => {
           const qid = r.questionId ?? r.question_id ?? r.question?.id;
           const optId = r.optionAnswerId ?? r.option_answer_id ?? r.optionAnswer?.id ?? r.option_answer;
           const free = r.free_text ?? r.textAnswer ?? r.freeText ?? r.text_answer ?? r.freeTextAnswer ?? r.textAnswer;
           const val = r.value ?? r.valueAnswer ?? r.score;

           if (optId) {
             // Try to map option id to text using selectedSurvey questions if available
             const q = surveyObj.questions?.find(qq => String(qq.id) === String(qid));
             let optText = null;
             if (q) {
               if (Array.isArray(q.options)) {
                 const found = q.options.find(o => String(o.id) === String(optId) || String(o.value) === String(optId));
                 if (found) optText = found.text ?? found.value ?? String(found);
               } else if (typeof q.options === 'string') {
                 const mapping = {1: 'Siempre', 2: 'Casi siempre', 3: 'Algunas veces', 4: 'Casi nunca', 5: 'Nunca'};
                 optText = mapping[optId] || mapping[val] || String(optId);
               }
             }
             prevAnswers[qid] = optText || String(optId);
           } else if (free) {
             prevAnswers[qid] = free;
           } else if (val) {
             const mapping = {1: 'Siempre', 2: 'Casi siempre', 3: 'Algunas veces', 4: 'Casi nunca', 5: 'Nunca'};
             prevAnswers[qid] = mapping[val] || String(val);
           }
         });

         setAnswers(prevAnswers);

         // Disable form if status is completed, or completedAt exists, or all questions already answered
         const status = (match.status ?? match.state ?? match.statusApplication ?? '').toString();
         const completedAt = match.completedAt ?? match.completed_at;
         const allAnswered = Array.isArray(surveyObj?.questions) && surveyObj.questions.length > 0 && filtered.length >= surveyObj.questions.length;
         const statusLc = status.toLowerCase();
         if (statusLc.includes('complet') || statusLc.includes('finaliz') || completedAt || allAnswered) {
           setFormDisabled(true);
         }
       }
    } catch (err) {
      console.error('Error in checkExistingSubmission:', err);
    }
  }, [selectedEmployee, selectedSurvey]);
  
  // When selected employee or survey changes, check for existing submission
  useEffect(() => {
    checkExistingSubmission();
  }, [checkExistingSubmission]);

  const handleSurveySelect = async (id) => {
    try {
      console.log('🔍 Loading survey details for ID:', id);
      
      // Intentar primero con el endpoint específico para preguntas
      try {
        console.log('🔍 Trying getSurveyWithQuestions...');
        const questionsResponse = await getSurveyWithQuestions(id);
        console.log('✅ Questions array response:', questionsResponse.data);
        
        // Obtener datos básicos de la encuesta también
        const surveyResponse = await getSurveyById(id);
        const surveyData = surveyResponse.data;
        console.log('📝 Basic survey data:', surveyData);
        
        // Combinar encuesta con preguntas
        const completeSurvey = {
          ...surveyData,
          questions: questionsResponse.data // Las preguntas vienen como array
        };
        
        console.log('🎯 Complete survey with questions:', completeSurvey);
        setSelectedSurvey(completeSurvey);
        setAnswers({});
        setExpandedModule(1);
        // Immediately check if this employee already submitted this survey
        checkExistingSubmission(selectedEmployee, completeSurvey);
         return;
      } catch (questionsError) {
        console.log('❌ getSurveyWithQuestions failed:', questionsError.response?.status);
      }
      
      // Fallback al endpoint normal
      console.log('🔍 Trying regular getSurveyById...');
      const response = await getSurveyById(id);
      const surveyWithDetails = response.data;
      console.log('� Regular survey response:', surveyWithDetails);
      
      // Verificar si ya tiene preguntas
      if (surveyWithDetails.questions && surveyWithDetails.questions.length > 0) {
        console.log('✅ Survey already has questions!');
        setSelectedSurvey(surveyWithDetails);
      } else {
        console.log('⚠️ No questions found, adding test questions');
        surveyWithDetails.questions = generateTestQuestions();
        setSelectedSurvey(surveyWithDetails);
      }
      
      setAnswers({});
      setExpandedModule(1);
      // Re-run check in case selectedSurvey changed
      checkExistingSubmission();
    } catch (error) {
      console.error('💥 Error loading survey details:', error);
      // Fallback to basic survey data with test questions
      const survey = surveys.find(s => s.id === id);
      if (survey) {
        survey.questions = generateTestQuestions();
        setSelectedSurvey(survey);
      }
      setAnswers({});
      setExpandedModule(1);
    }
  };

  // Función temporal para generar preguntas de prueba
  const generateTestQuestions = () => {
    const sampleQuestions = [];
    
    // Generar 73 preguntas para simular una encuesta NOM-035 completa
    for (let i = 1; i <= 73; i++) {
      sampleQuestions.push({
        id: i,
        text: `Pregunta ${i}: ¿Cómo evalúa usted el factor de riesgo psicosocial relacionado con esta situación laboral?`,
        type: 'single-choice',
        options: 'Siempre,Casi siempre,Algunas veces,Casi nunca,Nunca'
      });
    }
    
    return sampleQuestions;
  };

  const handleAnswerChange = (qid, value) => setAnswers({ ...answers, [qid]: value });

  // Obtener preguntas por módulo
  const getQuestionsByModule = (moduleNum) => {
    if (!selectedSurvey?.questions) return [];
    const module = NOM035_MODULES[moduleNum];
    if (!module) return selectedSurvey.questions;
    
    // Si hay 73 preguntas, usar rango por posición
    if (selectedSurvey.questions.length >= 70) {
      const [start, end] = module.questionRange;
      return selectedSurvey.questions.slice(start - 1, end);
    }
    
    // Si son menos preguntas, mostrar todas (encuesta personalizada)
    return selectedSurvey.questions;
  };

  // Verificar si un módulo está completo
  const isModuleComplete = (moduleNum) => {
    const moduleQuestions = getQuestionsByModule(moduleNum);
    return moduleQuestions.every(q => answers[q.id] && answers[q.id].trim() !== "");
  };

  // Calcular progreso total
  const getTotalProgress = () => {
    if (!selectedSurvey?.questions) return 0;
    const totalQuestions = selectedSurvey.questions.length;
    const answeredQuestions = Object.keys(answers).filter(
      qid => answers[qid] && answers[qid].trim() !== ""
    ).length;
    return Math.round((answeredQuestions / totalQuestions) * 100);
  };

  const handleSubmit = async e => {
    e.preventDefault();
    if (!selectedEmployee || !selectedSurvey) return;
    if (formDisabled && existingApplication) {
      alert('Esta evaluación ya fue enviada para este empleado. Revisión en modo lectura.');
      return;
    }

    try {
      console.log('🚀 Starting survey submission process...');
      console.log('📝 Employee ID:', selectedEmployee);
      console.log('📋 Survey ID:', selectedSurvey.id);
      console.log('💬 Answers:', answers);
      
      // Paso 1: Crear una aplicación de encuesta (surveyApplicationId)
      let surveyApplicationId;
      try {
        const applicationData = {
          employeeId: parseInt(selectedEmployee),
          surveyId: parseInt(selectedSurvey.id),
          status: "completed", // o "in_progress"
          startDate: new Date().toISOString(),
          endDate: new Date().toISOString()
        };
        
        console.log('� Creating survey application:', applicationData);
        const applicationResult = await createSurveyApplication(applicationData);
        surveyApplicationId = applicationResult.data.id || applicationResult.data.surveyApplicationId || 1;
        console.log('✅ Survey application created with ID:', surveyApplicationId);
      } catch (appError) {
        console.log('⚠️ Could not create survey application, using default ID:', appError);
        surveyApplicationId = 1; // Fallback ID
      }
      
      // Paso 2: Convertir las respuestas al formato que espera el backend
      const responses = [];
      
      for (const question of selectedSurvey.questions) {
        const userAnswer = answers[question.id];
        if (userAnswer && userAnswer.trim() !== "") {
          
          // Determinar si es una respuesta de opción múltiple o texto libre
          const isMultipleChoice = question.type === 'single-choice' || question.type === 'likert' || question.options;
          
          if (isMultipleChoice) {
            // Para preguntas de opción múltiple, necesitamos encontrar el optionAnswerId
            const optionAnswerId = getOptionAnswerId(userAnswer);
            
            responses.push({
              surveyApplicationId: surveyApplicationId,
              questionId: parseInt(question.id),
              optionAnswerId: optionAnswerId,
              textAnswer: null
            });
          } else {
            // Para preguntas de texto libre
            responses.push({
              surveyApplicationId: surveyApplicationId,
              questionId: parseInt(question.id),
              optionAnswerId: null,
              textAnswer: userAnswer
            });
          }
        }
      }
      
      console.log('📦 Formatted responses for backend:', responses);
      
      // Paso 3: Enviar cada respuesta individualmente (según el diseño del backend)
      const results = [];
      for (const response of responses) {
        try {
          const result = await submitSurveyResponse(response);
          results.push(result);
          console.log('✅ Response saved:', result);
        } catch (error) {
          console.error('❌ Error saving individual response:', error);
          throw error; // Para detener el proceso si falla una respuesta
        }
      }
      
      console.log('✅ All responses submitted successfully:', results);
      alert("¡Encuesta enviada exitosamente!");
      setAnswers({});
      setSelectedSurvey(null);
      setSelectedEmployee("");
      
    } catch (error) {
      console.error("💥 Error al enviar encuesta:", error);
      console.error("💥 Error response:", error.response);
      console.error("💥 Error details:", error.response?.data);
      console.error("💥 Error status:", error.response?.status);
      console.error("💥 Error headers:", error.response?.headers);
      
      // Mostrar error más detallado
      let errorMessage = "Error al enviar la encuesta. ";
      if (error.response?.status) {
        errorMessage += `Status: ${error.response.status}. `;
      }
      if (error.response?.data?.message) {
        errorMessage += `Mensaje: ${error.response.data.message}`;
      } else if (error.response?.data) {
        errorMessage += `Detalle: ${JSON.stringify(error.response.data)}`;
      } else if (error.message) {
        errorMessage += `Error: ${error.message}`;
      }
      
      alert(errorMessage);
    }
  };

  // Función auxiliar para mapear respuestas de texto a IDs de opciones
  const getOptionAnswerId = (answerText) => {
    // Mapeo para opciones estándar NOM-035
    const optionMapping = {
      'Siempre': 1,
      'Casi siempre': 2,
      'Algunas veces': 3,
      'Casi nunca': 4,
      'Nunca': 5
    };
    
    return optionMapping[answerText] || 1; // Default a "Siempre" si no se encuentra
  };

  // Renderizar pregunta individual
  const renderQuestion = (question, index) => {
    console.log('🔍 Rendering question:', question);
    
    // Opciones estándar NOM-035
    const nom035Options = [
      'Siempre',
      'Casi siempre', 
      'Algunas veces',
      'Casi nunca',
      'Nunca'
    ];
    
    // Manejar diferentes formatos de opciones
    let questionOptions = [];
    
    // Para preguntas tipo 'likert' o sin opciones definidas, usar siempre las estándar de NOM-035
    if (question.type === 'likert' || !question.options || (Array.isArray(question.options) && question.options.length === 0)) {
      console.log('📝 Using standard NOM-035 options for likert question');
      questionOptions = nom035Options;
    } else if (question.options) {
      if (typeof question.options === 'string') {
        questionOptions = question.options.split(',').map(opt => opt.trim());
      } else if (Array.isArray(question.options)) {
        // Si las opciones son objetos con estructura {id, value, text, sortOrder}
        questionOptions = question.options.map(opt => {
          if (typeof opt === 'object' && opt.text) {
            return opt.text; // Usar la propiedad 'text' del objeto
          } else if (typeof opt === 'object' && opt.value) {
            return opt.value; // O usar 'value' si no hay 'text'
          } else {
            return String(opt); // Convertir a string si es otro tipo
          }
        });
      } else {
        console.log('⚠️ Unknown options format:', question.options);
        questionOptions = nom035Options; // Usar opciones por defecto
      }
    } else {
      // Si no hay opciones definidas, usar las estándar de NOM-035
      questionOptions = nom035Options;
    }
    
    console.log('📋 Final options for question:', questionOptions);
    
    // Para encuestas NOM-035, forzar siempre opciones múltiples
    const useMultipleChoice = true; // Siempre usar opción múltiple para NOM-035
    
    return (
      <Card key={question.id} sx={{ mb: 2, border: '1px solid #e0e0e0' }}>
        <CardContent>
          <Typography variant="body1" sx={{ mb: 2, fontWeight: 500 }}>
            {index + 1}. {question.text}
          </Typography>
          
          {useMultipleChoice && questionOptions.length > 0 ? (
            <FormControl component="fieldset">
              <RadioGroup
                value={answers[question.id] || ""}
                onChange={e => handleAnswerChange(question.id, e.target.value)}
                disabled={formDisabled}
              >
                {questionOptions.map((option, optIndex) => (
                  <FormControlLabel
                    key={optIndex}
                    value={option}
                    control={<Radio disabled={formDisabled} />}
                    label={option}
                  />
                ))}
              </RadioGroup>
            </FormControl>
          ) : (
            <TextField
              fullWidth
              multiline
              rows={2}
              value={answers[question.id] || ""}
              onChange={e => handleAnswerChange(question.id, e.target.value)}
              placeholder="Escriba su respuesta aquí..."
              variant="outlined"
              disabled={formDisabled}
            />
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" sx={{ mb: 3, fontWeight: 600, color: '#1e293b' }}>
        {t('survey.answer.title') || 'Responder Encuesta NOM-035'}
      </Typography>

      {formDisabled && existingApplication && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          Esta evaluación ya fue enviada para este empleado. Modo lectura activo.
          {(() => {
            const st = existingApplication.status ?? existingApplication.state ?? existingApplication.statusApplication;
            const started = existingApplication.startedAt ?? existingApplication.started_at;
            const completed = existingApplication.completedAt ?? existingApplication.completed_at;
            return (
              <>
                {st ? <> Estado: <strong>{st}</strong>.</> : null}
                {started ? <> Inicio: {started}.</> : null}
                {completed ? <> Fin: {completed}.</> : null}
              </>
            );
          })()}
        </Alert>
      )}

      {/* Selección de Empleado y Encuesta */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <TextField
              select
              fullWidth
              sx={{ minWidth: 520 }}
              label={t('survey.answer.selectEmployee') || "Seleccionar Empleado"}
              value={selectedEmployee}
              onChange={e => { setSelectedEmployee(e.target.value); checkExistingSubmission(e.target.value, selectedSurvey); }}
              variant="outlined"
              SelectProps={{ MenuProps: MENU_PROPS }}
            >
              <MenuItem value="" sx={{ whiteSpace: 'normal', minHeight: 48 }}>{t('survey.answer.selectEmployeePlaceholder') || "Seleccione un empleado"}</MenuItem>
              {employees.map(emp => (
                <MenuItem key={emp.id} value={emp.id} sx={{ whiteSpace: 'normal', minHeight: 48 }}>
                  {emp.name} ({emp.email})
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <TextField
              select
              fullWidth
              sx={{ minWidth: 520 }}
              label={t('survey.answer.selectSurvey') || "Seleccionar Encuesta"}
              value={selectedSurvey ? selectedSurvey.id : ""}
              onChange={e => handleSurveySelect(Number(e.target.value))}
              variant="outlined"
              SelectProps={{ MenuProps: MENU_PROPS }}
            >
              <MenuItem value="" sx={{ whiteSpace: 'normal', minHeight: 48 }}>{t('survey.answer.selectSurveyPlaceholder') || "Seleccione una encuesta"}</MenuItem>
              {surveys.map(s => (
                <MenuItem key={s.id} value={s.id} sx={{ whiteSpace: 'normal', minHeight: 48 }}>
                  {s.title} ({s.questions?.length || 0} preguntas)
                </MenuItem>
              ))}
            </TextField>
          </Grid>
        </Grid>
      </Paper>

      {/* Información de la Encuesta y Progreso */}
      {selectedSurvey && (
        <Paper sx={{ p: 3, mb: 3 }}>
          <Grid container spacing={3} alignItems="center">
            <Grid item xs={12} md={8}>
              <Typography variant="h6" sx={{ mb: 1, fontWeight: 600 }}>
                {selectedSurvey.title}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                {selectedSurvey.description}
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                <Chip 
                  icon={<AssignmentIcon />}
                  label={`${selectedSurvey.questions?.length || 0} preguntas`}
                  variant="outlined"
                />
                {selectedSurvey.questions?.length >= 70 && (
                  <Chip 
                    label="Encuesta NOM-035 Completa"
                    color="primary"
                    variant="outlined"
                  />
                )}
              </Box>
            </Grid>
            
            <Grid item xs={12} md={4}>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  Progreso Total
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <LinearProgress 
                    variant="determinate" 
                    value={getTotalProgress()} 
                    sx={{ flexGrow: 1, height: 8, borderRadius: 4 }}
                  />
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {getTotalProgress()}%
                  </Typography>
                </Box>
              </Box>
            </Grid>
          </Grid>
        </Paper>
      )}

      {/* Módulos de Preguntas */}
      {selectedSurvey && selectedSurvey.questions && (
        <Box>
          {selectedSurvey.questions.length >= 70 ? (
            // Vista por módulos para encuestas completas NOM-035
            <Box>
              <Alert severity="info" sx={{ mb: 3 }}>
                <Typography variant="body2">
                  Esta encuesta está organizada por módulos según la norma NOM-035. 
                  Puede completar los módulos en cualquier orden.
                </Typography>
              </Alert>
              
              {Object.entries(NOM035_MODULES).map(([moduleNum, module]) => {
                const moduleQuestions = getQuestionsByModule(parseInt(moduleNum));
                const isComplete = isModuleComplete(parseInt(moduleNum));
                const hasQuestions = moduleQuestions.length > 0;
                
                if (!hasQuestions) return null;
                
                return (
                  <Accordion 
                    key={moduleNum}
                    expanded={expandedModule === parseInt(moduleNum)}
                    onChange={(e, isExpanded) => setExpandedModule(isExpanded ? parseInt(moduleNum) : null)}
                    sx={{ mb: 2, border: '1px solid #e0e0e0' }}
                  >
                    <AccordionSummary 
                      expandIcon={<ExpandMoreIcon />}
                      sx={{ 
                        backgroundColor: module.color,
                        '&:hover': { backgroundColor: module.color + 'dd' }
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
                        <Typography variant="h6" sx={{ fontWeight: 600 }}>
                          Módulo {moduleNum}: {module.name}
                        </Typography>
                        {isComplete && (
                          <CheckCircleIcon color="success" />
                        )}
                        <Box sx={{ marginLeft: 'auto', mr: 2 }}>
                          <Chip 
                            label={`${moduleQuestions.length} preguntas`}
                            size="small"
                            variant="outlined"
                          />
                        </Box>
                      </Box>
                    </AccordionSummary>
                    
                    <AccordionDetails sx={{ p: 3 }}>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                        {module.description}
                      </Typography>
                      
                      {moduleQuestions.map((question, index) => 
                        renderQuestion(question, index)
                      )}
                    </AccordionDetails>
                  </Accordion>
                );
              })}
            </Box>
          ) : (
            // Vista simple para encuestas personalizadas
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" sx={{ mb: 3, fontWeight: 600 }}>
                Preguntas de la Encuesta
              </Typography>
              {selectedSurvey.questions.map((question, index) => 
                renderQuestion(question, index)
              )}
            </Paper>
          )}
          
          {/* Botón de Envío */}
          <Box sx={{ mt: 4, textAlign: 'center' }}>
            <Button 
              onClick={handleSubmit}
              variant="contained" 
              size="large"
              disabled={!selectedEmployee || getTotalProgress() < 100 || formDisabled}
              sx={{ 
                px: 6, 
                py: 2,
                backgroundColor: '#6366f1',
                '&:hover': { backgroundColor: '#4f46e5' }
              }}
            >
              {t('survey.answer.submit') || 'Enviar Encuesta Completa'}
            </Button>
            {getTotalProgress() < 100 && (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Complete todas las preguntas para enviar la encuesta
              </Typography>
            )}
          </Box>
        </Box>
      )}
    </Box>
  );
}
