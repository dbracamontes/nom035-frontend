export const LIKERT_LABELS = [
  "Siempre",
  "Casi siempre",
  "Algunas veces",
  "Casi nunca",
  "Nunca"
];

const LIKERT_SYNONYMS = {
  siempre: "Siempre",
  "casi siempre": "Casi siempre",
  frecuente: "Casi siempre",
  frecuentemente: "Casi siempre",
  "muy frecuente": "Casi siempre",
  "algunas veces": "Algunas veces",
  "a veces": "Algunas veces",
  ocasionalmente: "Algunas veces",
  regularmente: "Algunas veces",
  "casi nunca": "Casi nunca",
  "rara vez": "Casi nunca",
  raramente: "Casi nunca",
  "pocas veces": "Casi nunca",
  nunca: "Nunca",
  always: "Siempre",
  "almost always": "Casi siempre",
  sometimes: "Algunas veces",
  "almost never": "Casi nunca",
  never: "Nunca",
  "1": "Siempre",
  "2": "Casi siempre",
  "3": "Algunas veces",
  "4": "Casi nunca",
  "5": "Nunca"
};

export function canonicalizeLikertLabel(input) {
  if (input == null) return "";
  const normalized = String(input).trim();
  if (!normalized) return "";
  if (LIKERT_LABELS.includes(normalized)) return normalized;
  const lookup = LIKERT_SYNONYMS[normalized.toLowerCase()];
  if (lookup) return lookup;
  const numeric = Number(normalized);
  if (!Number.isNaN(numeric) && numeric >= 1 && numeric <= LIKERT_LABELS.length) {
    return LIKERT_LABELS[numeric - 1];
  }
  return normalized;
}

export function parseQuestionMetadata(rawMetadata) {
  if (!rawMetadata) return {};
  if (typeof rawMetadata === "object") return rawMetadata;
  try {
    return JSON.parse(rawMetadata);
  } catch (error) {
    return {};
  }
}

export function detectQuestionKind(questionOrType) {
  const rawType = ((typeof questionOrType === "string"
    ? questionOrType
    : questionOrType?.type || questionOrType?.responseType || "") || "").toLowerCase();

  if (!rawType) return "likert";
  if (rawType.includes("likert")) return "likert";
  if (["single_choice", "single-choice", "singlechoice", "radio"].includes(rawType)) return "single";
  if (["multi_select", "multi-select", "multiselect", "checkbox"].includes(rawType)) return "multi";
  if (rawType === "matrix") return "matrix";
  if (["text", "textarea", "date", "time", "number"].includes(rawType)) return rawType === "textarea" ? "text" : rawType;
  return "likert";
}

const normalizeOption = (questionId, option, index) => {
  if (option == null) return null;
  if (typeof option === "string") {
    const optionId = `${questionId || "q"}-opt-${index}`;
    return {
      id: optionId,
      optionAnswerId: null,
      label: option,
      value: index + 1,
      requiresFreeText: option.trim().toLowerCase() === "otros",
      sortOrder: index + 1
    };
  }
  const derivedId = option.id ?? option.value ?? `${questionId || "q"}-opt-${index}`;
  return {
    id: String(derivedId),
    optionAnswerId: option.id ?? null,
    label: option.text ?? option.label ?? option.option ?? `Opción ${index + 1}`,
    value: option.value ?? index + 1,
    requiresFreeText: Boolean(option.requiresFreeText),
    sortOrder: option.sortOrder ?? index + 1,
    metadata: option.metadata || null
  };
};

export function normalizeQuestion(question) {
  if (!question) return null;
  const metadata = parseQuestionMetadata(question.metadata);
  const normalizedOptions = Array.isArray(question.options)
    ? question.options.map((opt, idx) => normalizeOption(question.id, opt, idx)).filter(Boolean)
    : [];
  const normalized = {
    ...question,
    metadata,
    normalizedOptions
  };
  normalized.kind = detectQuestionKind(normalized);
  return normalized;
}

export function normalizeQuestionList(rawList) {
  if (!Array.isArray(rawList)) return [];
  return rawList
    .map((question) => normalizeQuestion(question))
    .filter(Boolean)
    .sort((a, b) => {
      const aOrder = a.sortOrder ?? a.number ?? 0;
      const bOrder = b.sortOrder ?? b.number ?? 0;
      return aOrder - bOrder;
    });
}

export function questionAnswered(question, answer) {
  const kind = detectQuestionKind(question);
  if (kind === "likert") {
    return LIKERT_LABELS.includes(answer);
  }
  if (kind === "single") {
    return Boolean(answer && answer.optionId);
  }
  if (kind === "multi") {
    return Boolean(answer && Array.isArray(answer.optionIds) && answer.optionIds.length);
  }
  if (["text", "date", "time", "number"].includes(kind)) {
    return typeof answer === "string" && answer.trim() !== "";
  }
  if (kind === "matrix") {
    const rows = question?.metadata?.rows || [];
    if (!rows.length) {
      return Boolean(answer && Object.keys(answer || {}).length);
    }
    const selection = question?.metadata?.selection === "radio" ? "radio" : "checkbox";
    return rows.every((row) => {
      const key = String(row);
      const value = answer ? answer[key] : undefined;
      if (selection === "radio") {
        return typeof value === "string" && value.trim() !== "";
      }
      return Array.isArray(value) && value.length > 0;
    });
  }
  return Boolean(answer);
}

const buildMultiSelectPayload = (question, answer) => {
  const normalizedAnswer = Array.isArray(answer?.optionIds) ? answer.optionIds : [];
  if (!normalizedAnswer.length) return null;
  const indexById = new Map();
  (question.normalizedOptions || []).forEach((option) => {
    indexById.set(String(option.id), option);
  });
  const optionAnswerIds = normalizedAnswer
    .map((id) => indexById.get(String(id))?.optionAnswerId)
    .filter((id) => id != null);
  const optionLabels = normalizedAnswer
    .map((id) => indexById.get(String(id))?.label)
    .filter(Boolean);
  return {
    kind: "multi_select",
    optionIds: normalizedAnswer,
    optionAnswerIds,
    optionLabels,
    otherText: answer?.otherText || null
  };
};

const buildMatrixPayload = (question, answer) => {
  if (!answer || typeof answer !== "object") return null;
  const payload = JSON.parse(JSON.stringify(answer));
  return {
    kind: "matrix",
    selection: question?.metadata?.selection || "checkbox",
    rows: payload
  };
};

export function buildResponsePayload(question, answer, surveyApplicationId) {
  const kind = detectQuestionKind(question);
  if (!question || !surveyApplicationId) return null;
  if (!questionAnswered(question, answer)) return null;

  const basePayload = {
    surveyApplicationId,
    questionId: question.id
  };

  if (kind === "likert") {
    const score = LIKERT_LABELS.indexOf(answer) + 1;
    return {
      ...basePayload,
      value: score > 0 ? score : null,
      freeText: score > 0 ? null : answer
    };
  }

  if (kind === "single") {
    const option = (question.normalizedOptions || []).find(
      (opt) => String(opt.id) === String(answer.optionId) || String(opt.optionAnswerId) === String(answer.optionId)
    );
    return {
      ...basePayload,
      optionAnswerId: option?.optionAnswerId ?? (option && !Number.isNaN(Number(option.id)) ? Number(option.id) : null),
      value: option?.value ?? null,
      freeText: answer?.otherText?.trim() ? answer.otherText.trim() : null
    };
  }

  if (kind === "multi") {
    const structured = buildMultiSelectPayload(question, answer);
    if (!structured) return null;
    return {
      ...basePayload,
      freeText: JSON.stringify(structured)
    };
  }

  if (["text", "date", "time", "number"].includes(kind)) {
    return {
      ...basePayload,
      freeText: typeof answer === "string" ? answer.trim() : String(answer)
    };
  }

  if (kind === "matrix") {
    const structured = buildMatrixPayload(question, answer);
    if (!structured) return null;
    return {
      ...basePayload,
      freeText: JSON.stringify(structured)
    };
  }

  return null;
}

export function hydrateAnswerFromResponse(question, responseDto) {
  if (!question || !responseDto) return null;
  const kind = detectQuestionKind(question);
  const freeText = responseDto.freeText ?? responseDto.textAnswer ?? "";

  if (kind === "likert") {
    const label = canonicalizeLikertLabel(responseDto.value ?? freeText ?? responseDto.optionAnswerId);
    return label || "";
  }

  if (kind === "single") {
    const optionId = responseDto.optionAnswerId;
    if (optionId != null) {
      const option = (question.normalizedOptions || []).find(
        (opt) => String(opt.optionAnswerId) === String(optionId) || String(opt.id) === String(optionId)
      );
      return {
        optionId: option?.id ?? String(optionId),
        optionAnswerId: optionId,
        label: option?.label ?? canonicalizeLikertLabel(responseDto.value ?? optionId),
        otherText: freeText && option?.label !== freeText ? freeText : ""
      };
    }
    return freeText ? { optionId: null, label: freeText, otherText: freeText } : null;
  }

  if (kind === "multi") {
    if (typeof freeText === "string") {
      try {
        const parsed = JSON.parse(freeText);
        return {
          optionIds: parsed.optionIds || [],
          otherText: parsed.otherText || ""
        };
      } catch (error) {
        return null;
      }
    }
    if (freeText && typeof freeText === "object") {
      return {
        optionIds: freeText.optionIds || [],
        otherText: freeText.otherText || ""
      };
    }
    return null;
  }

  if (kind === "matrix") {
    if (typeof freeText === "string") {
      try {
        const parsed = JSON.parse(freeText);
        return parsed.rows || parsed;
      } catch (error) {
        return null;
      }
    }
    if (freeText && typeof freeText === "object") {
      return freeText.rows || freeText;
    }
    return null;
  }

  if (["text", "date", "time", "number"].includes(kind)) {
    return typeof freeText === "string" ? freeText : String(freeText || "");
  }

  return null;
}
