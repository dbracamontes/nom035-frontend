
import React, { useEffect, useState } from "react";
import { getSurveys } from "../api/nom035";
import { Paper, Typography, List, ListItem, ListItemText } from "@mui/material";

export default function SurveyList() {
  const [surveys, setSurveys] = useState([]);

  useEffect(() => { getSurveys().then(res => setSurveys(res.data)); }, []);

  return (
    <Paper sx={{ p: 2 }}>
      <Typography variant="h6">Surveys List</Typography>
      <List>
        {surveys.map(s => (
          <ListItem key={s.id}>
            <ListItemText primary={s.title} secondary={s.description} />
          </ListItem>
        ))}
      </List>
    </Paper>
  );
}