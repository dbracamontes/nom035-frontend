import axios from 'axios';

// Base URL configured via .env (REACT_APP_API_URL)
const API_ROOT = process.env.REACT_APP_API_URL || 'http://localhost:8080';
const API_BASE = `${API_ROOT}/api`;

// Add request interceptor to ensure proper headers (JSON by default).
// For multipart/form-data requests we will explicitly set the header in each call,
// and this interceptor will respect that and not override.
axios.interceptors.request.use(
  (config) => {
    const method = (config.method || '').toLowerCase();
    const existingContentType = config.headers && config.headers['Content-Type'];

    if ((method === 'post' || method === 'put') && !existingContentType) {
      config.headers['Content-Type'] = 'application/json';
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Obtener el usuario autenticado actual
export const getCurrentUser = () => axios.get(`${API_BASE}/users/me`);

// Gestión de usuarios y roles
export const getUsersWithRoles = () => axios.get(`${API_BASE}/users`);
export const getRolesCatalog = () => axios.get(`${API_BASE}/users/roles`);
export const updateUserRoles = (userId, payload) => axios.put(`${API_BASE}/users/${userId}/roles`, payload);
export const generateTemporaryPassword = (userId) => axios.post(`${API_BASE}/users/${userId}/password/generate`);

// Recuperación de contraseñas
export const requestPasswordReset = (email) => axios.post(`${API_BASE}/users/password-reset/request`, { email });
export const confirmPasswordReset = (token, newPassword) => axios.post(`${API_BASE}/users/password-reset/confirm`, { token, newPassword });

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

// Employee documents endpoints
export const getEmployeeDocs = (employeeId) =>
  axios.get(`${API_BASE}/employees/${employeeId}/documents`);

export const createEmployeeDoc = (dto) =>
  axios.post(`${API_BASE}/employees/${dto.employeeId}/documents`, dto);

export const uploadEmployeeDocFile = (employeeId, docId, file) => {
  const formData = new FormData();
  formData.append('file', file);
  return axios.post(
    `${API_BASE}/employees/${employeeId}/documents/${docId}/file`,
    formData,
    { headers: { 'Content-Type': 'multipart/form-data' } }
  );
};

export const deleteEmployeeDocFile = (employeeId, docId) =>
  axios.delete(`${API_BASE}/employees/${employeeId}/documents/${docId}/file`);

// NEW: download employee document file
export const downloadEmployeeDocFile = (employeeId, docId) =>
  axios.get(`${API_BASE}/employees/${employeeId}/documents/${docId}/file`, {
    responseType: 'blob',
  });

// Document interpretation downloads
export const downloadDocumentPdf = (jobId) =>
  axios.get(`${API_BASE}/documents/${jobId}/downloadPdf`, { responseType: 'blob' });

// NEW: logical delete (mark document as INACTIVE)
export const deactivateEmployeeDoc = (employeeId, docId) =>
  axios.put(`${API_BASE}/employees/${employeeId}/documents/${docId}/deactivate`);

// NEW: catalog of document types
export const getDocumentTypes = () =>
  axios.get(`${API_BASE}/document-types`);

// Company endpoints
export const getCompanies = () => axios.get(`${API_BASE}/companies`);
export const getCompanyById = id => axios.get(`${API_BASE}/companies/${id}`);
export const createCompany = data => axios.post(`${API_BASE}/companies`, data);
export const updateCompany = (id, data) => axios.put(`${API_BASE}/companies/${id}`, data);
export const deleteCompany = id => axios.delete(`${API_BASE}/companies/${id}`);

// Medica LEBEN endpoints
export const getMedicaLebenDocs = (companyId) =>
  axios.get(`${API_BASE}/companies/${companyId}/medica-leben/docs`);

export const uploadMedicaLebenDocs = (companyId, files) => {
  const formData = new FormData();
  Object.entries(files).forEach(([key, file]) => {
    if (file) {
      formData.append(key, file);
    }
  });
  return axios.post(
    `${API_BASE}/companies/${companyId}/medica-leben/docs`,
    formData,
    { headers: { 'Content-Type': 'multipart/form-data' } }
  );
};

export const getMedicaLebenPhotos = (companyId) =>
  axios.get(`${API_BASE}/companies/${companyId}/medica-leben/photos`);

export const uploadMedicaLebenPhoto = (companyId, photo, description, sortOrder) => {
  const formData = new FormData();
  formData.append('photo', photo);
  if (description) formData.append('description', description);
  if (sortOrder !== undefined && sortOrder !== null) {
    formData.append('sortOrder', String(sortOrder));
  }
  return axios.post(
    `${API_BASE}/companies/${companyId}/medica-leben/photos`,
    formData,
    { headers: { 'Content-Type': 'multipart/form-data' } }
  );
};
export const deleteMedicaLebenDoc = (companyId, field) =>
  axios.delete(`${API_BASE}/companies/${companyId}/medica-leben/docs/${field}`);

export const deleteMedicaLebenPhoto = (companyId, photoId) =>
  axios.delete(`${API_BASE}/companies/${companyId}/medica-leben/photos/${photoId}`);

// Sistema Consultoria draft persistence
export const getConsultoriaDraftByCompany = (companyId) =>
  axios.get(`${API_BASE}/consultoria-drafts/company/${companyId}`);

export const upsertConsultoriaDraftByCompany = (companyId, payload) =>
  axios.put(`${API_BASE}/consultoria-drafts/company/${companyId}`, { payload });

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
  const auth = getAuthHeader();
  try {
    const response = await axios.post(`${API_BASE}/company-surveys`, payload, {
      headers: {
        'Content-Type': 'application/json',
        ...auth
      }
    });
    return response.data;
  } catch (err) {
    if (err.response) {
      throw new Error(`HTTP error! status: ${err.response.status}`);
    } else {
      throw err;
    }
  }
};
export const updateCompanySurvey = (id, data) => axios.put(`${API_BASE}/company-surveys/${id}`, data);
export const deleteCompanySurvey = id => axios.delete(`${API_BASE}/company-surveys/${id}`);

// Dashboard endpoints
export const getCompanyDashboard = companyId => axios.get(`${API_BASE}/dashboard/company/${companyId}`);
export const getCompanyRisk = companyId => axios.get(`${API_BASE}/dashboard/company/${companyId}/risk`);
export const getCompanyParticipation = companyId => axios.get(`${API_BASE}/dashboard/company/${companyId}/participation`);
export const getCompanyParticipationSummary = companyId => axios.get(`${API_BASE}/dashboard/company/${companyId}/participation/summary`);

// Resumen global de participación por empresa
export const getParticipationSummary = () => axios.get(`${API_BASE}/dashboard/participation/summary`);

// Survey Response endpoints
export const submitSurveyResponse = data => {
  console.log('API: Sending to /api/responses:', JSON.stringify(data, null, 2));
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
  console.log('API: Creating survey application:', JSON.stringify(data, null, 2));
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
export const completeSurveyApplication = (applicationId) => {
  console.log('API: Completing survey application:', applicationId);
  return axios.put(`${API_BASE}/survey-applications/${applicationId}/complete`);
};

// Statistics and Analytics endpoints
export const getResponseStatistics = () => {
  console.log('API: Getting response statistics');
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
  
  console.log('API: Getting participation statistics:', url);
  return axios.get(url);
};

export const getModuleStatistics = (surveyId = null) => {
  let url = `${API_BASE}/responses/modules`;
  
  if (surveyId) {
    url += `?surveyId=${surveyId}`;
  }
  
  console.log('API: Getting module statistics:', url);
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
  
  console.log('API: Getting risk analysis:', url);
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
  
  console.log('API: Getting filtered responses:', url);
  return axios.get(url);
};

// NEW: Reports (NOM-035 dictamen)
export const getApplicationDictamen = (applicationId) => axios.get(`${API_BASE}/reports/application/${applicationId}/dictamen`);
export const getCompanyDictamenSummary = (companyId) => axios.get(`${API_BASE}/reports/company/${companyId}/dictamen-summary`);

// NEW: PDF downloads (responseType: blob)
export const downloadApplicationDictamenPdf = (applicationId) => {
  console.log('API: Downloading application dictamen PDF:', applicationId);
  return axios.get(`${API_BASE}/reports/application/${applicationId}/dictamen.pdf`, { responseType: 'blob' });
};
export const downloadCompanyDictamenSummaryPdf = (companyId) => {
  console.log('API: Downloading company dictamen summary PDF:', companyId);
  return axios.get(`${API_BASE}/reports/company/${companyId}/dictamen-summary.pdf`, { responseType: 'blob' });
};
// NEW (Branded variants): pass optional branding parameters
export const downloadApplicationDictamenPdfBranded = (applicationId, brand = {}) => {
  const params = new URLSearchParams();
  Object.entries(brand).forEach(([k,v]) => { if (v) params.append(k, v); });
  const url = `${API_BASE}/reports/application/${applicationId}/dictamen.pdf${params.toString() ? '?' + params.toString() : ''}`;
  console.log('API: Downloading branded application dictamen PDF:', url);
  return axios.get(url, { responseType: 'blob' });
};
export const downloadCompanyDictamenSummaryPdfBranded = (companyId, brand = {}) => {
  const params = new URLSearchParams();
  Object.entries(brand).forEach(([k,v]) => { if (v) params.append(k, v); });
  const url = `${API_BASE}/reports/company/${companyId}/dictamen-summary.pdf${params.toString() ? '?' + params.toString() : ''}`;
  console.log('API: Downloading branded company dictamen summary PDF:', url);
  return axios.get(url, { responseType: 'blob' });
};

// NEW: Ponderaciones PDF downloads
export const downloadApplicationPonderacionesPdf = (applicationId) => {
  console.log('API: Downloading application ponderaciones PDF:', applicationId);
  return axios.get(`${API_BASE}/reports/application/${applicationId}/ponderaciones.pdf`, { responseType: 'blob' });
};
export const downloadApplicationPonderacionesPdfBranded = (applicationId, brand = {}) => {
  const params = new URLSearchParams();
  Object.entries(brand).forEach(([k,v]) => { if (v) params.append(k, v); });
  const url = `${API_BASE}/reports/application/${applicationId}/ponderaciones.pdf${params.toString() ? '?' + params.toString() : ''}`;
  console.log('API: Downloading branded application ponderaciones PDF:', url);
  return axios.get(url, { responseType: 'blob' });
};

// NEW: Médica Leben individual JSON report
export const getMedicaLebenApplicationReport = (applicationId) => {
  console.log('API: Getting Medica Leben application report:', applicationId);
  return axios.get(`${API_BASE}/reports/medica-leben/application/${applicationId}`);
};

// Document AI (Interpretación de documentos)
export const interpretDocument = (file, documentType) => {
  const formData = new FormData();
  formData.append('file', file);
  if (documentType) formData.append('documentType', documentType);
  return axios.post(`${API_BASE}/documents/interpret`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};

export const getDocumentJobStatus = (jobId) => axios.get(`${API_BASE}/documents/${jobId}/status`, {
  headers: { 'Cache-Control': 'no-cache', Pragma: 'no-cache' },
  params: { _t: Date.now() }
});

export const getDocumentPreview = (jobId) => axios.get(`${API_BASE}/documents/${jobId}/preview`);

export const downloadDocumentWord = (jobId) =>
  axios.get(`${API_BASE}/documents/${jobId}/download`, { responseType: 'blob' });

// Document generation (Crear Documento)
export const getDocgenTemplates = () => axios.get(`${API_BASE}/docgen/templates`);
export const getDocgenTemplateFields = (templateType) => axios.get(`${API_BASE}/docgen/templates/${templateType}/fields`);
export const generateDocgenManual = (templateType, fields) =>
  axios.post(`${API_BASE}/docgen/generate/manual`, { templateType, fields });
export const getDocgenPreview = (jobId) => axios.get(`${API_BASE}/docgen/${jobId}/preview`);
export const downloadDocgenWord = (jobId) =>
  axios.get(`${API_BASE}/docgen/${jobId}/download/word`, { responseType: 'blob' });
export const downloadDocgenPdf = (jobId) =>
  axios.get(`${API_BASE}/docgen/${jobId}/download/pdf`, { responseType: 'blob' });

// Contract generation (Genera Contrato)
export const prepareContractFromDocuments = (files, documentType = 'ACTA', templateType = 'DOCUMENTO_04_1') => {
  const formData = new FormData();
  (files || []).forEach((file) => {
    if (file) {
      formData.append('files', file);
    }
  });
  if (documentType) {
    formData.append('documentType', documentType);
  }
  if (templateType) {
    formData.append('templateType', templateType);
  }
  return axios.post(`${API_BASE}/contracts/prepare`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};

export const generateContract = (templateType, fields) =>
  axios.post(`${API_BASE}/contracts/generate`, { templateType, fields });

export const getContractMovementLog = () =>
  axios.get(`${API_BASE}/contracts/movements`);