import React, { useState, useEffect } from "react";
import { TextField, Button, Box, IconButton, Paper, MenuItem } from "@mui/material";
import AddIcon from '@mui/icons-material/Add';
import { createSurvey, updateSurvey, getCompanies } from "../api/nom035";

export default function SurveyForm({ survey, onCreated }) {
  const [title, setTitle] = useState(survey ? survey.title : "");
  const [description, setDescription] = useState(survey ? survey.description : "");
  const [questions, setQuestions] = useState(survey ? survey.questions : [{ text: "", type: "single-choice", options: "A,B,C,D", answerScores: '{"A":1,"B":2,"C":3,"D":4}' }]);
  const [companies, setCompanies] = useState([]);
  const [companyId, setCompanyId] = useState(survey && survey.company ? survey.company.id : "");

  useEffect(() => {
    getCompanies().then(res => setCompanies(res.data));
  }, []);

  const handleQChange = (idx, field, value) => {
    const newQs = [...questions];
    newQs[idx][field] = value;
    setQuestions(newQs);
  };

  const addQuestion = () => setQuestions([...questions, { text: "", type: "single-choice", options: "", answerScores: "" }]);

  const handleSubmit = async e => {
    e.preventDefault();
    const payload = {
      title,
      description,
      questions,
      company: companyId ? { id: companyId } : undefined
    };
    if (survey && survey.id) {
      await updateSurvey(survey.id, payload);
    } else {
      await createSurvey(payload);
    }
    setTitle(""); setDescription(""); setQuestions([{ text: "", type: "single-choice", options: "", answerScores: "" }]); setCompanyId("");
    if (onCreated) onCreated();
  };

  return (
    <Paper sx={{ p: 2, mb: 2 }}>
      <Box component="form" onSubmit={handleSubmit}>
        <TextField label="Title" value={title} onChange={e => setTitle(e.target.value)} required sx={{ mr: 2 }} />
        <TextField label="Description" value={description} onChange={e => setDescription(e.target.value)} sx={{ mr: 2 }} />
        <TextField
          select
          label="Company"
          value={companyId}
          onChange={e => setCompanyId(e.target.value)}
          required
          sx={{ mr: 2, minWidth: 120 }}
        >
          <MenuItem value="">Select Company</MenuItem>
          {companies.map(company => (
            <MenuItem key={company.id} value={company.id}>{company.name}</MenuItem>
          ))}
        </TextField>
        {questions.map((q, idx) => (
          <Box key={idx} sx={{ mt: 2, mb: 2 }}>
            <TextField label="Question Text" value={q.text} onChange={e => handleQChange(idx, "text", e.target.value)} required sx={{ mr: 2 }} />
            <TextField label="Type" value={q.type} onChange={e => handleQChange(idx, "type", e.target.value)} sx={{ mr: 2 }} />
            <TextField label="Options" value={q.options} onChange={e => handleQChange(idx, "options", e.target.value)} sx={{ mr: 2 }} />
            <TextField label="Answer Scores (JSON)" value={q.answerScores} onChange={e => handleQChange(idx, "answerScores", e.target.value)} sx={{ mr: 2 }} />
          </Box>
        ))}
        <IconButton onClick={addQuestion}><AddIcon /></IconButton>
        <Button type="submit" variant="contained">{survey ? "Update Survey" : "Create Survey"}</Button>
      </Box>
    </Paper>
  );
}