import React, { useState, useEffect, useCallback } from "react";
import { getSurveys, getEmployees, submitSurveyResponse, getSurveyById, getSurveyWithQuestions, createSurveyApplication, getSurveyApplications, getSurveyResponsesByApplication, getCompanySurveyById, getSurveyApplicationCheck, getFilteredResponses } from "../api/nom035";
import { 
  Box, Button, TextField, Paper, MenuItem, Typography, 
  Card, CardContent, LinearProgress,
  Chip, Grid, FormControl, RadioGroup, FormControlLabel, 
  Radio, Accordion, AccordionSummary, AccordionDetails, Alert,
  FormGroup, Checkbox
} from "@mui/material";
import { 
  ExpandMore as ExpandMoreIcon, 
  CheckCircle as CheckCircleIcon,
  Assignment as AssignmentIcon 
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { normalizeQuestionList } from "../utils/surveyUtils";

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

  // Helper to consistently read answers by string keys
  const getAnswer = (qid) => answers[String(qid)] || "";

  // Canonicalize any incoming label or token to the five NOM-035 labels
  const canonicalLabels = ['Siempre','Casi siempre','Algunas veces','Casi nunca','Nunca'];
  const labelSynonyms = {
    // Spanish
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
    // English fallbacks
    'always': 'Siempre',
    'almost always': 'Casi siempre',
    'sometimes': 'Algunas veces',
    'almost never': 'Casi nunca',
    'never': 'Nunca',
    // Numeric strings
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
    // If already exact match, keep it
    if (canonicalLabels.includes(s)) return s;
    const lower = s.toLowerCase();
    if (labelSynonyms[lower]) return labelSynonyms[lower];
    // If a number (score), map 1..5
    const n = Number(s);
    if (!Number.isNaN(n) && n >= 1 && n <= 5) return canonicalLabels[n - 1];
    return s; // fallback (will be rare)
  };

  // Normalize stored response pieces into the exact option label used by the UI
  const NOM035_OPTIONS = canonicalLabels.map((label, idx) => ({
    id: null,
    label,
    value: label,
    numericValue: idx + 1,
    requiresFreeText: false,
  }));

  const normalizeQuestionType = (question) => {
    if (!question) return '';
    if (typeof question.kind === 'string') return question.kind.toLowerCase();
    return String(question?.type || question?.responseType || '').toLowerCase();
  };

  const extractQuestionOptions = (question) => {
    if (Array.isArray(question?.normalizedOptions) && question.normalizedOptions.length > 0) {
      return question.normalizedOptions.map(opt => ({
        id: opt.optionAnswerId ?? opt.id ?? null,
        label: opt.label ?? opt.text ?? opt.value ?? opt.name ?? '',
        value: opt.value ?? opt.id ?? opt.label ?? '',
        numericValue: opt.value ?? opt.numericValue ?? null,
        requiresFreeText: Boolean(opt.requiresFreeText),
      })).filter(opt => opt.label);
    }

    if (!question) return [];
    let raw = question.options ?? question.optionAnswers ?? question.option_answers ?? null;
    if (typeof raw === 'string') {
      raw = raw.split(/[,|;]/).map(part => part.trim()).filter(Boolean);
    }
    if (!raw) return [];
    const list = Array.isArray(raw) ? raw : Object.values(raw);
    return list
      .map((opt, index) => {
        if (opt == null) return null;
        if (typeof opt === 'string') {
          const label = opt.trim();
          if (!label) return null;
          return {
            id: null,
            label,
            value: label,
            numericValue: undefined,
            requiresFreeText: false,
          };
        }

        const label = (opt.text ?? opt.label ?? opt.name ?? opt.title ?? opt.value ?? `Opción ${index + 1}`).toString();
        const rawValue = opt.value ?? opt.code ?? opt.index ?? label;
        const numericValue = typeof opt.value === 'number'
          ? opt.value
          : (opt.value !== undefined && !Number.isNaN(Number(opt.value)) ? Number(opt.value) : (typeof opt.score === 'number' ? opt.score : undefined));

        return {
          id: opt.id ?? opt.optionAnswerId ?? opt.option_answer_id ?? null,
          label,
          value: rawValue != null ? String(rawValue) : label,
          numericValue,
          requiresFreeText: Boolean(opt.requiresFreeText ?? opt.requires_free_text),
        };
      })
      .filter(Boolean);
  };

  const shouldUseNom035Defaults = (question, backendOptions) => {
    if (backendOptions.length > 0) return false;
    const type = normalizeQuestionType(question);
    return type === 'likert' || type === 'scale' || type === 'single_choice' || type === 'radio' || type === '';
  };

  const resolveQuestionOptions = (question) => {
    const backendOptions = extractQuestionOptions(question);
    const useNomDefaults = shouldUseNom035Defaults(question, backendOptions);
    const options = backendOptions.length > 0 ? backendOptions : (useNomDefaults ? NOM035_OPTIONS : []);
    return { options, useNomDefaults };
  };

  const findOptionMatch = (options, answerValue) => {
    if (!answerValue && answerValue !== 0) return null;
    const normalized = String(answerValue).trim().toLowerCase();
    return options.find(opt => {
      if (opt.value != null && String(opt.value).trim().toLowerCase() === normalized) return true;
      if (opt.label != null && String(opt.label).trim().toLowerCase() === normalized) return true;
      if (opt.id != null && String(opt.id) === String(answerValue)) return true;
      return false;
    }) || null;
  };

  const normalizeResponseLabel = (question, optId, free, val) => {
    if (free) return String(free);
    const options = extractQuestionOptions(question);

    if (optId != null) {
      const match = options.find(opt => opt.id != null && String(opt.id) === String(optId));
      if (match) return match.value;
    }

    if (val != null) {
      const match = options.find(opt => {
        if (opt.numericValue != null && !Number.isNaN(Number(opt.numericValue))) {
          return Number(opt.numericValue) === Number(val);
        }
        return String(opt.value).toLowerCase() === String(val).toLowerCase();
      });
      if (match) return match.value;
    }

    if (options.length === 0 && val != null) {
      return canonicalizeLabel(val);
    }

    return null;
  };
  
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
            return { ...s, questions: normalizeQuestionList(qs) };
          } catch (err) {
            // Fallback: try the regular survey endpoint which may include questions
            try {
              const sRes = await getSurveyById(s.id);
              const sd = sRes.data || {};
              const qs = sd.questions || [];
              return { ...s, questions: normalizeQuestionList(qs) };
            } catch (err2) {
              return { ...s, questions: normalizeQuestionList(s.questions || []) };
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

          // Load responses for this application to prefill (server-filtered)
          const responsesRes = await getSurveyResponsesByApplication(data.applicationId);
          const filtered = responsesRes.data || [];

          const prevAnswers = {};
          filtered.forEach(r => {
            const qid = r.questionId ?? r.question_id ?? r.question?.id;
            const optId = r.optionAnswerId ?? r.option_answer_id ?? r.optionAnswer?.id ?? r.option_answer;
            const free = r.free_text ?? r.textAnswer ?? r.freeText ?? r.text_answer ?? r.freeTextAnswer ?? r.textAnswer;
            const val = r.value ?? r.valueAnswer ?? r.score;

            // Normalize to exact option label used in the UI (avoid mixing numbers and labels)
            const q = surveyObj.questions?.find(qq => String(qq.id) === String(qid));
            const label = normalizeResponseLabel(q, optId, free, val);
            if (label != null) prevAnswers[String(qid)] = label;
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

         // Load responses for this application (server-filtered)
         const appId = match.id ?? match.applicationId ?? match.surveyApplicationId;
         const responsesRes = await getSurveyResponsesByApplication(appId);
         const filtered = responsesRes.data || [];

         // Prefill answers map so fields show existing values
         const prevAnswers = {};
         filtered.forEach(r => {
           const qid = r.questionId ?? r.question_id ?? r.question?.id;
           const optId = r.optionAnswerId ?? r.option_answer_id ?? r.optionAnswer?.id ?? r.option_answer;
           const free = r.free_text ?? r.textAnswer ?? r.freeText ?? r.text_answer ?? r.freeTextAnswer ?? r.textAnswer;
           const val = r.value ?? r.valueAnswer ?? r.score;

           // Normalize to exact option label used in the UI (avoid mixing numbers and labels)
           const q = surveyObj.questions?.find(qq => String(qq.id) === String(qid));
           const label = normalizeResponseLabel(q, optId, free, val);
           if (label != null) prevAnswers[String(qid)] = label;
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
       } else {
         // No direct matching application found: try filtered responses (employee + survey)
         console.log('⚠️ No survey application found, checking filtered responses...');
         try {
           const filteredRes = await getFilteredResponses({ employeeId: String(employeeId), surveyId: String(surveyObj.id) });
           const filtered = filteredRes.data || [];
           console.log('📊 Filtered responses found:', filtered.length);
           
           if (filtered.length > 0) {
             // Prefill answers from any existing responses
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
             setExistingApplication({ foundResponses: true, responsesCount: filtered.length, status: 'completado' });

             // Disable form if we have responses covering the survey
             const totalQuestionsCount = Array.isArray(surveyObj.questions) ? surveyObj.questions.length : 0;
             
             console.log(`📈 Coverage: ${filtered.length} responses for ${totalQuestionsCount} questions`);
             
             if (totalQuestionsCount > 0 && filtered.length >= totalQuestionsCount) {
               console.log('🔒 Disabling form - all questions answered');
               setFormDisabled(true);
             } else if (filtered.length > 0) {
               // Partial responses exist - disable form to prevent duplicates
               console.log('🔒 Disabling form - partial responses found (preventing duplicates)');
               setFormDisabled(true);
             }
           }
         } catch (err) {
           console.warn('Could not check filtered responses fallback', err);
         }
       }
    } catch (err) {
      console.error('Error in checkExistingSubmission:', err);
    }
  }, [selectedEmployee, selectedSurvey, expandedModule]);
  
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

  const setAnswerValue = (qid, value) =>
    setAnswers(prev => ({ ...prev, [String(qid)]: value }));

  const toggleMultiSelectAnswer = (qid, optionValue) => {
    setAnswers(prev => {
      const key = String(qid);
      const current = Array.isArray(prev[key]) ? prev[key] : [];
      const exists = current.some(v => String(v) === String(optionValue));
      const next = exists
        ? current.filter(v => String(v) !== String(optionValue))
        : [...current, optionValue];
      return { ...prev, [key]: next };
    });
  };

  // If backend supplies selectedSurvey.modules, each module should include its questions
  // Helper to check completion of a module object
  const isModuleComplete = (module) => {
    if (!module || !Array.isArray(module.questions)) return false;
    return module.questions.every(q => {
      const v = answers[q.id] ?? answers[String(q.id)] ?? '';
      return String(v).trim() !== '';
    });
  };

  // Calcular progreso total
  const getTotalProgress = () => {
    if (!selectedSurvey?.questions) return 0;
    const totalQuestions = selectedSurvey.questions.length;
    const answeredQuestions = selectedSurvey.questions.filter(q => String(getAnswer(q.id)).trim() !== "").length;
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
        const answerValue = getAnswer(question.id);
        const hasAnswer = Array.isArray(answerValue)
          ? answerValue.length > 0
          : String(answerValue ?? '').trim() !== '';

        if (!hasAnswer) continue;

        const { options: resolvedOptions, useNomDefaults } = resolveQuestionOptions(question);
        const basePayload = {
          surveyApplicationId,
          questionId: Number(question.id)
        };

        if (Array.isArray(answerValue)) {
          const joined = answerValue.join(', ');
          responses.push({
            ...basePayload,
            optionAnswerId: null,
            textAnswer: joined,
            freeText: joined
          });
          continue;
        }

        if (resolvedOptions.length > 0) {
          const match = findOptionMatch(resolvedOptions, answerValue);
          const payload = {
            ...basePayload,
            optionAnswerId: match?.id ?? null,
          };
          if (match?.numericValue != null && !Number.isNaN(Number(match.numericValue))) {
            payload.value = Number(match.numericValue);
          }
          if (!match?.id) {
            payload.textAnswer = answerValue;
            payload.freeText = answerValue;
          }
          responses.push(payload);
          continue;
        }

        if (useNomDefaults) {
          const canonical = canonicalizeLabel(answerValue);
          const match = NOM035_OPTIONS.find(opt => opt.label === canonical);
          responses.push({
            ...basePayload,
            optionAnswerId: null,
            value: match?.numericValue,
            textAnswer: canonical
          });
          continue;
        }

        responses.push({
          ...basePayload,
          optionAnswerId: null,
          textAnswer: String(answerValue),
          freeText: String(answerValue)
        });
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
      
      // Instead of clearing the form, reload the check to show read-only mode
      // Keep the employee and survey selected so user can see the completed state
      await checkExistingSubmission(selectedEmployee, selectedSurvey);
      
      // Scroll to top to show the warning message
      window.scrollTo({ top: 0, behavior: 'smooth' });
      
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
    const canon = canonicalizeLabel(answerText);
    const optionMapping = {
      'Siempre': 1,
      'Casi siempre': 2,
      'Algunas veces': 3,
      'Casi nunca': 4,
      'Nunca': 5
    };
    return optionMapping[canon] || 1; // Default a "Siempre" si no se encuentra
  };

  // Renderizar pregunta individual
  const renderQuestion = (question, index) => {
    const questionType = normalizeQuestionType(question);
    const { options: resolvedOptions, useNomDefaults } = resolveQuestionOptions(question);
    const hasOptions = resolvedOptions.length > 0;
    const isMultiSelect = questionType === 'multi_select' && hasOptions;
    const isDateQuestion = questionType === 'date';
    const answerValue = getAnswer(question.id);
    const radioValue = useNomDefaults ? canonicalizeLabel(answerValue) : (answerValue ?? '');
    const selectedMultiValues = Array.isArray(answerValue) ? answerValue : [];

    const renderRadioOptions = () => (
      <FormControl component="fieldset">
        <RadioGroup
          value={radioValue}
          onChange={e => {
            const next = useNomDefaults ? canonicalizeLabel(e.target.value) : e.target.value;
            setAnswerValue(question.id, next);
          }}
          disabled={formDisabled}
        >
          {resolvedOptions.map((option, optIndex) => (
            <FormControlLabel
              key={option.id ?? option.value ?? optIndex}
              value={option.value}
              control={<Radio disabled={formDisabled} />}
              label={option.label}
            />
          ))}
        </RadioGroup>
      </FormControl>
    );

    const renderMultiSelect = () => (
      <FormControl component="fieldset">
        <FormGroup>
          {resolvedOptions.map((option, optIndex) => (
            <FormControlLabel
              key={option.id ?? option.value ?? optIndex}
              control={
                <Checkbox
                  checked={selectedMultiValues.some(v => String(v) === String(option.value))}
                  onChange={() => toggleMultiSelectAnswer(question.id, option.value)}
                  disabled={formDisabled}
                />
              }
              label={option.label}
            />
          ))}
        </FormGroup>
      </FormControl>
    );

    const renderTextField = () => (
      <TextField
        fullWidth
        multiline={!isDateQuestion}
        type={isDateQuestion ? 'date' : 'text'}
        rows={isDateQuestion ? 1 : 2}
        value={typeof answerValue === 'string' ? answerValue : ''}
        onChange={e => setAnswerValue(question.id, e.target.value)}
        placeholder="Escriba su respuesta aquí..."
        variant="outlined"
        disabled={formDisabled}
        InputLabelProps={isDateQuestion ? { shrink: true } : undefined}
      />
    );

    return (
      <Card key={question.id} sx={{ mb: 2, border: '1px solid #e0e0e0' }}>
        <CardContent>
          <Typography variant="body1" sx={{ mb: 2, fontWeight: 500 }}>
            {index + 1}. {question.text}
          </Typography>

          {isMultiSelect
            ? renderMultiSelect()
            : hasOptions
              ? renderRadioOptions()
              : renderTextField()}
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
              {surveys.filter(Boolean).map(s => (
                <MenuItem key={s.id} value={s.id} sx={{ whiteSpace: 'normal', minHeight: 48 }}>
                  {(s.title || s.name || `Encuesta ${s.id}`)} ({s.questions?.length || 0} preguntas)
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
                {selectedSurvey.title || selectedSurvey.name || `Encuesta ${selectedSurvey.id}`}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                {selectedSurvey.description || ''}
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

      {/* Módulos de Preguntas: usar módulos del backend si existen, si no mostrar lista plana */}
      {selectedSurvey && selectedSurvey.questions && (
        <Box>
          {Array.isArray(selectedSurvey.modules) && selectedSurvey.modules.length > 0 ? (
            <Box>
              <Alert severity="info" sx={{ mb: 3 }}>
                <Typography variant="body2">
                  Esta encuesta está organizada por módulos. Puede navegar entre módulos.
                </Typography>
              </Alert>

              {selectedSurvey.modules.map((module, idx) => {
                const moduleId = module.id ?? idx;
                const moduleQuestions = Array.isArray(module.questions) && module.questions.length > 0
                  ? module.questions
                  : // if module provides questionIds, resolve them from selectedSurvey.questions
                    (Array.isArray(module.questionIds) ? selectedSurvey.questions.filter(q => module.questionIds.includes(q.id) || module.questionIds.includes(String(q.id))) : []);

                if (!moduleQuestions || moduleQuestions.length === 0) return null;

                const complete = isModuleComplete({ questions: moduleQuestions });

                return (
                  <Accordion key={String(moduleId)} expanded={expandedModule === String(moduleId) || expandedModule === moduleId} onChange={(e, isExpanded) => setExpandedModule(isExpanded ? moduleId : null)} sx={{ mb: 2, border: '1px solid #e0e0e0' }}>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ backgroundColor: module.color ?? '#f5f5f5', '&:hover': { backgroundColor: (module.color ?? '#f5f5f5') + 'dd' } }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
                        <Typography variant="h6" sx={{ fontWeight: 600 }}>{module.name ?? `Módulo ${idx+1}`}</Typography>
                        {complete && (<CheckCircleIcon color="success" />)}
                        <Box sx={{ marginLeft: 'auto', mr: 2 }}><Chip label={`${moduleQuestions.length} preguntas`} size="small" variant="outlined"/></Box>
                      </Box>
                    </AccordionSummary>
                    <AccordionDetails sx={{ p: 3 }}>
                      {module.description ? <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>{module.description}</Typography> : null}
                      {moduleQuestions.map((question, index) => renderQuestion(question, index))}
                    </AccordionDetails>
                  </Accordion>
                );
              })}
            </Box>
          ) : (
            // Fallback: flat list of questions
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" sx={{ mb: 3, fontWeight: 600 }}>Preguntas de la Encuesta</Typography>
              {selectedSurvey.questions.map((question, index) => renderQuestion(question, index))}
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
