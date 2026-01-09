import React, { useState, useEffect, useCallback, useMemo, useRef, useDeferredValue } from "react";
import { getSurveys, submitSurveyResponse, getSurveyById, getSurveyWithQuestions, createSurveyApplication, getSurveyApplications, getSurveyResponsesByApplication, completeSurveyApplication } from "../api/nom035";
import debounce from 'lodash.debounce';
import { 
  Box, Button, Paper, MenuItem, Typography, 
  Card, CardContent, LinearProgress,
  Chip, FormControl, RadioGroup, FormControlLabel, 
  Radio, Accordion, AccordionSummary, AccordionDetails, Alert, Select, InputLabel,
  Checkbox, TextField, FormGroup, Stack, Table, TableBody, TableCell, TableHead, TableRow
} from "@mui/material";
import { 
  ExpandMore as ExpandMoreIcon, 
  CheckCircle as CheckCircleIcon,
  Assignment as AssignmentIcon 
} from '@mui/icons-material';
import { 
  normalizeQuestionList,
  LIKERT_LABELS,
  questionAnswered,
  buildResponsePayload,
  hydrateAnswerFromResponse
} from "../utils/surveyUtils";

const MENU_PROPS = {
  PaperProps: {
    style: {
      minWidth: 520,
      maxHeight: 600,
      padding: '8px'
    }
  }
};

const QUESTIONS_PER_PAGE = 10;

const toNumericId = (value) => {
  const parsed = parseInt(value, 10);
  return Number.isNaN(parsed) ? null : parsed;
};

const extractSurveyIdFromApplication = (application) => {
  if (!application) return null;

  const direct = toNumericId(application.surveyId ?? application.survey_id);
  if (direct != null) return direct;

  const nestedSurvey = application.survey || application.surveyDto || application.survey_dto;
  const nestedId = toNumericId(
    nestedSurvey?.id ??
    nestedSurvey?.surveyId ??
    nestedSurvey?.survey_id
  );
  if (nestedId != null) return nestedId;

  const companySurvey = application.companySurvey ?? application.company_survey;
  const companySurveyId = toNumericId(
    companySurvey?.surveyId ??
    companySurvey?.survey_id ??
    companySurvey?.survey?.id
  );
  if (companySurveyId != null) return companySurveyId;

  return null;
};

export default function EmployeeSurveyAnswer() {
  const [surveys, setSurveys] = useState([]);
  const [selectedSurvey, setSelectedSurvey] = useState(null);
  const [answers, setAnswers] = useState({});
  const [expandedModule, setExpandedModule] = useState(null);
  const [existingApplication, setExistingApplication] = useState(null);
  const [formDisabled, setFormDisabled] = useState(false);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [completedSurveys, setCompletedSurveys] = useState({}); // { [surveyId]: true }
  const [surveyTitleFilter, setSurveyTitleFilter] = useState('');
  // NEW: gating state for sequential sections
  const [enabledSectionMaxIndex, setEnabledSectionMaxIndex] = useState(0);
  const [savingSection, setSavingSection] = useState(false);
  const [surveyApplications, setSurveyApplications] = useState([]);
  const [sectionPageIndex, setSectionPageIndex] = useState(0);
  const initialDataLoadedRef = useRef(false);
  const responsesCacheRef = useRef(new Map());
  const [autoSaving, setAutoSaving] = useState(false);
  const deferredAnswers = useDeferredValue(answers);

  const refreshSurveyApplications = useCallback(async () => {
    try {
      const response = await getSurveyApplications();
      const appList = response.data || [];
      setSurveyApplications(appList);
      return appList;
    } catch (error) {
      console.error('Error fetching survey applications:', error);
      setSurveyApplications([]);
      return [];
    }
  }, []);

  const getAnswer = useCallback((qid) => answers[String(qid)], [answers]);
  const getStableAnswer = useCallback((qid) => deferredAnswers[String(qid)], [deferredAnswers]);

  const canonicalLabels = LIKERT_LABELS;
  const NOM035_OPTIONS = canonicalLabels.map((label, idx) => ({
    id: `likert-${idx + 1}`,
    optionAnswerId: null,
    label,
    value: label,
    requiresFreeText: false,
    numericValue: idx + 1
  }));
  const mapResponsesToAnswers = useCallback((surveyObj, responses) => {
    if (!surveyObj?.questions || !Array.isArray(responses)) {
      return {};
    }
    const questionLookup = surveyObj.questions.reduce((acc, question) => {
      if (question?.id != null) {
        acc[String(question.id)] = question;
      }
      return acc;
    }, {});
    const parsedAnswers = {};
    responses.forEach((response) => {
      const qid = response?.questionId ?? response?.question_id ?? response?.question?.id;
      if (qid == null) return;
      const question = questionLookup[String(qid)];
      if (!question) return;
      const hydrated = hydrateAnswerFromResponse(question, response);
      if (hydrated != null) {
        parsedAnswers[String(qid)] = hydrated;
      }
    });
    return parsedAnswers;
  }, []);
  
  useEffect(() => {
    if (initialDataLoadedRef.current) return;
    initialDataLoadedRef.current = true;

    const loadData = async () => {
      try {
        const apps = await refreshSurveyApplications();

        const assignedSurveyIds = new Set();
        apps.forEach(app => {
          const surveyId = extractSurveyIdFromApplication(app);
          if (surveyId != null) {
            assignedSurveyIds.add(surveyId);
          }
        });

        const surveysRes = await getSurveys();
        const surveysData = surveysRes.data || [];
        const filteredSurveys = surveysData.filter(s => assignedSurveyIds.has(parseInt(s.id)));

        const surveysWithQuestions = await Promise.all(
          filteredSurveys.map(async (s) => {
            try {
              const qRes = await getSurveyWithQuestions(s.id);
              const qs = Array.isArray(qRes.data) ? qRes.data : (qRes.data?.questions || []);
              return { ...s, questions: normalizeQuestionList(qs) };
            } catch (err) {
              try {
                const sRes = await getSurveyById(s.id);
                const sd = sRes.data || {};
                const qs = sd.questions || [];
                return { ...s, questions: normalizeQuestionList(qs) };
              } catch (err2) {
                return { ...s, questions: normalizeQuestionList(s.questions || []) };
              }
            }
          })
        );

        setSurveys(surveysWithQuestions);

        try {
          const completedMap = {};
          const toLower = (s) => (s || '').toString().toLowerCase();
          apps.forEach(a => {
            const st = toLower(a.status);
            const completed = !!a.completedAt || st === 'completado' || st === 'completada' || st === 'completed';
            if (!completed) return;
            const appSurveyId = extractSurveyIdFromApplication(a);
            if (appSurveyId != null) {
              const sid = parseInt(appSurveyId);
              if (!isNaN(sid)) completedMap[sid] = true;
            }
          });
          setCompletedSurveys(completedMap);
        } catch (e) {
          console.warn('Could not compute completed surveys:', e?.message || e);
        }
      } catch (err) {
        console.error('Error loading surveys:', err);
        setSurveys([]);
        initialDataLoadedRef.current = false;
      }
    };

    loadData();
  }, [refreshSurveyApplications]);
  
  const checkExistingSubmission = useCallback(async (surveyObj = selectedSurvey, options = {}) => {
    const { forceRefresh = false } = options || {};
    setExistingApplication(null);
    // NO resetear formDisabled aquí - solo se debe establecer en true si está completada
    // setFormDisabled(false); REMOVIDO

    if (!surveyObj) return;

    try {
      let apps = surveyApplications;
      if (forceRefresh || !apps || apps.length === 0) {
        apps = await refreshSurveyApplications();
      }
      if (!apps || apps.length === 0) return;

      // Recolectar TODAS las apps para esta encuesta y seleccionar la más relevante
      const matches = apps.filter(a => {
        const appSurveyId = extractSurveyIdFromApplication(a);
        try {
          return appSurveyId != null && parseInt(appSurveyId) === parseInt(surveyObj.id);
        } catch (e) {
          return false;
        }
      });

      // Elegir preferentemente una app completada; si no, la de id más alto
      const toLower = (s) => (s || '').toString().toLowerCase();
      const isCompleted = (a) => {
        const st = toLower(a.status);
        return !!a.completedAt || st === 'completado' || st === 'completada' || st === 'completed';
      };

      let match = null;
      if (matches.length > 0) {
        const completedMatches = matches.filter(isCompleted)
          .sort((a, b) => {
            const ad = a.completedAt ? new Date(a.completedAt).getTime() : 0;
            const bd = b.completedAt ? new Date(b.completedAt).getTime() : 0;
            if (bd !== ad) return bd - ad; // más reciente primero
            return (b.id ?? 0) - (a.id ?? 0);
          });
        if (completedMatches.length > 0) {
          match = completedMatches[0];
        } else {
          match = matches.slice().sort((a, b) => (b.id ?? 0) - (a.id ?? 0))[0];
        }
      }

        if (match) {
        setExistingApplication(match);

        const appId = match.id ?? match.applicationId ?? match.surveyApplicationId;
          let hydratedAnswers = {};
          if (!appId) {
            setAnswers({});
          } else {
          let responsesData = [];
          if (!forceRefresh && responsesCacheRef.current.has(appId)) {
            responsesData = responsesCacheRef.current.get(appId);
          } else {
            const responsesRes = await getSurveyResponsesByApplication(appId);
            responsesData = responsesRes.data || [];
            responsesCacheRef.current.set(appId, responsesData);
          }
            hydratedAnswers = mapResponsesToAnswers(surveyObj, responsesData);
            setAnswers(hydratedAnswers);
        }

        // Verificar si está completada - mejorado para detectar el enum COMPLETADO del backend
        const st = (match.status ?? '').toLowerCase();
        const hasCompletedAt = !!match.completedAt;
        const statusIsCompleted = st === 'completado' || st === 'completada' || st === 'completed';
          const totalQuestions = Array.isArray(surveyObj.questions) ? surveyObj.questions.length : 0;
          const answeredQuestionCount = Object.keys(hydratedAnswers).length;
          const allQuestionsAnswered = totalQuestions > 0 && answeredQuestionCount >= totalQuestions;
        
        if (hasCompletedAt || statusIsCompleted || allQuestionsAnswered) {
          setFormDisabled(true);
        } else {
          // Solo establecer en false si NO está completada
          setFormDisabled(false);
        }
      } else {
        // No hay aplicación existente, habilitar el formulario
        setFormDisabled(false);
        setAnswers({});
      }

      if (apps && apps.length > 0) {
        try {
          const completedMap = {};
          const toLowerStatus = (s) => (s || '').toString().toLowerCase();
          apps.forEach(a => {
            const st = toLowerStatus(a.status);
            const completed = !!a.completedAt || st === 'completado' || st === 'completada' || st === 'completed';
            if (!completed) return;
            const appSurveyId = extractSurveyIdFromApplication(a);
            if (appSurveyId != null) {
              const sid = parseInt(appSurveyId);
              if (!isNaN(sid)) completedMap[sid] = true;
            }
          });
          setCompletedSurveys(completedMap);
        } catch (e) {
          console.warn('Could not compute completed surveys:', e?.message || e);
        }
      }
    } catch (err) {
      console.error('Error checking existing submission:', err);
    }
  }, [selectedSurvey, surveyApplications, refreshSurveyApplications]);

  useEffect(() => {
    if (selectedSurvey) {
      checkExistingSubmission(selectedSurvey);
    }
  }, [selectedSurvey, checkExistingSubmission]);

  // Helpers for sections
  const allQuestions = useMemo(() => selectedSurvey?.questions || [], [selectedSurvey]);
  const questionNumberMap = useMemo(() => {
    const map = {};
    allQuestions.forEach((question, index) => {
      if (question?.id != null) {
        map[String(question.id)] = index + 1;
      }
    });
    return map;
  }, [allQuestions]);
  const resolvedSurveyTitle = (q) => q.surveyTitle || q.survey_title || '';
  const sectionKey = (title) => {
    if (!title) return '';
    const s = String(title);
    const m = s.match(/^Gu[ií]a\s*([IVX]+)/i);
    if (m) {
      const roman = (m[1] || '').toUpperCase();
      return `Guía ${roman}`;
    }
    // default: part before dash or full title
    const dashIdx = s.indexOf(' - ');
    return dashIdx > 0 ? s.slice(0, dashIdx) : s;
  };
  // Derive ordered distinct section titles by walking questions
  const sectionTitles = useMemo(() => {
    const seen = new Set();
    const order = [];
    allQuestions.forEach(q => {
      const key = sectionKey(resolvedSurveyTitle(q));
      if (key && !seen.has(key)) { seen.add(key); order.push(key); }
    });
    return order;
  }, [allQuestions]);
  // NEW: map internal key -> full original title for display
  const sectionTitleMap = useMemo(() => {
    const map = {};
    allQuestions.forEach(q => {
      const full = resolvedSurveyTitle(q);
      const key = sectionKey(full);
      if (key && !map[key]) map[key] = full; // first occurrence keeps full text
    });
    return map;
  }, [allQuestions]);
  const questionsInSection = useCallback(
    (title) => allQuestions.filter(q => sectionKey(resolvedSurveyTitle(q)) === title),
    [allQuestions]
  );
  const questionHasAnswer = useCallback(
    (question) => questionAnswered(question, getStableAnswer(question.id)),
    [getStableAnswer]
  );
  const questionHasAnswerImmediate = useCallback(
    (question) => questionAnswered(question, getAnswer(question.id)),
    [getAnswer]
  );
  const isSectionComplete = useCallback(
    (title) => questionsInSection(title).every(questionHasAnswer),
    [questionsInSection, questionHasAnswer]
  );

  // Initialize/refresh gating when survey or answers change
  useEffect(() => {
    if (!selectedSurvey) return;
    if (sectionTitles.length === 0) return;

    // Determine last fully-completed section index and unlock next one
    let lastCompletedIdx = -1;
    sectionTitles.forEach((t, idx) => {
      if (isSectionComplete(t)) lastCompletedIdx = idx > lastCompletedIdx ? idx : lastCompletedIdx;
    });
    const nextUnlock = Math.min(sectionTitles.length - 1, Math.max(0, lastCompletedIdx + 1));
    setEnabledSectionMaxIndex(nextUnlock);

    // Ensure a valid current filter: prefer first incomplete; otherwise keep current
    if (!surveyTitleFilter || !sectionTitles.includes(surveyTitleFilter)) {
      const firstIncomplete = sectionTitles.find(t => !isSectionComplete(t)) || sectionTitles[0];
      setSurveyTitleFilter(firstIncomplete);
    }
  }, [selectedSurvey, sectionTitles, isSectionComplete, surveyTitleFilter]);

  const handleSurveyChange = async (e) => {
    const surveyId = e.target.value;
    const survey = surveys.find(s => String(s.id) === String(surveyId));
    setSelectedSurvey(survey || null);
    setAnswers({});
    setExpandedModule(null);
    setShowSuccessMessage(false);
    // Reset gating for new survey
    setEnabledSectionMaxIndex(0);
    setSurveyTitleFilter('');
    setSectionPageIndex(0);
  };

  const handleSectionFilterChange = (value) => {
    setSurveyTitleFilter(value);
    setSectionPageIndex(0);
  };

  // Función de guardado automático con debounce
  const autoSaveAnswers = useCallback(async () => {
    if (!selectedSurvey || formDisabled) return;
    
    try {
      setAutoSaving(true);
      
      // Ensure we have a survey application id
      let appId = existingApplication?.id ?? existingApplication?.applicationId ?? existingApplication?.surveyApplicationId;
      if (!appId) {
        const appRes = await createSurveyApplication({
          surveyId: selectedSurvey.id,
          status: 'en_progreso'
        });
        const createdApp = appRes.data || {};
        appId = createdApp.id ?? createdApp.applicationId ?? createdApp.surveyApplicationId ?? appRes.data?.id;
        if (appId) {
          setExistingApplication({ ...(createdApp || {}), id: appId, status: createdApp.status ?? 'en_progreso' });
          setSurveyApplications(prev => {
            const exists = prev.some(app => (app.id ?? app.applicationId ?? app.surveyApplicationId) === appId);
            return exists ? prev : [...prev, { ...createdApp, id: appId }];
          });
        }
      }

      if (!appId) {
        console.warn('No se pudo crear la aplicación de encuesta para auto-guardado');
        return;
      }

      // Guardar solo las respuestas que existen actualmente
      const allQs = selectedSurvey.questions || [];
      const responsesPayload = allQs
        .map(q => buildResponsePayload(q, getAnswer(q.id), appId))
        .filter(Boolean);

      if (responsesPayload.length > 0) {
        await submitSurveyResponse(responsesPayload);
        console.log('✅ Auto-guardado exitoso:', responsesPayload.length, 'respuestas');
      }
    } catch (err) {
      console.error('Error en auto-guardado:', err);
    } finally {
      setAutoSaving(false);
    }
  }, [selectedSurvey, formDisabled, existingApplication, getAnswer]);

  // Debounced version - se ejecuta 2 segundos después del último cambio
  const debouncedAutoSave = useMemo(
    () => debounce(autoSaveAnswers, 2000),
    [autoSaveAnswers]
  );

  const handleAnswerChange = (questionId, value) => {
    setAnswers(prev => {
      const newAnswers = { ...prev, [String(questionId)]: value };
      
      // Limpiar respuestas de preguntas que se ocultan al responder "No"
      // Pregunta 31 (ID 104): Si cambia a 'No', elimina respuestas de IDs 105-108
      if (Number(questionId) === 104 && (value === 'No' || value?.label === 'No')) {
        [105, 106, 107, 108].forEach(id => delete newAnswers[String(id)]);
      }
      
      // Pregunta 37 (ID 110): Si cambia a 'No', elimina respuestas de IDs 111-114
      if (Number(questionId) === 110 && (value === 'No' || value?.label === 'No')) {
        [111, 112, 113, 114].forEach(id => delete newAnswers[String(id)]);
      }
      
      // Pregunta 42 (ID 115): Si cambia a 'No', elimina respuestas de IDs 116-117
      if (Number(questionId) === 115 && (value === 'No' || value?.label === 'No')) {
        [116, 117].forEach(id => delete newAnswers[String(id)]);
      }
      
      // Pregunta 45 (ID 118): Si cambia a 'No', elimina respuestas de IDs 119-122
      if (Number(questionId) === 118 && (value === 'No' || value?.label === 'No')) {
        [119, 120, 121, 122].forEach(id => delete newAnswers[String(id)]);
      }
      
      // Pregunta 58 (ID 131): Si cambia a 'No', elimina respuestas de IDs 132-138
      if (Number(questionId) === 131 && (value === 'No' || value?.label === 'No')) {
        [132, 133, 134, 135, 136, 137, 138].forEach(id => delete newAnswers[String(id)]);
      }
      
      return newAnswers;
    });
    
    // Activar auto-guardado después de cada cambio
    if (!formDisabled) {
      debouncedAutoSave();
    }
  };

  const renderLikertControl = (question, answerValue, disabled) => {
    const likertValue = typeof answerValue === 'string' ? answerValue : '';
    return (
      <FormControl component="fieldset" fullWidth disabled={disabled}>
        <RadioGroup
          value={likertValue}
          onChange={(e) => !disabled && handleAnswerChange(question.id, e.target.value)}
        >
          {LIKERT_LABELS.map(label => {
            const selected = likertValue === label;
            return (
              <FormControlLabel
                key={label}
                value={label}
                disabled={disabled}
                control={
                  <Radio 
                    disabled={disabled}
                    sx={{
                      ...(disabled && selected && {
                        color: 'success.main',
                        '&.Mui-checked': {
                          color: 'success.main',
                        },
                        '&.Mui-disabled': {
                          color: 'success.main',
                        }
                      }),
                      ...(disabled && !selected && {
                        '&.Mui-disabled': {
                          color: 'rgba(0, 0, 0, 0.26)'
                        }
                      })
                    }}
                  />
                }
                label={
                  <Typography 
                    sx={{ 
                      fontWeight: disabled && selected ? 600 : 400,
                      color: disabled && selected ? 'success.dark' : 'inherit',
                      ...(disabled && !selected && {
                        color: 'text.disabled'
                      })
                    }}
                  >
                    {label}
                  </Typography>
                }
                sx={{
                  ...(disabled && {
                    opacity: selected ? 1 : 0.5,
                    py: 0.5,
                    cursor: 'not-allowed',
                    pointerEvents: 'none'
                  })
                }}
              />
            );
          })}
        </RadioGroup>
      </FormControl>
    );
  };

  const determineQuestionKind = (question) => {
    if (!question) return '';
    if (typeof question.kind === 'string') return question.kind.toLowerCase();
    return String(question.type || question.responseType || '').toLowerCase();
  };

  const coerceOptionArray = (source) => {
    if (!source) return [];
    if (Array.isArray(source)) return source;
    if (typeof source === 'string') {
      return source
        .split(/[\r\n,;|]+/)
        .map((part) => part.trim())
        .filter(Boolean);
    }
    if (typeof source === 'object') {
      return Object.values(source);
    }
    return [];
  };

  const extractQuestionOptions = (question) => {
    if (!question) return [];
    if (Array.isArray(question.normalizedOptions) && question.normalizedOptions.length) {
      return question.normalizedOptions.map((opt, idx) => ({
        id: opt.optionAnswerId ?? opt.id ?? `${question.id || 'q'}-opt-${idx}`,
        optionAnswerId: opt.optionAnswerId ?? opt.id ?? null,
        label: opt.label ?? opt.text ?? opt.value ?? '',
        value: opt.value ?? opt.id ?? opt.label ?? '',
        requiresFreeText: Boolean(opt.requiresFreeText)
      })).filter((opt) => opt.label);
    }

    const sources = [
      question.options,
      question.optionAnswers,
      question.option_answers,
      question.optionAnswerDtos,
      question.option_answer_dtos,
      question.optionAnswerList,
      question.option_answer_list,
      question.responseOptions,
      question.response_options,
      question.answers,
      question.metadata?.options
    ];

    for (const source of sources) {
      const list = coerceOptionArray(source)
        .map((opt, idx) => {
          if (opt == null) return null;
          if (typeof opt === 'string') {
            return {
              id: `${question.id || 'q'}-opt-${idx}`,
              optionAnswerId: null,
              label: opt,
              value: opt,
              requiresFreeText: opt.trim().toLowerCase() === 'otros'
            };
          }
          return {
            id: opt.id ?? opt.optionAnswerId ?? opt.value ?? `${question.id || 'q'}-opt-${idx}`,
            optionAnswerId: opt.optionAnswerId ?? opt.id ?? null,
            label: opt.text ?? opt.label ?? opt.name ?? opt.value ?? `Opción ${idx + 1}`,
            value: opt.value ?? opt.id ?? opt.text ?? opt.label ?? '',
            requiresFreeText: Boolean(opt.requiresFreeText ?? opt.requires_free_text)
          };
        })
        .filter(Boolean);
      if (list.length) return list;
    }

    if (typeof question === 'object') {
      for (const [key, value] of Object.entries(question)) {
        if (!value) continue;
        if (Array.isArray(value) && /option/i.test(key)) {
          const list = coerceOptionArray(value)
            .map((opt, idx) => {
              if (opt == null) return null;
              if (typeof opt === 'string') {
                return {
                  id: `${question.id || 'q'}-opt-${idx}`,
                  optionAnswerId: null,
                  label: opt,
                  value: opt,
                  requiresFreeText: opt.trim().toLowerCase() === 'otros'
                };
              }
              return {
                id: opt.id ?? opt.optionAnswerId ?? opt.value ?? `${question.id || 'q'}-opt-${idx}`,
                optionAnswerId: opt.optionAnswerId ?? opt.id ?? null,
                label: opt.text ?? opt.label ?? opt.name ?? opt.value ?? `Opción ${idx + 1}`,
                value: opt.value ?? opt.id ?? opt.text ?? opt.label ?? '',
                requiresFreeText: Boolean(opt.requiresFreeText ?? opt.requires_free_text)
              };
            })
            .filter(Boolean);
          if (list.length) return list;
        }
      }
    }

    return [];
  };

  const shouldUseDefaultLikert = (question, backendOptions) => {
    if (backendOptions.length > 0) return false;
    const type = determineQuestionKind(question);
    return type === 'likert' || type === 'single' || type === 'single_choice' || type === 'radio' || type === '';
  };

  const resolveQuestionOptions = (question) => {
    const backendOptions = extractQuestionOptions(question);
    const useNomDefaults = shouldUseDefaultLikert(question, backendOptions);
    const options = backendOptions.length ? backendOptions : (useNomDefaults ? NOM035_OPTIONS : []);
    return { options, useNomDefaults };
  };

  const optionKey = (option, index) => {
    if (!option) return String(index);
    return String(option.optionAnswerId ?? option.id ?? option.value ?? option.label ?? index);
  };

  const renderSingleChoiceControl = (question, answerValue, disabled) => {
    const { options } = resolveQuestionOptions(question);
    if (!options.length) {
      return <Alert severity="warning">Esta pregunta no tiene opciones configuradas.</Alert>;
    }

    const selectedOptionId = answerValue?.optionId ? String(answerValue.optionId) : '';
    const showOtherField = options.some((opt, idx) => opt.requiresFreeText && optionKey(opt, idx) === selectedOptionId);

    return (
      <Box>
        <FormControl component="fieldset" fullWidth disabled={disabled}>
          <RadioGroup
            value={selectedOptionId}
            onChange={(e) => {
              if (disabled) return;
              const option = options.find((opt, idx) => optionKey(opt, idx) === e.target.value);
              if (!option) return;
              handleAnswerChange(question.id, {
                optionId: e.target.value,
                optionAnswerId: option.optionAnswerId ?? option.id ?? null,
                label: option.label,
                otherText: option.requiresFreeText ? (answerValue?.otherText || '') : ''
              });
            }}
          >
            {options.map((option, idx) => {
              const optionId = optionKey(option, idx);
              return (
                <FormControlLabel
                  key={optionId}
                  value={optionId}
                  control={<Radio disabled={disabled} />}
                  label={option.label}
                  disabled={disabled}
                />
              );
            })}
          </RadioGroup>
        </FormControl>
        {showOtherField && (
          <TextField
            label="Especifica (opcional)"
            fullWidth
            sx={{ 
              mt: 2,
              '& .MuiInputBase-root': {
                backgroundColor: (answerValue?.otherText && answerValue.otherText.trim()) ? '#e3f2fd' : 'white'
              }
            }}
            value={answerValue?.otherText || ''}
            onChange={(e) => handleAnswerChange(question.id, {
              ...(answerValue || {}),
              optionId: selectedOptionId,
              otherText: e.target.value
            })}
            disabled={disabled}
          />
        )}
      </Box>
    );
  };

  const renderMultiSelectControl = (question, answerValue, disabled) => {
    const { options } = resolveQuestionOptions(question);
    if (!options.length) {
      return <Alert severity="warning">Esta pregunta no tiene opciones configuradas.</Alert>;
    }

    // Forzar radio button en la pregunta 25
    const isPregunta25 = (questionNumberMap[String(question.id)] === 25);

    if (isPregunta25) {
      const selectedId = typeof answerValue === 'string' ? answerValue : '';
      return (
        <FormControl component="fieldset">
          <RadioGroup
            value={selectedId}
            onChange={e => !disabled && handleAnswerChange(question.id, e.target.value)}
          >
            {options.map((option, idx) => {
              const optionId = optionKey(option, idx);
              return (
                <FormControlLabel
                  key={optionId}
                  value={optionId}
                  control={<Radio disabled={disabled} />}
                  label={option.label}
                  disabled={disabled}
                />
              );
            })}
          </RadioGroup>
        </FormControl>
      );
    }

    // Comportamiento normal para otras preguntas
    const selectedIds = Array.isArray(answerValue?.optionIds)
      ? answerValue.optionIds.map(id => String(id))
      : [];

    const toggleOption = (optionId) => {
      if (disabled) return;
      const stringId = String(optionId);
      const current = new Set(selectedIds);
      if (current.has(stringId)) {
        current.delete(stringId);
      } else {
        current.add(stringId);
      }
      handleAnswerChange(question.id, {
        optionIds: Array.from(current),
        otherText: answerValue?.otherText || ''
      });
    };

    const requiresOther = options.some(opt => opt.requiresFreeText && selectedIds.includes(String(opt.id)));

    return (
      <Box>
        <FormGroup>
          {options.map((option, idx) => {
            const optionId = optionKey(option, idx);
            const checked = selectedIds.includes(optionId);
            return (
              <FormControlLabel
                key={optionId}
                control={<Checkbox checked={checked} onChange={() => toggleOption(optionId)} disabled={disabled} />}
                label={option.label}
                disabled={disabled}
              />
            );
          })}
        </FormGroup>
        {requiresOther && (
          <TextField
            label="Especifica (opcional)"
            fullWidth
            sx={{ 
              mt: 2,
              '& .MuiInputBase-root': {
                backgroundColor: (answerValue?.otherText && answerValue.otherText.trim()) ? '#e3f2fd' : 'white'
              }
            }}
            value={answerValue?.otherText || ''}
            onChange={(e) => handleAnswerChange(question.id, {
              optionIds: selectedIds,
              otherText: e.target.value
            })}
            disabled={disabled}
          />
        )}
      </Box>
    );
  };

  const renderTextControl = (question, answerValue, disabled) => {
    const kind = (question.kind || '').toLowerCase();
    const inputType = ['date', 'time', 'number'].includes(kind) ? kind : 'text';
    const multiline = kind === 'text' ? Boolean(question.metadata?.multiline ?? (question.text?.length > 120)) : false;
    const minRows = question.metadata?.rows ?? (multiline ? 3 : 1);
    const value = typeof answerValue === 'string' ? answerValue : '';
    
    // Solo las preguntas 159, 163, 168 son opcionales
    const isOptional = [159, 163, 168].includes(question.id);
    const hasValue = value && value.trim().length > 0;

    // Para la pregunta de Fecha de Nacimiento (id 75), mostrar solo el input nativo sin label ni placeholder
    if (kind === 'date' && question.id === 75) {
      return (
        <Box sx={{ mt: 2, mb: 2 }}>
          <input
            type="date"
            value={value}
            onChange={e => handleAnswerChange(question.id, e.target.value)}
            disabled={disabled}
            style={{
              width: '100%',
              padding: '12px',
              fontSize: '16px',
              borderRadius: '4px',
              border: '1px solid #ccc',
              boxSizing: 'border-box',
              backgroundColor: (isOptional && hasValue) ? '#e3f2fd' : 'white'
            }}
          />
        </Box>
      );
    }
    // ...existing code...
    let label = question.metadata?.placeholder;
    if (!label) {
      label = isOptional ? 'Respuesta (opcional)' : 'Respuesta';
    }
    return (
      <TextField
        fullWidth
        type={inputType}
        multiline={multiline}
        minRows={minRows}
        value={value}
        onChange={(e) => handleAnswerChange(question.id, e.target.value)}
        disabled={disabled}
        label={label}
        sx={{
          '& .MuiInputBase-root': {
            backgroundColor: (isOptional && hasValue) ? '#e3f2fd' : 'white'
          }
        }}
      />
    );
  };

  const renderMatrixControl = (question, answerValue, disabled) => {
    const rows = question.metadata?.rows || [];
    const columns = question.metadata?.columns || [];
    if (!rows.length || !columns.length) {
      return <Alert severity="warning">Esta pregunta matricial no tiene filas u opciones configuradas.</Alert>;
    }

    const currentAnswer = (answerValue && typeof answerValue === 'object') ? answerValue : {};

    const toLabel = (item, fallbackLabel) => {
      if (item == null) return fallbackLabel;
      if (typeof item === 'string') return item;
      if (typeof item === 'number') return String(item);
      return item.label ?? item.text ?? item.title ?? fallbackLabel;
    };

    return (
      <Box sx={{ overflowX: 'auto' }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 600 }}>Reactivo</TableCell>
              {columns.map((col, colIdx) => (
                <TableCell key={colIdx} align="center" sx={{ fontWeight: 600 }}>
                  {toLabel(col, `Opción ${colIdx + 1}`)}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((row, rowIdx) => {
              const rowKey = String(row);
              const displayLabel = toLabel(row, `Fila ${rowIdx + 1}`);
              const rowValue = currentAnswer[rowKey] ?? '';
              return (
                <TableRow key={rowKey}>
                  <TableCell sx={{ fontWeight: 500 }}>{displayLabel}</TableCell>
                  {columns.map((col, colIdx) => {
                    const colKey = typeof col === 'object'
                      ? (col.id ?? col.value ?? col.key ?? toLabel(col, `col-${colIdx}`))
                      : String(col ?? `col-${colIdx}`);
                    const checked = rowValue === colKey;
                    const handleMatrixChange = () => {
                      if (disabled) return;
                      handleAnswerChange(question.id, {
                        ...currentAnswer,
                        [rowKey]: colKey
                      });
                    };
                    return (
                      <TableCell key={colKey} align="center">
                        <Radio checked={checked} onChange={handleMatrixChange} disabled={disabled} />
                      </TableCell>
                    );
                  })}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Box>
    );
  };

  const renderQuestionInput = (question, disabled) => {
    const kind = (question.kind || question.type || '').toLowerCase();
    const answerValue = getAnswer(question.id);

    if (kind === 'likert') {
      return renderLikertControl(question, answerValue, disabled);
    }
    if (kind === 'single' || kind === 'single_choice' || kind === 'single-choice') {
      return renderSingleChoiceControl(question, answerValue, disabled);
    }
    if (kind === 'multi' || kind === 'multi_select' || kind === 'multi-select') {
      return renderMultiSelectControl(question, answerValue, disabled);
    }
    if (['text', 'date', 'time', 'number'].includes(kind)) {
      return renderTextControl(question, answerValue, disabled);
    }
    if (kind === 'matrix') {
      return renderMatrixControl(question, answerValue, disabled);
    }
    return renderLikertControl(question, answerValue, disabled);
  };

  // Save only the current section's answers and unlock the next section
  // Función helper para obtener IDs de preguntas que deben estar ocultas o son opcionales
  const getOptionalQuestionIds = useCallback(() => {
    const optionalIds = [];

    // Helper para verificar si una respuesta es "No"
    const isNoAnswer = (answer) => {
      if (!answer) return true; // No respondió = considera como "No"
      if (typeof answer === 'string') return answer.toLowerCase() === 'no';
      if (answer.label) return answer.label.toLowerCase() === 'no';
      if (answer.optionId) {
        // Si tiene optionId, buscar la opción y ver su texto
        const question = allQuestions.find(q => q.id === answer.questionId);
        if (question && question.options) {
          const option = question.options.find(o => String(o.id) === String(answer.optionId));
          if (option && option.text) return option.text.toLowerCase() === 'no';
        }
      }
      return false;
    };

    // Pregunta 31 (ID 104): Si responde "No" → oculta 32-35 (IDs 105-108)
    const pregunta31 = allQuestions.find(q => q.id === 104);
    const respuesta31 = pregunta31 ? getAnswer(pregunta31.id) : null;
    if (isNoAnswer(respuesta31)) {
      optionalIds.push(105, 106, 107, 108);
    }

    // Pregunta 37 (ID 110): Si responde "No" → oculta 38-41 (IDs 111-114)
    const pregunta37 = allQuestions.find(q => q.id === 110);
    const respuesta37 = pregunta37 ? getAnswer(pregunta37.id) : null;
    if (isNoAnswer(respuesta37)) {
      optionalIds.push(111, 112, 113, 114);
    }

    // Pregunta 42 (ID 115): Si responde "No" → oculta 43-44 (IDs 116-117)
    const pregunta42 = allQuestions.find(q => q.id === 115);
    const respuesta42 = pregunta42 ? getAnswer(pregunta42.id) : null;
    if (isNoAnswer(respuesta42)) {
      optionalIds.push(116, 117);
    }

    // Pregunta 45 (ID 118): Si responde "No" → oculta 46-49 (IDs 119-122)
    const pregunta45 = allQuestions.find(q => q.id === 118);
    const respuesta45 = pregunta45 ? getAnswer(pregunta45.id) : null;
    if (isNoAnswer(respuesta45)) {
      optionalIds.push(119, 120, 121, 122);
    }

    // Pregunta 58 (ID 131): Si responde "No" → oculta 59-65 (IDs 132-138)
    const pregunta58 = allQuestions.find(q => q.id === 131);
    const respuesta58 = pregunta58 ? getAnswer(pregunta58.id) : null;
    if (isNoAnswer(respuesta58)) {
      optionalIds.push(132, 133, 134, 135, 136, 137, 138);
    }

    // Solo estas 3 preguntas de tipo texto son opcionales:
    // ID 159 (Pregunta 86): Especificar cantidad de cigarros - OPCIONAL
    // ID 163 (Pregunta 90): Especificar consumo de alcohol - OPCIONAL
    // ID 168 (Pregunta 95): Especificar otra enfermedad - OPCIONAL
    const textQuestionIds = [159, 163, 168];
    optionalIds.push(...textQuestionIds);

    console.log('🔍 DEBUG getOptionalQuestionIds:', {
      respuesta31, isNo31: isNoAnswer(respuesta31),
      respuesta37, isNo37: isNoAnswer(respuesta37),
      respuesta42, isNo42: isNoAnswer(respuesta42),
      respuesta45, isNo45: isNoAnswer(respuesta45),
      respuesta58, isNo58: isNoAnswer(respuesta58),
      optionalIds
    });

    return optionalIds;
  }, [allQuestions, getAnswer]);

  const saveCurrentSection = async () => {
    if (!selectedSurvey) return;
    if (!surveyTitleFilter) return;

    const currentIndex = sectionTitles.indexOf(surveyTitleFilter);
    if (currentIndex === -1) return;

    const sectionQs = questionsInSection(surveyTitleFilter);
    
    // Obtener IDs de preguntas ocultas u opcionales (texto libre)
    const optionalIds = getOptionalQuestionIds();
    
    console.log('🔍 DEBUG saveCurrentSection:', {
      totalQuestions: sectionQs.length,
      optionalIds,
      sectionTitle: surveyTitleFilter
    });
    
    // Filtrar preguntas sin responder, excluyendo las opcionales
    let unanswered = sectionQs.filter(q => {
      // Si la pregunta es opcional (oculta o texto libre), no bloquea el guardado
      if (optionalIds.includes(Number(q.id))) return false;
      const hasAnswer = questionHasAnswerImmediate(q);
      if (!hasAnswer) {
        console.log('❌ Pregunta sin responder:', q.id, q.text?.substring(0, 50));
      }
      return !hasAnswer;
    });
    
    console.log('📊 Preguntas sin responder (obligatorias):', unanswered.length);
    
    if (unanswered.length > 0) {
      alert(`Por favor responde todas las preguntas obligatorias de la sección antes de guardar. Faltan ${unanswered.length}.`);
      return;
    }

    try {
      setSavingSection(true);
      // Ensure we have a survey application id
      let appId = existingApplication?.id ?? existingApplication?.applicationId ?? existingApplication?.surveyApplicationId;
      if (!appId) {
        const appRes = await createSurveyApplication({
          surveyId: selectedSurvey.id,
          status: 'en_progreso'
        });
        const createdApp = appRes.data || {};
        appId = createdApp.id ?? createdApp.applicationId ?? createdApp.surveyApplicationId ?? appRes.data?.id;
        if (appId) {
          setExistingApplication(prev => prev ?? { ...(createdApp || {}), id: appId, status: createdApp.status ?? 'en_progreso' });
          setSurveyApplications(prev => {
            const exists = prev.some(app => (app.id ?? app.applicationId ?? app.surveyApplicationId) === appId);
            return exists ? prev : [...prev, { ...createdApp, id: appId }];
          });
        }
      }

      // Build payload only for this section
      const responsesPayload = sectionQs
        .map(q => buildResponsePayload(q, getAnswer(q.id), appId))
        .filter(Boolean);

      if (!responsesPayload.length) {
        throw new Error('No se pudieron construir las respuestas para esta sección.');
      }

      await submitSurveyResponse(responsesPayload);

      // Unlock next section and auto-advance
      const nextIdx = Math.min(sectionTitles.length - 1, currentIndex + 1);
      setEnabledSectionMaxIndex(prev => Math.max(prev, nextIdx));
      if (nextIdx !== currentIndex) setSurveyTitleFilter(sectionTitles[nextIdx]);

      // If all sections are now complete, optionally mark as completed here
      const allComplete = sectionTitles.every(t => isSectionComplete(t));
      if (allComplete && appId) {
        try {
          await completeSurveyApplication(appId);
          setFormDisabled(true);
          setShowSuccessMessage(true);
          setCompletedSurveys(prev => ({ ...prev, [selectedSurvey.id]: true }));
        } catch (e) {
          // Non-fatal: user can still submit with the final button
        }
      }
    } catch (err) {
      console.error('Error guardando sección:', err);
      alert('Error al guardar la sección: ' + (err.response?.data?.message || err.message));
    } finally {
      setSavingSection(false);
    }
  };

  const handleSubmit = async () => {
    if (!selectedSurvey) {
      alert('Por favor selecciona una encuesta');
      return;
    }

    const allQs = selectedSurvey.questions || [];
    
    // Obtener IDs de preguntas ocultas u opcionales (texto libre)
    const optionalIds = getOptionalQuestionIds();
    
    // Filtrar preguntas sin responder, excluyendo las opcionales
    let unanswered = allQs.filter(q => {
      // Si la pregunta es opcional (oculta o texto libre), no bloquea el envío
      if (optionalIds.includes(Number(q.id))) return false;
      return !questionHasAnswerImmediate(q);
    });
    
    if (unanswered.length > 0) {
      alert(`Por favor responde todas las preguntas obligatorias. Faltan ${unanswered.length} respuestas.`);
      return;
    }

    try {
      let appId = existingApplication?.id ?? existingApplication?.applicationId ?? existingApplication?.surveyApplicationId;
      
      if (!appId) {
        const appRes = await createSurveyApplication({
          surveyId: selectedSurvey.id,
          status: 'en_progreso'
        });
        const createdApp = appRes.data || {};
        appId = createdApp.id ?? createdApp.applicationId ?? createdApp.surveyApplicationId ?? appRes.data?.id;
        if (appId) {
          setExistingApplication(prev => prev ?? { ...(createdApp || {}), id: appId, status: createdApp.status ?? 'en_progreso' });
          setSurveyApplications(prev => {
            const exists = prev.some(app => (app.id ?? app.applicationId ?? app.surveyApplicationId) === appId);
            return exists ? prev : [...prev, { ...createdApp, id: appId }];
          });
        }
      }

      const responsesPayload = allQs
        .map(q => buildResponsePayload(q, getAnswer(q.id), appId))
        .filter(Boolean);

      if (!responsesPayload.length) {
        throw new Error('No se pudieron construir las respuestas para esta encuesta.');
      }

      // Paso 1: Enviar las respuestas
      await submitSurveyResponse(responsesPayload);
      
      // Paso 2: Marcar la aplicación como completada
      await completeSurveyApplication(appId);
      
      // Paso 3: Actualizar el estado local INMEDIATAMENTE
      setShowSuccessMessage(true);
      setFormDisabled(true);
      // Marcar encuesta seleccionada como completada para mostrar distintivo en el dropdown
      if (selectedSurvey?.id) {
        setCompletedSurveys(prev => ({ ...prev, [selectedSurvey.id]: true }));
      }
      
      // Paso 4: Recargar la información de la encuesta para reflejar el estado completado
      await checkExistingSubmission(selectedSurvey, { forceRefresh: true });
    } catch (err) {
      console.error('❌ Error submitting survey:', err);
      alert('Error al enviar la encuesta: ' + (err.response?.data?.message || err.message));
    }
  };

  // adjust grouped questions based on filter
  const filteredQuestions = surveyTitleFilter
    ? allQuestions.filter(q => sectionKey(resolvedSurveyTitle(q)) === surveyTitleFilter)
    : allQuestions;
  const filteredQuestionsWithLogic = useMemo(() => {
    let result = [...filteredQuestions];

    const preguntaRuido = allQuestions.find(q => q.id === 104);
    const respuestaRuido = preguntaRuido ? getStableAnswer(preguntaRuido.id) : null;
    const showNoiseQuestions = preguntaRuido && (respuestaRuido === 'Si' || respuestaRuido?.label === 'Si');
    if (!showNoiseQuestions) {
      result = result.filter(q => ![105, 106, 107, 108].includes(Number(q.id)));
    }

    const preguntaVibracion = allQuestions.find(q => q.id === 110);
    const respuestaVibracion = preguntaVibracion ? getStableAnswer(preguntaVibracion.id) : null;
    const showVibrationQuestions = preguntaVibracion && (respuestaVibracion === 'Si' || respuestaVibracion?.label === 'Si');
    if (!showVibrationQuestions) {
      result = result.filter(q => ![111, 112, 113, 114].includes(Number(q.id)));
    }

    const preguntaIluminacion = allQuestions.find(q => q.id === 115);
    const respuestaIluminacion = preguntaIluminacion ? getStableAnswer(preguntaIluminacion.id) : null;
    const showLightQuestions = preguntaIluminacion && (respuestaIluminacion === 'Si' || respuestaIluminacion?.label === 'Si');
    if (!showLightQuestions) {
      result = result.filter(q => ![116, 117].includes(Number(q.id)));
    }

    const preguntaQuimicos45 = allQuestions.find(q => q.id === 118 || q.number === 45);
    const respuestaQuimicos45 = preguntaQuimicos45 ? getStableAnswer(preguntaQuimicos45.id) : null;
    const showChemQuestions45 = preguntaQuimicos45 && (respuestaQuimicos45 === 'Si' || respuestaQuimicos45?.label === 'Si');
    if (!showChemQuestions45) {
      result = result.filter(q => ![119, 120, 121, 122].includes(Number(q.id)));
    }

    const preguntaQuimicos57 = allQuestions.find(q => q.id === 131);
    const respuestaQuimicos57 = preguntaQuimicos57 ? getStableAnswer(preguntaQuimicos57.id) : null;
    const showQuimicosQuestions57 = preguntaQuimicos57 && (respuestaQuimicos57 === 'Si' || respuestaQuimicos57?.label === 'Si');
    if (!showQuimicosQuestions57) {
      result = result.filter(q => ![132, 133, 134, 135, 136, 137, 138].includes(Number(q.id)));
    }

    return result;
  }, [filteredQuestions, allQuestions, getStableAnswer]);

  const {
    currentPageQuestions,
    totalPages,
    currentPageIndex,
    pageStart,
    pageEnd,
    totalItemsInSection
  } = useMemo(() => {
    const totalItems = filteredQuestionsWithLogic.length;
    const totalPagesCalc = totalItems > 0
      ? Math.ceil(totalItems / QUESTIONS_PER_PAGE)
      : 0;
    const clampedIndex = totalPagesCalc === 0
      ? 0
      : Math.min(sectionPageIndex, totalPagesCalc - 1);
    const sliceStart = clampedIndex * QUESTIONS_PER_PAGE;
    const sliceEnd = sliceStart + QUESTIONS_PER_PAGE;
    const slice = filteredQuestionsWithLogic.slice(sliceStart, sliceEnd);
    const visualStart = totalItems === 0 ? 0 : sliceStart + 1;
    const visualEnd = totalItems === 0 ? 0 : Math.min(totalItems, sliceStart + slice.length);

    return {
      currentPageQuestions: slice,
      totalPages: totalPagesCalc,
      currentPageIndex: clampedIndex,
      pageStart: visualStart,
      pageEnd: visualEnd,
      totalItemsInSection: totalItems
    };
  }, [filteredQuestionsWithLogic, sectionPageIndex]);

  const groupedQuestions = useMemo(() => {
    return currentPageQuestions.reduce((acc, q) => {
      const cat = q.category || 'General';
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(q);
      return acc;
    }, {});
  }, [currentPageQuestions]);

  const { totalQuestions, answeredCount, progress } = useMemo(() => {
    const total = filteredQuestions.length;
    const answered = filteredQuestions.filter(questionHasAnswer).length;
    return {
      totalQuestions: total,
      answeredCount: answered,
      progress: total > 0 ? (answered / total) * 100 : 0
    };
  }, [filteredQuestions, questionHasAnswer]);

  const {
    fullTotalQuestions,
    fullAnsweredCount,
    completedSectionsCount,
    allSectionsComplete
  } = useMemo(() => {
    const fullTotal = allQuestions.length;
    const fullAnswered = allQuestions.filter(questionHasAnswer).length;
    const completedSections = sectionTitles.filter(t => isSectionComplete(t)).length;
    const complete = sectionTitles.length > 0
      ? completedSections === sectionTitles.length
      : (fullTotal > 0 && fullAnswered === fullTotal);

    return {
      fullTotalQuestions: fullTotal,
      fullAnsweredCount: fullAnswered,
      completedSectionsCount: completedSections,
      allSectionsComplete: complete
    };
  }, [allQuestions, sectionTitles, questionHasAnswer, isSectionComplete]);

  useEffect(() => {
    const totalItems = filteredQuestionsWithLogic.length;
    const maxPage = totalItems === 0 ? 0 : Math.ceil(totalItems / QUESTIONS_PER_PAGE) - 1;
    setSectionPageIndex(prev => {
      const normalized = Math.min(Math.max(prev, 0), Math.max(maxPage, 0));
      return normalized === prev ? prev : normalized;
    });
  }, [filteredQuestionsWithLogic.length]);

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
          {autoSaving && (
            <Chip 
              label="Guardando..." 
              size="small" 
              color="info" 
              sx={{ ml: 2 }}
            />
          )}
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
                  <Box sx={{ display: 'flex', gap: 1, mt: 0.5, alignItems: 'center', flexWrap: 'wrap' }}>
                    <Chip label={`${survey.questions?.length || 0} preguntas`} size="small" color="primary" variant="outlined" />
                    {survey.guideType && (
                      <Chip label={survey.guideType} size="small" color="secondary" variant="outlined" />
                    )}
                    {completedSurveys[survey.id] && (
                      <Chip label="Completada" size="small" color="success" variant="filled" />
                    )}
                  </Box>
                </Box>
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {/* Nueva dropdown para filtrar por Bloque / Módulo (secuencial) */}
        {selectedSurvey && sectionTitles.length > 0 && (
          <FormControl fullWidth sx={{ mb: 3 }}>
            <InputLabel id="survey-title-filter-label">Sección</InputLabel>
            <Select
              labelId="survey-title-filter-label"
              value={surveyTitleFilter}
              label="Sección"
              onChange={(e) => handleSectionFilterChange(e.target.value)}
              MenuProps={MENU_PROPS}
            >
              {sectionTitles.map((title, idx) => (
                <MenuItem key={title} value={title} disabled={idx > enabledSectionMaxIndex}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography>{sectionTitleMap[title] || title}</Typography>
                    <Chip 
                      label={`${questionsInSection(title).filter(questionHasAnswer).length}/${questionsInSection(title).length}`} 
                      size="small" 
                      color={isSectionComplete(title) ? 'success' : 'default'}
                    />
                    {idx > enabledSectionMaxIndex && (
                      <Chip label="Bloqueado" size="small" color="warning" variant="outlined" />
                    )}
                  </Box>
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        )}

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
                Progreso: {answeredCount} / {totalQuestions} preguntas{surveyTitleFilter ? ' (filtrado)' : ''}
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
        {selectedSurvey && totalItemsInSection > 0 && (
          <>
            {totalPages > 1 && (
              <Box sx={{ mt: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  Mostrando preguntas {pageStart}-{pageEnd} de {totalItemsInSection}
                </Typography>
                <Stack direction="row" spacing={2}>
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={() => setSectionPageIndex(prev => Math.max(0, prev - 1))}
                    disabled={currentPageIndex === 0}
                  >
                    Página anterior
                  </Button>
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={() => setSectionPageIndex(prev => Math.min(totalPages - 1, prev + 1))}
                    disabled={totalPages === 0 || currentPageIndex >= totalPages - 1}
                  >
                    Página siguiente
                  </Button>
                </Stack>
              </Box>
            )}

            <Box sx={{ mt: 2 }}>
              {Object.keys(groupedQuestions).length === 0 && (
                <Alert severity="info">No hay preguntas visibles para esta página.</Alert>
              )}
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
                        label={`${questions.filter(questionHasAnswer).length}/${questions.length}`} 
                        size="small" 
                        color={questions.every(questionHasAnswer) ? "success" : "default"}
                      />
                    </Box>
                  </AccordionSummary>
                  <AccordionDetails>
                    {questions.map((question, idx) => {
                      const hasAnswer = questionHasAnswer(question);
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
                            <Box sx={{ mb: 2 }}>
                              <Typography 
                                variant="body1" 
                                sx={{ 
                                  fontWeight: 500,
                                  color: 'text.primary'
                                }}
                              >
                                {(questionNumberMap[String(question.id)] ?? idx + 1)}. {question.text}
                              </Typography>
                              {question.metadata?.helpText && (
                                <Typography variant="body2" color="text.secondary">
                                  {question.metadata.helpText}
                                </Typography>
                              )}
                            </Box>
                            {formDisabled && hasAnswer && (
                              <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
                                <CheckCircleIcon color="success" fontSize="small" />
                                <Typography variant="body2" color="success.dark">
                                  Respondida
                                </Typography>
                              </Stack>
                            )}
                            {renderQuestionInput(question, formDisabled)}
                          </CardContent>
                        </Card>
                      );
                    })}
                  </AccordionDetails>
                </Accordion>
              ))}
            </Box>
          </>
        )}

        {selectedSurvey && totalItemsInSection > 0 && totalPages > 1 && (
          <Box sx={{ mt: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
            <Typography variant="body2" color="text.secondary">
              Página {currentPageIndex + 1} de {totalPages}
            </Typography>
            <Stack direction="row" spacing={2}>
              <Button
                variant="outlined"
                onClick={() => setSectionPageIndex(prev => Math.max(0, prev - 1))}
                disabled={currentPageIndex === 0}
              >
                Página anterior
              </Button>
              <Button
                variant="outlined"
                onClick={() => setSectionPageIndex(prev => Math.min(totalPages - 1, prev + 1))}
                disabled={currentPageIndex >= totalPages - 1}
              >
                Página siguiente
              </Button>
            </Stack>
          </Box>
        )}

        {selectedSurvey && totalItemsInSection === 0 && (
          <Alert severity="info" sx={{ mt: 3 }}>
            No hay preguntas disponibles para esta sección.
          </Alert>
        )}

        {/* Botones de Guardado por Sección */}
        {selectedSurvey && !formDisabled && surveyTitleFilter && (
          <Box sx={{ mt: 2, mb: 1, display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
            <Button 
              variant="contained" 
              color="primary" 
              onClick={saveCurrentSection}
              disabled={!isSectionComplete(surveyTitleFilter) || savingSection}
            >
              {savingSection ? 'Guardando…' : 'Guardar sección'}
            </Button>
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
            disabled={!allSectionsComplete}
            sx={{ 
              mt: 3,
              py: 1.5,
              fontWeight: 'bold',
              fontSize: '1.1rem'
            }}
          >
            {!allSectionsComplete 
              ? (sectionTitles.length > 0
                  ? `Completa todas las secciones (${completedSectionsCount}/${sectionTitles.length})`
                  : `Completa todas las preguntas (${fullAnsweredCount}/${fullTotalQuestions})`)
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
