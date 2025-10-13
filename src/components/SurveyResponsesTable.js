import React, { useEffect, useState } from "react";
import { getSurveyResponses, getSurveys, getEmployees } from "../api/nom035";
import { DataGrid } from "@mui/x-data-grid";
import { Button, TextField, MenuItem } from "@mui/material";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import jsPDF from "jspdf";
import "jspdf-autotable";

export default function SurveyResponsesTable() {
  const [rows, setRows] = useState([]);
  const [surveys, setSurveys] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [selectedSurvey, setSelectedSurvey] = useState("");
  const [selectedEmployee, setSelectedEmployee] = useState("");

  useEffect(() => {
    getSurveys().then(res => setSurveys(res.data));
    getEmployees().then(res => setEmployees(res.data));
    fetchResponses();
  }, []);

  const fetchResponses = () => {
    getSurveyResponses().then(res => {
      let data = res.data;
      if (selectedSurvey) {
        data = data.filter(r => r.survey.id === Number(selectedSurvey));
      }
      if (selectedEmployee) {
        data = data.filter(r => r.employee.id === Number(selectedEmployee));
      }
      setRows(data.map((r, idx) => ({
        id: idx,
        survey: r.survey.title,
        employee: r.employee.name,
        riskLevel: r.riskLevel,
        date: r.submittedAt,
        answers: r.answers ? r.answers.map(a => `${a.question.text}: ${a.answer}`).join("; ") : ""
      })));
    });
  };

  useEffect(() => {
    fetchResponses();
    // eslint-disable-next-line
  }, [selectedSurvey, selectedEmployee]);

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
      <TextField
        select
        label="Filter by Survey"
        value={selectedSurvey}
        onChange={e => setSelectedSurvey(e.target.value)}
        sx={{ mb: 2, mr: 2, minWidth: 200 }}
      >
        <MenuItem value="">All Surveys</MenuItem>
        {surveys.map(s => <MenuItem key={s.id} value={s.id}>{s.title}</MenuItem>)}
      </TextField>
      <TextField
        select
        label="Filter by Employee"
        value={selectedEmployee}
        onChange={e => setSelectedEmployee(e.target.value)}
        sx={{ mb: 2, minWidth: 200 }}
      >
        <MenuItem value="">All Employees</MenuItem>
        {employees.map(emp => <MenuItem key={emp.id} value={emp.id}>{emp.name}</MenuItem>)}
      </TextField>
      <Button variant="contained" sx={{ mb: 2, mr: 2 }} onClick={exportExcel}>Export Table (Excel)</Button>
      <Button variant="contained" sx={{ mb: 2 }} onClick={exportPDF}>Export Table (PDF)</Button>
      <DataGrid
        rows={rows}
        columns={[
          { field: "survey", headerName: "Survey", width: 180 },
          { field: "employee", headerName: "Employee", width: 180 },
          { field: "riskLevel", headerName: "Risk Level", width: 120 },
          { field: "date", headerName: "Date", width: 160 },
          { field: "answers", headerName: "Answers", width: 400 }
        ]}
        pageSize={10}
        rowsPerPageOptions={[10, 20, 50]}
        autoHeight
      />
    </div>
  );
}