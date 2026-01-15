import React, { useEffect, useState } from "react";
import { useTranslation } from 'react-i18next';
import { getSurveyResponses, getSurveys, getEmployees, getSurveyApplications, getCompanies } from "../api/nom035";
import { DataGrid } from "@mui/x-data-grid";
import { Button, TextField, MenuItem, Box } from "@mui/material";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import jsPDF from "jspdf";
import "jspdf-autotable";
import { useNavigate } from 'react-router-dom';
import EmployeeSurveyResponseReport from './EmployeeSurveyResponseReport';

export default function SurveyResponsesTable() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [surveys, setSurveys] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [applications, setApplications] = useState([]);
  const [selectedSurvey, setSelectedSurvey] = useState("");
  const [selectedEmployee, setSelectedEmployee] = useState("");
  const [selectedCompany, setSelectedCompany] = useState("");
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [selectedApplicationId, setSelectedApplicationId] = useState(null);

  // Helpers to safely extract fields regardless of backend shape
  const toNum = (v) => {
    const n = Number(v);
    return Number.isNaN(n) ? null : n;
  };
  const findSurveyTitle = (sid) => {
    if (sid == null) return "(Unknown survey)";
    const s = surveys.find(x => toNum(x?.id) === toNum(sid));
    return s?.title || s?.name || `Survey ${sid}`;
  };
  const findEmployeeName = (eid) => {
    if (eid == null) return "(Unknown)";
    const e = employees.find(x => toNum(x?.id) === toNum(eid));
    return e?.name || e?.email || `#${eid}`;
  };

  useEffect(() => {
    // Load reference data and build table rows
    Promise.all([
      getSurveys().then(res => res.data || []).catch(() => []),
      getEmployees().then(res => res.data || []).catch(() => []),
      getCompanies().then(res => res.data || []).catch(() => []),
      getSurveyApplications().then(res => res.data || []).catch(() => []),
      getSurveyResponses().then(res => res.data || []).catch(() => [])
    ]).then(([surveysData, employeesData, companiesData, appsData, responsesData]) => {
      setSurveys(Array.isArray(surveysData) ? surveysData : []);
      setEmployees(Array.isArray(employeesData) ? employeesData : []);
      setCompanies(Array.isArray(companiesData) ? companiesData : []);
      setApplications(Array.isArray(appsData) ? appsData : []);

      buildRows(appsData, responsesData, surveysData, employeesData, companiesData);
    });
    // eslint-disable-next-line
  }, []);

  useEffect(() => {
    // Rebuild rows when filters or reference data change
    if (!applications) return;
    getSurveyResponses().then(res => {
      const responsesData = Array.isArray(res.data) ? res.data : [];
      buildRows(applications, responsesData, surveys, employees, companies);
    }).catch(() => buildRows(applications, [], surveys, employees, companies));
    // eslint-disable-next-line
  }, [selectedSurvey, selectedEmployee, selectedCompany, surveys, employees, companies, applications]);

  const buildRows = (appsData, responsesData, surveysData, employeesData, companiesData) => {
    const validApps = Array.isArray(appsData) ? appsData : [];
    const validResponses = Array.isArray(responsesData) ? responsesData : [];

    // Group responses by surveyApplicationId
    const byApp = new Map();
    for (const r of validResponses) {
      const appId = toNum(r?.surveyApplicationId);
      if (appId == null) continue;
      if (!byApp.has(appId)) byApp.set(appId, []);
      byApp.get(appId).push(r);
    }

    // Filter apps by selected filters
    let apps = validApps;
    if (selectedSurvey) {
      const sel = toNum(selectedSurvey);
      apps = apps.filter(a => toNum(a?.surveyId) === sel);
    }
    if (selectedEmployee) {
      const selE = toNum(selectedEmployee);
      apps = apps.filter(a => toNum(a?.employeeId) === selE);
    }
    if (selectedCompany) {
      const selC = toNum(selectedCompany);
      // Filter by company through employee
      apps = apps.filter(a => {
        const emp = employeesData.find(e => toNum(e?.id) === toNum(a?.employeeId));
        return emp && toNum(emp?.companyId) === selC;
      });
    }

    const mapped = apps.map(app => {
      const appId = app?.id;
      const surveyId = app?.surveyId;
      const employeeId = app?.employeeId;
      const answersArr = byApp.get(toNum(appId)) || [];
      const answersPreview = answersArr.slice(0, 5).map(a => {
        const q = a?.questionId != null ? `Q${a.questionId}` : 'Q?';
        const val = a?.textAnswer ?? a?.optionAnswerId ?? '';
        return `${q}: ${val}`;
      }).join("; ");
      const answersSuffix = answersArr.length > 5 ? `; +${answersArr.length - 5} más` : '';

      return {
        id: appId,
        surveyId,
        survey: findSurveyTitle(surveyId),
        employeeId,
        employee: findEmployeeName(employeeId),
        riskLevel: app?.riskLevel || '',
        date: app?.completedAt || app?.startedAt || '',
        answers: answersPreview + answersSuffix
      };
    });

    setRows(mapped);
  };

  const exportExcel = () => {
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Responses");
    const buf = XLSX.write(wb, { type: "array", bookType: "xlsx" });
    saveAs(new Blob([buf], { type: "application/octet-stream" }), "survey_responses.xlsx");
  };

  const exportPDF = () => {
    const doc = new jsPDF();
    doc.text("Survey Responses", 14, 16);
    doc.autoTable({
      startY: 20,
      head: [["Survey", "Employee", "Risk Level", "Date", "Answers"]],
      body: rows.map(r => [r.survey, r.employee, r.riskLevel, r.date, r.answers])
    });
    doc.save("survey_responses.pdf");
  };

  const handleViewMedicaLebenReport = (applicationId, surveyTitle) => {
    if (!applicationId) return;
    const title = (surveyTitle || '').toLowerCase();
    const isMedicaLeben = title.includes('medica leben') || title.includes('médica leben');
    if (!isMedicaLeben) {
      alert('Solo aplica para encuestas Médica Leben');
      return;
    }
    navigate(`/medica-leben-report/${applicationId}`);
  };

  const handleOpenResponseReport = (applicationId) => {
    setSelectedApplicationId(applicationId);
    setReportDialogOpen(true);
  };

  const handleCloseResponseReport = () => {
    setReportDialogOpen(false);
    setSelectedApplicationId(null);
  };

  const columns = [
    { field: "survey", headerName: t('responses.survey'), width: 200 },
    { field: "employee", headerName: t('responses.employee'), width: 200 },
    { field: "riskLevel", headerName: t('responses.riskLevel'), width: 140 },
    { field: "date", headerName: t('responses.date'), width: 200 },
    { field: "answers", headerName: t('responses.answers'), width: 400 },
    {
      field: 'medicaLebenReport',
      headerName: 'Reporte Médica Leben',
      width: 220,
      sortable: false,
      filterable: false,
      align: 'center',
      headerAlign: 'center',
      renderCell: (params) => (
        <Button
          variant="outlined"
          size="small"
          onClick={() => handleViewMedicaLebenReport(params.row.id, params.row.survey)}
          sx={{ minWidth: 180 }}
        >
          Ver reporte individual
        </Button>
      )
    },
    {
      field: 'responseReport',
      headerName: 'Reporte Respuestas',
      width: 220,
      sortable: false,
      filterable: false,
      align: 'center',
      headerAlign: 'center',
      renderCell: (params) => (
        <Button
          variant="outlined"
          size="small"
          onClick={() => handleOpenResponseReport(params.row.id)}
          sx={{ minWidth: 180 }}
        >
          Ver Respuestas
        </Button>
      )
    }
  ];

  return (
    <div style={{ height: 500, width: "100%" }}>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 2, mb: 2 }}>

        <TextField
          select
          size="small"
          label={t('responses.filterBySurvey')}
          value={selectedSurvey}
          onChange={e => setSelectedSurvey(e.target.value)}
          sx={{ minWidth: 240 }}
        >
          <MenuItem value="">{t('responses.allSurveys')}</MenuItem>
          {surveys.filter(Boolean).map(s => <MenuItem key={s.id} value={s.id}>{s.title || s.name || `${t('responses.survey')} ${s.id}`}</MenuItem>)}
        </TextField>

        <TextField
          select
          size="small"
          label={t('responses.filterByEmployee')}
          value={selectedEmployee}
          onChange={e => setSelectedEmployee(e.target.value)}
          sx={{ minWidth: 240 }}
        >
          <MenuItem value="">{t('responses.allEmployees')}</MenuItem>
          {employees.filter(Boolean).map(emp => <MenuItem key={emp.id} value={emp.id}>{emp.name || emp.email || `#${emp.id}`}</MenuItem>)}
        </TextField>

        <TextField
          select
          size="small"
          label="Filtrar por Empresa"
          value={selectedCompany}
          onChange={e => setSelectedCompany(e.target.value)}
          sx={{ minWidth: 240 }}
        >
          <MenuItem value="">Todas las Empresas</MenuItem>
          {companies.filter(Boolean).map(comp => <MenuItem key={comp.id} value={comp.id}>{comp.name || `Empresa #${comp.id}`}</MenuItem>)}
        </TextField>

        <Box sx={{ flexGrow: 1 }} />

        <Button variant="contained" size="small" onClick={exportExcel}>{t('responses.exportToExcel')}</Button>
        <Button variant="contained" size="small" onClick={exportPDF}>{t('responses.exportToPDF')}</Button>
      </Box>
      <DataGrid
        rows={rows}
        columns={columns}
        pageSize={10}
        rowsPerPageOptions={[10, 20, 50]}
        autoHeight
      />
      
      <EmployeeSurveyResponseReport
        open={reportDialogOpen}
        onClose={handleCloseResponseReport}
        applicationId={selectedApplicationId}
      />
    </div>
  );
}