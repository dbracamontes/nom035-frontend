import axios from 'axios';

const API_BASE = "http://localhost:8080/api";

export const getEmployees = () => axios.get(`${API_BASE}/employees`);
export const createEmployee = data => axios.post(`${API_BASE}/employees`, data);

export const getSurveys = () => axios.get(`${API_BASE}/surveys`);
export const createSurvey = data => axios.post(`${API_BASE}/surveys/generate`, data);

export const getSurveyResponses = () => axios.get(`${API_BASE}/survey-responses`);
export const submitSurveyResponse = data => axios.post(`${API_BASE}/survey-responses`, data);

export const getRiskSummary = () => axios.get(`${API_BASE}/reports/risk-summary`);