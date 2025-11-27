import React, { useState } from "react";
import { Box, Button, Container, Typography, Fade, Slide } from "@mui/material";
import { Add as AddIcon, Business as BusinessIcon } from "@mui/icons-material";
import CompanyList from "./CompanyList";
import CompanyForm from "./CompanyForm";
import MedicaLebenCompanyForm from "./MedicaLebenCompanyForm";

export default function MedicaLebenCompaniesPage() {
  const [mode, setMode] = useState('list'); // 'list' | 'create' | 'docs'
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleCreateCompany = () => {
    setSelectedCompany(null);
    setMode('create');
  };

  const handleCompanyCreatedOrUpdated = () => {
    setMode('list');
    setSelectedCompany(null);
    setRefreshTrigger(prev => prev + 1);
  };

  const handleCancelCompanyForm = () => {
    setMode('list');
    setSelectedCompany(null);
  };

  const handleSelectCompanyForDocs = (company) => {
    setSelectedCompany(company);
    setMode('docs');
  };

  const handleCloseDocsForm = () => {
    setMode('list');
    setSelectedCompany(null);
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
          <BusinessIcon sx={{ fontSize: 40, color: '#059669' }} />
          <Typography variant="h4" sx={{ fontWeight: 600, color: '#1e293b' }}>
            Gestión de Empresas - Médica LEBEN
          </Typography>
        </Box>
        <Typography variant="body1" color="text.secondary">
          Crea nuevas empresas o selecciona una existente para capturar la documentación requerida por Médica LEBEN.
        </Typography>
      </Box>

      {/* Botón crear empresa (solo cuando estamos en la lista) */}
      {mode === 'list' && (
        <Fade in={mode === 'list'}>
          <Box sx={{ mb: 3 }}>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleCreateCompany}
              size="large"
              sx={{
                backgroundColor: '#059669',
                '&:hover': { backgroundColor: '#047857' },
                px: 4,
                mb: 1,
              }}
            >
              Nueva Empresa (Médica LEBEN)
            </Button>
            <Typography variant="caption" color="text.secondary" display="block">
              Paso 1: crea o selecciona una empresa. Paso 2: carga su documentación.
            </Typography>
          </Box>
        </Fade>
      )}

      {/* Formulario de creación/edición de empresa (reutiliza CompanyForm) */}
      {mode === 'create' && (
        <Slide direction="down" in={mode === 'create'} mountOnEnter unmountOnExit>
          <Box sx={{ mb: 4 }}>
            <CompanyForm
              company={selectedCompany}
              onSave={handleCompanyCreatedOrUpdated}
              onCancel={handleCancelCompanyForm}
            />
          </Box>
        </Slide>
      )}

      {/* Formulario de documentos Médica LEBEN */}
      {mode === 'docs' && selectedCompany && (
        <Slide direction="down" in={mode === 'docs'} mountOnEnter unmountOnExit>
          <Box sx={{ mb: 4 }}>
            <MedicaLebenCompanyForm
              company={selectedCompany}
              onClose={handleCloseDocsForm}
            />
          </Box>
        </Slide>
      )}

      {/* Lista de empresas (siempre visible cuando estamos en modo lista) */}
      <Fade in={mode === 'list'} timeout={500}>
        <Box>
          <CompanyList
            onEdit={handleSelectCompanyForDocs}
            onRefresh={() => setRefreshTrigger(prev => prev + 1)}
            refreshTrigger={refreshTrigger}
          />
        </Box>
      </Fade>
    </Container>
  );
}