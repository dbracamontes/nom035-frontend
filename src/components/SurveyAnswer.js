import React, { useState, useEffect } from "react";
import { getSurveys, getEmployees, submitSurveyResponse } from "../api/nom035";
import { Box, Button, TextField, Paper, MenuItem } from "@mui/material";

export default function SurveyAnswer() {
  const [surveys, setSurveys] = useState([]);
  const [selectedSurvey, setSelectedSurvey] = useState(null);
  const [answers, setAnswers] = useState({});
  const [employees, setEmployees] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState("");

  useEffect(() => {
    getSurveys().then(res => setSurveys(res.data));
    getEmployees().then(res => setEmployees(res.data));
  }, []);

  const handleSurveySelect = id => {
    setSelectedSurvey(surveys.find(s => s.id === id));
    setAnswers({});
  };

  const handleAnswerChange = (qid, value) => setAnswers({ ...answers, [qid]: value });

  const handleSubmit = async e => {
    e.preventDefault();
    if (!selectedEmployee || !selectedSurvey) return;
    const response = {
      employee: { id: selectedEmployee },
      survey: { id: selectedSurvey.id },
      answers: selectedSurvey.questions.map(q => ({
        question: { id: q.id },
        answer: answers[q.id] || ""
      }))
    };
    await submitSurveyResponse(response);
    alert("Submitted!");
    setAnswers({});
    setSelectedSurvey(null);
    setSelectedEmployee("");
  };

  return (
    <Paper sx={{ p: 2 }}>
      <TextField
        select
        label="Select Employee"
        value={selectedEmployee}
        onChange={e => setSelectedEmployee(e.target.value)}
        sx={{ mb: 2, minWidth: 200 }}
      >
        <MenuItem value="">Select an employee</MenuItem>
        {employees.map(emp => (
          <MenuItem key={emp.id} value={emp.id}>{emp.name} ({emp.email})</MenuItem>
        ))}
      </TextField>
      <TextField
        select
        label="Select Survey"
        value={selectedSurvey ? selectedSurvey.id : ""}
        onChange={e => handleSurveySelect(Number(e.target.value))}
        sx={{ mb: 2, minWidth: 200 }}
      >
        <MenuItem value="">Select a survey</MenuItem>
        {surveys.map(s => <MenuItem key={s.id} value={s.id}>{s.title}</MenuItem>)}
      </TextField>
      {selectedSurvey && selectedSurvey.questions && (
        <Box component="form" onSubmit={handleSubmit}>
          {selectedSurvey.questions.map(q => (
            <TextField key={q.id} label={q.text} value={answers[q.id] || ""} onChange={e => handleAnswerChange(q.id, e.target.value)} sx={{ mb: 2 }} fullWidth />
          ))}
          <Button type="submit" variant="contained">Submit Answers</Button>
        </Box>
      )}
    </Paper>
  );
}