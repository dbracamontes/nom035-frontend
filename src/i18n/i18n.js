import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Define translations directly in JavaScript
const resources = {
  en: {
    translation: {
      "app": {
        "title": "NOM-035 Survey Platform"
      },
      "navigation": {
        "landing": "Landing",
        "dashboard": "Dashboard",
        "employees": "Employees",
        "surveys": "Surveys",
        "companySurveys": "Company Surveys",
        "answerSurvey": "Answer Survey",
        "surveyResponses": "Survey Responses"
      },
      "landing": {
        "welcomeMessage": "Welcome! Use the sidebar to manage employees, surveys, answers, and view analytics.",
        "platformDescription": "This platform helps organizations comply with NOM-035 by enabling survey management, employee well-being tracking, and risk analytics."
      },
      "employee": {
        "form": {
          "name": "Name",
          "department": "Department",
          "position": "Position",
          "email": "Email",
          "company": "Company",
          "validation": {
            "nameEmailCompanyRequired": "Name, Email, and Company are required."
          }
        },
        "list": {
          "title": "Employees List",
          "filterByCompany": "Filter by Company",
          "allCompanies": "All Companies",
          "companyLabel": "Company",
          "editEmployee": "Edit employee",
          "noCompany": "N/A"
        },
        "page": {
          "addEmployee": "Add Employee",
          "editEmployee": "Edit Employee"
        }
      },
      "survey": {
        "form": {
          "title": "Title",
          "description": "Description",
          "company": "Company",
          "selectCompany": "Select Company",
          "questionText": "Question Text",
          "type": "Type",
          "options": "Options",
          "answerScores": "Answer Scores (JSON)",
          "createSurvey": "Create Survey",
          "updateSurvey": "Update Survey"
        },
        "list": {
          "title": "Surveys List",
          "editSurvey": "Edit Survey",
          "descriptionLabel": "Description",
          "companyLabel": "Company",
          "noCompany": "N/A"
        },
        "answer": {
          "title": "Answer NOM-035 Survey",
          "selectEmployee": "Select Employee",
          "selectEmployeePlaceholder": "Select an employee",
          "selectSurvey": "Select Survey",
          "selectSurveyPlaceholder": "Select a survey",
          "submit": "Submit Complete Survey",
          "progress": "Progress",
          "moduleComplete": "Module Complete",
          "totalProgress": "Total Progress",
          "completeAllQuestions": "Complete all questions to submit the survey",
          "surveySubmitted": "Survey submitted successfully",
          "submitError": "Error submitting survey",
          "nom035Info": "This survey is organized by modules according to NOM-035 standard. You can complete modules in any order.",
          "questionsLabel": "questions",
          "nom035Complete": "Complete NOM-035 Survey",
          "surveyQuestions": "Survey Questions"
        }
      },
      "common": {
        "language": "Language",
        "cancel": "Cancel",
        "save": "Save",
        "edit": "Edit",
        "delete": "Delete"
      }
    }
  },
  es: {
    translation: {
      "app": {
        "title": "Plataforma de Encuestas NOM-035"
      },
      "navigation": {
        "landing": "Inicio",
        "dashboard": "Panel de Control",
        "employees": "Empleados",
        "surveys": "Encuestas",
        "companySurveys": "Encuestas de Empresa",
        "answerSurvey": "Responder Encuesta",
        "surveyResponses": "Respuestas de Encuestas"
      },
      "landing": {
        "welcomeMessage": "¡Bienvenido! Utiliza la barra lateral para gestionar empleados, encuestas, respuestas y ver analíticas.",
        "platformDescription": "Esta plataforma ayuda a las organizaciones a cumplir con la NOM-035 habilitando la gestión de encuestas, seguimiento del bienestar de empleados y análisis de riesgos."
      },
      "employee": {
        "form": {
          "name": "Nombre",
          "department": "Departamento",
          "position": "Puesto",
          "email": "Email",
          "company": "Empresa",
          "validation": {
            "nameEmailCompanyRequired": "Nombre, Email y Empresa son requeridos."
          }
        },
        "list": {
          "title": "Lista de Empleados",
          "filterByCompany": "Filtrar por Empresa",
          "allCompanies": "Todas las Empresas",
          "companyLabel": "Empresa",
          "editEmployee": "Editar empleado",
          "noCompany": "N/A"
        },
        "page": {
          "addEmployee": "Agregar Empleado",
          "editEmployee": "Editar Empleado"
        }
      },
      "survey": {
        "form": {
          "title": "Título",
          "description": "Descripción",
          "company": "Empresa",
          "selectCompany": "Seleccionar Empresa",
          "questionText": "Texto de la Pregunta",
          "type": "Tipo",
          "options": "Opciones",
          "answerScores": "Puntuaciones de Respuestas (JSON)",
          "createSurvey": "Crear Encuesta",
          "updateSurvey": "Actualizar Encuesta"
        },
        "list": {
          "title": "Lista de Encuestas",
          "editSurvey": "Editar Encuesta",
          "descriptionLabel": "Descripción",
          "companyLabel": "Empresa",
          "noCompany": "N/A"
        },
        "answer": {
          "title": "Responder Encuesta NOM-035",
          "selectEmployee": "Seleccionar Empleado",
          "selectEmployeePlaceholder": "Seleccione un empleado",
          "selectSurvey": "Seleccionar Encuesta",
          "selectSurveyPlaceholder": "Seleccione una encuesta",
          "submit": "Enviar Encuesta Completa",
          "progress": "Progreso",
          "moduleComplete": "Módulo Completo",
          "totalProgress": "Progreso Total",
          "completeAllQuestions": "Complete todas las preguntas para enviar la encuesta",
          "surveySubmitted": "Encuesta enviada exitosamente",
          "submitError": "Error al enviar la encuesta",
          "nom035Info": "Esta encuesta está organizada por módulos según la norma NOM-035. Puede completar los módulos en cualquier orden.",
          "questionsLabel": "preguntas",
          "nom035Complete": "Encuesta NOM-035 Completa",
          "surveyQuestions": "Preguntas de la Encuesta"
        }
      },
      "common": {
        "language": "Idioma",
        "cancel": "Cancelar",
        "save": "Guardar",
        "edit": "Editar",
        "delete": "Eliminar"
      }
    }
  }
};

i18n
  .use(LanguageDetector) // Detects user language
  .use(initReactI18next) // Passes i18n down to react-i18next
  .init({
    resources,
    lng: 'es', // Default language
    fallbackLng: 'es', // Use es if detected lng is not available
    
    keySeparator: '.', // Enable key separation with dots
    nsSeparator: false, // Disable namespace separator
    
    interpolation: {
      escapeValue: false // React already does escaping
    },
    
    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      caches: ['localStorage'] // Cache user language preference
    }
  });

export default i18n;