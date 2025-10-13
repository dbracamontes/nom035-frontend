import axios from 'axios';

const API_BASE = "http://localhost:8080/api";

// Employee endpoints
export const getEmployees = () => axios.get(`${API_BASE}/employees`);
export const getEmployeeById = id => axios.get(`${API_BASE}/employees/${id}`);
export const getEmployeesByCompany = companyId => axios.get(`${API_BASE}/employees/company/${companyId}`);
export const createEmployee = data => axios.post(`${API_BASE}/employees`, data);
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
export const createSurvey = data => axios.post(`${API_BASE}/surveys`, data);
export const updateSurvey = (id, data) => axios.put(`${API_BASE}/surveys/${id}`, data);
export const deleteSurvey = id => axios.delete(`${API_BASE}/surveys/${id}`);

// CompanySurvey endpoints
export const getCompanySurveys = () => axios.get(`${API_BASE}/company-surveys`);
export const getCompanySurveyById = id => axios.get(`${API_BASE}/company-surveys/${id}`);
export const getCompanySurveysByCompany = companyId => axios.get(`${API_BASE}/company-surveys/company/${companyId}`);
export const getCompanySurveysBySurvey = surveyId => axios.get(`${API_BASE}/company-surveys/survey/${surveyId}`);
export const createCompanySurvey = data => axios.post(`${API_BASE}/company-surveys`, data);
export const updateCompanySurvey = (id, data) => axios.put(`${API_BASE}/company-surveys/${id}`, data);
export const deleteCompanySurvey = id => axios.delete(`${API_BASE}/company-surveys/${id}`);

// Dashboard endpoints
export const getCompanyDashboard = companyId => axios.get(`${API_BASE}/dashboard/company/${companyId}`);
export const getCompanyRisk = companyId => axios.get(`${API_BASE}/dashboard/company/${companyId}/risk`);
export const getCompanyParticipation = companyId => axios.get(`${API_BASE}/dashboard/company/${companyId}/participation`);