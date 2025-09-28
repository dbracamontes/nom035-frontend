import React, { useEffect, useState } from "react";
import { getSurveyResponses } from "../api/nom035";
import { DataGrid } from "@mui/x-data-grid";
import { Button } from "@mui/material";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import jsPDF from "jspdf";
import "jspdf-autotable";

export default function SurveyResponsesTable() {
  const [rows, setRows] = useState([]);

  useEffect(() => {
    getSurveyResponses().then(res =>
      setRows(res.data.map((r, idx) => ({
        id: idx,
        survey: r.survey.title,
        employee: r.employee.name,
        riskLevel: r.riskLevel,
        date: r.submittedAt
      })))
    );
  }, []);

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
      head: [["Survey", "Employee", "Risk Level", "Date"]],
      body: rows.map(r => [r.survey, r.employee, r.riskLevel, r.date])
    });
    doc.save("survey_responses.pdf");
  };

  return (
    <div style={{ height: 400, width: "100%" }}>
      <Button variant="contained" sx={{ mb: 2, mr: 2 }} onClick={exportExcel}>Export Table (Excel)</Button>
      <Button variant="contained" sx={{ mb: 2 }} onClick={exportPDF}>Export Table (PDF)</Button>
      <DataGrid
        rows={rows}
        columns={[
          { field: "survey", headerName: "Survey", width: 150 },
          { field: "employee", headerName: "Employee", width: 150 },
          { field: "riskLevel", headerName: "Risk Level", width: 120 },
          { field: "date", headerName: "Date", width: 180 }
        ]}
        pageSize={5}
      />
    </div>
  );
}