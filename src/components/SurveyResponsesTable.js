import React, { useEffect, useState } from "react";
import { useTranslation } from 'react-i18next';
import { getSurveyResponses, getSurveys, getEmployees, getSurveyApplications } from "../api/nom035";
import { DataGrid } from "@mui/x-data-grid";
import { Button, TextField, MenuItem, Box } from "@mui/material";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import jsPDF from "jspdf";
import "jspdf-autotable";

export default function SurveyResponsesTable() {
  const { t } = useTranslation();
  const [rows, setRows] = useState([]);
  const [surveys, setSurveys] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [applications, setApplications] = useState([]);
  const [selectedSurvey, setSelectedSurvey] = useState("");
  const [selectedEmployee, setSelectedEmployee] = useState("");

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
      getSurveyApplications().then(res => res.data || []).catch(() => []),
      getSurveyResponses().then(res => res.data || []).catch(() => [])
    ]).then(([surveysData, employeesData, appsData, responsesData]) => {
      setSurveys(Array.isArray(surveysData) ? surveysData : []);
      setEmployees(Array.isArray(employeesData) ? employeesData : []);
      setApplications(Array.isArray(appsData) ? appsData : []);

      buildRows(appsData, responsesData, surveysData, employeesData);
    });
    // eslint-disable-next-line
  }, []);

  useEffect(() => {
    // Rebuild rows when filters or reference data change
    if (!applications) return;
    getSurveyResponses().then(res => {
      const responsesData = Array.isArray(res.data) ? res.data : [];
      buildRows(applications, responsesData, surveys, employees);
    }).catch(() => buildRows(applications, [], surveys, employees));
    // eslint-disable-next-line
  }, [selectedSurvey, selectedEmployee, surveys, employees, applications]);

  const buildRows = (appsData, responsesData, surveysData, employeesData) => {
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
        survey: findSurveyTitle(surveyId),
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

        <Box sx={{ flexGrow: 1 }} />

  <Button variant="contained" size="small" onClick={exportExcel}>{t('responses.exportToExcel')}</Button>
  <Button variant="contained" size="small" onClick={exportPDF}>{t('responses.exportToPDF')}</Button>
      </Box>
      <DataGrid
        rows={rows}
        columns={[
          { field: "survey", headerName: t('responses.survey'), width: 200 },
          { field: "employee", headerName: t('responses.employee'), width: 200 },
          { field: "riskLevel", headerName: t('responses.riskLevel'), width: 140 },
          { field: "date", headerName: t('responses.date'), width: 200 },
          { field: "answers", headerName: t('responses.answers'), width: 500 }
        ]}
        pageSize={10}
        rowsPerPageOptions={[10, 20, 50]}
        autoHeight
      />
    </div>
  );
}