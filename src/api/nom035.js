import axios from 'axios';

// Base URL configured via .env (REACT_APP_API_URL)
const API_ROOT = process.env.REACT_APP_API_URL || 'http://localhost:8080';
const API_BASE = `${API_ROOT}/api`;

// Obtener el usuario autenticado actual
export const getCurrentUser = () => axios.get(`${API_BASE}/me`);

// Add request interceptor to ensure proper headers
axios.interceptors.request.use(
  (config) => {
    if (config.method === 'post' || config.method === 'put') {
      config.headers['Content-Type'] = 'application/json';
    }
    // console.log('Request config:', config);
    return config;
  },
  (error) => Promise.reject(error)
);

// Employee endpoints
export const getEmployees = () => axios.get(`${API_BASE}/employees`);
export const getEmployeeById = id => axios.get(`${API_BASE}/employees/${id}`);
export const getEmployeesByCompany = companyId => axios.get(`${API_BASE}/employees/company/${companyId}`);
export const createEmployee = data => {
  return axios.post(`${API_BASE}/employees`, data, {
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    }
  });
};
// Utilidad para obtener credenciales guardadas
function getAuthHeader() {
  const creds = sessionStorage.getItem('auth');
  if (!creds) return {};
  return { Authorization: 'Basic ' + creds };
}
export const updateEmployee = (id, data) => axios.put(`${API_BASE}/employees/${id}`, data);
export const deleteEmployee = id => axios.delete(`${API_BASE}/employees/${id}`);

// Company endpoints
export const getCompanies = () => axios.get(`${API_BASE}/companies`);
export const getCompanyById = id => axios.get(`${API_BASE}/companies/${id}`);
export const createCompany = data => axios.post(`${API_BASE}/companies`, data);
export const updateCompany = (id, data) => axios.put(`${API_BASE}/companies/${id}`, data);
export const deleteCompany = id => axios.delete(`${API_BASE}/companies/${id}`);

// Survey endpoints
export const getSurveys = () => axios.get(`${API_BASE}/surveys`);
export const getSurveyById = id => axios.get(`${API_BASE}/surveys/${id}`);
export const getSurveyWithQuestions = id => axios.get(`${API_BASE}/surveys/${id}/questions`);
export const createSurvey = data => {
  return axios.post(`${API_BASE}/surveys`, JSON.stringify(data), {
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    }
  });
};
export const updateSurvey = (id, data) => axios.put(`${API_BASE}/surveys/${id}`, data);
export const deleteSurvey = id => axios.delete(`${API_BASE}/surveys/${id}`);

// CompanySurvey endpoints

// Interceptor para agregar Authorization a cada request (debe ir después de getAuthHeader)
axios.interceptors.request.use(
  (config) => {
    const auth = getAuthHeader();
    if (auth.Authorization) config.headers.Authorization = auth.Authorization;
    return config;
  },
  (error) => Promise.reject(error)
);

// Interceptor para manejar 401/403 globalmente
axios.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response && (err.response.status === 401 || err.response.status === 403)) {
      // Don't force-redirect to /login when the failing request is the current-user check
      // or when the user is already on the login page — this prevents redirect loops.
      try {
        const reqUrl = (err.config && err.config.url) ? err.config.url : '';
  const isMeCheck = reqUrl.includes('/api/users/me') || reqUrl.endsWith('/api/users/me');
        const pathname = (typeof window !== 'undefined' && window.location && window.location.pathname) ? window.location.pathname : '';
        const alreadyOnLogin = pathname === '/login' || pathname === '/';

        if (!isMeCheck && !alreadyOnLogin) {
          window.location.href = '/login';
        }
      } catch (e) {
        // If anything unexpected happens, avoid blocking the error — rethrow it.
        console.error('Error handling auth redirect:', e);
      }
    }
    return Promise.reject(err);
  }
);
export const getCompanySurveys = () => axios.get(`${API_BASE}/company-surveys`);
export const getCompanySurveyById = id => axios.get(`${API_BASE}/company-surveys/${id}`);
export const getCompanySurveysByCompany = companyId => axios.get(`${API_BASE}/company-surveys/company/${companyId}`);
export const getCompanySurveysBySurvey = surveyId => axios.get(`${API_BASE}/company-surveys/survey/${surveyId}`);
export const createCompanySurvey = async (data) => {
  console.log('Enviando datos a company-surveys:', data);
  
  const payload = {
    companyId: data.companyId,
    surveyId: data.surveyId,
    dueDate: data.dueDate || "2025-12-15",
    companyVersion: data.companyVersion || "v1",
    status: data.status || "activo",
    completionRate: data.completionRate || 0.0,
    notes: data.notes || "Desde frontend"
  };
  
  console.log('Payload final:', payload);
  
  const response = await fetch(`${API_BASE}/company-surveys`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });
  
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  
  return response.json();
};
export const updateCompanySurvey = (id, data) => axios.put(`${API_BASE}/company-surveys/${id}`, data);
export const deleteCompanySurvey = id => axios.delete(`${API_BASE}/company-surveys/${id}`);

// Dashboard endpoints
export const getCompanyDashboard = companyId => axios.get(`${API_BASE}/dashboard/company/${companyId}`);
export const getCompanyRisk = companyId => axios.get(`${API_BASE}/dashboard/company/${companyId}/risk`);
export const getCompanyParticipation = companyId => axios.get(`${API_BASE}/dashboard/company/${companyId}/participation`);

// Survey Response endpoints
export const submitSurveyResponse = data => {
  console.log('📤 API: Sending to /api/responses:', JSON.stringify(data, null, 2));
  return axios.post(`${API_BASE}/responses`, data, {
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    }
  });
};
// Get all responses (legacy)
export const getSurveyResponses = () => axios.get(`${API_BASE}/responses`);

// Get responses for a specific survey application (preferred when you have an application id)
export const getSurveyResponsesByApplication = (surveyApplicationId) => axios.get(`${API_BASE}/responses/survey-application/${surveyApplicationId}`);

// Survey Application endpoints (for managing survey sessions)
export const createSurveyApplication = data => {
  console.log('📤 API: Creating survey application:', JSON.stringify(data, null, 2));
  return axios.post(`${API_BASE}/survey-applications`, data, {
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    }
  });
};
export const getSurveyApplications = () => axios.get(`${API_BASE}/survey-applications`);
export const getSurveyApplicationCheck = (employeeId, surveyId) => {
  const params = new URLSearchParams({ employeeId: String(employeeId), surveyId: String(surveyId) });
  return axios.get(`${API_BASE}/survey-applications/check?${params.toString()}`);
};

// Statistics and Analytics endpoints
export const getResponseStatistics = () => {
  console.log('📊 API: Getting response statistics');
  return axios.get(`${API_BASE}/responses/statistics`);
};

export const getParticipationStatistics = (companyId = null, surveyId = null) => {
  let url = `${API_BASE}/responses/participation`;
  const params = new URLSearchParams();
  
  if (companyId) params.append('companyId', companyId);
  if (surveyId) params.append('surveyId', surveyId);
  
  if (params.toString()) {
    url += `?${params.toString()}`;
  }
  
  console.log('📊 API: Getting participation statistics:', url);
  return axios.get(url);
};

export const getModuleStatistics = (surveyId = null) => {
  let url = `${API_BASE}/responses/modules`;
  
  if (surveyId) {
    url += `?surveyId=${surveyId}`;
  }
  
  console.log('📊 API: Getting module statistics:', url);
  return axios.get(url);
};

export const getRiskAnalysis = (companyId = null, surveyId = null) => {
  let url = `${API_BASE}/responses/risk-analysis`;
  const params = new URLSearchParams();
  
  if (companyId) params.append('companyId', companyId);
  if (surveyId) params.append('surveyId', surveyId);
  
  if (params.toString()) {
    url += `?${params.toString()}`;
  }
  
  console.log('📊 API: Getting risk analysis:', url);
  return axios.get(url);
};

// Response details with filters
export const getFilteredResponses = (filters = {}) => {
  let url = `${API_BASE}/responses/filtered`;
  const params = new URLSearchParams();
  
  Object.entries(filters).forEach(([key, value]) => {
    if (value) params.append(key, value);
  });
  
  if (params.toString()) {
    url += `?${params.toString()}`;
  }
  
  console.log('📊 API: Getting filtered responses:', url);
  return axios.get(url);
};