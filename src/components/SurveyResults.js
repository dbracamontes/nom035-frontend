import React, { useState, useEffect, useMemo } from "react";
import { 
  getSurveyResponses, getCompanies, getSurveys, getEmployees, getParticipationSummary
} from "../api/nom035";
import { 
  Box, Typography, Paper, Tab, Tabs, Grid, Card, CardContent, 
  CircularProgress, Alert, MenuItem, TextField, Chip, LinearProgress,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Accordion, AccordionSummary, AccordionDetails, Button, Stack
} from "@mui/material";
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import {
  ResponsiveContainer, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, Legend, Bar, PieChart, Pie, Cell
} from 'recharts';
import { 
  TrendingUp as TrendingUpIcon,
  People as PeopleIcon,
  Assessment as AssessmentIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  ExpandMore as ExpandMoreIcon
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';

// Definición de módulos NOM-035 para análisis (colores azul y morado)
const NOM035_MODULES = {
  1: {
    name: "Condiciones en el ambiente de trabajo",
    description: "Condiciones peligrosas e inseguras, deficientes e insalubres",
    color: "#2196f3",
    riskLevels: { low: [0, 5], medium: [6, 9], high: [10, 20], veryHigh: [21, 40] }
  },
  2: {
    name: "Cargas de trabajo", 
    description: "Cargas cuantitativas, ritmo de trabajo, cargas mentales",
    color: "#9c27b0",
    riskLevels: { low: [0, 10], medium: [11, 20], high: [21, 30], veryHigh: [31, 60] }
  },
  3: {
    name: "Falta de control y autonomía",
    description: "Iniciativa, influencia, participación y manejo del cambio",
    color: "#2196f3",
    riskLevels: { low: [0, 5], medium: [6, 11], high: [12, 18], veryHigh: [19, 36] }
  },
  4: {
    name: "Jornada de trabajo y rotación de turnos",
    description: "Jornadas extensas, trabajo nocturno, rotación de turnos",
    color: "#9c27b0",
    riskLevels: { low: [0, 4], medium: [5, 6], high: [7, 10], veryHigh: [11, 16] }
  },
  5: {
    name: "Interferencia en la relación trabajo-familia", 
    description: "Tiempo limitado, atención a responsabilidades familiares",
    color: "#2196f3",
    riskLevels: { low: [0, 4], medium: [5, 8], high: [9, 12], veryHigh: [13, 16] }
  },
  6: {
    name: "Liderazgo y relaciones en el trabajo",
    description: "Características del liderazgo, relaciones sociales",
    color: "#9c27b0",
    riskLevels: { low: [0, 10], medium: [11, 18], high: [19, 28], veryHigh: [29, 68] }
  },
  7: {
    name: "Violencia laboral",
    description: "Violencia psicológica, acoso, malos tratos",
    color: "#2196f3",
    riskLevels: { low: [0, 7], medium: [8, 10], high: [11, 15], veryHigh: [16, 32] }
  }
};

// Función para determinar nivel de riesgo
const getRiskLevel = (score, moduleNum) => {
  const module = NOM035_MODULES[moduleNum];
  if (!module) return 'low';
  
  const { low, medium, high, veryHigh } = module.riskLevels;
  
  if (score >= veryHigh[0] && score <= veryHigh[1]) return 'veryHigh';
  if (score >= high[0] && score <= high[1]) return 'high';
  if (score >= medium[0] && score <= medium[1]) return 'medium';
  return 'low';
};

// Colores para niveles de riesgo (azul y morado)
const RISK_COLORS = {
  low: '#2196f3',      // Azul
  medium: '#9c27b0',   // Morado
  high: '#2196f3',     // Azul
  veryHigh: '#9c27b0'  // Morado
};

// Componente para tarjeta de estadística
function StatCard({ title, value, subtitle, icon, color = '#1976d2' }) {
  return (
    <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <Box sx={{ 
            p: 1, 
            borderRadius: 2, 
            backgroundColor: color + '20',
            color: color,
            mr: 2 
          }}>
            {icon}
          </Box>
          <Typography variant="h6" component="div" sx={{ fontWeight: 600 }}>
            {title}
          </Typography>
        </Box>
        
        <Typography variant="h3" sx={{ fontWeight: 700, color: color, mb: 1 }}>
          {value}
        </Typography>
        
        {subtitle && (
          <Typography variant="body2" color="text.secondary">
            {subtitle}
          </Typography>
        )}
      </CardContent>
    </Card>
  );
}

// Componente principal
export default function SurveyResults() {
  const { t } = useTranslation();
  const [currentTab, setCurrentTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Estados para datos
  const [responses, setResponses] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [participationSummary, setParticipationSummary] = useState([]);
  const [surveys, setSurveys] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState('');
  const [selectedSurvey, setSelectedSurvey] = useState('');
  
  // Estados para estadísticas procesadas
  const [participationStats, setParticipationStats] = useState({});
  const [moduleResults, setModuleResults] = useState([]);
  const [riskAnalysis, setRiskAnalysis] = useState({});

  // Memoized filtered responses para exportar y mostrar detalle
  const filteredResponses = useMemo(() => {
    let filtered = responses;
    if (selectedCompany) {
      // TODO: Filtrar por empresa cuando tengamos esa relación
    }
    if (selectedSurvey) {
      filtered = filtered.filter(r => r.surveyApplicationId === parseInt(selectedSurvey));
    }
    return filtered;
  }, [responses, selectedCompany, selectedSurvey]);

  // Exportar a Excel
  const handleExportExcel = () => {
    if (!filteredResponses.length) return;
    const data = filteredResponses.map(r => ({
      ID: r.id,
      'Empleado': r.employeeName || r.employeeId || '',
      'Encuesta': r.surveyTitle || r.surveyApplicationId || '',
      'Fecha': r.createdAt ? new Date(r.createdAt).toLocaleString() : '',
      ...r.answers
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Respuestas');
    XLSX.writeFile(wb, 'respuestas_nom035.xlsx');
  };

  // Exportar a PDF
  const handleExportPDF = () => {
    if (!filteredResponses.length) return;
    const doc = new jsPDF();
    const columns = [
      { header: 'ID', dataKey: 'id' },
      { header: 'Empleado', dataKey: 'employeeName' },
      { header: 'Encuesta', dataKey: 'surveyTitle' },
      { header: 'Fecha', dataKey: 'createdAt' }
    ];
    const answerKeys = filteredResponses[0]?.answers ? Object.keys(filteredResponses[0].answers) : [];
    answerKeys.forEach(q => columns.push({ header: q, dataKey: q }));
    const rows = filteredResponses.map(r => {
      const row = {
        id: r.id,
        employeeName: r.employeeName || r.employeeId || '',
        surveyTitle: r.surveyTitle || r.surveyApplicationId || '',
        createdAt: r.createdAt ? new Date(r.createdAt).toLocaleString() : ''
      };
      if (r.answers) {
        answerKeys.forEach(q => {
          row[q] = r.answers[q] || '';
        });
      }
      return row;
    });
    doc.text('Respuestas NOM-035', 14, 16);
    doc.autoTable({
      columns,
      body: rows,
      startY: 20,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [33, 150, 243] }
    });
    doc.save('respuestas_nom035.pdf');
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (responses.length > 0) {
      processStatistics();
    }
  }, [responses, selectedCompany, selectedSurvey]);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      // Cargar datos básicos y resumen de participación real
      const [responsesRes, companiesRes, surveysRes, employeesRes, participationSummaryRes] = await Promise.all([
        getSurveyResponses(),
        getCompanies(),
        getSurveys(),
        getEmployees(),
        getParticipationSummary()
      ]);
      setResponses(responsesRes.data || []);
      setCompanies(companiesRes.data || []);
      setSurveys(surveysRes.data || []);
      setEmployees(employeesRes.data || []);
      setParticipationSummary(participationSummaryRes.data || []);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      setError('Error al cargar los datos del dashboard');
    } finally {
      setLoading(false);
    }
  };

  const processStatistics = () => {
    console.log('🔄 Processing statistics with responses:', responses.length);
    
    // Filtrar respuestas según selección
    let filteredResponses = responses;
    
    if (selectedCompany) {
      // TODO: Filtrar por empresa cuando tengamos esa relación
    }
    
    if (selectedSurvey) {
      filteredResponses = filteredResponses.filter(r => 
        r.surveyApplicationId === parseInt(selectedSurvey)
      );
    }
    
    // Calcular estadísticas de participación
    const totalEmployees = employees.length;
    const respondedEmployees = new Set(filteredResponses.map(r => r.surveyApplicationId)).size;
    
    setParticipationStats({
      total: totalEmployees,
      responded: respondedEmployees,
      pending: totalEmployees - respondedEmployees,
      percentage: totalEmployees > 0 ? Math.round((respondedEmployees / totalEmployees) * 100) : 0
    });
    
    // Procesar resultados por módulo (simulado por ahora)
    const moduleData = Object.entries(NOM035_MODULES).map(([num, module]) => {
      // Simular datos de respuestas por módulo
      const moduleResponses = Math.floor(Math.random() * respondedEmployees) + 1;
      const averageScore = Math.floor(Math.random() * 40) + 1;
      const riskLevel = getRiskLevel(averageScore, parseInt(num));
      
      return {
        module: parseInt(num),
        name: module.name,
        responses: moduleResponses,
        averageScore,
        riskLevel,
        color: module.color
      };
    });
    
    setModuleResults(moduleData);
    
    // Calcular análisis de riesgo general
    const riskCounts = moduleData.reduce((acc, module) => {
      acc[module.riskLevel] = (acc[module.riskLevel] || 0) + 1;
      return acc;
    }, {});
    
    setRiskAnalysis(riskCounts);
    
    console.log('✅ Statistics processed:', {
      participation: { totalEmployees, respondedEmployees },
      modules: moduleData.length,
      riskAnalysis: riskCounts
    });
  };

  const handleTabChange = (event, newValue) => {
    setCurrentTab(newValue);
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 400 }}>
        <CircularProgress size={60} />
        <Typography variant="h6" sx={{ ml: 2 }}>
          Cargando dashboard de resultados...
        </Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ m: 3 }}>
        {error}
      </Alert>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" sx={{ mb: 3, fontWeight: 700, color: '#212121', letterSpacing: 1 }}>
        Dashboard de Resultados NOM-035
      </Typography>

      {/* Filtros de selección */}
  <Paper sx={{ p: 3, mb: 3, backgroundColor: '#f5f5f5', borderRadius: 3, boxShadow: 2 }}>
        <Typography variant="h6" sx={{ mb: 2, fontWeight: 700, color: '#212121' }}>
          Filtros de Análisis
        </Typography>
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <TextField
              select
              fullWidth
              label="Seleccionar Empresa"
              value={selectedCompany}
              onChange={e => setSelectedCompany(e.target.value)}
              variant="outlined"
              sx={{ backgroundColor: '#fff', borderRadius: 2, minWidth: 300 }}
              InputProps={{ style: { fontSize: 16 } }}
            >
              <MenuItem value="">Todas las empresas</MenuItem>
              {companies.map(company => (
                <MenuItem key={company.id} value={company.id}>
                  {company.name}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              select
              fullWidth
              label="Seleccionar Encuesta"
              value={selectedSurvey}
              onChange={e => setSelectedSurvey(e.target.value)}
              variant="outlined"
              sx={{ backgroundColor: '#fff', borderRadius: 2, minWidth: 300 }}
              InputProps={{ style: { fontSize: 16 } }}
            >
              <MenuItem value="">Todas las encuestas</MenuItem>
              {surveys.filter(Boolean).map(survey => (
                <MenuItem key={survey.id} value={survey.id}>
                  {survey.title || survey.name || `Encuesta ${survey.id}`}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
        </Grid>
      </Paper>

      {/* Resumen de estadísticas principales */}
  <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={3}>
          <StatCard 
            title="Total Empleados"
            value={participationStats.total || 0}
            subtitle="Empleados registrados"
            icon={<PeopleIcon sx={{ fontSize: 40, color: '#2196f3' }} />}
            color="#2196f3"
          />
        </Grid>
        <Grid item xs={12} md={3}>
          <StatCard 
            title="Han Respondido"
            value={participationStats.responded || 0}
            subtitle={`${participationStats.percentage || 0}% de participación`}
            icon={<CheckCircleIcon sx={{ fontSize: 40, color: '#9c27b0' }} />}
            color="#9c27b0"
          />
        </Grid>
        <Grid item xs={12} md={3}>
          <StatCard 
            title="Pendientes"
            value={participationStats.pending || 0}
            subtitle="Encuestas por completar"
            icon={<WarningIcon sx={{ fontSize: 40, color: '#2196f3' }} />}
            color="#2196f3"
          />
        </Grid>
        <Grid item xs={12} md={3}>
          <StatCard 
            title="Total Respuestas"
            value={responses.length}
            subtitle="Respuestas registradas"
            icon={<AssessmentIcon sx={{ fontSize: 40, color: '#9c27b0' }} />}
            color="#9c27b0"
          />
        </Grid>
      </Grid>

      {/* Pestañas para diferentes vistas */}
      <Paper sx={{ mb: 3, backgroundColor: '#fff', borderRadius: 3, boxShadow: 2 }}>
        <Tabs 
          value={currentTab} 
          onChange={handleTabChange}
          variant="scrollable"
          scrollButtons="auto"
          sx={{ borderBottom: 3, borderColor: '#2196f3', backgroundColor: '#fff', borderRadius: 3 }}
        >
          <Tab 
            label="📈 Participación" 
            icon={<TrendingUpIcon sx={{ color: '#2196f3' }} />}
            iconPosition="start"
          />
          <Tab 
            label="Resultados por Módulo"
          />
          <Tab 
            label="⚠️ Análisis de Riesgo" 
            icon={<WarningIcon sx={{ color: '#2196f3' }} />}
            iconPosition="start"
          />
          <Tab 
            label="📋 Detalle de Respuestas" 
            icon={<AssessmentIcon sx={{ color: '#9c27b0' }} />}
            iconPosition="start"
          />
        </Tabs>

        <Box sx={{ p: 3 }}>
          {/* Vista de Participación */}
          {currentTab === 0 && (
            <Box>
              <Typography variant="h6" sx={{ mb: 3, fontWeight: 600 }}>
                📈 Estadísticas de Participación
              </Typography>
              
              <Grid container spacing={3}>
                {/* Gráfico circular de participación - Versión simplificada */}
                <Grid item xs={12} md={6}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                        Distribución de Participación
                      </Typography>
                      <Box sx={{ textAlign: 'center', py: 4 }}>
                        <Box sx={{ position: 'relative', display: 'inline-flex', mb: 3 }}>
                          <CircularProgress 
                            variant="determinate" 
                            value={participationStats.percentage || 0}
                            size={120}
                            thickness={8}
                            sx={{ color: '#2196f3' }}
                          />
                          <Box sx={{
                            top: 0, left: 0, bottom: 0, right: 0,
                            position: 'absolute',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexDirection: 'column'
                          }}>
                            <Typography variant="h4" sx={{ fontWeight: 700, color: '#2196f3' }}>
                              {participationStats.percentage || 0}%
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              Participación
                            </Typography>
                          </Box>
                        </Box>
                        <Grid container spacing={2}>
                          <Grid item xs={6}>
                            <Box sx={{ textAlign: 'center' }}>
                              <Typography variant="h5" sx={{ fontWeight: 700, color: '#2196f3' }}>
                                {participationStats.responded || 0}
                              </Typography>
                              <Typography variant="body2" color="text.secondary">
                                Han Respondido
                              </Typography>
                            </Box>
                          </Grid>
                          <Grid item xs={6}>
                            <Box sx={{ textAlign: 'center' }}>
                              <Typography variant="h5" sx={{ fontWeight: 700, color: '#9c27b0' }}>
                                {participationStats.pending || 0}
                              </Typography>
                              <Typography variant="body2" color="text.secondary">
                                Pendientes
                              </Typography>
                            </Box>
                          </Grid>
                        </Grid>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
                
                {/* Progreso de participación */}
                <Grid item xs={12} md={6}>
                  <Card sx={{ height: '100%' }}>
                    <CardContent>
                      <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                        Progreso de Participación
                      </Typography>
                      <Box sx={{ mb: 3 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                          <Typography variant="body2" color="text.secondary">
                            Empleados que han respondido
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {participationStats.percentage || 0}%
                          </Typography>
                        </Box>
                        <LinearProgress 
                          variant="determinate" 
                          value={participationStats.percentage || 0}
                          sx={{ height: 8, borderRadius: 5, backgroundColor: '#e3e3fa', '& .MuiLinearProgress-bar': { backgroundColor: '#2196f3' } }}
                        />
                      </Box>
                      <Grid container spacing={2}>
                        <Grid item xs={6}>
                          <Box sx={{ textAlign: 'center', p: 2, backgroundColor: '#e3f2fd', borderRadius: 2 }}>
                            <Typography variant="h4" sx={{ fontWeight: 700, color: '#2196f3' }}>
                              {participationStats.responded || 0}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              Completadas
                            </Typography>
                          </Box>
                        </Grid>
                        <Grid item xs={6}>
                          <Box sx={{ textAlign: 'center', p: 2, backgroundColor: '#ede7f6', borderRadius: 2 }}>
                            <Typography variant="h4" sx={{ fontWeight: 700, color: '#9c27b0' }}>
                              {participationStats.pending || 0}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              Pendientes
                            </Typography>
                          </Box>
                        </Grid>
                      </Grid>
                      <Box sx={{ mt: 3, p: 2, backgroundColor: '#f5f5f5', borderRadius: 2 }}>
                        <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center' }}>
                          <strong>Meta:</strong> Alcanzar 85% de participación para cumplir con NOM-035
                        </Typography>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
                
                {/* Tabla de resumen por empresa */}
                <Grid item xs={12}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                        Resumen por Empresa
                      </Typography>
                      <TableContainer>
                        <Table>
                          <TableHead>
                            <TableRow>
                              <TableCell><strong>Empresa</strong></TableCell>
                              <TableCell align="center"><strong>Total Empleados</strong></TableCell>
                              <TableCell align="center"><strong>Han Respondido</strong></TableCell>
                              <TableCell align="center"><strong>Pendientes</strong></TableCell>
                              <TableCell align="center"><strong>% Participación</strong></TableCell>
                              <TableCell align="center"><strong>Estado</strong></TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {participationSummary.length > 0 ? participationSummary.map((row) => (
                              <TableRow key={row.companyId}>
                                <TableCell>{row.companyName}</TableCell>
                                <TableCell align="center">
                                  <Typography variant="body2" sx={{ fontWeight: 700, color: '#2196f3' }}>{row.totalEmployees}</Typography>
                                </TableCell>
                                <TableCell align="center">
                                  <Typography variant="body2" sx={{ fontWeight: 700, color: '#2196f3' }}>{row.responded}</Typography>
                                </TableCell>
                                <TableCell align="center">
                                  <Typography variant="body2" sx={{ fontWeight: 700, color: '#9c27b0' }}>{row.pending}</Typography>
                                </TableCell>
                                <TableCell align="center">
                                  <Typography variant="body2" sx={{ fontWeight: 700, color: row.participationPercent >= 85 ? '#2196f3' : '#9c27b0' }}>{row.participationPercent}%</Typography>
                                </TableCell>
                                <TableCell align="center">
                                  <Chip 
                                    label={row.status}
                                    sx={{ backgroundColor: row.participationPercent >= 85 ? '#e3f2fd' : '#ede7f6', color: row.participationPercent >= 85 ? '#2196f3' : '#9c27b0', fontWeight: 700 }}
                                    size="small"
                                  />
                                </TableCell>
                              </TableRow>
                            )) : (
                              <TableRow>
                                <TableCell colSpan={6} align="center">
                                  <Typography color="text.secondary">
                                    No hay empresas registradas
                                  </Typography>
                                </TableCell>
                              </TableRow>
                            )}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            </Box>
          )}
          
          {/* Resultados por Módulo */}
          {currentTab === 1 && (
            <Box>
              <Typography variant="h6" sx={{ mb: 3, fontWeight: 600 }}>
                Resultados por Módulo NOM-035
              </Typography>
              
              <Grid container spacing={3}>
                {/* Gráfico de barras por módulo */}
                <Grid item xs={12} lg={8}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                        Puntuación Promedio por Módulo
                      </Typography>
                      
                      <Box sx={{ height: 400 }}>
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart
                            data={moduleResults}
                            margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis 
                              dataKey="name" 
                              angle={-45}
                              textAnchor="end"
                              height={100}
                              fontSize={12}
                            />
                            <YAxis />
                            <Tooltip 
                              formatter={(value, name) => [value, 'Puntuación Promedio']}
                              labelFormatter={(label) => `Módulo: ${label}`}
                            />
                            <Legend />
                            <Bar 
                              dataKey="averageScore" 
                              name="Puntuación Promedio"
                              fill="#8884d8"
                              radius={[4, 4, 0, 0]}
                            />
                          </BarChart>
                        </ResponsiveContainer>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
                
                {/* Resumen de módulos con mayor riesgo */}
                <Grid item xs={12} lg={4}>
                  <Card sx={{ height: '100%' }}>
                    <CardContent>
                      <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                        Módulos de Mayor Riesgo
                      </Typography>
                      
                      <Box sx={{ maxHeight: 350, overflowY: 'auto' }}>
                        {moduleResults
                          .sort((a, b) => b.averageScore - a.averageScore)
                          .slice(0, 7)
                          .map((module, index) => (
                            <Box 
                              key={module.module} 
                              sx={{ 
                                mb: 2, 
                                p: 2, 
                                backgroundColor: index < 3 ? '#ffebee' : '#f5f5f5', 
                                borderRadius: 2,
                                border: index < 3 ? '1px solid #ffcdd2' : '1px solid #e0e0e0'
                              }}
                            >
                              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                                <Typography variant="body2" sx={{ fontWeight: 600, mr: 1 }}>
                                  #{index + 1}
                                </Typography>
                                <Chip 
                                  label={module.riskLevel}
                                  size="small"
                                  color={
                                    module.riskLevel === 'veryHigh' ? 'error' :
                                    module.riskLevel === 'high' ? 'error' :
                                    module.riskLevel === 'medium' ? 'warning' : 'success'
                                  }
                                  sx={{ mr: 1 }}
                                />
                                <Typography variant="h6" sx={{ fontWeight: 700, color: RISK_COLORS[module.riskLevel] }}>
                                  {module.averageScore}
                                </Typography>
                              </Box>
                              
                              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                Módulo {module.module}: {module.name}
                              </Typography>
                              
                              <Typography variant="caption" color="text.secondary">
                                {module.responses} respuestas registradas
                              </Typography>
                            </Box>
                          ))
                        }
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
                
                {/* Detalle de cada módulo en acordeones */}
                <Grid item xs={12}>
                  <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                    Detalle por Módulo
                  </Typography>
                  
                  {moduleResults.map((module) => (
                    <Accordion key={module.module} sx={{ mb: 1 }}>
                      <AccordionSummary 
                        expandIcon={<ExpandMoreIcon />}
                        sx={{ 
                          backgroundColor: `${module.color}20`,
                          '&:hover': { backgroundColor: `${module.color}30` }
                        }}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                          <Typography variant="h6" sx={{ fontWeight: 600, mr: 2 }}>
                            Módulo {module.module}: {module.name}
                          </Typography>
                          
                          <Chip 
                            label={`Puntuación: ${module.averageScore}`}
                            sx={{ 
                              backgroundColor: RISK_COLORS[module.riskLevel],
                              color: 'white',
                              mr: 2
                            }}
                          />
                          
                          <Chip 
                            label={module.riskLevel === 'veryHigh' ? 'Riesgo Muy Alto' :
                                   module.riskLevel === 'high' ? 'Riesgo Alto' :
                                   module.riskLevel === 'medium' ? 'Riesgo Medio' : 'Riesgo Bajo'}
                            color={
                              module.riskLevel === 'veryHigh' ? 'error' :
                              module.riskLevel === 'high' ? 'error' :
                              module.riskLevel === 'medium' ? 'warning' : 'success'
                            }
                            variant="outlined"
                          />
                        </Box>
                      </AccordionSummary>
                      
                      <AccordionDetails>
                        <Grid container spacing={3}>
                          <Grid item xs={12} md={8}>
                            <Typography variant="body1" sx={{ mb: 2 }}>
                              <strong>Descripción:</strong> {NOM035_MODULES[module.module]?.description}
                            </Typography>
                            
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                              Este módulo evalúa los factores de riesgo psicosocial relacionados con {module.name.toLowerCase()}.
                              Una puntuación de {module.averageScore} indica un nivel de riesgo {
                                module.riskLevel === 'veryHigh' ? 'muy alto' :
                                module.riskLevel === 'high' ? 'alto' :
                                module.riskLevel === 'medium' ? 'medio' : 'bajo'
                              }.
                            </Typography>
                            
                            <Box sx={{ mb: 2 }}>
                              <Typography variant="body2" sx={{ mb: 1 }}>
                                Distribución de riesgo:
                              </Typography>
                              <LinearProgress 
                                variant="determinate" 
                                value={(module.averageScore / 40) * 100}
                                sx={{ 
                                  height: 8, 
                                  borderRadius: 4,
                                  backgroundColor: '#e0e0e0',
                                  '& .MuiLinearProgress-bar': {
                                    backgroundColor: RISK_COLORS[module.riskLevel]
                                  }
                                }}
                              />
                            </Box>
                          </Grid>
                          
                          <Grid item xs={12} md={4}>
                            <Box sx={{ 
                              p: 2, 
                              backgroundColor: `${RISK_COLORS[module.riskLevel]}20`, 
                              borderRadius: 2,
                              textAlign: 'center'
                            }}>
                              <Typography variant="h4" sx={{ 
                                fontWeight: 700, 
                                color: RISK_COLORS[module.riskLevel],
                                mb: 1
                              }}>
                                {module.averageScore}/40
                              </Typography>
                              <Typography variant="body2" color="text.secondary">
                                Puntuación Promedio
                              </Typography>
                              <Typography variant="body2" color="text.secondary">
                                {module.responses} respuestas
                              </Typography>
                            </Box>
                          </Grid>
                        </Grid>
                      </AccordionDetails>
                    </Accordion>
                  ))}
                </Grid>
              </Grid>
            </Box>
          )}
          
          {/* Análisis de Riesgo */}
          {currentTab === 2 && (
            <Box>
              <Typography variant="h6" sx={{ mb: 3, fontWeight: 600 }}>
                ⚠️ Análisis de Riesgo Psicosocial
              </Typography>
              
              <Grid container spacing={3}>
                {/* Resumen general de riesgo */}
                <Grid item xs={12} md={6}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                        Distribución General de Riesgo
                      </Typography>
                      
                      <Box sx={{ height: 300 }}>
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={[
                                { name: 'Riesgo Bajo', value: riskAnalysis.low || 0, fill: RISK_COLORS.low },
                                { name: 'Riesgo Medio', value: riskAnalysis.medium || 0, fill: RISK_COLORS.medium },
                                { name: 'Riesgo Alto', value: riskAnalysis.high || 0, fill: RISK_COLORS.high },
                                { name: 'Riesgo Muy Alto', value: riskAnalysis.veryHigh || 0, fill: RISK_COLORS.veryHigh }
                              ]}
                              cx="50%"
                              cy="50%"
                              labelLine={false}
                              label={({ name, value, percent }) => 
                                value > 0 ? `${name}: ${value} (${(percent * 100).toFixed(0)}%)` : null
                              }
                              outerRadius={80}
                              fill="#8884d8"
                              dataKey="value"
                            >
                              {[
                                { name: 'Riesgo Bajo', value: riskAnalysis.low || 0, fill: RISK_COLORS.low },
                                { name: 'Riesgo Medio', value: riskAnalysis.medium || 0, fill: RISK_COLORS.medium },
                                { name: 'Riesgo Alto', value: riskAnalysis.high || 0, fill: RISK_COLORS.high },
                                { name: 'Riesgo Muy Alto', value: riskAnalysis.veryHigh || 0, fill: RISK_COLORS.veryHigh }
                              ].map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.fill} />
                              ))}
                            </Pie>
                            <Tooltip />
                          </PieChart>
                        </ResponsiveContainer>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
                
                {/* Indicadores de alerta */}
                <Grid item xs={12} md={6}>
                  <Card sx={{ height: '100%' }}>
                    <CardContent>
                      <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                        Indicadores de Alerta
                      </Typography>
                      
                      <Box sx={{ mb: 3 }}>
                        {/* Alerta crítica */}
                        {(riskAnalysis.veryHigh || 0) > 0 && (
                          <Alert severity="error" sx={{ mb: 2 }}>
                            <Typography variant="body2">
                              <strong>🚨 Atención Crítica:</strong> {riskAnalysis.veryHigh} módulo(s) con riesgo muy alto.
                              Se requiere acción inmediata.
                            </Typography>
                          </Alert>
                        )}
                        
                        {/* Alerta alta */}
                        {(riskAnalysis.high || 0) > 0 && (
                          <Alert severity="warning" sx={{ mb: 2 }}>
                            <Typography variant="body2">
                              <strong>⚠️ Alerta Alta:</strong> {riskAnalysis.high} módulo(s) con riesgo alto.
                              Se recomienda implementar medidas preventivas.
                            </Typography>
                          </Alert>
                        )}
                        
                        {/* Situación favorable */}
                        {(riskAnalysis.low || 0) >= 5 && (
                          <Alert severity="success" sx={{ mb: 2 }}>
                            <Typography variant="body2">
                              <strong>✅ Situación Favorable:</strong> La mayoría de módulos presenta riesgo bajo.
                            </Typography>
                          </Alert>
                        )}
                      </Box>
                      
                      {/* Medidores de riesgo */}
                      <Box>
                        {[
                          { level: 'veryHigh', label: 'Muy Alto', color: RISK_COLORS.veryHigh },
                          { level: 'high', label: 'Alto', color: RISK_COLORS.high },
                          { level: 'medium', label: 'Medio', color: RISK_COLORS.medium },
                          { level: 'low', label: 'Bajo', color: RISK_COLORS.low }
                        ].map(({ level, label, color }) => (
                          <Box key={level} sx={{ mb: 2 }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                Riesgo {label}
                              </Typography>
                              <Typography variant="body2" sx={{ color: color, fontWeight: 700 }}>
                                {riskAnalysis[level] || 0} módulos
                              </Typography>
                            </Box>
                            <LinearProgress 
                              variant="determinate" 
                              value={((riskAnalysis[level] || 0) / 7) * 100}
                              sx={{ 
                                height: 6, 
                                borderRadius: 3,
                                backgroundColor: '#f0f0f0',
                                '& .MuiLinearProgress-bar': {
                                  backgroundColor: color
                                }
                              }}
                            />
                          </Box>
                        ))}
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
                
                {/* Matriz de riesgo por módulo */}
                <Grid item xs={12}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                        Matriz de Riesgo por Módulo
                      </Typography>
                      
                      <TableContainer>
                        <Table>
                          <TableHead>
                            <TableRow>
                              <TableCell><strong>Módulo</strong></TableCell>
                              <TableCell align="center"><strong>Puntuación</strong></TableCell>
                              <TableCell align="center"><strong>Nivel de Riesgo</strong></TableCell>
                              <TableCell align="center"><strong>Respuestas</strong></TableCell>
                              <TableCell align="center"><strong>Recomendación</strong></TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {moduleResults
                              .sort((a, b) => {
                                const riskOrder = { veryHigh: 4, high: 3, medium: 2, low: 1 };
                                return riskOrder[b.riskLevel] - riskOrder[a.riskLevel];
                              })
                              .map((module) => (
                                <TableRow key={module.module}>
                                  <TableCell>
                                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                      Módulo {module.module}: {module.name}
                                    </Typography>
                                  </TableCell>
                                  <TableCell align="center">
                                    <Typography variant="h6" sx={{ 
                                      fontWeight: 700, 
                                      color: RISK_COLORS[module.riskLevel] 
                                    }}>
                                      {module.averageScore}
                                    </Typography>
                                  </TableCell>
                                  <TableCell align="center">
                                    <Chip 
                                      label={
                                        module.riskLevel === 'veryHigh' ? 'Muy Alto' :
                                        module.riskLevel === 'high' ? 'Alto' :
                                        module.riskLevel === 'medium' ? 'Medio' : 'Bajo'
                                      }
                                      color={
                                        module.riskLevel === 'veryHigh' ? 'error' :
                                        module.riskLevel === 'high' ? 'error' :
                                        module.riskLevel === 'medium' ? 'warning' : 'success'
                                      }
                                      size="small"
                                    />
                                  </TableCell>
                                  <TableCell align="center">{module.responses}</TableCell>
                                  <TableCell align="center">
                                    <Typography variant="body2" color="text.secondary">
                                      {module.riskLevel === 'veryHigh' ? '� Acción inmediata' :
                                       module.riskLevel === 'high' ? '⚠️ Medidas preventivas' :
                                       module.riskLevel === 'medium' ? '📋 Monitoreo continuo' : '✅ Mantener condiciones'}
                                    </Typography>
                                  </TableCell>
                                </TableRow>
                              ))
                            }
                          </TableBody>
                        </Table>
                      </TableContainer>
                    </CardContent>
                  </Card>
                </Grid>
                
                {/* Recomendaciones según NOM-035 */}
                <Grid item xs={12}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                        📋 Recomendaciones según NOM-035
                      </Typography>
                      
                      <Grid container spacing={2}>
                        <Grid item xs={12} md={6}>
                          <Box sx={{ p: 2, backgroundColor: '#ffebee', borderRadius: 2 }}>
                            <Typography variant="h6" sx={{ fontWeight: 600, color: '#d32f2f', mb: 1 }}>
                              🚨 Acciones Inmediatas (Riesgo Muy Alto/Alto)
                            </Typography>
                            <Typography variant="body2" sx={{ mb: 1 }}>
                              • Implementar programa de intervención específico
                            </Typography>
                            <Typography variant="body2" sx={{ mb: 1 }}>
                              • Evaluación médica y psicológica del personal
                            </Typography>
                            <Typography variant="body2" sx={{ mb: 1 }}>
                              • Revisión de cargas de trabajo y condiciones laborales
                            </Typography>
                            <Typography variant="body2">
                              • Capacitación en manejo del estrés y comunicación
                            </Typography>
                          </Box>
                        </Grid>
                        
                        <Grid item xs={12} md={6}>
                          <Box sx={{ p: 2, backgroundColor: '#fff3e0', borderRadius: 2 }}>
                            <Typography variant="h6" sx={{ fontWeight: 600, color: '#f57c00', mb: 1 }}>
                              📋 Medidas Preventivas (Riesgo Medio)
                            </Typography>
                            <Typography variant="body2" sx={{ mb: 1 }}>
                              • Programas de bienestar laboral
                            </Typography>
                            <Typography variant="body2" sx={{ mb: 1 }}>
                              • Talleres de desarrollo de habilidades
                            </Typography>
                            <Typography variant="body2" sx={{ mb: 1 }}>
                              • Mejora en canales de comunicación
                            </Typography>
                            <Typography variant="body2">
                              • Monitoreo periódico de condiciones laborales
                            </Typography>
                          </Box>
                        </Grid>
                      </Grid>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            </Box>
          )}
          
          {/* Detalle de Respuestas */}
          {currentTab === 3 && (
            <Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  📋 Detalle de Respuestas
                </Typography>
                <Stack direction="row" spacing={2}>
                  <Button variant="contained" color="success" onClick={handleExportExcel} disabled={!filteredResponses.length}>
                    Exportar a Excel
                  </Button>
                  <Button variant="contained" color="primary" onClick={handleExportPDF} disabled={!filteredResponses.length}>
                    Exportar a PDF
                  </Button>
                </Stack>
              </Box>
              <TableContainer component={Paper}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell><strong>ID</strong></TableCell>
                      <TableCell><strong>Empleado</strong></TableCell>
                      <TableCell><strong>Encuesta</strong></TableCell>
                      <TableCell><strong>Fecha</strong></TableCell>
                      {/* Render dynamic answer columns */}
                      {filteredResponses[0]?.answers && Object.keys(filteredResponses[0].answers).map((q, idx) => (
                        <TableCell key={q}><strong>{q}</strong></TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredResponses.length ? filteredResponses.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell>{r.id}</TableCell>
                        <TableCell>{r.employeeName || r.employeeId || ''}</TableCell>
                        <TableCell>{r.surveyTitle || r.surveyApplicationId || ''}</TableCell>
                        <TableCell>{r.createdAt ? new Date(r.createdAt).toLocaleString() : ''}</TableCell>
                        {r.answers && Object.keys(filteredResponses[0].answers).map((q) => (
                          <TableCell key={q}>{r.answers[q] || ''}</TableCell>
                        ))}
                      </TableRow>
                    )) : (
                      <TableRow>
                        <TableCell colSpan={4} align="center">
                          <Typography color="text.secondary">No hay respuestas para los filtros seleccionados.</Typography>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          )}
        </Box>
      </Paper>
    </Box>
  );
}
