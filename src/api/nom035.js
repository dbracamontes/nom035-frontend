import axios from 'axios';

const API_BASE = "http://localhost:8080/api";

// Add request interceptor to ensure proper headers
axios.interceptors.request.use(
  (config) => {
    if (config.method === 'post' || config.method === 'put') {
      config.headers['Content-Type'] = 'application/json';
    }
    console.log('Request config:', config);
    return config;
  },
  (error) => Promise.reject(error)
);

// Employee endpoints
export const getEmployees = () => axios.get(`${API_BASE}/employees`);
export const getEmployeeById = id => axios.get(`${API_BASE}/employees/${id}`);
export const getEmployeesByCompany = companyId => axios.get(`${API_BASE}/employees/company/${companyId}`);
export const createEmployee = data => {
  return axios.post(`${API_BASE}/employees`, JSON.stringify(data), {
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    }
  });
};
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
  
  const response = await fetch('http://localhost:8080/api/company-surveys', {
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
export const getSurveyResponses = () => axios.get(`${API_BASE}/responses`);

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