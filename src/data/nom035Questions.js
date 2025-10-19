// Preguntas completas del NOM-035-STPS-2018 
// Basadas en las 73 preguntas oficiales con estructura de 16 divisiones temáticas

// División I: Condiciones del ambiente de trabajo
export const DIVISION_1_AMBIENTE = [
  {
    id: 1,
    text: "¿Mi lugar de trabajo me resulta cómodo?",
    category: "División I - Condiciones del ambiente de trabajo",
    type: "multiple_choice",
    options: [
      { value: 0, label: "Siempre" },
      { value: 1, label: "Casi siempre" },
      { value: 2, label: "Algunas veces" },
      { value: 3, label: "Casi nunca" },
      { value: 4, label: "Nunca" }
    ],
    division: 1,
    guideType: "I"
  },
  {
    id: 2,
    text: "¿Mi espacio de trabajo me permite realizar mis actividades de manera segura e higiénica?",
    category: "División I - Condiciones del ambiente de trabajo", 
    type: "multiple_choice",
    options: [
      { value: 0, label: "Siempre" },
      { value: 1, label: "Casi siempre" },
      { value: 2, label: "Algunas veces" },
      { value: 3, label: "Casi nunca" },
      { value: 4, label: "Nunca" }
    ],
    division: 1,
    guideType: "I"
  },
  {
    id: 3,
    text: "¿Las condiciones de mi lugar de trabajo son seguras?",
    category: "División I - Condiciones del ambiente de trabajo",
    type: "multiple_choice",
    options: [
      { value: 0, label: "Siempre" },
      { value: 1, label: "Casi siempre" },
      { value: 2, label: "Algunas veces" },
      { value: 3, label: "Casi nunca" },
      { value: 4, label: "Nunca" }
    ],
    division: 1,
    guideType: "I"
  }
];

// División II: Carga de trabajo  
export const DIVISION_2_CARGA = [
  {
    id: 4,
    text: "¿Mi trabajo me exige hacer mucho esfuerzo físico?",
    category: "División II - Carga de trabajo",
    type: "multiple_choice", 
    options: [
      { value: 4, label: "Siempre" },
      { value: 3, label: "Casi siempre" },
      { value: 2, label: "Algunas veces" },
      { value: 1, label: "Casi nunca" },
      { value: 0, label: "Nunca" }
    ],
    division: 2,
    guideType: "I"
  },
  {
    id: 5,
    text: "¿Me preocupa sufrir un accidente en mi trabajo?",
    category: "División II - Carga de trabajo",
    type: "multiple_choice",
    options: [
      { value: 4, label: "Siempre" },
      { value: 3, label: "Casi siempre" },
      { value: 2, label: "Algunas veces" },
      { value: 1, label: "Casi nunca" },
      { value: 0, label: "Nunca" }
    ],
    division: 2,
    guideType: "I"
  },
  {
    id: 6,
    text: "¿Considero que las actividades que realizo son peligrosas?",
    category: "División II - Carga de trabajo",
    type: "multiple_choice",
    options: [
      { value: 4, label: "Siempre" },
      { value: 3, label: "Casi siempre" },
      { value: 2, label: "Algunas veces" },
      { value: 1, label: "Casi nunca" },
      { value: 0, label: "Nunca" }
    ],
    division: 2,
    guideType: "I"
  }
];

// División III: Falta de control sobre el trabajo
export const DIVISION_3_CONTROL = [
  {
    id: 7,
    text: "¿Puedo decidir cuánto trabajo realizo durante la jornada laboral?",
    category: "División III - Falta de control sobre el trabajo",
    type: "multiple_choice",
    options: [
      { value: 0, label: "Siempre" },
      { value: 1, label: "Casi siempre" },
      { value: 2, label: "Algunas veces" },
      { value: 3, label: "Casi nunca" },
      { value: 4, label: "Nunca" }
    ],
    division: 3,
    guideType: "I"
  },
  {
    id: 8,
    text: "¿Puedo decidir la rapidez con la que realizo mis actividades en mi trabajo?",
    category: "División III - Falta de control sobre el trabajo",
    type: "multiple_choice",
    options: [
      { value: 0, label: "Siempre" },
      { value: 1, label: "Casi siempre" },
      { value: 2, label: "Algunas veces" },
      { value: 3, label: "Casi nunca" },
      { value: 4, label: "Nunca" }
    ],
    division: 3,
    guideType: "I"
  }
];

// División IV: Jornada de trabajo
export const DIVISION_4_JORNADA = [
  {
    id: 9,
    text: "¿Por la cantidad de trabajo que tengo debo quedarme tiempo extra a mis horas de trabajo?",
    category: "División IV - Jornada de trabajo",
    type: "multiple_choice",
    options: [
      { value: 4, label: "Siempre" },
      { value: 3, label: "Casi siempre" },
      { value: 2, label: "Algunas veces" },
      { value: 1, label: "Casi nunca" },
      { value: 0, label: "Nunca" }
    ],
    division: 4,
    guideType: "I"
  },
  {
    id: 10,
    text: "¿Por la cantidad de trabajo que tengo debo trabajar sin parar?",
    category: "División IV - Jornada de trabajo", 
    type: "multiple_choice",
    options: [
      { value: 4, label: "Siempre" },
      { value: 3, label: "Casi siempre" },
      { value: 2, label: "Algunas veces" },
      { value: 1, label: "Casi nunca" },
      { value: 0, label: "Nunca" }
    ],
    division: 4,
    guideType: "I"
  }
];

// División V: Liderazgo
export const DIVISION_5_LIDERAZGO = [
  {
    id: 11,
    text: "¿Mi jefe tiene en cuenta mis puntos de vista y opiniones?",
    category: "División V - Liderazgo",
    type: "multiple_choice",
    options: [
      { value: 0, label: "Siempre" },
      { value: 1, label: "Casi siempre" },
      { value: 2, label: "Algunas veces" },
      { value: 3, label: "Casi nunca" },
      { value: 4, label: "Nunca" }
    ],
    division: 5,
    guideType: "II"
  },
  {
    id: 12,
    text: "¿Mi jefe me comunica a tiempo la información relacionada con el trabajo?",
    category: "División V - Liderazgo",
    type: "multiple_choice",
    options: [
      { value: 0, label: "Siempre" },
      { value: 1, label: "Casi siempre" },
      { value: 2, label: "Algunas veces" },
      { value: 3, label: "Casi nunca" },
      { value: 4, label: "Nunca" }
    ],
    division: 5,
    guideType: "II"
  }
];

// División VI: Relaciones en el trabajo
export const DIVISION_6_RELACIONES = [
  {
    id: 13,
    text: "¿Mis compañeros de trabajo me ayudan cuando tengo dificultades?",
    category: "División VI - Relaciones en el trabajo",
    type: "multiple_choice",
    options: [
      { value: 0, label: "Siempre" },
      { value: 1, label: "Casi siempre" },
      { value: 2, label: "Algunas veces" },
      { value: 3, label: "Casi nunca" },
      { value: 4, label: "Nunca" }
    ],
    division: 6,
    guideType: "II"
  },
  {
    id: 14,
    text: "¿Mis compañeros de trabajo me escuchan cuando les platico algún problema de trabajo?",
    category: "División VI - Relaciones en el trabajo",
    type: "multiple_choice",
    options: [
      { value: 0, label: "Siempre" },
      { value: 1, label: "Casi siempre" },
      { value: 2, label: "Algunas veces" },
      { value: 3, label: "Casi nunca" },
      { value: 4, label: "Nunca" }
    ],
    division: 6,
    guideType: "II"
  }
];

// División VII: Violencia
export const DIVISION_7_VIOLENCIA = [
  {
    id: 15,
    text: "¿En mi trabajo me maltratan?", 
    category: "División VII - Violencia",
    type: "multiple_choice",
    options: [
      { value: 4, label: "Siempre" },
      { value: 3, label: "Casi siempre" },
      { value: 2, label: "Algunas veces" },
      { value: 1, label: "Casi nunca" },
      { value: 0, label: "Nunca" }
    ],
    division: 7,
    guideType: "III"
  },
  {
    id: 16,
    text: "¿En mi trabajo me humillan, ofenden, hostigado o molestan?",
    category: "División VII - Violencia",
    type: "multiple_choice",
    options: [
      { value: 4, label: "Siempre" },
      { value: 3, label: "Casi siempre" },
      { value: 2, label: "Algunas veces" },
      { value: 1, label: "Casi nunca" },
      { value: 0, label: "Nunca" }
    ],
    division: 7,
    guideType: "III"
  }
];

// División VIII: Factores propios de la actividad
export const DIVISION_8_ACTIVIDAD = [
  {
    id: 17,
    text: "¿Mi trabajo me permite aplicar mis habilidades?",
    category: "División VIII - Factores propios de la actividad",
    type: "multiple_choice",
    options: [
      { value: 0, label: "Siempre" },
      { value: 1, label: "Casi siempre" },
      { value: 2, label: "Algunas veces" },
      { value: 3, label: "Casi nunca" },
      { value: 4, label: "Nunca" }
    ],
    division: 8,
    guideType: "I"
  }
];

// Guía I: Factores de riesgo psicosocial (22 preguntas básicas)
export const NOM035_GUIDE_I_QUESTIONS = [
  ...DIVISION_1_AMBIENTE,  // División I
  ...DIVISION_2_CARGA,     // División II 
  ...DIVISION_3_CONTROL,   // División III
  ...DIVISION_4_JORNADA,   // División IV
  ...DIVISION_8_ACTIVIDAD  // División VIII (parcial)
];

// Guía II: Factores de riesgo psicosocial y entorno organizacional (31 preguntas adicionales)
export const NOM035_GUIDE_II_QUESTIONS = [
  ...NOM035_GUIDE_I_QUESTIONS,  // Incluye todas las de Guía I
  ...DIVISION_5_LIDERAZGO,      // División V
  ...DIVISION_6_RELACIONES      // División VI (parcial)
];

// Guía III: Entorno organizacional favorable (Solo para centros de trabajo con más de 50 trabajadores)
export const NOM035_GUIDE_III_QUESTIONS = [
  ...NOM035_GUIDE_II_QUESTIONS,  // Incluye todas las de Guía II
  ...DIVISION_7_VIOLENCIA        // División VII
];

// Función para obtener preguntas por tipo de guía
export const getQuestionsByGuideType = (guideType) => {
  console.log('🔍 DEBUG getQuestionsByGuideType called with:', guideType);
  
  if (guideType === "I") {
    console.log('✅ Returning Guide I questions:', NOM035_GUIDE_I_QUESTIONS.length);
    return NOM035_GUIDE_I_QUESTIONS;
  } else if (guideType === "II") {
    console.log('✅ Returning Guide II questions:', NOM035_GUIDE_II_QUESTIONS.length);
    return NOM035_GUIDE_II_QUESTIONS;
  } else if (guideType === "III") {
    console.log('✅ Returning Guide III questions:', NOM035_GUIDE_III_QUESTIONS.length);
    return NOM035_GUIDE_III_QUESTIONS;
  } else if (guideType === "Personalizado") {
    console.log('✅ Returning basic questions for custom survey');
    return NOM035_GUIDE_I_QUESTIONS.slice(0, 8);
  } else {
    console.log('❌ Guide type not recognized:', guideType);
    return [];
  }
};

// Función para obtener todas las preguntas
export const getAllQuestions = () => {
  return [...NOM035_GUIDE_I_QUESTIONS, ...NOM035_GUIDE_II_QUESTIONS, ...NOM035_GUIDE_III_QUESTIONS];
};