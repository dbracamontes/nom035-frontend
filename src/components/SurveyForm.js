import React, { useState } from "react";
import { TextField, Button, Box, IconButton, Paper } from "@mui/material";
import AddIcon from '@mui/icons-material/Add';
import { createSurvey } from "../api/nom035";

export default function SurveyForm({ onCreated }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [questions, setQuestions] = useState([
    { text: "", type: "single-choice", options: "A,B,C,D", answerScores: '{"A":1,"B":2,"C":3,"D":4}' }
  ]);

  const handleQChange = (idx, field, value) => {
    const newQs = [...questions];
    newQs[idx][field] = value;
    setQuestions(newQs);
  };

  const addQuestion = () => setQuestions([...questions, { text: "", type: "single-choice", options: "", answerScores: "" }]);

  const handleSubmit = async e => {
    e.preventDefault();
    await createSurvey({ title, description, questions });
    setTitle(""); setDescription(""); setQuestions([{ text: "", type: "single-choice", options: "", answerScores: "" }]);
    if (onCreated) onCreated();
  };

  return (
    <Paper sx={{ p: 2, mb: 2 }}>
      <Box component="form" onSubmit={handleSubmit}>
        <TextField label="Title" value={title} onChange={e => setTitle(e.target.value)} required sx={{ mr: 2 }} />
        <TextField label="Description" value={description} onChange={e => setDescription(e.target.value)} sx={{ mr: 2 }} />
        {questions.map((q, idx) => (
          <Box key={idx} sx={{ mt: 2, mb: 2 }}>
            <TextField label="Question Text" value={q.text} onChange={e => handleQChange(idx, "text", e.target.value)} required sx={{ mr: 2 }} />
            <TextField label="Type" value={q.type} onChange={e => handleQChange(idx, "type", e.target.value)} sx={{ mr: 2 }} />
            <TextField label="Options" value={q.options} onChange={e => handleQChange(idx, "options", e.target.value)} sx={{ mr: 2 }} />
            <TextField label="Answer Scores (JSON)" value={q.answerScores} onChange={e => handleQChange(idx, "answerScores", e.target.value)} sx={{ mr: 2 }} />
          </Box>
        ))}
        <IconButton onClick={addQuestion}><AddIcon /></IconButton>
        <Button type="submit" variant="contained">Create Survey</Button>
      </Box>
    </Paper>
  );
}