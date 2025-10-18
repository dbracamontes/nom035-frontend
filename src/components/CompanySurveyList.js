import React, { useState, useEffect } from "react";
import { 
  Paper, Typography, List, ListItem, ListItemText, 
  IconButton, Chip, Stack, Box, Grid, Card, CardContent,
  CardActions, Button, Dialog, DialogTitle, DialogContent,
  DialogActions, Collapse
} from "@mui/material";
import { 
  Delete as DeleteIcon, 
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  People as PeopleIcon,
  Assignment as AssignmentIcon,
  DateRange as DateRangeIcon
} from '@mui/icons-material';
import { getCompanySurveys, deleteCompanySurvey } from "../api/nom035";

export default function CompanySurveyList({ refreshFlag }) {
  const [companySurveys, setCompanySurveys] = useState([]);
  const [expandedCard, setExpandedCard] = useState(null);
  const [deleteDialog, setDeleteDialog] = useState({ open: false, survey: null });

  const fetchCompanySurveys = async () => {
    try {
      const response = await getCompanySurveys();
      setCompanySurveys(response.data);
    } catch (error) {
      console.error("Error fetching company surveys:", error);
      alert("Error al cargar las encuestas de empresa");
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

  const formatDate = (dateString) => {
    if (!dateString) return "No especificada";
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (startDate, endDate) => {
    const now = new Date();
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (now < start) return "warning"; // Pendiente
    if (now >= start && now <= end) return "success"; // Activa
    if (now > end) return "error"; // Expirada
    return "default";
  };

  const getStatusText = (startDate, endDate) => {
    const now = new Date();
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (!startDate && !endDate) return "Sin fechas";
    if (now < start) return "Pendiente";
    if (now >= start && now <= end) return "Activa";
    if (now > end) return "Expirada";
    return "Sin estado";
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
                    {survey.title}
                  </Typography>
                  
                  <Stack spacing={1} sx={{ mb: 2 }}>
                    <Chip 
                      label={survey.company?.name || "Sin empresa"}
                      color="primary"
                      size="small"
                    />
                    <Chip 
                      label={getStatusText(survey.startDate, survey.endDate)}
                      color={getStatusColor(survey.startDate, survey.endDate)}
                      size="small"
                    />
                  </Stack>

                  <Typography variant="body2" color="text.secondary" paragraph>
                    {survey.description || "Sin descripción"}
                  </Typography>

                  <Stack direction="row" spacing={2} sx={{ mb: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <AssignmentIcon sx={{ fontSize: 16, mr: 0.5 }} />
                      <Typography variant="caption">
                        {survey.survey?.title || "Encuesta base"}
                      </Typography>
                    </Box>
                  </Stack>

                  <Stack direction="row" spacing={2}>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <PeopleIcon sx={{ fontSize: 16, mr: 0.5 }} />
                      <Typography variant="caption">
                        {survey.employeeIds?.length || 0} empleados
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <DateRangeIcon sx={{ fontSize: 16, mr: 0.5 }} />
                      <Typography variant="caption">
                        {formatDate(survey.startDate)}
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
                      Fechas:
                    </Typography>
                    <Typography variant="body2" sx={{ mb: 2 }}>
                      <strong>Inicio:</strong> {formatDate(survey.startDate)}<br />
                      <strong>Fin:</strong> {formatDate(survey.endDate)}
                    </Typography>

                    <Typography variant="subtitle2" gutterBottom>
                      Encuesta Base:
                    </Typography>
                    <Typography variant="body2" sx={{ mb: 2 }}>
                      {survey.survey?.title}<br />
                      <span style={{ color: 'text.secondary' }}>
                        {survey.survey?.description}
                      </span>
                    </Typography>

                    {survey.survey?.questions && (
                      <>
                        <Typography variant="subtitle2" gutterBottom>
                          Preguntas ({survey.survey.questions.length}):
                        </Typography>
                        <List dense>
                          {survey.survey.questions.slice(0, 3).map((question, index) => (
                            <ListItem key={index} sx={{ py: 0 }}>
                              <ListItemText 
                                primary={`${index + 1}. ${question.text}`}
                                secondary={`Tipo: ${question.type}`}
                              />
                            </ListItem>
                          ))}
                          {survey.survey.questions.length > 3 && (
                            <Typography variant="caption" color="text.secondary">
                              ... y {survey.survey.questions.length - 3} preguntas más
                            </Typography>
                          )}
                        </List>
                      </>
                    )}

                    <Typography variant="subtitle2" gutterBottom>
                      Empleados Asignados:
                    </Typography>
                    <Typography variant="body2">
                      {survey.employeeIds?.length || 0} empleados seleccionados
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
            ¿Está seguro de que desea eliminar la encuesta "{deleteDialog.survey?.title}"?
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