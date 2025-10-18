import React, { useState } from "react";
import { Box, Tab, Tabs, Typography } from "@mui/material";
import CompanySurveyForm from "./CompanySurveyForm";
import CompanySurveyList from "./CompanySurveyList";
import { useTranslation } from 'react-i18next';

function TabPanel({ children, value, index, ...other }) {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

export default function CompanySurveyPage() {
  const { t } = useTranslation();
  const [tabValue, setTabValue] = useState(0);
  const [refreshFlag, setRefreshFlag] = useState(0);

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const handleSurveyCreated = () => {
    setRefreshFlag(prev => prev + 1);
    // Cambiar a la pestaña de lista después de crear
    setTabValue(1);
  };

  return (
    <Box sx={{ width: '100%' }}>
      <Typography variant="h4" gutterBottom>
        Gestión de Encuestas de Empresa
      </Typography>
      
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={tabValue} onChange={handleTabChange} aria-label="company survey tabs">
          <Tab label="Crear Nueva Encuesta" />
          <Tab label="Encuestas Creadas" />
        </Tabs>
      </Box>
      
      <TabPanel value={tabValue} index={0}>
        <CompanySurveyForm onCreated={handleSurveyCreated} />
      </TabPanel>
      
      <TabPanel value={tabValue} index={1}>
        <CompanySurveyList refreshFlag={refreshFlag} />
      </TabPanel>
    </Box>
  );
}