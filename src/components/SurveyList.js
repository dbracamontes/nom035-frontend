import React, { useEffect, useState } from "react";
import { getSurveys, deleteSurvey } from "../api/nom035";
import { Paper, Typography, List, ListItem, ListItemText, IconButton, Dialog, DialogTitle, DialogContent } from "@mui/material";
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import SurveyForm from "./SurveyForm";

export default function SurveyList() {
  const [surveys, setSurveys] = useState([]);
  const [editSurvey, setEditSurvey] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const fetchSurveys = () => {
    getSurveys().then(res => {
      setSurveys(Array.isArray(res.data) ? res.data : []);
    });
  };

  useEffect(() => {
    fetchSurveys();
  }, []);

  const handleDelete = async (id) => {
    await deleteSurvey(id);
    fetchSurveys();
  };

  const handleEdit = (survey) => {
    setEditSurvey(survey);
    setDialogOpen(true);
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
    setEditSurvey(null);
    fetchSurveys();
  };

  return (
    <Paper sx={{ p: 2 }}>
      <Typography variant="h6">Surveys List</Typography>
      <List>
        {surveys.map(s => (
          <ListItem key={s.id}
            secondaryAction={
              <>
                <IconButton edge="end" aria-label="edit" onClick={() => handleEdit(s)}><EditIcon /></IconButton>
                <IconButton edge="end" aria-label="delete" onClick={() => handleDelete(s.id)}><DeleteIcon /></IconButton>
              </>
            }
          >
            <ListItemText
              primary={s.title}
              secondary={`Description: ${s.description || ""} | Company: ${s.company?.name || "N/A"}`}
            />
          </ListItem>
        ))}
      </List>
      <Dialog open={dialogOpen} onClose={handleDialogClose} maxWidth="md" fullWidth>
        <DialogTitle>Edit Survey</DialogTitle>
        <DialogContent>
          {editSurvey && <SurveyForm survey={editSurvey} onCreated={handleDialogClose} />}
        </DialogContent>
      </Dialog>
    </Paper>
  );
}