import React, { useState, useContext, useEffect } from "react";
import { Box, CssBaseline, Drawer, Toolbar, AppBar, Typography, List, ListItem, ListItemIcon, ListItemText, ThemeProvider, IconButton, Button, Avatar, Stack } from "@mui/material";
import theme from "./theme";
import DashboardIcon from '@mui/icons-material/Dashboard';
import PeopleIcon from '@mui/icons-material/People';
import AssignmentIcon from '@mui/icons-material/Assignment';
import QuizIcon from '@mui/icons-material/Quiz';
import TableChartIcon from '@mui/icons-material/TableChart';
import BusinessIcon from '@mui/icons-material/Business';
import AnalyticsIcon from '@mui/icons-material/Analytics';
import LandingPage from "./components/LandingPage";
import EmployeeForm from "./components/EmployeeForm";
import EmployeeList from "./components/EmployeeList";
import SurveyForm from "./components/SurveyForm";
import SurveyList from "./components/SurveyList";
import SurveyAnswer from "./components/SurveyAnswer";
import EmployeeSurveyAnswer from "./components/EmployeeSurveyAnswer";
import Dashboard from "./components/Dashboard";
import SurveyResults from "./components/SurveyResults";
import SurveyResponsesTable from "./components/SurveyResponsesTable";
import EmployeesPage from "./components/EmployeesPage";
import CompanySurveyPage from "./components/CompanySurveyPage";
import CompaniesPage from "./components/CompaniesPage";
import LanguageSelector from "./components/LanguageSelector";
import LoginPage from "./components/LoginPage";
import { useTranslation } from 'react-i18next';
import { UserContext } from "./context/UserContext";
import { Routes, Route, useNavigate, useLocation, Navigate } from "react-router-dom";


const drawerWidth = 220;

export default function App() {
  const { t, i18n } = useTranslation();
  // Forzar idioma español al montar la app
  useEffect(() => {
    i18n.changeLanguage('es');
  }, [i18n]);
  const { user, login, logout, loading } = useContext(UserContext);
  const [selected, setSelected] = useState(0);
  const location = useLocation();
  // Función para verificar si el usuario tiene un rol específico
  const hasRole = (roleName) => {
    if (!user || !user.roles) return false;
    return user.roles.some(role => role.authority === roleName);
  };

  // Opciones de menú completas
  const allMenuOptions = [
    // ROLE_ADMIN - Acceso completo al sistema
    { text: t("navigation.dashboard"), icon: <DashboardIcon />, component: <Dashboard />, roles: ['ROLE_ADMIN', 'ROLE_COMPANY'] },
    { text: t("navigation.companies"), icon: <BusinessIcon />, component: <CompaniesPage />, roles: ['ROLE_ADMIN'] },
    { text: t("navigation.employees"), icon: <PeopleIcon />, component: <EmployeesPage />, roles: ['ROLE_ADMIN', 'ROLE_COMPANY'] },
    // Ocultar encuestas para ROLE_COMPANY: solo visible para ROLE_ADMIN
    { text: t("navigation.surveys"), icon: <AssignmentIcon />, component: <><SurveyForm /><SurveyList /></>, roles: ['ROLE_ADMIN'] },
    { text: t("navigation.companySurveys"), icon: <BusinessIcon />, component: <CompanySurveyPage />, roles: ['ROLE_ADMIN'] },
    // ROLE_EMPLOYEE - Solo responder encuestas asignadas (componente simplificado)
    { text: t("navigation.answerSurvey"), icon: <QuizIcon />, component: <EmployeeSurveyAnswer />, roles: ['ROLE_EMPLOYEE'] },
    { text: t("navigation.resultsDashboard"), icon: <AnalyticsIcon />, component: <SurveyResults />, roles: ['ROLE_ADMIN', 'ROLE_COMPANY'] },
    { text: t("navigation.surveyResponses"), icon: <TableChartIcon />, component: <SurveyResponsesTable />, roles: ['ROLE_ADMIN', 'ROLE_COMPANY'] }
  ];

  // Filtrar opciones de menú según el rol del usuario
  const menuOptions = user ? allMenuOptions.filter(option => 
    option.roles.some(role => hasRole(role))
  ) : allMenuOptions;

  // Asegurar que el índice seleccionado es válido tras filtrar
  useEffect(() => {
    if (selected >= menuOptions.length) {
      setSelected(0);
    }
  }, [menuOptions.length, selected]);

  // Si está cargando, mostrar pantalla de carga
  if (loading) return <div>Cargando...</div>;

  // Si no está autenticado y no está en /login, redirigir a /login
  if (!user && location.pathname !== "/login") {
    return <Navigate to="/login" replace />;
  }

  // Si está autenticado y está en /login, redirigir a home
  if (user && location.pathname === "/login") {
    return <Navigate to="/" replace />;
  }

  return (
    <ThemeProvider theme={theme}>
      <Routes>
        <Route path="/login" element={<LoginPage onLogin={login} />} />
        <Route path="/*" element={
          <Box sx={{ display: "flex" }}>
            <CssBaseline />
            <AppBar 
              position="fixed" 
              sx={{ 
                zIndex: 1201,
                background: `linear-gradient(135deg, ${theme.palette.primary.dark} 0%, ${theme.palette.primary.light} 50%, ${theme.palette.primary.main} 100%)`,
                boxShadow: '0 8px 32px rgba(99, 102, 241, 0.2)',
                backdropFilter: 'blur(10px)',
                borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
              }}
            >
              <Toolbar>
                <Typography 
                  variant="h6" 
                  noWrap 
                  component="div" 
                  sx={{ 
                    flexGrow: 1,
                    fontWeight: 600,
                    letterSpacing: '0.5px',
                    background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
                    backgroundClip: 'text',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    textShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
                  }}
                >
                  {t("app.title")}
                </Typography>
                {user && (
                  <Stack direction="row" spacing={2} alignItems="center">
                    <Avatar sx={{ bgcolor: '#06b6d4', color: '#fff', width: 32, height: 32, fontSize: 16 }}>
                      {user.name ? user.name[0] : (user.username ? user.username[0] : (user.email ? user.email[0] : 'U'))}
                    </Avatar>
                    <Box sx={{ display: { xs: 'none', sm: 'block' }, textAlign: 'right' }}>
                      <Typography variant="body2" sx={{ fontWeight: 500, color: '#fff' }}>
                        {user.name || user.username || user.email || 'Usuario'}
                      </Typography>
                      {user.email && (
                        <Typography variant="caption" sx={{ color: '#e0e7ef' }}>{user.email}</Typography>
                      )}
                    </Box>
                    <Button color="inherit" onClick={logout} sx={{ ml: 1, fontWeight: 500 }}>
                      {t('common.logout', 'Cerrar sesión')}
                    </Button>
                  </Stack>
                )}
                {/* Solo el selector de idioma en la AppBar */}
                <LanguageSelector />
              </Toolbar>
            </AppBar>
            <Drawer
              variant="permanent"
              sx={{
                width: drawerWidth,
                [`& .MuiDrawer-paper`]: { width: drawerWidth, boxSizing: "border-box" }
              }}
            >
              <Toolbar />
              <List>
                {menuOptions.map((option, idx) => (
                  <ListItem
                    button
                    key={option.text}
                    selected={selected === idx}
                    onClick={() => setSelected(idx)}
                  >
                    <ListItemIcon>{option.icon}</ListItemIcon>
                    <ListItemText primary={option.text} />
                  </ListItem>
                ))}
              </List>
            </Drawer>
            <Box component="main" sx={{ flexGrow: 1, bgcolor: theme.palette.background.default, p: 3, minHeight: "100vh" }}>
              <Toolbar />
              {menuOptions[selected].component}
            </Box>
          </Box>
        } />
      </Routes>
    </ThemeProvider>
  );
}