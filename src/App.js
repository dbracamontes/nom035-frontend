import React, { useState, useContext, useEffect } from "react";
import { Box, CssBaseline, Drawer, Toolbar, AppBar, Typography, List, ListItemIcon, ListItemText, ThemeProvider, IconButton, Button, Avatar, Stack, ListSubheader, Collapse, ListItemButton } from "@mui/material";
import ExpandLess from '@mui/icons-material/ExpandLess';
import ExpandMore from '@mui/icons-material/ExpandMore';
import theme from "./theme";
import DashboardIcon from '@mui/icons-material/Dashboard';
import PeopleIcon from '@mui/icons-material/People';
import AssignmentIcon from '@mui/icons-material/Assignment';
import QuizIcon from '@mui/icons-material/Quiz';
import TableChartIcon from '@mui/icons-material/TableChart';
import BusinessIcon from '@mui/icons-material/Business';
import AnalyticsIcon from '@mui/icons-material/Analytics';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import DescriptionIcon from '@mui/icons-material/Description';
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
import UserRoleManagement from "./components/UserRoleManagement";
import LanguageSelector from "./components/LanguageSelector";
import LoginPage from "./components/LoginPage";
import MedicaLebenCompaniesPage from "./components/MedicaLebenCompaniesPage";
import MedicaLebenReportPage from './components/MedicaLebenReportPage';
import DocumentInterpretationPage from "./components/DocumentInterpretationPage";
import DocumentCreationPage from "./components/DocumentCreationPage";
import ContractGenerationPage from "./components/ContractGenerationPage";
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
  const [openNom035, setOpenNom035] = useState(true);
  const [openMedicaLeben, setOpenMedicaLeben] = useState(false);
  const [activeSection, setActiveSection] = useState('nom035'); // 'nom035' | 'medicaLeben'
  const [selectedMedicaLeben, setSelectedMedicaLeben] = useState('ml-companies');
  const [mlReset, setMlReset] = useState(0); // nuevo trigger para resetear vista ML
  const location = useLocation();
  // Función para verificar si el usuario tiene un rol específico
  const hasRole = (roleName) => {
    if (!user || !user.roles) return false;
    return user.roles.some(role => role.authority === roleName);
  };

  // Opciones de menú completas agrupadas por categorías
  const allMenuGroups = [
    {
      id: 'main',
      label: t('navigation.section.main', 'Principal'),
      items: [
        { text: t("navigation.dashboard"), icon: <DashboardIcon />, component: <Dashboard />, roles: ['ROLE_ADMIN', 'ROLE_COMPANY'] },
      ],
    },
    {
      id: 'management',
      label: t('navigation.section.management', 'Gestión'),
      items: [
        { text: t("navigation.companies"), icon: <BusinessIcon />, component: <CompaniesPage />, roles: ['ROLE_ADMIN'] },
        { text: t("navigation.employees"), icon: <PeopleIcon />, component: <EmployeesPage />, roles: ['ROLE_ADMIN', 'ROLE_COMPANY'] },
        { text: t("navigation.rolesPrivileges"), icon: <AdminPanelSettingsIcon />, component: <UserRoleManagement />, roles: ['ROLE_ADMIN'] },
      ],
    },
    {
      id: 'surveys',
      label: t('navigation.section.surveys', 'Encuestas'),
      items: [
        { text: t("navigation.surveys"), icon: <AssignmentIcon />, component: <><SurveyForm /><SurveyList /></>, roles: ['ROLE_ADMIN'] },
        { text: t("navigation.companySurveys"), icon: <BusinessIcon />, component: <CompanySurveyPage />, roles: ['ROLE_ADMIN'] },
        { text: t("navigation.answerSurvey"), icon: <QuizIcon />, component: <EmployeeSurveyAnswer />, roles: ['ROLE_EMPLOYEE'] },
      ],
    },
    {
      id: 'reports',
      label: t('navigation.section.reports', 'Resultados y reportes'),
      items: [
        { text: t("navigation.resultsDashboard"), icon: <AnalyticsIcon />, component: <SurveyResults />, roles: ['ROLE_ADMIN', 'ROLE_COMPANY'] },
        { text: t("navigation.surveyResponses"), icon: <TableChartIcon />, component: <SurveyResponsesTable />, roles: ['ROLE_ADMIN', 'ROLE_COMPANY'] },
      ],
    },
    {
      id: 'docgen',
      label: t('navigation.section.docgen', 'Generar Documentos'),
      items: [
        { text: 'Interpretación de Documento', icon: <DescriptionIcon />, component: <DocumentInterpretationPage />, roles: ['ROLE_ADMIN', 'ROLE_COMPANY'] },
        { text: 'Crear Documento', icon: <DescriptionIcon />, component: <DocumentCreationPage />, roles: ['ROLE_ADMIN', 'ROLE_COMPANY'] },
        { text: 'Genera Contrato', icon: <DescriptionIcon />, component: <ContractGenerationPage />, roles: ['ROLE_ADMIN', 'ROLE_COMPANY'] },
      ],
    },
  ];

  // Filtrar grupos de menú según el rol del usuario
  const filteredGroups = (user ? allMenuGroups.map(group => ({
    ...group,
    items: group.items.filter(option => option.roles.some(role => hasRole(role)))
  })).filter(group => group.items.length > 0) : allMenuGroups);

  // Aplanar los items filtrados para mantener el manejo por índice
  const flatMenuOptions = filteredGroups.flatMap(group => group.items);

  // Asegurar que el índice seleccionado es válido tras filtrar
  useEffect(() => {
    if (selected >= flatMenuOptions.length) {
      setSelected(0);
    }
  }, [flatMenuOptions.length, selected]);

  // Opciones del submenú Medica LEBEN (índices virtuales independientes del menú NOM-035)
  const medicaLebenOptions = [
    {
      id: 'ml-companies',
      label: 'Gestión de Empresas Médica LEBEN',
      component: <MedicaLebenCompaniesPage resetTrigger={mlReset} />, // pasar trigger
      roles: ['ROLE_ADMIN', 'ROLE_GENERADOR', 'ROLE_COTIZADOR'],
    },
  ];

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
                  Plataforma de Encuestas
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
                {/* NOM-035 main menu */}
                <ListItemButton onClick={() => setOpenNom035(prev => !prev)}>
                  <ListItemText primary="Encuestas" />
                  {openNom035 ? <ExpandLess /> : <ExpandMore />}
                </ListItemButton>
                <Collapse in={openNom035} timeout="auto" unmountOnExit>
                  <List component="div" disablePadding>
                    {filteredGroups.map(group => (
                      <React.Fragment key={group.id}>
                        <ListSubheader component="div">
                          {group.label}
                        </ListSubheader>
                        {group.items.map(option => {
                          const idx = flatMenuOptions.indexOf(option);
                          return (
                            <ListItemButton
                              key={option.text}
                              selected={activeSection === 'nom035' && selected === idx}
                              onClick={() => {
                                setSelected(idx);
                                setActiveSection('nom035');
                              }}
                              sx={{ pl: 4 }}
                            >
                              <ListItemIcon>{option.icon}</ListItemIcon>
                              <ListItemText primary={option.text} />
                            </ListItemButton>
                          );
                        })}
                      </React.Fragment>
                    ))}
                  </List>
                </Collapse>

                {/* Medica LEBEN menu */}
                {(!user || hasRole('ROLE_ADMIN') || hasRole('ROLE_GENERADOR') || hasRole('ROLE_COTIZADOR')) && (
                  <>
                    <ListItemButton onClick={() => setOpenMedicaLeben(prev => !prev)}>
                      <ListItemText primary="Medica LEBEN" />
                      {openMedicaLeben ? <ExpandLess /> : <ExpandMore />}
                    </ListItemButton>
                    <Collapse in={openMedicaLeben} timeout="auto" unmountOnExit>
                      <List component="div" disablePadding>
                        {medicaLebenOptions
                          .filter(opt => !user || opt.roles.some(r => hasRole(r)))
                          .map(opt => (
                            <ListItemButton
                              key={opt.id}
                              selected={activeSection === 'medicaLeben' && selectedMedicaLeben === opt.id}
                              onClick={() => {
                                setSelectedMedicaLeben(opt.id);
                                setActiveSection('medicaLeben');
                                // forzar modo 'list' en la página ML si ya estaba abierta
                                setMlReset(prev => prev + 1);
                              }}
                              sx={{ pl: 4 }}
                            >
                              <ListItemText primary={opt.label} />
                            </ListItemButton>
                          ))}
                      </List>
                    </Collapse>
                  </>
                )}
              </List>
            </Drawer>
            <Box component="main" sx={{ flexGrow: 1, bgcolor: theme.palette.background.default, p: 3, minHeight: "100vh" }}>
              <Toolbar />
              {activeSection === 'medicaLeben'
                ? medicaLebenOptions.find(o => o.id === selectedMedicaLeben)?.component
                : flatMenuOptions[selected] && flatMenuOptions[selected].component}
            </Box>
          </Box>
        } />
        <Route path="/medica-leben-report/:applicationId" element={<MedicaLebenReportPage />} />
      </Routes>
    </ThemeProvider>
  );
}