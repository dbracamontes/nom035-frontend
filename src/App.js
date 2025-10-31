import React, { useState, useContext } from "react";
import { Box, CssBaseline, Drawer, Toolbar, AppBar, Typography, List, ListItem, ListItemIcon, ListItemText, ThemeProvider } from "@mui/material";
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
import Dashboard from "./components/Dashboard";
import SurveyResults from "./components/SurveyResults";
import SurveyResponsesTable from "./components/SurveyResponsesTable";
import EmployeesPage from "./components/EmployeesPage";
import CompanySurveyPage from "./components/CompanySurveyPage";
import LanguageSelector from "./components/LanguageSelector";
import LoginPage from "./components/LoginPage";
import { useTranslation } from 'react-i18next';
import { UserContext } from "./context/UserContext";
import { Routes, Route, useNavigate, useLocation, Navigate } from "react-router-dom";


const drawerWidth = 220;

export default function App() {
  const { t } = useTranslation();
  const { user, login, loading } = useContext(UserContext);
  const [selected, setSelected] = useState(0);
  const location = useLocation();
  // Opciones de menú
  const menuOptions = [
    { text: t("navigation.landing"), icon: <DashboardIcon />, component: <LandingPage /> },
    { text: t("navigation.dashboard"), icon: <DashboardIcon />, component: <Dashboard /> },
    { text: t("navigation.employees"), icon: <PeopleIcon />, component: <EmployeesPage /> },
    { text: t("navigation.surveys"), icon: <AssignmentIcon />, component: <><SurveyForm /><SurveyList /></> },
    { text: t("navigation.companySurveys"), icon: <BusinessIcon />, component: <CompanySurveyPage /> },
    { text: t("navigation.answerSurvey"), icon: <QuizIcon />, component: <SurveyAnswer /> },
    { text: t("navigation.resultsDashboard"), icon: <AnalyticsIcon />, component: <SurveyResults /> },
    { text: t("navigation.surveyResponses"), icon: <TableChartIcon />, component: <SurveyResponsesTable /> }
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
                  {t("app.title")}
                </Typography>
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