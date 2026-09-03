import React, { useState, useEffect } from "react";
import { 
  Box, Button, TextField, Paper, Typography, Grid,
  Alert
} from "@mui/material";
import { Save as SaveIcon, Cancel as CancelIcon } from "@mui/icons-material";
import { useTranslation } from 'react-i18next';
import axios from 'axios';

const API_BASE = `${process.env.REACT_APP_API_URL || 'http://localhost:8080'}/api`;

export default function CompanyForm({ company, onSave, onCancel, onOpenDocs }) {
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    name: '',
    taxId: '',
    folioMercantil: ''
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    if (company) {
      setFormData({
        name: company.name || '',
        taxId: company.taxId || '',
        folioMercantil: company.folioMercantil || ''
      });
    } else {
      setFormData({
        name: '',
        taxId: '',
        folioMercantil: ''
      });
    }
    setErrors({});
    setSuccessMessage('');
  }, [company]);

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.name || formData.name.trim() === '') {
      newErrors.name = 'El nombre de la empresa es obligatorio';
    } else if (formData.name.length > 150) {
      newErrors.name = 'El nombre no puede exceder 150 caracteres';
    }

    if (!formData.taxId || formData.taxId.trim() === '') {
      newErrors.taxId = 'El RFC/Tax ID es obligatorio';
    } else if (formData.taxId.length > 20) {
      newErrors.taxId = 'El RFC/Tax ID no puede exceder 20 caracteres';
    }

    if (!formData.folioMercantil || formData.folioMercantil.trim() === '') {
      newErrors.folioMercantil = 'El Folio Mercantil es obligatorio';
    } else if (formData.folioMercantil.length > 50) {
      newErrors.folioMercantil = 'El Folio Mercantil no puede exceder 50 caracteres';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    setSuccessMessage('');

    try {
      const dataToSend = {
        name: formData.name.trim(),
        taxId: formData.taxId.trim(),
        folioMercantil: formData.folioMercantil.trim()
      };

      if (company && company.id) {
        // Update existing company
        await axios.put(`${API_BASE}/companies/${company.id}`, dataToSend);
        setSuccessMessage('Empresa actualizada exitosamente');
      } else {
        // Create new company
        await axios.post(`${API_BASE}/companies`, dataToSend);
        setSuccessMessage('Empresa creada exitosamente');
      }

      setTimeout(() => {
        if (onSave) onSave();
      }, 1500);

    } catch (error) {
      console.error("Error saving company:", error);
      const errorMessage = error.response?.data?.message || 
                          error.response?.data?.error || 
                          'Error al guardar la empresa';
      setErrors({ submit: errorMessage });
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field) => (e) => {
    setFormData({
      ...formData,
      [field]: e.target.value
    });
    // Clear error for this field when user starts typing
    if (errors[field]) {
      setErrors({
        ...errors,
        [field]: undefined
      });
    }
  };

  return (
    <Paper sx={{ p: 3, boxShadow: 2 }}>
      <Typography variant="h5" sx={{ mb: 3, fontWeight: 600 }}>
        {company && company.id 
          ? t('companies.form.editTitle') || 'Editar Empresa'
          : t('companies.form.createTitle') || 'Crear Nueva Empresa'
        }
      </Typography>

      {successMessage && (
        <Alert severity="success" sx={{ mb: 3 }}>
          {successMessage}
        </Alert>
      )}

      {errors.submit && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {errors.submit}
        </Alert>
      )}

      <form onSubmit={handleSubmit}>
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Nombre de la Empresa *"
              value={formData.name}
              onChange={handleChange('name')}
              error={!!errors.name}
              helperText={errors.name || 'Nombre completo de la empresa'}
              variant="outlined"
              disabled={loading}
              inputProps={{ maxLength: 150 }}
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              required
              label="RFC / Tax ID"
              value={formData.taxId}
              onChange={handleChange('taxId')}
              error={!!errors.taxId}
              helperText={errors.taxId || 'RFC de la empresa'}
              variant="outlined"
              disabled={loading}
              inputProps={{ maxLength: 20 }}
              placeholder="Ej: ABC123456XYZ"
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              required
              label="Folio Mercantil"
              value={formData.folioMercantil}
              onChange={handleChange('folioMercantil')}
              error={!!errors.folioMercantil}
              helperText={errors.folioMercantil || 'Folio mercantil de la empresa'}
              variant="outlined"
              disabled={loading}
              inputProps={{ maxLength: 50 }}
              placeholder="Ej: FM-12345"
            />
          </Grid>

          {company && company.id && (
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="ID"
                value={company.id}
                variant="outlined"
                disabled
                helperText="ID de la empresa (no editable)"
              />
            </Grid>
          )}
        </Grid>

        <Box sx={{ mt: 4, display: 'flex', gap: 2, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
          <Button
            variant="outlined"
            startIcon={<CancelIcon />}
            onClick={onCancel}
            disabled={loading}
            size="large"
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            variant="contained"
            startIcon={<SaveIcon />}
            disabled={loading}
            size="large"
            sx={{
              backgroundColor: '#6366f1',
              '&:hover': { backgroundColor: '#4f46e5' }
            }}
          >
            {loading ? 'Guardando...' : (company && company.id ? 'Actualizar' : 'Crear Empresa')}
          </Button>
        </Box>
      </form>
    </Paper>
  );
}