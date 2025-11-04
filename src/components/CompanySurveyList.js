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
      
      setCompanySurveys(surveysResponse.data || []);
      setCompanies(companiesResponse.data || []);
      setSurveys(baseSurveysResponse.data || []);
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
    // Si el formato es YYYY-MM-DD, parsear manualmente como local para evitar desfase por zona horaria
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
      const [year, month, day] = dateString.split('-');
      const date = new Date(Number(year), Number(month) - 1, Number(day));
      return date.toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    }
    // Si no, usar el parseo estándar
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
    <Box sx={{ 
      background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
      borderRadius: 3,
      p: 4,
      boxShadow: '0 4px 16px rgba(99, 102, 241, 0.1)',
      border: '1px solid rgba(99, 102, 241, 0.1)'
    }}>
      <Typography 
        variant="h4" 
        gutterBottom
        sx={{
          fontWeight: 700,
          color: '#1e293b',
          mb: 4,
          textAlign: 'center'
        }}
      >
        Encuestas de Empresa
      </Typography>

      {companySurveys.length === 0 ? (
        <Box sx={{ 
          textAlign: 'center', 
          py: 8,
          background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
          borderRadius: 2,
          border: '1px solid rgba(99, 102, 241, 0.1)'
        }}>
          <Typography 
            variant="h6" 
            sx={{ 
              color: '#64748b',
              mb: 2,
              fontWeight: 500
            }}
          >
            📋 No hay encuestas de empresa creadas
          </Typography>
          <Typography variant="body2" sx={{ color: '#94a3b8' }}>
            Las encuestas aparecerán aquí una vez que las crees
          </Typography>
        </Box>
      ) : (
        <Grid container spacing={3}>
          {companySurveys.map(survey => (
            <Grid item xs={12} md={6} lg={4} key={survey.id}>
              <Card sx={{
                background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
                borderRadius: 3,
                boxShadow: '0 8px 32px rgba(99, 102, 241, 0.15)',
                border: '1px solid rgba(255, 255, 255, 0.8)',
                transition: 'all 0.3s ease',
                position: 'relative',
                overflow: 'hidden',
                '&:hover': {
                  transform: 'translateY(-8px)',
                  boxShadow: '0 20px 40px rgba(99, 102, 241, 0.25)',
                },
                '&::before': {
                  content: '""',
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  height: '4px',
                  background: `linear-gradient(135deg, ${
                    getStatusColor(survey.status, survey.dueDate) === 'success' 
                      ? '#10b981, #06b6d4' 
                      : getStatusColor(survey.status, survey.dueDate) === 'error'
                      ? '#ef4444, #f97316'
                      : '#6366f1, #8b5cf6'
                  })`,
                }
              }}>
                <CardContent sx={{ p: 3 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <Box sx={{
                      width: 48,
                      height: 48,
                      borderRadius: 2,
                      background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      mr: 2,
                      boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)'
                    }}>
                      <AssignmentIcon sx={{ color: 'white', fontSize: 24 }} />
                    </Box>
                    <Box sx={{ flex: 1 }}>
                      <Typography 
                        variant="h6" 
                        sx={{ 
                          fontWeight: 600,
                          color: '#1e293b',
                          mb: 0.5
                        }}
                      >
                        Encuesta #{survey.id}
                      </Typography>
                      <Typography variant="body2" sx={{ color: '#64748b' }}>
                        {getSurveyTitle(survey.surveyId)}
                      </Typography>
                    </Box>
                  </Box>
                  
                  <Stack spacing={1.5} sx={{ mb: 3 }}>
                    <Chip 
                      label={getCompanyName(survey.companyId)}
                      sx={{
                        background: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)',
                        color: 'white',
                        fontWeight: 500,
                        '& .MuiChip-icon': { color: 'white' }
                      }}
                      size="small"
                      icon={<BusinessIcon />}
                    />
                    <Chip 
                      label={getStatusText(survey.status, survey.dueDate)}
                      sx={{
                        background: getStatusColor(survey.status, survey.dueDate) === 'success' 
                          ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                          : getStatusColor(survey.status, survey.dueDate) === 'error'
                          ? 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)'
                          : 'linear-gradient(135deg, #6b7280 0%, #4b5563 100%)',
                        color: 'white',
                        fontWeight: 500
                      }}
                      size="small"
                    />
                  </Stack>

                  <Box sx={{
                    background: 'linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%)',
                    borderRadius: 2,
                    p: 2,
                    mb: 2
                  }}>
                    <Typography variant="body2" sx={{ color: '#475569', mb: 1 }}>
                      {survey.notes || "Sin notas adicionales"}
                    </Typography>

                    <Stack direction="row" spacing={2} sx={{ mb: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <DateRangeIcon sx={{ fontSize: 16, mr: 0.5, color: '#6366f1' }} />
                        <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 500 }}>
                          Vence: {formatDate(survey.dueDate)}
                        </Typography>
                      </Box>
                    </Stack>

                    <Box sx={{ mt: 2 }}>
                      <Typography variant="caption" sx={{ color: '#64748b', mb: 1, display: 'block' }}>
                        Progreso: {(survey.completionRate * 100).toFixed(1)}%
                      </Typography>
                      <Box sx={{
                        width: '100%',
                        height: 8,
                        backgroundColor: '#e2e8f0',
                        borderRadius: 1,
                        overflow: 'hidden'
                      }}>
                        <Box sx={{
                          width: `${survey.completionRate * 100}%`,
                          height: '100%',
                          background: 'linear-gradient(135deg, #10b981 0%, #06b6d4 100%)',
                          transition: 'width 0.3s ease'
                        }} />
                      </Box>
                    </Box>
                  </Box>
                </CardContent>

                <CardActions sx={{ 
                  px: 3, 
                  pb: 3,
                  background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)'
                }}>
                  <Button 
                    size="small" 
                    onClick={() => toggleExpand(survey.id)}
                    endIcon={expandedCard === survey.id ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                    sx={{
                      background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                      color: 'white',
                      fontWeight: 500,
                      px: 2,
                      '&:hover': {
                        background: 'linear-gradient(135deg, #5b5bd6 0%, #7c3aed 100%)',
                        transform: 'translateY(-1px)',
                        boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)'
                      }
                    }}
                  >
                    {expandedCard === survey.id ? "Menos detalles" : "Más detalles"}
                  </Button>
                  
                  <IconButton 
                    size="small" 
                    onClick={() => setDeleteDialog({ open: true, survey })}
                    sx={{
                      ml: 'auto',
                      background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                      color: 'white',
                      '&:hover': {
                        background: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)',
                        transform: 'scale(1.05)'
                      }
                    }}
                  >
                    <DeleteIcon />
                  </IconButton>
                </CardActions>

                <Collapse in={expandedCard === survey.id}>
                  <CardContent sx={{ 
                    pt: 0, 
                    px: 3, 
                    pb: 3,
                    background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
                    borderTop: '1px solid rgba(99, 102, 241, 0.1)'
                  }}>
                    <Box sx={{
                      background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
                      borderRadius: 2,
                      p: 3,
                      border: '1px solid rgba(99, 102, 241, 0.1)'
                    }}>
                      <Typography 
                        variant="subtitle2" 
                        gutterBottom
                        sx={{
                          fontWeight: 600,
                          color: '#6366f1',
                          mb: 2,
                          display: 'flex',
                          alignItems: 'center'
                        }}
                      >
                        📊 Información Detallada
                      </Typography>
                      <Box sx={{ 
                        display: 'grid', 
                        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                        gap: 1.5,
                        mb: 3
                      }}>
                        <Typography variant="body2" sx={{ color: '#475569' }}>
                          <strong style={{ color: '#6366f1' }}>ID:</strong> {survey.id}
                        </Typography>
                        <Typography variant="body2" sx={{ color: '#475569' }}>
                          <strong style={{ color: '#6366f1' }}>Empresa:</strong> {getCompanyName(survey.companyId)}
                        </Typography>
                        <Typography variant="body2" sx={{ color: '#475569' }}>
                          <strong style={{ color: '#6366f1' }}>Asignada:</strong> {formatDate(survey.assignedAt)}
                        </Typography>
                        <Typography variant="body2" sx={{ color: '#475569' }}>
                          <strong style={{ color: '#6366f1' }}>Versión:</strong> {survey.companyVersion}
                        </Typography>
                        <Typography variant="body2" sx={{ color: '#475569' }}>
                          <strong style={{ color: '#6366f1' }}>Estado:</strong> {survey.status}
                        </Typography>
                        <Typography variant="body2" sx={{ color: '#475569' }}>
                          <strong style={{ color: '#6366f1' }}>Progreso:</strong> {(survey.completionRate * 100).toFixed(1)}%
                        </Typography>
                      </Box>

                      <Typography 
                        variant="subtitle2" 
                        gutterBottom
                        sx={{
                          fontWeight: 600,
                          color: '#8b5cf6',
                          mb: 1
                        }}
                      >
                        📝 Descripción de la Encuesta Base
                      </Typography>
                      <Typography variant="body2" sx={{ color: '#64748b', mb: 3 }}>
                        {getSurveyDescription(survey.surveyId)}
                      </Typography>

                      <Typography 
                        variant="subtitle2" 
                        gutterBottom
                        sx={{
                          fontWeight: 600,
                          color: '#06b6d4',
                          mb: 1
                        }}
                      >
                        💬 Notas
                      </Typography>
                      <Typography variant="body2" sx={{ color: '#64748b' }}>
                        {survey.notes || "Sin notas adicionales"}
                      </Typography>
                    </Box>
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
        maxWidth="xs"
        fullWidth
        PaperProps={{
          sx: {
            background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
            borderRadius: 3,
            border: '1px solid rgba(99, 102, 241, 0.1)',
            boxShadow: '0 8px 32px rgba(99, 102, 241, 0.08)'
          }
        }}
      >
        <DialogTitle sx={{
          background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
          color: 'white',
          fontWeight: 700,
          fontSize: '1.1rem',
          textAlign: 'center',
          py: 1.5
        }}>
          Confirmar eliminación de encuesta
        </DialogTitle>
        <DialogContent sx={{ p: 3 }}>
          <Typography sx={{ color: '#475569', fontWeight: 500, fontSize: '0.98rem', textAlign: 'center', mb: 1.2 }}>
            ¿Está seguro de que desea eliminar la encuesta <strong>#{deleteDialog.survey?.id}</strong>?
          </Typography>
          <Typography sx={{ color: '#6366f1', fontWeight: 500, textAlign: 'center', mb: 0.7, fontSize: '0.95rem' }}>
            <strong>Empresa:</strong> {deleteDialog.survey && getCompanyName(deleteDialog.survey.companyId)}
          </Typography>
          <Typography sx={{ color: '#ef4444', fontWeight: 600, textAlign: 'center', fontSize: '0.93rem' }}>
            Esta acción no se puede deshacer.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 0, justifyContent: 'center' }}>
          <Button 
            onClick={() => setDeleteDialog({ open: false, survey: null })}
            sx={{
              background: 'linear-gradient(135deg, #6b7280 0%, #4b5563 100%)',
              color: 'white',
              fontWeight: 600,
              fontSize: '1rem',
              px: 4,
              borderRadius: 2,
              boxShadow: '0 2px 8px rgba(99, 102, 241, 0.08)',
              '&:hover': {
                background: 'linear-gradient(135deg, #4b5563 0%, #374151 100%)'
              }
            }}
          >
            Cancelar
          </Button>
          <Button 
            onClick={() => handleDelete(deleteDialog.survey?.id)}
            sx={{
              background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
              color: 'white',
              fontWeight: 600,
              fontSize: '1rem',
              px: 4,
              borderRadius: 2,
              boxShadow: '0 2px 8px rgba(99, 102, 241, 0.08)',
              '&:hover': {
                background: 'linear-gradient(135deg, #5b5bd6 0%, #7c3aed 100%)'
              }
            }}
          >
            Confirmar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}