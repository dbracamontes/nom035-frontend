import React, { useState, useEffect } from "react";
import { 
  TextField, Button, Box, MenuItem, Typography, 
  FormControlLabel, Checkbox, List, ListItem, ListItemText,
  Dialog, DialogTitle, DialogContent, DialogActions, Grid,
  Chip, Stack, Divider
} from "@mui/material";
import { createCompanySurvey, getCompanies, getEmployeesByCompany, getSurveys, getSurveyById } from "../api/nom035";
import { getQuestionsByGuideType } from "../data/nom035Questions";

// Unified field style: responsive, no fixed minWidth/minHeight
const fieldSx = {
  width: '100%',
  '& .MuiOutlinedInput-root': {
    background: '#ffffff',
    borderRadius: 2,
    minHeight: '56px',
    height: 'auto',
    '& fieldset': {
      borderColor: 'rgba(99, 102, 241, 0.3)',
      borderWidth: 1
    },
    '&:hover fieldset': {
      borderColor: '#6366f1',
      borderWidth: 2
    },
    '&.Mui-focused fieldset': {
      borderColor: '#6366f1',
      borderWidth: 2,
      boxShadow: '0 0 0 3px rgba(99, 102, 241, 0.1)'
    }
  },
  '& .MuiInputLabel-root': {
    fontWeight: 500,
    color: '#64748b',
    backgroundColor: 'transparent',
    '&.Mui-focused': { 
      color: '#6366f1'
    },
    '&.MuiInputLabel-shrink': {
      backgroundColor: '#ffffff',
      padding: '0 8px',
      marginLeft: '-4px'
    }
  },
  '& .MuiSelect-select': {
    display: 'flex',
    alignItems: 'center',
    padding: '16.5px 14px',
    color: '#1e293b',
    fontWeight: 500
  },
  '& .MuiInputBase-input': {
    color: '#1e293b',
    fontWeight: 500
  }
};

const selectMenuProps = {
  PaperProps: {
    sx: {
      maxHeight: 300,
      '& .MuiMenuItem-root': {
        whiteSpace: 'normal',
        wordWrap: 'break-word',
        padding: '12px 16px'
      }
    }
  }
};

export default function CompanySurveyForm({ onCreated }) {
  const [companies, setCompanies] = useState([]);
  const [surveys, setSurveys] = useState([]);
  const [employees, setEmployees] = useState([]);
  
  // Form state
  const [selectedCompany, setSelectedCompany] = useState("");
  const [selectedSurvey, setSelectedSurvey] = useState("");
  const [selectedEmployees, setSelectedEmployees] = useState([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  
  // Dialog state
  const [employeeDialogOpen, setEmployeeDialogOpen] = useState(false);
  const [surveyDialogOpen, setSurveyDialogOpen] = useState(false);
  const [surveyDetails, setSurveyDetails] = useState(null);

  useEffect(() => {
    // Load companies and surveys on component mount
    Promise.all([
      getCompanies(),
      getSurveys()
    ]).then(([companiesRes, surveysRes]) => {
      setCompanies(companiesRes.data);
      setSurveys(surveysRes.data);
    });
  }, []);

  useEffect(() => {
    // Load employees when company is selected
    if (selectedCompany) {
      getEmployeesByCompany(selectedCompany).then(res => {
        setEmployees(res.data);
      });
    } else {
      setEmployees([]);
      setSelectedEmployees([]);
    }
  }, [selectedCompany]);

  const handleEmployeeToggle = (employeeId) => {
    setSelectedEmployees(prev => 
      prev.includes(employeeId) 
        ? prev.filter(id => id !== employeeId)
        : [...prev, employeeId]
    );
  };

  const handleSelectAllEmployees = () => {
    if (selectedEmployees.length === employees.length) {
      setSelectedEmployees([]);
    } else {
      setSelectedEmployees(employees.map(emp => emp.id));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!selectedCompany || !selectedSurvey) {
      alert("Por favor complete todos los campos requeridos");
      return;
    }

    // Usando el formato JSON que requiere el backend
    const payload = {
      companyId: parseInt(selectedCompany),
      surveyId: parseInt(selectedSurvey),
      dueDate: endDate ? endDate.split('T')[0] : "2025-12-15",
      companyVersion: "v1",
      status: "activo",
      completionRate: 0.0,
      notes: description || title || "Encuesta creada desde frontend"
    };

    console.log("Payload enviado:", payload);
    console.log("Payload serializado:", JSON.stringify(payload));

    try {
      const response = await createCompanySurvey(payload);
      console.log("Respuesta del servidor:", response);
      
      // Reset form
      setTitle("");
      setDescription("");
      setStartDate("");
      setEndDate("");
      setSelectedCompany("");
      setSelectedSurvey("");
      setSelectedEmployees([]);
      
      if (onCreated) onCreated();
      alert("Encuesta de empresa creada exitosamente");
    } catch (error) {
      console.error("Error creating company survey:", error);
      
      let errorMessage = "Error al crear la encuesta de empresa";
      if (error.response) {
        console.error("Error response:", error.response.data);
        console.error("Error status:", error.response.status);
        
        if (error.response.status === 400) {
          errorMessage += `\nError 400: Datos inválidos - ${JSON.stringify(error.response.data)}`;
        } else if (error.response.status === 415) {
          errorMessage += "\nError 415: Problema con Content-Type. Verifica el controlador del backend.";
          errorMessage += "\nPosibles causas:";
          errorMessage += "\n- El backend no acepta application/json";
          errorMessage += "\n- Falta @RequestBody en el controlador";
          errorMessage += "\n- Problema con la serialización de datos";
        } else {
          errorMessage += `\nError ${error.response.status}: ${JSON.stringify(error.response.data)}`;
        }
      } else if (error.request) {
        errorMessage += "\nNo se pudo conectar con el servidor. ¿Está ejecutándose en puerto 8080?";
      } else {
        errorMessage += `\n${error.message}`;
      }
      
      alert(errorMessage);
    }
  };

  const handleOpenSurveyDialog = async () => {
    if (selectedSurvey) {
      try {
        const response = await getSurveyById(selectedSurvey);
        setSurveyDetails(response.data);
        setSurveyDialogOpen(true);
      } catch (error) {
        console.error("Error cargando detalles de la encuesta:", error);
        // Si falla, usamos los datos básicos que ya tenemos
        setSurveyDetails(surveys.find(s => s.id === selectedSurvey));
        setSurveyDialogOpen(true);
      }
    }
  };

  const selectedCompanyName = companies.find(c => c.id === selectedCompany)?.name || "";
  const selectedEmployeeNames = employees.filter(emp => selectedEmployees.includes(emp.id));

  return (
    <Box 
      component="form" 
      onSubmit={handleSubmit}
      sx={{ 
        background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
        borderRadius: 2,
        p: 4,
        border: '1px solid rgba(99, 102, 241, 0.08)',
        boxShadow: '0 2px 8px rgba(99, 102, 241, 0.05)'
      }}
    >
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: '1fr',
            sm: 'repeat(3, 1fr)'
          },
          gap: 3
        }}
      >
        {/* Company Selection */}
        <Box>
          <TextField
            select
            fullWidth
            label="Seleccionar Empresa"
            value={selectedCompany}
            onChange={e => setSelectedCompany(e.target.value)}
            required
            sx={fieldSx}
            MenuProps={selectMenuProps}
          >
            <MenuItem value="">-- Seleccionar Empresa --</MenuItem>
            {companies.map(company => (
              <MenuItem key={company.id} value={company.id}>
                {company.name}
              </MenuItem>
            ))}
          </TextField>
        </Box>

        {/* Survey Selection */}
        <Box>
          <TextField
            select
            fullWidth
            label="Seleccionar Encuesta"
            value={selectedSurvey}
            onChange={e => setSelectedSurvey(e.target.value)}
            required
            sx={fieldSx}
            MenuProps={selectMenuProps}
          >
            <MenuItem value="">-- Seleccionar Encuesta --</MenuItem>
            {surveys.map(survey => (
              <MenuItem key={survey.id} value={survey.id}>
                {survey.title}
              </MenuItem>
            ))}
          </TextField>
        </Box>

        {/* Survey Details Action */}
        <Box>
          {selectedSurvey && (
            <Box sx={{ display: 'flex', alignItems: 'flex-start', height: '100%', pt: 0.5 }}>
              <Button 
                size="small" 
                onClick={handleOpenSurveyDialog}
                fullWidth
                sx={{ 
                  background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                  color: 'white',
                  fontWeight: 500,
                  borderRadius: 2,
                  px: 2,
                  py: 1.5,
                  minHeight: '56px',
                  '&:hover': {
                    background: 'linear-gradient(135deg, #5b5bd6 0%, #7c3aed 100%)',
                    transform: 'translateY(-1px)',
                    boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)'
                  }
                }}
              >
                Ver detalles de la encuesta
              </Button>
            </Box>
          )}
        </Box>

        {/* Title */}
        <Box>
          <TextField
            fullWidth
            label="Título Encuesta"
            value={title}
            onChange={e => setTitle(e.target.value)}
            required
            sx={fieldSx}
          />
        </Box>

        {/* Date Range */}
        <Box>
          <TextField
            fullWidth
            type="datetime-local"
            label="Fecha Inicio"
            value={startDate}
            onChange={e => setStartDate(e.target.value)}
            InputLabelProps={{ shrink: true }}
            sx={fieldSx}
          />
        </Box>

        <Box>
          <TextField
            fullWidth
            type="datetime-local"
            label="Fecha Fin"
            value={endDate}
            onChange={e => setEndDate(e.target.value)}
            InputLabelProps={{ shrink: true }}
            sx={fieldSx}
          />
        </Box>

        {/* Description - spans all columns */}
        <Box sx={{ gridColumn: { xs: '1', sm: '1 / -1' } }}>
          <TextField
            fullWidth
            multiline
            rows={3}
            label="Descripción/Notas"
            value={description}
            onChange={e => setDescription(e.target.value)}
            sx={{
              ...fieldSx,
              '& .MuiOutlinedInput-root': {
                ...fieldSx['& .MuiOutlinedInput-root'],
                height: 'auto',
                alignItems: 'start'
              }
            }}
          />
        </Box>

        {/* Employee Selection - spans all columns */}
        <Box sx={{ gridColumn: { xs: '1', sm: '1 / -1' } }}>
          <Typography 
            variant="h6" 
            gutterBottom
            sx={{
              fontWeight: 600,
              color: '#6366f1',
              mb: 2
            }}
          >
            Empleados Seleccionados
          </Typography>
          
          {selectedCompany ? (
            <>
              <Box sx={{
                background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
                borderRadius: 2,
                p: 3,
                border: '1px solid rgba(99, 102, 241, 0.1)'
              }}>
                <Box sx={{ mb: 2, display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                  <Button 
                    variant="outlined" 
                    onClick={() => setEmployeeDialogOpen(true)}
                    disabled={employees.length === 0}
                  >
                    Seleccionar Empleados ({selectedEmployees.length}/{employees.length})
                  </Button>
                  {employees.length > 0 && (
                    <Button 
                      onClick={handleSelectAllEmployees}
                    >
                      {selectedEmployees.length === employees.length ? "Deseleccionar Todos" : "Seleccionar Todos"}
                    </Button>
                  )}
                </Box>

                {selectedEmployeeNames.length > 0 && (
                  <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                    {selectedEmployeeNames.map(employee => (
                      <Chip 
                        key={employee.id}
                        label={employee.name}
                        onDelete={() => handleEmployeeToggle(employee.id)}
                        color="primary"
                        sx={{ mb: 1 }}
                      />
                    ))}
                  </Stack>
                )}
              </Box>
            </>
          ) : (
            <Typography color="text.secondary">
              Primero seleccione una empresa para ver los empleados disponibles
            </Typography>
          )}
        </Box>

        {/* Submit Button - spans all columns */}
        <Box sx={{ gridColumn: { xs: '1', sm: '1 / -1' } }}>
          <Box sx={{ textAlign: 'right', pt: 2 }}>
            <Button 
              type="submit" 
              size="large"
              disabled={!selectedCompany || !selectedSurvey}
              sx={{
                background: !selectedCompany || !selectedSurvey 
                  ? 'linear-gradient(135deg, #9ca3af 0%, #6b7280 100%)'
                  : 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                color: 'white',
                fontWeight: 600,
                fontSize: '1.1rem',
                px: 6,
                py: 2,
                borderRadius: 3,
                boxShadow: '0 8px 32px rgba(99, 102, 241, 0.3)',
                '&:hover': {
                  background: !selectedCompany || !selectedSurvey 
                    ? 'linear-gradient(135deg, #9ca3af 0%, #6b7280 100%)'
                    : 'linear-gradient(135deg, #5b5bd6 0%, #7c3aed 100%)',
                  transform: !selectedCompany || !selectedSurvey ? 'none' : 'translateY(-2px)',
                  boxShadow: !selectedCompany || !selectedSurvey 
                    ? '0 8px 32px rgba(99, 102, 241, 0.3)'
                    : '0 12px 40px rgba(99, 102, 241, 0.4)'
                },
                '&:disabled': {
                  color: 'white'
                }
              }}
            >
              Crear Encuesta de Empresa
            </Button>
          </Box>
        </Box>
      </Box>

      {/* Employee Selection Dialog */}
      <Dialog 
        open={employeeDialogOpen} 
        onClose={() => setEmployeeDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Seleccionar Empleados - {selectedCompanyName}
        </DialogTitle>
        <DialogContent>
          <List>
            {employees.map(employee => (
              <ListItem key={employee.id} dense>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={selectedEmployees.includes(employee.id)}
                      onChange={() => handleEmployeeToggle(employee.id)}
                    />
                  }
                  label={
                    <ListItemText
                      primary={employee.name}
                      secondary={`${employee.department} - ${employee.position} - ${employee.email}`}
                    />
                  }
                />
              </ListItem>
            ))}
          </List>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEmployeeDialogOpen(false)}>
            Cerrar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Survey Details Dialog */}
      <Dialog 
        open={surveyDialogOpen} 
        onClose={() => {
          setSurveyDialogOpen(false);
          setSurveyDetails(null);
        }}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
            borderRadius: 3,
            border: '1px solid rgba(99, 102, 241, 0.1)',
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.15)'
          }
        }}
      >
        <DialogTitle sx={{
          background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
          color: 'white',
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center',
          gap: 1
        }}>
          Detalles de la Encuesta
        </DialogTitle>
        <DialogContent sx={{ p: 3 }}>
          {surveyDetails && (
            <>
              <Typography 
                variant="h6" 
                gutterBottom
                sx={{
                  fontWeight: 600,
                  color: '#1e293b',
                  mb: 2
                }}
              >
                {surveyDetails.title}
              </Typography>
              <Typography variant="body2" paragraph sx={{ color: '#64748b', lineHeight: 1.6 }}>
                {surveyDetails.description}
              </Typography>

              {/* Additional survey info */}
              <Box sx={{ mb: 3 }}>
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <Typography variant="caption" sx={{ color: '#64748b', display: 'block' }}>
                      Tipo de Guía
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 500, color: '#1e293b' }}>
                      Guía {surveyDetails.guideType || 'No especificado'}
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="caption" sx={{ color: '#64748b', display: 'block' }}>
                      Estado
                    </Typography>
                    <Chip 
                      label={surveyDetails.active ? 'Activa' : 'Inactiva'}
                      size="small"
                      sx={{ 
                        backgroundColor: surveyDetails.active ? '#dcfce7' : '#fee2e2',
                        color: surveyDetails.active ? '#166534' : '#dc2626',
                        fontWeight: 500
                      }}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <Typography variant="caption" sx={{ color: '#64748b', display: 'block' }}>
                      Fecha de Creación
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 500, color: '#1e293b' }}>
                      {surveyDetails.createdAt ? new Date(surveyDetails.createdAt).toLocaleDateString('es-ES', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      }) : 'No disponible'}
                    </Typography>
                  </Grid>
                </Grid>
              </Box>

              <Divider sx={{ 
                my: 3,
                background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                height: 2,
                borderRadius: 1
              }} />
              
              <Typography 
                variant="subtitle1" 
                gutterBottom
                sx={{
                  fontWeight: 600,
                  color: '#6366f1',
                  mb: 2
                }}
              >
                Preguntas:
              </Typography>
              {(() => {
                // Primero intentamos usar las preguntas de la API
                let questions = surveyDetails?.questions || [];
                console.log('🔍 DEBUG surveyDetails:', surveyDetails);
                console.log('🔍 DEBUG questions from API:', questions);
                
                // Si no hay preguntas en la API, usamos las preguntas del NOM-035 según el tipo de guía
                if (!questions || questions.length === 0) {
                  const guideType = surveyDetails?.guideType;
                  console.log('🔍 DEBUG guideType:', guideType);
                  if (guideType) {
                    questions = getQuestionsByGuideType(guideType);
                    console.log('🔍 DEBUG questions from NOM035 data:', questions);
                  }
                }
                
                if (!questions || questions.length === 0) {
                  return (
                    <Box sx={{ 
                      p: 3, 
                      textAlign: 'center',
                      background: 'linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)',
                      borderRadius: 2,
                      border: '1px solid rgba(239, 68, 68, 0.1)'
                    }}>
                      <Typography variant="h6" sx={{ color: '#dc2626', mb: 2, fontWeight: 500 }}>
                        ⚠️ Tipo de Guía No Reconocido
                      </Typography>
                      <Typography variant="body2" sx={{ color: '#7f1d1d', lineHeight: 1.6 }}>
                        No se pudo determinar el tipo de guía para esta encuesta.
                      </Typography>
                    </Box>
                  );
                }
                
                return (
                  <Box sx={{ maxHeight: '400px', overflowY: 'auto', pr: 1 }}>
                    <Typography variant="body2" sx={{ color: '#64748b', mb: 2, fontStyle: 'italic' }}>
                      Mostrando {questions.length} preguntas de la Guía {surveyDetails?.guideType} del NOM-035-STPS-2018
                    </Typography>
                    {questions.map((question, index) => (
                      <Box 
                        key={question.id || index} 
                        sx={{ 
                          mb: 3,
                          p: 3,
                          background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
                          borderRadius: 2,
                          border: '1px solid rgba(99, 102, 241, 0.15)',
                          boxShadow: '0 2px 4px rgba(99, 102, 241, 0.05)'
                        }}
                      >
                        <Typography variant="body1" sx={{ fontWeight: 600, color: '#1e293b', mb: 2 }}>
                          {index + 1}. {question.text || question.question || question.pregunta || 'Pregunta sin texto'}
                        </Typography>
                        
                        {question.category && (
                          <Chip 
                            label={question.category}
                            size="small"
                            sx={{ 
                              backgroundColor: '#e0e7ff', 
                              color: '#3730a3',
                              fontWeight: 500,
                              mb: 2
                            }}
                          />
                        )}
                        
                        {question.options && Array.isArray(question.options) && (
                          <Box sx={{ mt: 2 }}>
                            <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 500, display: 'block', mb: 1 }}>
                              Opciones de respuesta:
                            </Typography>
                            <Stack spacing={1}>
                              {question.options.map((option, optIndex) => (
                                <Box key={optIndex} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                  <Typography variant="caption" sx={{ 
                                    color: '#6366f1', 
                                    fontWeight: 600,
                                    minWidth: '20px'
                                  }}>
                                    {option.value}:
                                  </Typography>
                                  <Typography variant="body2" sx={{ color: '#475569' }}>
                                    {option.label}
                                  </Typography>
                                </Box>
                              ))}
                            </Stack>
                          </Box>
                        )}
                      </Box>
                    ))}
                  </Box>
                );
              })()}
            </>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 0 }}>
          <Button 
            onClick={() => {
              setSurveyDialogOpen(false);
              setSurveyDetails(null);
            }}
            sx={{
              background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
              color: 'white',
              fontWeight: 500,
              px: 3,
              '&:hover': {
                background: 'linear-gradient(135deg, #5b5bd6 0%, #7c3aed 100%)'
              }
            }}
          >
            Cerrar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
