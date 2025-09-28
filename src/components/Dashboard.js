import React, { useEffect, useState } from "react";
import { getRiskSummary } from "../api/nom035";
import { Box, Typography, Paper, Button } from "@mui/material";
import { PieChart, Pie, Cell, Tooltip, Legend } from "recharts";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042"];

export default function Dashboard() {
  const [riskSummary, setRiskSummary] = useState({ counts: {}, averageScore: 0 });

  useEffect(() => {
    getRiskSummary().then(res => setRiskSummary(res.data));
  }, []);

  const pieData = Object.keys(riskSummary.counts || {}).map((key, idx) => ({
    name: key,
    value: riskSummary.counts[key]
  }));

  const exportExcel = () => {
    const ws = XLSX.utils.json_to_sheet(
      pieData.map(d => ({ Risk: d.name, Count: d.value }))
    );
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "RiskSummary");
    const buf = XLSX.write(wb, { type: "array", bookType: "xlsx" });
    saveAs(new Blob([buf], { type: "application/octet-stream" }), "risk_summary.xlsx");
  };

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h4">Dashboard</Typography>
      <Paper sx={{ p: 2, mb: 2 }}>
        <Typography variant="h6">Risk Level Distribution</Typography>
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
        <Button variant="contained" sx={{ mt: 2 }} onClick={exportExcel}>
          Export to Excel
        </Button>
      </Paper>
      <Typography variant="body1">Average Score: {riskSummary.averageScore}</Typography>
    </Box>
  );
}