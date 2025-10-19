import React, { useEffect, useState } from "react";
import {
  getCompanyDashboard,
  getCompanyRisk,
  getCompanyParticipation,
  getCompanies
} from "../api/nom035";
import { 
  Box, Typography, Paper, Button,
  Grid, Card, CardContent, Select, MenuItem, FormControl, InputLabel,
  Chip, LinearProgress, Avatar, Stack, Divider, IconButton, Tooltip
} from "@mui/material";
import {
  People as PeopleIcon,
  Assignment as AssignmentIcon,
  TrendingUp as TrendingUpIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Download as DownloadIcon,
  Refresh as RefreshIcon,
  Business as BusinessIcon
} from '@mui/icons-material';
import { 
  PieChart, Pie, Cell, Tooltip as RechartsTooltip, Legend, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid
} from "recharts";
import { useTranslation } from 'react-i18next';
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

const COLORS = ["#6366f1", "#8b5cf6", "#06b6d4", "#10b981"];

export default function Dashboard() {
  const { t } = useTranslation();
  const [dashboard, setDashboard] = useState({ employees: [], surveyStatusCounts: [], surveys: [] });
  const [riskByFactor, setRiskByFactor] = useState({});
  const [participation, setParticipation] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState(1);
  const [loading, setLoading] = useState(false);

  const fetchData = async (companyId) => {
    setLoading(true);
    try {
      const [dashboardRes, riskRes, participationRes] = await Promise.all([
        getCompanyDashboard(companyId),
        getCompanyRisk(companyId),
        getCompanyParticipation(companyId)
      ]);
      
      setDashboard(dashboardRes.data);
      setRiskByFactor(riskRes.data);
      setParticipation(participationRes.data);
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Load companies list
    getCompanies().then(res => setCompanies(res.data));
  }, []);

  useEffect(() => {
    if (selectedCompany) {
      fetchData(selectedCompany);
    }
  }, [selectedCompany]);

  // Pie data for risk by factor
  const pieData = Object.keys(riskByFactor).map((key, idx) => ({
    name: key,
    value: riskByFactor[key]
  }));

  // Bar data for participation
  const barData = participation.map(item => ({
    name: item.surveyTitle?.length > 15 ? item.surveyTitle.substring(0, 15) + "..." : item.surveyTitle,
    completionRate: item.completionRate,
    fullName: item.surveyTitle
  }));

  // Statistics calculations
  const stats = {
    totalEmployees: dashboard.employees?.length || 0,
    totalSurveys: dashboard.surveys?.length || 0,
    avgCompletion: participation.length > 0 
      ? (participation.reduce((acc, curr) => acc + curr.completionRate, 0) / participation.length).toFixed(1)
      : 0,
    highRiskFactors: pieData.filter(item => item.value > 70).length
  };

  // Export functions
  const exportRiskExcel = () => {
    const ws = XLSX.utils.json_to_sheet(
      pieData.map(d => ({ Factor: d.name, AverageRisk: d.value }))
    );
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "RiskByFactor");
    const buf = XLSX.write(wb, { type: "array", bookType: "xlsx" });
    saveAs(new Blob([buf], { type: "application/octet-stream" }), "risk_by_factor.xlsx");
  };

  const exportParticipationExcel = () => {
    const ws = XLSX.utils.json_to_sheet(participation);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Participation");
    const buf = XLSX.write(wb, { type: "array", bookType: "xlsx" });
    saveAs(new Blob([buf], { type: "application/octet-stream" }), "participation_report.xlsx");
  };

  const StatCard = ({ title, value, icon, color, subtitle, trend }) => (
    <Card 
      sx={{ 
        height: '100%',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white',
        transition: 'transform 0.2s ease-in-out',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: '0 10px 25px rgba(0,0,0,0.1)'
        }
      }}
    >
      <CardContent sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
          <Box>
            <Typography variant="body2" sx={{ opacity: 0.9, mb: 1 }}>
              {title}
            </Typography>
            <Typography variant="h3" sx={{ fontWeight: 700, mb: 0.5 }}>
              {value}
            </Typography>
            {subtitle && (
              <Typography variant="caption" sx={{ opacity: 0.8 }}>
                {subtitle}
              </Typography>
            )}
          </Box>
          <Avatar 
            sx={{ 
              bgcolor: 'rgba(255,255,255,0.2)', 
              width: 56, 
              height: 56,
              '& .MuiSvgIcon-root': { fontSize: 28 }
            }}
          >
            {icon}
          </Avatar>
        </Box>
        {trend && (
          <Box sx={{ display: 'flex', alignItems: 'center', mt: 2 }}>
            <TrendingUpIcon sx={{ fontSize: 16, mr: 0.5, opacity: 0.8 }} />
            <Typography variant="caption" sx={{ opacity: 0.8 }}>
              {trend}
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );

  return (
    <Box sx={{ p: 3, backgroundColor: '#f8fafc', minHeight: '100vh' }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 700, color: '#1e293b', mb: 1 }}>
          Dashboard NOM-035
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Resumen ejecutivo de riesgos psicosociales y participación
        </Typography>
      </Box>

      {/* Controls */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <FormControl sx={{ minWidth: 250 }}>
          <InputLabel>Seleccionar Empresa</InputLabel>
          <Select
            value={selectedCompany}
            onChange={(e) => setSelectedCompany(e.target.value)}
            label="Seleccionar Empresa"
            sx={{ backgroundColor: 'white' }}
          >
            {companies.map(company => (
              <MenuItem key={company.id} value={company.id}>
                <BusinessIcon sx={{ mr: 1, color: '#6366f1' }} />
                {company.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        
        <Button
          variant="outlined"
          startIcon={<RefreshIcon />}
          onClick={() => fetchData(selectedCompany)}
          disabled={loading}
          sx={{ 
            borderColor: '#6366f1', 
            color: '#6366f1',
            '&:hover': { borderColor: '#4f46e5', backgroundColor: '#f1f5f9' }
          }}
        >
          Actualizar
        </Button>
      </Box>

      {loading && <LinearProgress sx={{ mb: 3, '& .MuiLinearProgress-bar': { backgroundColor: '#6366f1' } }} />}

      {/* Statistics Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Total Empleados"
            value={stats.totalEmployees}
            icon={<PeopleIcon />}
            subtitle="Personal registrado"
            trend="+2% este mes"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Encuestas Activas"
            value={stats.totalSurveys}
            icon={<AssignmentIcon />}
            subtitle="En el sistema"
            trend="3 nuevas esta semana"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Participación"
            value={`${stats.avgCompletion}%`}
            icon={<TrendingUpIcon />}
            subtitle="Promedio general"
            trend="↗ Mejorando"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Factores de Riesgo"
            value={stats.highRiskFactors}
            icon={<WarningIcon />}
            subtitle="Requieren atención"
            trend={stats.highRiskFactors > 0 ? "⚠ Revisar" : "✓ Bajo control"}
          />
        </Grid>
      </Grid>

      {/* Charts Section */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {/* Risk by Factor Chart */}
        <Grid item xs={12} md={6}>
          <Paper 
            sx={{ 
              p: 3, 
              height: 450,
              borderRadius: 3,
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
              border: '1px solid #e2e8f0'
            }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 600, color: '#1e293b' }}>
                  Riesgo por Factor
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Distribución de niveles de riesgo psicosocial
                </Typography>
              </Box>
              <Button 
                variant="text" 
                size="small"
                startIcon={<DownloadIcon />}
                onClick={exportRiskExcel}
                sx={{ color: '#6366f1' }}
              >
                Exportar
              </Button>
            </Box>
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={340}>
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    innerRadius={40}
                    label={({name, percent}) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  >
                    {pieData.map((entry, idx) => (
                      <Cell key={`cell-${idx}`} fill={COLORS[idx % COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip 
                    formatter={(value) => [`${value.toFixed(1)}%`, 'Riesgo']}
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                    }}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 340 }}>
                <Typography color="text.secondary">No hay datos de riesgo disponibles</Typography>
              </Box>
            )}
          </Paper>
        </Grid>

        {/* Participation Chart */}
        <Grid item xs={12} md={6}>
          <Paper 
            sx={{ 
              p: 3, 
              height: 450,
              borderRadius: 3,
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
              border: '1px solid #e2e8f0'
            }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 600, color: '#1e293b' }}>
                  Participación por Encuesta
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Porcentaje de participación en cada evaluación
                </Typography>
              </Box>
              <Button 
                variant="text" 
                size="small"
                startIcon={<DownloadIcon />}
                onClick={exportParticipationExcel}
                sx={{ color: '#6366f1' }}
              >
                Exportar
              </Button>
            </Box>
            {barData.length > 0 ? (
              <ResponsiveContainer width="100%" height={340}>
                <BarChart data={barData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="name" 
                    angle={-45}
                    textAnchor="end"
                    height={100}
                    tick={{ fontSize: 12 }}
                  />
                  <YAxis 
                    domain={[0, 100]}
                    tickFormatter={(value) => `${value}%`}
                    tick={{ fontSize: 12 }}
                  />
                  <RechartsTooltip 
                    formatter={(value, name, props) => [`${value.toFixed(1)}%`, 'Completitud']}
                    labelFormatter={(label, payload) => payload?.[0]?.payload?.fullName || label}
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                    }}
                  />
                  <Bar 
                    dataKey="completionRate" 
                    fill="#6366f1" 
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 340 }}>
                <Typography color="text.secondary">No hay datos de participación disponibles</Typography>
              </Box>
            )}
          </Paper>
        </Grid>
      </Grid>
      {/* Information Cards */}
      <Grid container spacing={3}>
        {/* Employees Section */}
        <Grid item xs={12} md={6}>
          <Paper 
            sx={{ 
              p: 3,
              borderRadius: 3,
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
              border: '1px solid #e2e8f0'
            }}
          >
            <Typography variant="h6" sx={{ fontWeight: 600, color: '#1e293b', mb: 3 }}>
              Empleados Registrados
            </Typography>
            {dashboard.employees?.length > 0 ? (
              <Box sx={{ maxHeight: 350, overflow: 'auto' }}>
                {dashboard.employees.slice(0, 8).map((emp, index) => (
                  <Box 
                    key={emp.id || index} 
                    sx={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      mb: 2, 
                      p: 2,
                      borderRadius: 2,
                      backgroundColor: '#f8fafc',
                      transition: 'all 0.2s',
                      '&:hover': { backgroundColor: '#f1f5f9' }
                    }}
                  >
                    <Avatar 
                      sx={{ 
                        mr: 2, 
                        bgcolor: '#6366f1',
                        width: 40,
                        height: 40
                      }}
                    >
                      {emp.name?.charAt(0) || 'E'}
                    </Avatar>
                    <Box sx={{ flexGrow: 1 }}>
                      <Typography variant="body1" sx={{ fontWeight: 500, color: '#1e293b' }}>
                        {emp.name || 'Sin nombre'}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {emp.position || 'Sin cargo'} • {emp.department || 'Sin departamento'}
                      </Typography>
                    </Box>
                    <Chip 
                      label="Activo" 
                      size="small"
                      sx={{ 
                        backgroundColor: '#dcfce7', 
                        color: '#166534',
                        fontWeight: 500
                      }}
                    />
                  </Box>
                ))}
                {dashboard.employees.length > 8 && (
                  <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', mt: 2 }}>
                    +{dashboard.employees.length - 8} empleados más
                  </Typography>
                )}
              </Box>
            ) : (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <PeopleIcon sx={{ fontSize: 48, color: '#cbd5e1', mb: 1 }} />
                <Typography color="text.secondary">
                  No hay empleados registrados
                </Typography>
              </Box>
            )}
          </Paper>
        </Grid>

        {/* Surveys Section */}
        <Grid item xs={12} md={6}>
          <Paper 
            sx={{ 
              p: 3,
              borderRadius: 3,
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
              border: '1px solid #e2e8f0'
            }}
          >
            <Typography variant="h6" sx={{ fontWeight: 600, color: '#1e293b', mb: 3 }}>
              Encuestas Disponibles
            </Typography>
            {dashboard.surveys?.length > 0 ? (
              <Box sx={{ maxHeight: 350, overflow: 'auto' }}>
                {dashboard.surveys.map((survey, index) => (
                  <Box 
                    key={survey.id || index} 
                    sx={{ 
                      mb: 2, 
                      p: 3, 
                      border: '1px solid #e2e8f0', 
                      borderRadius: 2,
                      backgroundColor: '#fafafa',
                      transition: 'all 0.2s',
                      '&:hover': { 
                        borderColor: '#6366f1',
                        backgroundColor: '#f8fafc'
                      }
                    }}
                  >
                    <Typography variant="body1" sx={{ fontWeight: 500, color: '#1e293b', mb: 1 }}>
                      {survey.title || `Encuesta #${survey.id}`}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      {survey.description || 'Sin descripción disponible'}
                    </Typography>
                    <Stack direction="row" spacing={1}>
                      <Chip 
                        label="Disponible" 
                        size="small"
                        sx={{ 
                          backgroundColor: '#dcfce7', 
                          color: '#166534'
                        }}
                      />
                      {survey.questions && (
                        <Chip 
                          label={`${survey.questions.length} preguntas`} 
                          size="small"
                          sx={{ 
                            backgroundColor: '#e0e7ff', 
                            color: '#3730a3'
                          }}
                        />
                      )}
                    </Stack>
                  </Box>
                ))}
              </Box>
            ) : (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <AssignmentIcon sx={{ fontSize: 48, color: '#cbd5e1', mb: 1 }} />
                <Typography color="text.secondary">
                  No hay encuestas disponibles
                </Typography>
              </Box>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}