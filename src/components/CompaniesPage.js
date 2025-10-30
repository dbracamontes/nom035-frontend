import React, { useState } from "react";
import { 
  Box, Button, Container, Typography, Fade, Slide
} from "@mui/material";
import { Add as AddIcon, Business as BusinessIcon } from "@mui/icons-material";
import { useTranslation } from 'react-i18next';
import CompanyList from "./CompanyList";
import CompanyForm from "./CompanyForm";

export default function CompaniesPage() {
  const { t } = useTranslation();
  const [showForm, setShowForm] = useState(false);
  const [editingCompany, setEditingCompany] = useState(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleCreate = () => {
    setEditingCompany(null);
    setShowForm(true);
  };

  const handleEdit = (company) => {
    setEditingCompany(company);
    setShowForm(true);
  };

  const handleSave = () => {
    setShowForm(false);
    setEditingCompany(null);
    setRefreshTrigger(prev => prev + 1);
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingCompany(null);
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
          <BusinessIcon sx={{ fontSize: 40, color: '#6366f1' }} />
          <Typography variant="h4" sx={{ fontWeight: 600, color: '#1e293b' }}>
            {t('companies.title') || 'Gestión de Empresas'}
          </Typography>
        </Box>
        <Typography variant="body1" color="text.secondary">
          Administra las empresas registradas en el sistema. Cada empresa puede tener múltiples empleados y encuestas asignadas.
        </Typography>
      </Box>

      {/* Create Button */}
      {!showForm && (
        <Fade in={!showForm}>
          <Box sx={{ mb: 3 }}>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleCreate}
              size="large"
              sx={{
                backgroundColor: '#6366f1',
                '&:hover': { backgroundColor: '#4f46e5' },
                px: 4
              }}
            >
              Nueva Empresa
            </Button>
          </Box>
        </Fade>
      )}

      {/* Form Section */}
      {showForm && (
        <Slide direction="down" in={showForm} mountOnEnter unmountOnExit>
          <Box sx={{ mb: 4 }}>
            <CompanyForm
              company={editingCompany}
              onSave={handleSave}
              onCancel={handleCancel}
            />
          </Box>
        </Slide>
      )}

      {/* List Section */}
      <Fade in={!showForm} timeout={500}>
        <Box>
          <CompanyList
            onEdit={handleEdit}
            onRefresh={() => setRefreshTrigger(prev => prev + 1)}
            refreshTrigger={refreshTrigger}
          />
        </Box>
      </Fade>
    </Container>
  );
}