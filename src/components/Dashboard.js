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
  // ...existing code...
  // ...existing code...
  // ...existing code...
  // (El log de riskByFactor se mueve después de todos los useState y hooks)
  const { user, loading } = useContext(UserContext);
  const navigate = useNavigate();

  // helper to check roles
  const hasRole = (roleName) => {
    if (!user || !user.roles) return false;
    return user.roles.some(role => role.authority === roleName);
  };

  const [dashboard, setDashboard] = useState({ employees: [], surveyStatusCounts: [], surveys: [] });
  const [riskByFactor, setRiskByFactor] = useState({});
  const [participation, setParticipation] = useState([]);
  const [companies, setCompanies] = useState([]);
  // selectedCompany inicia vacío y se setea al primer id válido cuando companies carga
  const [selectedCompany, setSelectedCompany] = useState("");
  const [dashboardLoading, setDashboardLoading] = useState(false);
  // Hooks para mostrar todos o top 5
  const [showAllRisk, setShowAllRisk] = useState(false);
  const [showAllParticipation, setShowAllParticipation] = useState(false);

  // Log para depuración: mostrar los nombres de los factores que llegan del backend
  useEffect(() => {
    if (riskByFactor && Object.keys(riskByFactor).length > 0) {
      console.log('Factores recibidos en riskByFactor:', Object.keys(riskByFactor));
    }
  }, [riskByFactor]);

  const fetchData = async (companyId) => {
    setDashboardLoading(true);
    try {
      const [dashboardRes, riskRes, participationRes] = await Promise.all([
        getCompanyDashboard(companyId),
        getCompanyRisk(companyId),
        getCompanyParticipation(companyId)
      ]);
      // Log de datos crudos para depuración
      console.log('DASHBOARD DATA:', dashboardRes.data);
      console.log('RISK BY FACTOR:', riskRes.data);
      console.log('PARTICIPATION:', participationRes.data);
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
    getCompanies().then((res) => {
      setCompanies(res.data);
      // If the user is a company user, prefer their company
      if (user && hasRole('ROLE_COMPANY')) {
        const userCompanyId = String(user.companyId || (user.company && user.company.id) || (res.data && res.data[0] && res.data[0].id));
        setSelectedCompany(userCompanyId);
      } else {
        // If no company selected yet, set the first one
        if (res.data && res.data.length > 0 && (!selectedCompany || !res.data.some(c => String(c.id) === String(selectedCompany)))) {
          setSelectedCompany(String(res.data[0].id));
        }
      }
    }).catch(() => setCompanies([]));
  }, [user]);

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
  // Mostrar siempre los factores clave de la NOM-035
  const factoresClave = [
    'Sobrecarga',
    'Horas extra',
    'Órdenes contradictorias', // Falta de control
    'Violencia presenciada',   // Violencia
    'Organización del jefe'    // Liderazgo negativo
  ];
  const pieDataLimited = showAllRisk
    ? pieData
    : factoresClave
        .map(factor => pieData.find(d => d.name === factor))
        .filter(Boolean);
  const barDataLimited = showAllParticipation ? barData : barData.slice(0, 5);
  const stats = {
    totalEmployees: dashboard.employees?.length || 0,
    totalSurveys: dashboard.surveys?.length || 0,
    avgCompletion: participation.length > 0 ? (participation.reduce((a, b) => a + b.completionRate, 0) / participation.length).toFixed(1) : 0,
    highRiskFactors: pieData.filter((p) => p.value > 70).length
  };
  // Altura dinámica para las gráficas (debe ir después de definir los datos limitados)
  const pieChartHeight = Math.max(360, (pieDataLimited.length || 1) * 60);
  const barChartHeight = Math.max(360, (barDataLimited.length || 1) * 60);

  const exportRiskExcel = () => {
    const ws = XLSX.utils.json_to_sheet(pieData.map((d) => ({ Factor: d.name, AverageRisk: d.value })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "RiskByFactor");
    const buf = XLSX.write(wb, { type: "array", bookType: "xlsx" });
    saveAs(new Blob([buf], { type: "application/octet-stream" }), "riesgo_por_factor.xlsx");
  };

  // Exportar participación a Excel
  const exportParticipationExcel = () => {
    const ws = XLSX.utils.json_to_sheet(barData.map((d) => ({ Encuesta: d.fullName, Participacion: d.completionRate })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Participacion");
    const buf = XLSX.write(wb, { type: "array", bookType: "xlsx" });
    saveAs(new Blob([buf], { type: "application/octet-stream" }), "participacion_por_encuesta.xlsx");
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
        {hasRole('ROLE_ADMIN') ? (
          <FormControl sx={{ minWidth: 240 }}>
            <InputLabel>Seleccionar Empresa</InputLabel>
            <Select
              value={selectedCompany}
              label="Seleccionar Empresa"
              onChange={(e) => setSelectedCompany(String(e.target.value))}
              MenuProps={{ PaperProps: { style: { maxHeight: 300 } } }}
            >
              {companies.map((c) => (
                <MenuItem key={c.id} value={String(c.id)}><BusinessIcon sx={{ mr: 1 }} />{c.name}</MenuItem>
              ))}
            </Select>
          </FormControl>
        ) : (
          <Box sx={{ display: 'flex', alignItems: 'center', minWidth: 240 }}>
            <BusinessIcon sx={{ mr: 1 }} />
            <Typography variant="subtitle1">{companies.find(c => String(c.id) === String(selectedCompany))?.name || '—'}</Typography>
          </Box>
        )}

        <Button variant="outlined" startIcon={<RefreshIcon />} onClick={() => fetchData(selectedCompany)} disabled={loading}>
          Actualizar
        </Button>
      </Box>

      {dashboardLoading && <LinearProgress sx={{ mb: 2 }} />}

      <Grid container columnSpacing={2} rowSpacing={2} sx={{ mb: 3 }}>
        <Grid><StatCard title="Total Empleados" value={stats.totalEmployees} icon={<PeopleIcon />} subtitle="Personal registrado" trend="+2% este mes" /></Grid>
        <Grid><StatCard title="Encuestas Activas" value={stats.totalSurveys} icon={<AssignmentIcon />} subtitle="En el sistema" trend="3 nuevas esta semana" /></Grid>
        <Grid><StatCard title="Participación" value={`${stats.avgCompletion}%`} icon={<TrendingUpIcon />} subtitle="Promedio general" trend="↗ Mejorando" /></Grid>
        <Grid><StatCard title="Factores de Riesgo" value={stats.highRiskFactors} icon={<WarningIcon />} subtitle="Requieren atención" trend={stats.highRiskFactors > 0 ? '⚠ Revisar' : '✓ Bajo control'} /></Grid>
      </Grid>

      <Grid container columnSpacing={2} rowSpacing={2}>
        <Grid sx={{ flex: 1, minWidth: 0 }}>
          <Paper sx={{ p: 2, height: 440 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Box>
                <Typography variant="h6">Riesgo por Factor</Typography>
                <Typography variant="body2" color="text.secondary">Distribución de niveles de riesgo psicosocial</Typography>
              </Box>
              <Box>
                <Button variant="text" startIcon={<DownloadIcon />} onClick={exportRiskExcel}>Exportar</Button>
                {pieData.length > 5 && (
                  <Button size="small" sx={{ ml: 1 }} onClick={() => setShowAllRisk(v => !v)}>
                    {showAllRisk ? 'Ver menos' : 'Ver todos'}
                  </Button>
                )}
              </Box>
            </Box>
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={pieChartHeight}>
                <PieChart>
                  <Pie data={pieDataLimited} dataKey="value" nameKey="name" innerRadius={40} outerRadius={100} label>
                    {pieDataLimited.map((entry, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
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

        <Grid sx={{ flex: 1, minWidth: 0 }}>
          <Paper sx={{ p: 2, height: 440 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Box>
                <Typography variant="h6">Participación por Encuesta</Typography>
                <Typography variant="body2" color="text.secondary">Porcentaje de participación en cada evaluación</Typography>
              </Box>
              <Box>
                <Button variant="text" startIcon={<DownloadIcon />} onClick={exportParticipationExcel}>Exportar</Button>
                {barData.length > 5 && (
                  <Button size="small" sx={{ ml: 1 }} onClick={() => setShowAllParticipation(v => !v)}>
                    {showAllParticipation ? 'Ver menos' : 'Ver todos'}
                  </Button>
                )}
              </Box>
            </Box>
            {barData.length > 0 ? (
              <ResponsiveContainer width="100%" height={barChartHeight}>
                <BarChart data={barDataLimited} margin={{ top: 10, right: 20, left: 0, bottom: 60 }}>
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
