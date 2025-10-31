import React, { useEffect, useState, useContext } from "react";
import { UserContext } from "../context/UserContext";
import { useNavigate } from "react-router-dom";
import {
  getCompanyDashboard,
  getCompanyRisk,
  getCompanyParticipation,
  getCompanies
} from "../api/nom035";
import {
  Box,
  Typography,
  Paper,
  Button,
  Grid,
  Card,
  CardContent,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  LinearProgress,
  Avatar,
  Stack
} from "@mui/material";
import {
  People as PeopleIcon,
  Assignment as AssignmentIcon,
  TrendingUp as TrendingUpIcon,
  Warning as WarningIcon,
  Download as DownloadIcon,
  Refresh as RefreshIcon,
  Business as BusinessIcon
} from "@mui/icons-material";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid
} from "recharts";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

import theme from "../theme";
const COLORS = [theme.palette.primary.dark, theme.palette.primary.light, theme.palette.primary.main, theme.palette.secondary.main];

export default function Dashboard() {
  const { user, loading } = useContext(UserContext);
  const navigate = useNavigate();

  const [dashboard, setDashboard] = useState({ employees: [], surveyStatusCounts: [], surveys: [] });
  const [riskByFactor, setRiskByFactor] = useState({});
  const [participation, setParticipation] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState(1);
  const [dashboardLoading, setDashboardLoading] = useState(false);

  const fetchData = async (companyId) => {
    setDashboardLoading(true);
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
      setDashboardLoading(false);
    }
  };

  useEffect(() => {
    // Evitar navegar repetidamente: si no hay usuario y no estamos ya en /login, navegar.
    try {
      const currentPath = window.location && window.location.pathname ? window.location.pathname : '';
      if (!loading && !user && currentPath !== '/login') navigate('/login');
    } catch (e) {
      if (!loading && !user) navigate('/login');
    }
  }, [loading, user, navigate]);

  useEffect(() => {
    getCompanies().then((res) => setCompanies(res.data)).catch(() => setCompanies([]));
  }, []);

  useEffect(() => {
    if (selectedCompany) fetchData(selectedCompany);
  }, [selectedCompany]);

  if (loading || !user) return <div>Cargando...</div>;

  const pieData = Object.keys(riskByFactor || {}).map((key) => ({ name: key, value: riskByFactor[key] }));
  const barData = (participation || []).map((item) => ({
    name: item.surveyTitle?.length > 15 ? item.surveyTitle.substring(0, 15) + "..." : item.surveyTitle,
    completionRate: item.completionRate,
    fullName: item.surveyTitle
  }));

  const stats = {
    totalEmployees: dashboard.employees?.length || 0,
    totalSurveys: dashboard.surveys?.length || 0,
    avgCompletion: participation.length > 0 ? (participation.reduce((a, b) => a + b.completionRate, 0) / participation.length).toFixed(1) : 0,
    highRiskFactors: pieData.filter((p) => p.value > 70).length
  };

  const exportRiskExcel = () => {
    const ws = XLSX.utils.json_to_sheet(pieData.map((d) => ({ Factor: d.name, AverageRisk: d.value })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "RiskByFactor");
    const buf = XLSX.write(wb, { type: "array", bookType: "xlsx" });
    saveAs(new Blob([buf], { type: "application/octet-stream" }), "risk_by_factor.xlsx");
  };

  const exportParticipationExcel = () => {
    const ws = XLSX.utils.json_to_sheet(participation || []);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Participation");
    const buf = XLSX.write(wb, { type: "array", bookType: "xlsx" });
    saveAs(new Blob([buf], { type: "application/octet-stream" }), "participation_report.xlsx");
  };

  const StatCard = ({ title, value, icon, subtitle, trend }) => (
  <Card sx={{ height: '100%', background: `linear-gradient(135deg, ${theme.palette.primary.dark} 0%, ${theme.palette.primary.light} 100%)`, color: 'white' }}>
      <CardContent sx={{ p: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            <Typography variant="body2" sx={{ opacity: 0.9 }}>{title}</Typography>
            <Typography variant="h5" sx={{ fontWeight: 700 }}>{value}</Typography>
            {subtitle && <Typography variant="caption">{subtitle}</Typography>}
          </Box>
          <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)' }}>{icon}</Avatar>
        </Box>
        {trend && <Typography variant="caption" sx={{ display: 'block', mt: 1 }}>{trend}</Typography>}
      </CardContent>
    </Card>
  );

  return (
    <Box sx={{ p: 3, backgroundColor: '#f8fafc', minHeight: '100vh' }}>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 700 }}>Dashboard NOM-035</Typography>
        <Typography variant="body2" color="text.secondary">Resumen ejecutivo de riesgos psicosociales y participación</Typography>
      </Box>

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <FormControl sx={{ minWidth: 240 }}>
          <InputLabel>Seleccionar Empresa</InputLabel>
          <Select value={selectedCompany} label="Seleccionar Empresa" onChange={(e) => setSelectedCompany(e.target.value)}>
            {companies.map((c) => (
              <MenuItem key={c.id} value={c.id}><BusinessIcon sx={{ mr: 1 }} />{c.name}</MenuItem>
            ))}
          </Select>
        </FormControl>

        <Button variant="outlined" startIcon={<RefreshIcon />} onClick={() => fetchData(selectedCompany)} disabled={loading}>
          Actualizar
        </Button>
      </Box>

      {dashboardLoading && <LinearProgress sx={{ mb: 2 }} />}

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}><StatCard title="Total Empleados" value={stats.totalEmployees} icon={<PeopleIcon />} subtitle="Personal registrado" trend="+2% este mes" /></Grid>
        <Grid item xs={12} sm={6} md={3}><StatCard title="Encuestas Activas" value={stats.totalSurveys} icon={<AssignmentIcon />} subtitle="En el sistema" trend="3 nuevas esta semana" /></Grid>
        <Grid item xs={12} sm={6} md={3}><StatCard title="Participación" value={`${stats.avgCompletion}%`} icon={<TrendingUpIcon />} subtitle="Promedio general" trend="↗ Mejorando" /></Grid>
        <Grid item xs={12} sm={6} md={3}><StatCard title="Factores de Riesgo" value={stats.highRiskFactors} icon={<WarningIcon />} subtitle="Requieren atención" trend={stats.highRiskFactors > 0 ? '⚠ Revisar' : '✓ Bajo control'} /></Grid>
      </Grid>

      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2, height: 440 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Box>
                <Typography variant="h6">Riesgo por Factor</Typography>
                <Typography variant="body2" color="text.secondary">Distribución de niveles de riesgo psicosocial</Typography>
              </Box>
              <Button variant="text" startIcon={<DownloadIcon />} onClick={exportRiskExcel}>Exportar</Button>
            </Box>
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={360}>
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={40} outerRadius={100} label>
                    {pieData.map((entry, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <RechartsTooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <Box sx={{ height: 360, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Typography color="text.secondary">No hay datos de riesgo disponibles</Typography></Box>
            )}
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2, height: 440 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Box>
                <Typography variant="h6">Participación por Encuesta</Typography>
                <Typography variant="body2" color="text.secondary">Porcentaje de participación en cada evaluación</Typography>
              </Box>
              <Button variant="text" startIcon={<DownloadIcon />} onClick={exportParticipationExcel}>Exportar</Button>
            </Box>
            {barData.length > 0 ? (
              <ResponsiveContainer width="100%" height={360}>
                <BarChart data={barData} margin={{ top: 10, right: 20, left: 0, bottom: 60 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" angle={-45} textAnchor="end" interval={0} height={80} />
                  <YAxis />
                  <RechartsTooltip />
                  <Bar dataKey="completionRate" fill={COLORS[0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <Box sx={{ height: 360, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Typography color="text.secondary">No hay datos de participación disponibles</Typography></Box>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}