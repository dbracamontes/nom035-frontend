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
        "answerSurvey": "Answer Survey",
        "surveyResponses": "Survey Responses"
      },
      "landing": {
        "welcomeMessage": "Welcome! Use the sidebar to manage employees, surveys, answers, and view analytics.",
        "platformDescription": "This platform helps organizations comply with NOM-035 by enabling survey management, employee well-being tracking, and risk analytics."
      },
      "common": {
        "language": "Language"
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
        "answerSurvey": "Responder Encuesta",
        "surveyResponses": "Respuestas de Encuestas"
      },
      "landing": {
        "welcomeMessage": "¡Bienvenido! Utiliza la barra lateral para gestionar empleados, encuestas, respuestas y ver analíticas.",
        "platformDescription": "Esta plataforma ayuda a las organizaciones a cumplir con la NOM-035 habilitando la gestión de encuestas, seguimiento del bienestar de empleados y análisis de riesgos."
      },
      "common": {
        "language": "Idioma"
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