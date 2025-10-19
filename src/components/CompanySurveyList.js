import React, { useState, useEffect } from "react";
import { 
  Paper, Typography, 
  IconButton, Chip, Stack, Box, Grid, Card, CardContent,
  CardActions, Button, Dialog, DialogTitle, DialogContent,
  DialogActions, Collapse
} from "@mui/material";
import { 
  Delete as DeleteIcon, 
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Assignment as AssignmentIcon,
  DateRange as DateRangeIcon,
  Business as BusinessIcon
} from '@mui/icons-material';
import { getCompanySurveys, deleteCompanySurvey, getCompanies, getSurveys } from "../api/nom035";

export default function CompanySurveyList({ refreshFlag }) {
  const [companySurveys, setCompanySurveys] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [surveys, setSurveys] = useState([]);
  const [expandedCard, setExpandedCard] = useState(null);
  const [deleteDialog, setDeleteDialog] = useState({ open: false, survey: null });

  const fetchCompanySurveys = async () => {
    try {
      const [surveysResponse, companiesResponse, baseSurveysResponse] = await Promise.all([
        getCompanySurveys(),
        getCompanies(),
        getSurveys()
      ]);
      
      setCompanySurveys(surveysResponse.data);
      setCompanies(companiesResponse.data);
      setSurveys(baseSurveysResponse.data);
    } catch (error) {
      console.error("Error fetching data:", error);
      alert("Error al cargar los datos");
      setCompanySurveys([]);
    }
  };

  useEffect(() => {
    fetchCompanySurveys();
  }, [refreshFlag]);

  const handleDelete = async (id) => {
    try {
      await deleteCompanySurvey(id);
      fetchCompanySurveys();
      setDeleteDialog({ open: false, survey: null });
    } catch (error) {
      console.error("Error deleting company survey:", error);
      alert("Error al eliminar la encuesta de empresa");
    }
  };

  const toggleExpand = (id) => {
    setExpandedCard(expandedCard === id ? null : id);
  };

  // Helper functions to get names
  const getCompanyName = (companyId) => {
    const company = companies.find(c => c.id === companyId);
    return company ? company.name : "Empresa no encontrada";
  };

  const getSurveyTitle = (surveyId) => {
    const survey = surveys.find(s => s.id === surveyId);
    return survey ? survey.title : "Encuesta no encontrada";
  };

  const getSurveyDescription = (surveyId) => {
    const survey = surveys.find(s => s.id === surveyId);
    return survey ? survey.description : "Sin descripción";
  };

  const formatDate = (dateString) => {
    if (!dateString) return "No especificada";
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getStatusColor = (status, dueDate) => {
    if (status === "activo") {
      const now = new Date();
      const due = new Date(dueDate);
      if (now > due) return "error"; // Expirada
      return "success"; // Activa
    }
    return "default";
  };

  const getStatusText = (status, dueDate) => {
    if (status === "activo") {
      const now = new Date();
      const due = new Date(dueDate);
      if (now > due) return "Expirada";
      return "Activa";
    }
    return status || "Sin estado";
  };

  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h5" gutterBottom>
        Encuestas de Empresa
      </Typography>

      {companySurveys.length === 0 ? (
        <Typography color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
          No hay encuestas de empresa creadas
        </Typography>
      ) : (
        <Grid container spacing={2}>
          {companySurveys.map(survey => (
            <Grid item xs={12} md={6} lg={4} key={survey.id}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Encuesta #{survey.id}
                  </Typography>
                  
                  <Stack spacing={1} sx={{ mb: 2 }}>
                    <Chip 
                      label={getCompanyName(survey.companyId)}
                      color="primary"
                      size="small"
                      icon={<BusinessIcon />}
                    />
                    <Chip 
                      label={getStatusText(survey.status, survey.dueDate)}
                      color={getStatusColor(survey.status, survey.dueDate)}
                      size="small"
                    />
                  </Stack>

                  <Typography variant="body2" color="text.secondary" paragraph>
                    {survey.notes || "Sin notas adicionales"}
                  </Typography>

                  <Stack direction="row" spacing={2} sx={{ mb: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <AssignmentIcon sx={{ fontSize: 16, mr: 0.5 }} />
                      <Typography variant="caption">
                        {getSurveyTitle(survey.surveyId)}
                      </Typography>
                    </Box>
                  </Stack>

                  <Stack direction="row" spacing={2}>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <DateRangeIcon sx={{ fontSize: 16, mr: 0.5 }} />
                      <Typography variant="caption">
                        Vence: {formatDate(survey.dueDate)}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <Typography variant="caption">
                        Progreso: {(survey.completionRate * 100).toFixed(1)}%
                      </Typography>
                    </Box>
                  </Stack>
                </CardContent>

                <CardActions>
                  <Button 
                    size="small" 
                    onClick={() => toggleExpand(survey.id)}
                    endIcon={expandedCard === survey.id ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                  >
                    {expandedCard === survey.id ? "Menos detalles" : "Más detalles"}
                  </Button>
                  
                  <IconButton 
                    size="small" 
                    onClick={() => setDeleteDialog({ open: true, survey })}
                    color="error"
                  >
                    <DeleteIcon />
                  </IconButton>
                </CardActions>

                <Collapse in={expandedCard === survey.id}>
                  <CardContent sx={{ pt: 0 }}>
                    <Typography variant="subtitle2" gutterBottom>
                      Información Detallada:
                    </Typography>
                    <Typography variant="body2" sx={{ mb: 2 }}>
                      <strong>ID:</strong> {survey.id}<br />
                      <strong>Empresa:</strong> {getCompanyName(survey.companyId)} (ID: {survey.companyId})<br />
                      <strong>Encuesta Base:</strong> {getSurveyTitle(survey.surveyId)} (ID: {survey.surveyId})<br />
                      <strong>Asignada:</strong> {formatDate(survey.assignedAt)}<br />
                      <strong>Vencimiento:</strong> {formatDate(survey.dueDate)}<br />
                      <strong>Versión:</strong> {survey.companyVersion}<br />
                      <strong>Estado:</strong> {survey.status}<br />
                      <strong>Progreso:</strong> {(survey.completionRate * 100).toFixed(1)}%
                    </Typography>

                    <Typography variant="subtitle2" gutterBottom>
                      Descripción de la Encuesta Base:
                    </Typography>
                    <Typography variant="body2" sx={{ mb: 2 }}>
                      {getSurveyDescription(survey.surveyId)}
                    </Typography>

                    <Typography variant="subtitle2" gutterBottom>
                      Notas:
                    </Typography>
                    <Typography variant="body2">
                      {survey.notes || "Sin notas adicionales"}
                    </Typography>
                  </CardContent>
                </Collapse>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog 
        open={deleteDialog.open} 
        onClose={() => setDeleteDialog({ open: false, survey: null })}
      >
        <DialogTitle>
          Confirmar Eliminación
        </DialogTitle>
        <DialogContent>
          <Typography>
            ¿Está seguro de que desea eliminar la encuesta #{deleteDialog.survey?.id}?
            <br />
            Empresa: {deleteDialog.survey && getCompanyName(deleteDialog.survey.companyId)}
            <br />
            Esta acción no se puede deshacer.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialog({ open: false, survey: null })}>
            Cancelar
          </Button>
          <Button 
            onClick={() => handleDelete(deleteDialog.survey?.id)}
            color="error"
            variant="contained"
          >
            Eliminar
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
}