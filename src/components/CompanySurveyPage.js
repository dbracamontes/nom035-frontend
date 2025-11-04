import React, { useState } from "react";
import { Box, Tab, Tabs, Typography, Snackbar, Alert } from "@mui/material";
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
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

export default function CompanySurveyPage() {
  const [successOpen, setSuccessOpen] = useState(false);
  const { t } = useTranslation();
  const [tabValue, setTabValue] = useState(0);
  const [refreshFlag, setRefreshFlag] = useState(0);

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const handleSurveyCreated = () => {
    setRefreshFlag(prev => prev + 1);
    setSuccessOpen(true);
    // Esperar 1800ms antes de cambiar de pestaña para mostrar el mensaje
    setTimeout(() => {
      setTabValue(1);
    }, 1800);
  };

  return (
    <Box sx={{ 
      width: '100%',
      background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
      minHeight: '100vh',
      p: 3
    }}>
      <Typography 
        variant="h3" 
        gutterBottom
        sx={{
          fontWeight: 700,
          color: '#1e293b',
          mb: 4,
          textAlign: 'center'
        }}
      >
        Gestión de Encuestas de Empresa
      </Typography>
      
      <Box sx={{ 
        background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
        borderRadius: 3,
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
        border: '1px solid rgba(255, 255, 255, 0.2)',
        overflow: 'hidden'
      }}>
        <Box sx={{ 
          borderBottom: '1px solid rgba(99, 102, 241, 0.1)',
          background: 'linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%)'
        }}>
          <Tabs 
            value={tabValue} 
            onChange={handleTabChange} 
            aria-label="company survey tabs"
            sx={{
              '& .MuiTab-root': {
                fontWeight: 600,
                fontSize: '1rem',
                py: 3,
                px: 4,
                '&.Mui-selected': {
                  background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                  color: 'white',
                  borderRadius: '8px 8px 0 0'
                },
                '&:not(.Mui-selected)': {
                  color: '#64748b',
                  '&:hover': {
                    background: 'rgba(99, 102, 241, 0.1)',
                    color: '#6366f1'
                  }
                }
              },
              '& .MuiTabs-indicator': {
                display: 'none'
              }
            }}
          >
            <Tab label="Crear Nueva Encuesta" />
            <Tab label="Encuestas Creadas" />
          </Tabs>
        </Box>
      
        <TabPanel value={tabValue} index={0}>
          <CompanySurveyForm onCreated={handleSurveyCreated} />
  <Snackbar open={successOpen} autoHideDuration={5000} onClose={() => setSuccessOpen(false)} anchorOrigin={{ vertical: 'top', horizontal: 'center' }}>
        <Alert onClose={() => setSuccessOpen(false)} severity="success" sx={{ width: '100%' }}>
          {t("companySurvey.form.success", "Encuesta de empresa creada exitosamente")}
        </Alert>
      </Snackbar>
        </TabPanel>
        
        <TabPanel value={tabValue} index={1}>
          <CompanySurveyList refreshFlag={refreshFlag} />
        </TabPanel>
      </Box>
    </Box>
  );
}