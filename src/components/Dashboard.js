import React, { useEffect, useState } from "react";
import {
  getCompanyDashboard,
  getCompanyRisk,
  getCompanyParticipation
} from "../api/nom035";
import { Box, Typography, Paper, Button, Table, TableBody, TableCell, TableHead, TableRow } from "@mui/material";
import { PieChart, Pie, Cell, Tooltip, Legend } from "recharts";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#A28BFE", "#FEA8B2"];
const COMPANY_ID = 1; // Change as needed or make selectable

export default function Dashboard() {
  const [dashboard, setDashboard] = useState({ employees: [], surveyStatusCounts: [], surveys: [] });
  const [riskByFactor, setRiskByFactor] = useState({});
  const [participation, setParticipation] = useState([]);

  useEffect(() => {
    getCompanyDashboard(COMPANY_ID).then(res => setDashboard(res.data));
    getCompanyRisk(COMPANY_ID).then(res => setRiskByFactor(res.data));
    getCompanyParticipation(COMPANY_ID).then(res => setParticipation(res.data));
  }, []);

  // Pie data for risk by factor
  const pieData = Object.keys(riskByFactor).map((key, idx) => ({
    name: key,
    value: riskByFactor[key]
  }));

  // Export risk by factor to Excel
  const exportRiskExcel = () => {
    const ws = XLSX.utils.json_to_sheet(
      pieData.map(d => ({ Factor: d.name, AverageRisk: d.value }))
    );
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "RiskByFactor");
    const buf = XLSX.write(wb, { type: "array", bookType: "xlsx" });
    saveAs(new Blob([buf], { type: "application/octet-stream" }), "risk_by_factor.xlsx");
  };

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h4">Dashboard</Typography>
      <Paper sx={{ p: 2, mb: 2 }}>
        <Typography variant="h6">Risk by Factor</Typography>
        <PieChart width={400} height={300}>
          <Pie
            data={pieData}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            outerRadius={80}
            fill="#8884d8"
            label
          >
            {pieData.map((entry, idx) => (
              <Cell key={`cell-${idx}`} fill={COLORS[idx % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip />
          <Legend />
        </PieChart>
        <Button variant="contained" sx={{ mt: 2 }} onClick={exportRiskExcel}>
          Export Risk by Factor to Excel
        </Button>
      </Paper>
      <Paper sx={{ p: 2, mb: 2 }}>
        <Typography variant="h6">Participation by Survey</Typography>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Survey Title</TableCell>
              <TableCell>Completion Rate (%)</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {participation.map((row, idx) => (
              <TableRow key={idx}>
                <TableCell>{row.surveyTitle}</TableCell>
                <TableCell>{row.completionRate.toFixed(2)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>
      <Paper sx={{ p: 2, mb: 2 }}>
        <Typography variant="h6">Employees</Typography>
        <Typography variant="body2">Total: {dashboard.employees.length}</Typography>
        <ul>
          {dashboard.employees.map(emp => (
            <li key={emp.id}>{emp.name} ({emp.position})</li>
          ))}
        </ul>
      </Paper>
      <Paper sx={{ p: 2, mb: 2 }}>
        <Typography variant="h6">Survey Status Counts</Typography>
        <pre>{JSON.stringify(dashboard.surveyStatusCounts, null, 2)}</pre>
      </Paper>
      <Paper sx={{ p: 2, mb: 2 }}>
        <Typography variant="h6">Surveys</Typography>
        <ul>
          {dashboard.surveys.map(survey => (
            <li key={survey.id}>{survey.title}</li>
          ))}
        </ul>
      </Paper>
    </Box>
  );
}