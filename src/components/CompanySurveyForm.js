import React, { useState, useEffect } from "react";
import { 
  TextField, Button, Box, Paper, MenuItem, Typography, 
  FormControlLabel, Checkbox, List, ListItem, ListItemText,
  Dialog, DialogTitle, DialogContent, DialogActions, Grid,
  Chip, Stack, Divider
} from "@mui/material";
import { createCompanySurvey, getCompanies, getEmployeesByCompany, getSurveys } from "../api/nom035";


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

    // Usando el formato JSON que recomendó el backend
    const payload = {
      companyId: parseInt(selectedCompany),
      surveyId: parseInt(selectedSurvey),
      assignedAt: startDate ? startDate.split('T')[0] : new Date().toISOString().split('T')[0],
      notes: description || title || "Encuesta creada desde frontend"
    };

    console.log("Payload enviado:", payload);

    try {
      const response = await createCompanySurvey(payload);
      console.log("Respuesta del servidor:", response.data);
      
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

  const selectedCompanyName = companies.find(c => c.id === selectedCompany)?.name || "";
  const selectedSurveyTitle = surveys.find(s => s.id === selectedSurvey)?.title || "";
  const selectedEmployeeNames = employees.filter(emp => selectedEmployees.includes(emp.id));

  return (
    <Paper sx={{ p: 3, mb: 2 }}>
      <Typography variant="h5" gutterBottom>
        Crear Encuesta para Empresa
      </Typography>
      
      <Box component="form" onSubmit={handleSubmit} sx={{ mt: 2 }}>
        <Grid container spacing={3}>
          {/* Company Selection */}
          <Grid item xs={12} md={6}>
            <TextField
              select
              fullWidth
              label="Seleccionar Empresa"
              value={selectedCompany}
              onChange={e => setSelectedCompany(e.target.value)}
              required
            >
              <MenuItem value="">-- Seleccionar Empresa --</MenuItem>
              {companies.map(company => (
                <MenuItem key={company.id} value={company.id}>
                  {company.name}
                </MenuItem>
              ))}
            </TextField>
          </Grid>

          {/* Survey Selection */}
          <Grid item xs={12} md={6}>
            <TextField
              select
              fullWidth
              label="Seleccionar Encuesta Base"
              value={selectedSurvey}
              onChange={e => setSelectedSurvey(e.target.value)}
              required
            >
              <MenuItem value="">-- Seleccionar Encuesta --</MenuItem>
              {surveys.map(survey => (
                <MenuItem key={survey.id} value={survey.id}>
                  {survey.title}
                </MenuItem>
              ))}
            </TextField>
            {selectedSurvey && (
              <Button 
                size="small" 
                onClick={() => setSurveyDialogOpen(true)}
                sx={{ mt: 1 }}
              >
                Ver detalles de la encuesta
              </Button>
            )}
          </Grid>

          {/* Title */}
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Título de la Encuesta"
              value={title}
              onChange={e => setTitle(e.target.value)}
              required
            />
          </Grid>

          {/* Description */}
          <Grid item xs={12}>
            <TextField
              fullWidth
              multiline
              rows={3}
              label="Descripción"
              value={description}
              onChange={e => setDescription(e.target.value)}
            />
          </Grid>

          {/* Date Range */}
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              type="datetime-local"
              label="Fecha de Inicio"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              type="datetime-local"
              label="Fecha de Fin"
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>

          {/* Employee Selection */}
          <Grid item xs={12}>
            <Typography variant="h6" gutterBottom>
              Empleados Seleccionados
            </Typography>
            
            {selectedCompany ? (
              <>
                <Box sx={{ mb: 2 }}>
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
                      sx={{ ml: 2 }}
                    >
                      {selectedEmployees.length === employees.length ? "Deseleccionar Todos" : "Seleccionar Todos"}
                    </Button>
                  )}
                </Box>

                {selectedEmployeeNames.length > 0 && (
                  <Stack direction="row" spacing={1} flexWrap="wrap">
                    {selectedEmployeeNames.map(employee => (
                      <Chip 
                        key={employee.id}
                        label={employee.name}
                        onDelete={() => handleEmployeeToggle(employee.id)}
                        color="primary"
                      />
                    ))}
                  </Stack>
                )}
              </>
            ) : (
              <Typography color="text.secondary">
                Primero seleccione una empresa para ver los empleados disponibles
              </Typography>
            )}
          </Grid>

          {/* Submit Button */}
          <Grid item xs={12}>
            <Button 
              type="submit" 
              variant="contained" 
              size="large"
              disabled={!selectedCompany || !selectedSurvey || selectedEmployees.length === 0}
            >
              Crear Encuesta de Empresa
            </Button>
          </Grid>
        </Grid>
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
        onClose={() => setSurveyDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Detalles de la Encuesta
        </DialogTitle>
        <DialogContent>
          {selectedSurvey && (
            <>
              <Typography variant="h6" gutterBottom>
                {selectedSurveyTitle}
              </Typography>
              <Typography variant="body2" paragraph>
                {surveys.find(s => s.id === selectedSurvey)?.description}
              </Typography>
              <Divider sx={{ my: 2 }} />
              <Typography variant="subtitle1" gutterBottom>
                Preguntas:
              </Typography>
              {surveys.find(s => s.id === selectedSurvey)?.questions?.map((question, index) => (
                <Box key={index} sx={{ mb: 2 }}>
                  <Typography variant="body2">
                    <strong>{index + 1}. {question.text}</strong>
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Tipo: {question.type} | Opciones: {question.options}
                  </Typography>
                </Box>
              ))}
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSurveyDialogOpen(false)}>
            Cerrar
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
}