
import React, { useState } from "react";
import { Box, CssBaseline, Drawer, Toolbar, AppBar, Typography, List, ListItem, ListItemIcon, ListItemText } from "@mui/material";
import DashboardIcon from '@mui/icons-material/Dashboard';
import PeopleIcon from '@mui/icons-material/People';
import AssignmentIcon from '@mui/icons-material/Assignment';
import QuizIcon from '@mui/icons-material/Quiz';
import TableChartIcon from '@mui/icons-material/TableChart';
import LandingPage from "./components/LandingPage";
import EmployeeForm from "./components/EmployeeForm";
import EmployeeList from "./components/EmployeeList";
import SurveyForm from "./components/SurveyForm";
import SurveyList from "./components/SurveyList";
import SurveyAnswer from "./components/SurveyAnswer";
import Dashboard from "./components/Dashboard";
import SurveyResponsesTable from "./components/SurveyResponsesTable";

const drawerWidth = 220;

const menuOptions = [
  { text: "Landing", icon: <DashboardIcon />, component: <LandingPage /> },
  { text: "Dashboard", icon: <DashboardIcon />, component: <Dashboard /> },
  { text: "Employees", icon: <PeopleIcon />, component: <><EmployeeForm /><EmployeeList /></> },
  { text: "Surveys", icon: <AssignmentIcon />, component: <><SurveyForm /><SurveyList /></> },
  { text: "Answer Survey", icon: <QuizIcon />, component: <SurveyAnswer /> },
  { text: "Survey Responses", icon: <TableChartIcon />, component: <SurveyResponsesTable /> }
];

export default function App() {
  const [selected, setSelected] = useState(0);

  return (
    <Box sx={{ display: "flex" }}>
      <CssBaseline />
      <AppBar position="fixed" sx={{ zIndex: 1201 }}>
        <Toolbar>
          <Typography variant="h6" noWrap component="div">NOM-035 Survey Platform</Typography>
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
      <Box component="main" sx={{ flexGrow: 1, bgcolor: "#f5f5f5", p: 3, minHeight: "100vh" }}>
        <Toolbar />
        {menuOptions[selected].component}
      </Box>
    </Box>
  );
}