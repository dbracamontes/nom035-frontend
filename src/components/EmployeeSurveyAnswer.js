import React, { useState, useEffect, useCallback, useMemo } from "react";
import { getSurveys, submitSurveyResponse, getSurveyById, getSurveyWithQuestions, createSurveyApplication, getSurveyApplications, getSurveyResponsesByApplication, getCompanySurveyById, getSurveyApplicationCheck, completeSurveyApplication } from "../api/nom035";
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
import { useTranslation } from 'react-i18next';
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

export default function EmployeeSurveyAnswer() {
  const { t } = useTranslation();
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

  const getAnswer = (qid) => answers[String(qid)];

  const canonicalLabels = LIKERT_LABELS;
  const NOM035_OPTIONS = canonicalLabels.map((label, idx) => ({
    id: `likert-${idx + 1}`,
    optionAnswerId: null,
    label,
    value: label,
    requiresFreeText: false,
    numericValue: idx + 1
  }));
  
  useEffect(() => {
    const loadData = async () => {
      try {
        const surveysRes = await getSurveys();
        const surveysData = surveysRes.data || [];

        const surveysWithQuestions = await Promise.all(
          surveysData.map(async (s) => {
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

        console.log('Surveys loaded with questions:', surveysWithQuestions);
        setSurveys(surveysWithQuestions);

        // Compute completed surveys for current employee
        try {
          const appsRes = await getSurveyApplications();
          const apps = appsRes.data || [];
          const csIds = apps.map(a => a.companySurveyId ?? a.company_survey_id ?? a.companySurvey ?? a.company_survey)
                            .filter(Boolean)
                            .map(id => parseInt(id));
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

          const completedMap = {};
          const toLower = (s) => (s || '').toString().toLowerCase();
          apps.forEach(a => {
            const st = toLower(a.status);
            const completed = !!a.completedAt || st === 'completado' || st === 'completada' || st === 'completed';
            if (!completed) return;
            let appSurveyId = a.surveyId ?? a.survey_id ?? null;
            if (!appSurveyId) {
              const csId = a.companySurveyId ?? a.company_survey_id ?? a.companySurvey ?? a.company_survey;
              const parsed = parseInt(csId);
              if (!isNaN(parsed)) appSurveyId = csIdToSurveyId[parsed] ?? null;
            }
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
      }
    };

    loadData();
  }, []);
  
  const checkExistingSubmission = useCallback(async (surveyObj = selectedSurvey) => {
    setExistingApplication(null);
    // NO resetear formDisabled aquí - solo se debe establecer en true si está completada
    // setFormDisabled(false); REMOVIDO

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

      // Recolectar TODAS las apps para esta encuesta y seleccionar la más relevante
      const matches = apps.filter(a => {
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
        const responsesRes = await getSurveyResponsesByApplication(appId);
        const filtered = responsesRes.data || [];

        const prevAnswers = {};
        filtered.forEach(r => {
          const qid = r.questionId ?? r.question_id ?? r.question?.id;
          const q = surveyObj.questions?.find(qq => String(qq.id) === String(qid));
          const hydrated = hydrateAnswerFromResponse(q, r);
          if (qid != null && hydrated != null) {
            prevAnswers[String(qid)] = hydrated;
          }
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

  // Helpers for sections
  const allQuestions = selectedSurvey?.questions || [];
  const questionNumberMap = useMemo(() => {
    const map = {};
    allQuestions.forEach((question, index) => {
      if (question?.id != null) {
        map[String(question.id)] = index + 1;
      }
    });
    return map;
  }, [selectedSurvey]);
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
  const sectionTitles = (() => {
    const seen = new Set();
    const order = [];
    allQuestions.forEach(q => {
      const key = sectionKey(resolvedSurveyTitle(q));
      if (key && !seen.has(key)) { seen.add(key); order.push(key); }
    });
    return order;
  })();
  // NEW: map internal key -> full original title for display
  const sectionTitleMap = (() => {
    const map = {};
    allQuestions.forEach(q => {
      const full = resolvedSurveyTitle(q);
      const key = sectionKey(full);
      if (key && !map[key]) map[key] = full; // first occurrence keeps full text
    });
    return map;
  })();
  const questionsInSection = (title) => allQuestions.filter(q => sectionKey(resolvedSurveyTitle(q)) === title);
  const questionHasAnswer = (question) => questionAnswered(question, getAnswer(question.id));
  const isSectionComplete = (title) => questionsInSection(title).every(questionHasAnswer);

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
  }, [selectedSurvey, answers]);

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
    
    // Verificar si esta encuesta ya tiene respuestas guardadas
    if (survey) {
      await checkExistingSubmission(survey);
    }
  };

  const handleAnswerChange = (questionId, value) => {
    setAnswers(prev => {
      const newAnswers = { ...prev, [String(questionId)]: value };
      // Si la pregunta 31 cambia a 'No', elimina respuestas de 32-35
      if (String(questionId) === '31' && (value === 'No' || value?.label === 'No')) {
        for (let qnum = 32; qnum <= 35; qnum++) {
          delete newAnswers[String(qnum)];
        }
      }
      return newAnswers;
    });
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
    const { options, useNomDefaults } = resolveQuestionOptions(question);
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
            label="Especifica"
            fullWidth
            sx={{ mt: 2 }}
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
            label="Especifica"
            fullWidth
            sx={{ mt: 2 }}
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
              boxSizing: 'border-box'
            }}
          />
        </Box>
      );
    }
    // ...existing code...
    let label = question.metadata?.placeholder;
    if (!label) {
      label = 'Respuesta';
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
      />
    );
  };

  const renderMatrixControl = (question, answerValue, disabled) => {
    const rows = question.metadata?.rows || [];
    const columns = question.metadata?.columns || [];
    if (!rows.length || !columns.length) {
      return <Alert severity="warning">Esta pregunta matricial no tiene filas u opciones configuradas.</Alert>;
    }

    // Siempre forzar selección única por fila para las encuestas NOM-035
    const selectionMode = 'radio';
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
  const saveCurrentSection = async () => {
    if (!selectedSurvey) return;
    if (!surveyTitleFilter) return;

    const currentIndex = sectionTitles.indexOf(surveyTitleFilter);
    if (currentIndex === -1) return;

    const sectionQs = questionsInSection(surveyTitleFilter);
    // Si la respuesta a la 31 es 'No', no exigir 32-35
    let unanswered = sectionQs.filter(q => !questionHasAnswer(q));
    const pregunta31 = allQuestions.find(q => q.number === 31 || q.id === 31);
    const respuesta31 = pregunta31 ? getAnswer(pregunta31.id) : null;
    if (pregunta31 && respuesta31 && (respuesta31 === 'No' || respuesta31?.label === 'No')) {
      unanswered = unanswered.filter(q => !(q.number >= 32 && q.number <= 35));
    }
    if (unanswered.length > 0) {
      alert(`Por favor responde todas las preguntas de la sección antes de guardar. Faltan ${unanswered.length}.`);
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
        appId = appRes.data?.id ?? appRes.data?.applicationId;
        if (appId) {
          setExistingApplication(prev => prev ?? { id: appId, status: 'en_progreso' });
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
    // Si la respuesta a la 31 es 'No', no exigir 32-35
    let unanswered = allQs.filter(q => !questionHasAnswer(q));
    const pregunta31 = allQs.find(q => q.number === 31 || q.id === 31);
    const respuesta31 = pregunta31 ? getAnswer(pregunta31.id) : null;
    if (pregunta31 && respuesta31 && (respuesta31 === 'No' || respuesta31?.label === 'No')) {
      unanswered = unanswered.filter(q => !(q.number >= 32 && q.number <= 35));
    }
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
        if (appId) {
          setExistingApplication(prev => prev ?? { id: appId, status: 'en_progreso' });
        }
      }

      const responsesPayload = allQs
        .map(q => buildResponsePayload(q, getAnswer(q.id), appId))
        .filter(Boolean);

      if (!responsesPayload.length) {
        throw new Error('No se pudieron construir las respuestas para esta encuesta.');
      }

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
      // Marcar encuesta seleccionada como completada para mostrar distintivo en el dropdown
      if (selectedSurvey?.id) {
        setCompletedSurveys(prev => ({ ...prev, [selectedSurvey.id]: true }));
      }
      
      // Paso 4: Recargar la información de la encuesta para reflejar el estado completado
      console.log('🔄 Reloading survey application data...');
      await checkExistingSubmission(selectedSurvey);
      console.log('✅ Survey application reloaded');
    } catch (err) {
      console.error('❌ Error submitting survey:', err);
      alert('Error al enviar la encuesta: ' + (err.response?.data?.message || err.message));
    }
  };

  // adjust grouped questions based on filter
  const filteredQuestions = surveyTitleFilter
    ? allQuestions.filter(q => sectionKey(resolvedSurveyTitle(q)) === surveyTitleFilter)
    : allQuestions;
  // Filtrado condicional para preguntas 32-35 según respuesta a la 31
  console.log('Preguntas antes de filtrar:', filteredQuestions.map(q => ({ number: q.number, id: q.id, text: q.text })));
  let filteredQuestionsWithLogic = [...filteredQuestions];
  const preguntaRuido = allQuestions.find(q => q.id === 104);
  const respuestaRuido = preguntaRuido ? getAnswer(preguntaRuido.id) : null;
  const showNoiseQuestions = preguntaRuido && (respuestaRuido === 'Si' || respuestaRuido?.label === 'Si');
  filteredQuestionsWithLogic = filteredQuestionsWithLogic.filter(q => {
    // Oculta ids 105, 106, 107, 108 si no se ha respondido 'Si' en la 104
    if ([105, 106, 107, 108].includes(Number(q.id))) {
      return showNoiseQuestions === true;
    }
    return true;
  });
  // Filtrado condicional para preguntas 38-41 según respuesta a la 37 (id 110)
  const preguntaVibracion = allQuestions.find(q => q.id === 110);
  const respuestaVibracion = preguntaVibracion ? getAnswer(preguntaVibracion.id) : null;
  const showVibrationQuestions = preguntaVibracion && (respuestaVibracion === 'Si' || respuestaVibracion?.label === 'Si');
  filteredQuestionsWithLogic = filteredQuestionsWithLogic.filter(q => {
    // Oculta ids 111, 112, 113, 114 si no se ha respondido 'Si' en la 110
    if ([111, 112, 113, 114].includes(Number(q.id))) {
      return showVibrationQuestions === true;
    }
    return true;
  });
  // Filtrado condicional para preguntas 43-44 según respuesta a la 42 (id 115)
  const preguntaIluminacion = allQuestions.find(q => q.id === 115);
  const respuestaIluminacion = preguntaIluminacion ? getAnswer(preguntaIluminacion.id) : null;
  const showLightQuestions = preguntaIluminacion && (respuestaIluminacion === 'Si' || respuestaIluminacion?.label === 'Si');
  filteredQuestionsWithLogic = filteredQuestionsWithLogic.filter(q => {
    // Oculta ids 116, 117 si no se ha respondido 'Si' en la 115
    if ([116, 117].includes(Number(q.id))) {
      return showLightQuestions === true;
    }
    return true;
  });
  // Filtrado condicional para preguntas 46-49 según respuesta a la 45
  const preguntaQuimicos45 = allQuestions.find(q => q.id === 118 || q.number === 45);
  const respuestaQuimicos45 = preguntaQuimicos45 ? getAnswer(preguntaQuimicos45.id) : null;
  const showChemQuestions45 = preguntaQuimicos45 && (respuestaQuimicos45 === 'Si' || respuestaQuimicos45?.label === 'Si');
  filteredQuestionsWithLogic = filteredQuestionsWithLogic.filter(q => {
    // Oculta ids 119, 120, 121, 122 si no se ha respondido 'Si' en la 118 (45)
    if ([119, 120, 121, 122].includes(Number(q.id))) {
      return showChemQuestions45 === true;
    }
    return true;
  });
  // Filtrado condicional para preguntas 59-65 según respuesta a la 58
  // Filtrado condicional para preguntas 58-65 según respuesta a la 57 (id 131)
  const preguntaQuimicos57 = allQuestions.find(q => q.id === 131);
  const respuestaQuimicos57 = preguntaQuimicos57 ? getAnswer(preguntaQuimicos57.id) : null;
  const showQuimicosQuestions57 = preguntaQuimicos57 && (respuestaQuimicos57 === 'Si' || respuestaQuimicos57?.label === 'Si');
  filteredQuestionsWithLogic = filteredQuestionsWithLogic.filter(q => {
    // Oculta solo ids 132-138 si no se ha respondido 'Si' en la 131 (57), nunca la 139
    if ([132, 133, 134, 135, 136, 137, 138].includes(Number(q.id))) {
      return showQuimicosQuestions57 === true;
    }
    return true;
  });
  // Si la respuesta a la 31 es 'Si', mostrar 32-35 normalmente
  // Agrupar preguntas por categoría
  const groupedQuestions = filteredQuestionsWithLogic.reduce((acc, q) => {
    const cat = q.category || 'General';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(q);
    return acc;
  }, {});
  const totalQuestions = filteredQuestions.length;
  const answeredCount = filteredQuestions.filter(questionHasAnswer).length;
  const progress = totalQuestions > 0 ? (answeredCount / totalQuestions) * 100 : 0;
  // NEW: global completion across all sections
  const fullTotalQuestions = allQuestions.length;
  const fullAnsweredCount = allQuestions.filter(questionHasAnswer).length;
  const completedSectionsCount = sectionTitles.filter(t => isSectionComplete(t)).length;
  const allSectionsComplete = sectionTitles.length > 0
    ? completedSectionsCount === sectionTitles.length && sectionTitles.length > 0
    : (fullTotalQuestions > 0 && fullAnsweredCount === fullTotalQuestions);

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
              onChange={(e) => setSurveyTitleFilter(e.target.value)}
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
                          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mb: 2 }}>
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
