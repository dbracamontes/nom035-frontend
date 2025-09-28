import React, { useState, useEffect } from "react";
import { getSurveys, submitSurveyResponse } from "../api/nom035";
import { Box, Button, TextField, Paper } from "@mui/material";

export default function SurveyAnswer() {
  const [surveys, setSurveys] = useState([]);
  const [selectedSurvey, setSelectedSurvey] = useState(null);
  const [answers, setAnswers] = useState({});

  useEffect(() => { getSurveys().then(res => setSurveys(res.data)); }, []);

  const handleSurveySelect = id => {
    setSelectedSurvey(surveys.find(s => s.id === id));
    setAnswers({});
  };

  const handleAnswerChange = (qid, value) => setAnswers({ ...answers, [qid]: value });

  const handleSubmit = async e => {
    e.preventDefault();
    // Assume employeeId is known; if not, ask for employee selection
    const employeeId = 1;
    const response = {
      employee: { id: employeeId },
      survey: { id: selectedSurvey.id },
      answers: selectedSurvey.questions.map(q => ({
        question: { id: q.id },
        answer: answers[q.id] || ""
      }))
    };
    await submitSurveyResponse(response);
    alert("Submitted!");
  };

  return (
    <Paper sx={{ p: 2 }}>
      <select onChange={e => handleSurveySelect(Number(e.target.value))}>
        <option value="">Select a survey</option>
        {surveys.map(s => <option key={s.id} value={s.id}>{s.title}</option>)}
      </select>
      {selectedSurvey && (
        <Box component="form" onSubmit={handleSubmit}>
          {selectedSurvey.questions.map(q => (
            <TextField key={q.id} label={q.text} value={answers[q.id] || ""} onChange={e => handleAnswerChange(q.id, e.target.value)} sx={{ mb: 2 }} />
          ))}
          <Button type="submit" variant="contained">Submit Answers</Button>
        </Box>
      )}
    </Paper>
  );
}