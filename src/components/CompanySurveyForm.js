import React, { useState, useEffect, useMemo } from "react";
import {
  TextField, Button, Box, MenuItem, Typography,
  FormControlLabel, Checkbox, List, ListItem, ListItemText,
  Dialog, DialogTitle, DialogContent, DialogActions, Grid,
  Chip, Stack, Divider, Snackbar, Alert
} from "@mui/material";
import { createCompanySurvey, createSurveyApplication, getCompanies, getEmployeesByCompany, getSurveys, getSurveyById, getSurveyWithQuestions } from "../api/nom035";
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
  // Pagination state for survey questions in the details dialog
  const [questionPage, setQuestionPage] = useState(0);
  const questionPageSize = 10;
  const [companies, setCompanies] = useState([]);
  const [surveys, setSurveys] = useState([]);
  const [employees, setEmployees] = useState([]);
  
  // Form state
  const [selectedCompany, setSelectedCompany] = useState("");
  const [selectedSurvey, setSelectedSurvey] = useState("");
  const [selectedAssignmentSurvey, setSelectedAssignmentSurvey] = useState("");
  const [selectedEmployees, setSelectedEmployees] = useState([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  
  // Dialog state
  const [employeeDialogOpen, setEmployeeDialogOpen] = useState(false);
  const [surveyDialogOpen, setSurveyDialogOpen] = useState(false);
  const [surveyDetails, setSurveyDetails] = useState(null);

  // Reset pagination when opening/closing dialog or changing survey
  useEffect(() => {
    setQuestionPage(0);
  }, [surveyDialogOpen, surveyDetails]);

  const assignmentSurveyOptions = useMemo(() => {
    const nomSurvey = surveys.find((survey) => {
      const title = (survey.title || "").toLowerCase();
      return title.includes("nom035") || title.includes("nom-035") || title.includes("nom 035");
    });
    return nomSurvey ? [nomSurvey] : [];
  }, [surveys]);

  useEffect(() => {
    if (!selectedAssignmentSurvey && assignmentSurveyOptions.length === 1) {
      setSelectedAssignmentSurvey(String(assignmentSurveyOptions[0].id));
    }
  }, [assignmentSurveyOptions, selectedAssignmentSurvey]);

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

  const [errorOpen, setErrorOpen] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successOpen, setSuccessOpen] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();

    setErrorOpen(false);
    setSuccessOpen(false);

    if (!selectedCompany || !selectedAssignmentSurvey) {
      alert("Por favor seleccione una empresa y la encuesta a asignar");
      return;
    }

    if (selectedEmployees.length === 0) {
      setErrorMsg("Selecciona al menos un empleado para asignar la encuesta");
      setErrorOpen(true);
      return;
    }

    // Get local date from datetime-local input (avoid timezone issues)
    let dueDateStr = "2025-12-15";
    if (endDate) {
      // Create a Date object from the input value (which is local time)
      const dt = new Date(endDate);
      // Format as YYYY-MM-DD in local time
      const yyyy = dt.getFullYear();
      const mm = String(dt.getMonth() + 1).padStart(2, '0');
      const dd = String(dt.getDate()).padStart(2, '0');
      dueDateStr = `${yyyy}-${mm}-${dd}`;
    }

    const payload = {
      companyId: parseInt(selectedCompany),
  surveyId: parseInt(selectedAssignmentSurvey),
      dueDate: dueDateStr,
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

      if (selectedEmployees.length > 0) {
        const assignmentResults = await Promise.allSettled(
          selectedEmployees.map((employeeId) =>
            createSurveyApplication({
              employeeId,
              surveyId: payload.surveyId,
            })
          )
        );

        const failedAssignments = assignmentResults.filter((result) => result.status === "rejected");

        if (failedAssignments.length > 0) {
          console.error("Errores al crear aplicaciones de encuesta:", failedAssignments);
          setErrorMsg("La encuesta se creó, pero no se pudo asignar a todos los empleados seleccionados.");
          setErrorOpen(true);
        } else {
          const successMessage = `Encuesta creada y asignada a ${selectedEmployees.length} empleado${selectedEmployees.length === 1 ? "" : "s"}.`;
          setSuccessMsg(successMessage);
          setSuccessOpen(true);
        }
      }

      // Reset form
      setTitle("");
      setDescription("");
      setStartDate("");
      setEndDate("");
  setSelectedCompany("");
  setSelectedSurvey("");
  setSelectedAssignmentSurvey("");
      setSelectedEmployees([]);

      if (onCreated) onCreated();
    } catch (error) {
      console.error("Error creating company survey:", error);
      setErrorMsg("Error al crear la encuesta de empresa");
      setErrorOpen(true);
    }
  };

  const handleOpenSurveyDialog = async () => {
    if (selectedSurvey) {
      try {
        // Siempre usa el endpoint correcto para obtener TODAS las preguntas
        const response = await getSurveyWithQuestions(selectedSurvey);
        setSurveyDetails(response.data);
        setSurveyDialogOpen(true);
      } catch (error) {
        console.error("Error cargando detalles de la encuesta:", error);
        setSurveyDetails(null);
        setSurveyDialogOpen(true);
      }
    }
  };

  const selectedCompanyName = companies.find(c => c.id === selectedCompany)?.name || "";
  const selectedEmployeeNames = employees.filter(emp => selectedEmployees.includes(emp.id));

  return (
    <>
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
            sm: 'repeat(3, 1fr)',
            md: 'repeat(4, 1fr)'
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

        {/* Assignment Survey Selection (ahora a la izquierda) */}
        <Box>
          <TextField
            select
            fullWidth
            label="Asignar Encuesta"
            value={selectedAssignmentSurvey}
            onChange={e => setSelectedAssignmentSurvey(e.target.value)}
            required
            sx={fieldSx}
            MenuProps={selectMenuProps}
            helperText="Selecciona la encuesta que se asignará a la empresa"
          >
            <MenuItem value="">-- Asignar Encuesta --</MenuItem>
            {assignmentSurveyOptions.map((survey) => (
              <MenuItem key={survey.id} value={survey.id}>
                {survey.title}
              </MenuItem>
            ))}
          </TextField>
        </Box>

        {/* Survey Selection (ahora a la derecha) */}
        <Box>
          <TextField
            select
            fullWidth
            label="Visualizar Encuestas"
            value={selectedSurvey}
            onChange={e => setSelectedSurvey(e.target.value)}
            sx={fieldSx}
            MenuProps={selectMenuProps}
          >
            <MenuItem value="">-- Visualizar Encuesta --</MenuItem>
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
              disabled={!selectedCompany || !selectedAssignmentSurvey}
              sx={{
                background: !selectedCompany || !selectedAssignmentSurvey 
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
                  background: !selectedCompany || !selectedAssignmentSurvey 
                    ? 'linear-gradient(135deg, #9ca3af 0%, #6b7280 100%)'
                    : 'linear-gradient(135deg, #5b5bd6 0%, #7c3aed 100%)',
                  transform: !selectedCompany || !selectedAssignmentSurvey ? 'none' : 'translateY(-2px)',
                  boxShadow: !selectedCompany || !selectedAssignmentSurvey 
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
                // Permitir que la respuesta sea un array plano o un objeto con questions
                let questions = Array.isArray(surveyDetails)
                  ? surveyDetails
                  : (surveyDetails?.questions || []);
                // Si no hay preguntas, intentar obtener por tipo de guía
                if (!questions || questions.length === 0) {
                  const guideType = surveyDetails?.guideType;
                  if (guideType) {
                    questions = getQuestionsByGuideType(guideType);
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

                const totalPages = Math.ceil(questions.length / questionPageSize);
                const paginatedQuestions = questions.slice(questionPage * questionPageSize, (questionPage + 1) * questionPageSize);

                return (
                  <Box sx={{ maxHeight: '400px', overflowY: 'auto', pr: 1 }}>
                    <Typography variant="body2" sx={{ color: '#64748b', mb: 2, fontStyle: 'italic' }}>
                      Mostrando {questions.length} preguntas de la Guía {surveyDetails?.guideType || ''} del NOM-035-STPS-2018
                    </Typography>
                    {/* Mensaje de advertencia si se detecta posible endpoint incorrecto */}
                    {questions.length > 0 && questions.length <= 8 && (
                      <Box sx={{ mb: 2, p: 2, background: '#fffbe6', border: '1px solid #facc15', borderRadius: 2 }}>
                        <Typography variant="body2" sx={{ color: '#b45309', fontWeight: 600 }}>
                          ⚠️ Atención: Solo se están mostrando {questions.length} preguntas. Es probable que el sistema esté usando el endpoint incorrecto (/api/surveys/[id] en vez de /api/surveys/[id]/questions).
                        </Typography>
                      </Box>
                    )}
                    {paginatedQuestions.map((question, index) => (
                      <Box 
                        key={question.id || (questionPage * questionPageSize + index)} 
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
                          {questionPage * questionPageSize + index + 1}. {question.text || question.question || question.pregunta || 'Pregunta sin texto'}
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
                    {/* Controles de paginación */}
                    {totalPages > 1 && (
                      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
                        <Button onClick={() => setQuestionPage(p => Math.max(0, p - 1))} disabled={questionPage === 0} sx={{ mr: 2 }}>
                          Anterior
                        </Button>
                        <Typography sx={{ alignSelf: 'center', fontWeight: 500 }}>
                          Página {questionPage + 1} de {totalPages}
                        </Typography>
                        <Button onClick={() => setQuestionPage(p => Math.min(totalPages - 1, p + 1))} disabled={questionPage === totalPages - 1} sx={{ ml: 2 }}>
                          Siguiente
                        </Button>
                      </Box>
                    )}
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
      <Snackbar open={errorOpen} autoHideDuration={4000} onClose={() => setErrorOpen(false)} anchorOrigin={{ vertical: 'top', horizontal: 'center' }}>
        <Alert onClose={() => setErrorOpen(false)} severity="error" sx={{ width: '100%' }}>
          {errorMsg}
        </Alert>
      </Snackbar>
        <Snackbar open={successOpen} autoHideDuration={4000} onClose={() => setSuccessOpen(false)} anchorOrigin={{ vertical: 'top', horizontal: 'center' }}>
          <Alert onClose={() => setSuccessOpen(false)} severity="success" sx={{ width: '100%' }}>
            {successMsg}
          </Alert>
        </Snackbar>
    </>
  );
}
