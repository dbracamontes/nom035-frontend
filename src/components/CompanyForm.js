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
    folioMercantil: '',
    cliente: '',
    razonSocial: '',
    representante: '',
    domicilio: '',
    ciudad: '',
    codigoPostal: '',
    telefono: '',
    correoElectronico: '',
    sindicato: ''
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    if (company) {
      setFormData({
        name: company.name || '',
        taxId: company.taxId || '',
        folioMercantil: company.folioMercantil || '',
        cliente: company.cliente || '',
        razonSocial: company.razonSocial || '',
        representante: company.representante || '',
        domicilio: company.domicilio || '',
        ciudad: company.ciudad || '',
        codigoPostal: company.codigoPostal || '',
        telefono: company.telefono || '',
        correoElectronico: company.correoElectronico || '',
        sindicato: company.sindicato || ''
      });
    } else {
      setFormData({
        name: '',
        taxId: '',
        folioMercantil: '',
        cliente: '',
        razonSocial: '',
        representante: '',
        domicilio: '',
        ciudad: '',
        codigoPostal: '',
        telefono: '',
        correoElectronico: '',
        sindicato: ''
      });
    }
    setErrors({});
    setSuccessMessage('');
  }, [company]);

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.name || formData.name.trim() === '') {
      newErrors.name = t('companiesUi.form.nameRequired', 'El nombre de la empresa es obligatorio');
    } else if (formData.name.length > 150) {
      newErrors.name = t('companiesUi.form.nameTooLong', 'El nombre no puede exceder 150 caracteres');
    }

    if (!formData.taxId || formData.taxId.trim() === '') {
      newErrors.taxId = t('companiesUi.form.taxIdRequired', 'El RFC/Tax ID es obligatorio');
    } else if (formData.taxId.length > 20) {
      newErrors.taxId = t('companiesUi.form.taxIdTooLong', 'El RFC/Tax ID no puede exceder 20 caracteres');
    }

    if (!formData.folioMercantil || formData.folioMercantil.trim() === '') {
      newErrors.folioMercantil = t('companiesUi.form.folioRequired', 'El Folio Mercantil es obligatorio');
    } else if (formData.folioMercantil.length > 50) {
      newErrors.folioMercantil = t('companiesUi.form.folioTooLong', 'El Folio Mercantil no puede exceder 50 caracteres');
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
        folioMercantil: formData.folioMercantil.trim(),
        cliente: formData.cliente.trim(),
        razonSocial: formData.razonSocial.trim(),
        representante: formData.representante.trim(),
        domicilio: formData.domicilio.trim(),
        ciudad: formData.ciudad.trim(),
        codigoPostal: formData.codigoPostal.trim(),
        telefono: formData.telefono.trim(),
        correoElectronico: formData.correoElectronico.trim(),
        sindicato: formData.sindicato.trim()
      };

      if (company && company.id) {
        // Update existing company
        await axios.put(`${API_BASE}/companies/${company.id}`, dataToSend);
        setSuccessMessage(t('companiesUi.form.updated', 'Empresa actualizada exitosamente'));
      } else {
        // Create new company
        await axios.post(`${API_BASE}/companies`, dataToSend);
        setSuccessMessage(t('companiesUi.form.created', 'Empresa creada exitosamente'));
      }

      setTimeout(() => {
        if (onSave) onSave();
      }, 1500);

    } catch (error) {
      console.error("Error saving company:", error);
      const errorMessage = error.response?.data?.message || 
                          error.response?.data?.error || 
                          t('companiesUi.form.saveError', 'Error al guardar la empresa');
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
              label={t('companiesUi.form.nameLabel', 'Nombre de la Empresa *')}
              value={formData.name}
              onChange={handleChange('name')}
              error={!!errors.name}
              helperText={errors.name || t('companiesUi.form.nameHelper', 'Nombre completo de la empresa')}
              variant="outlined"
              disabled={loading}
              inputProps={{ maxLength: 150 }}
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              required
              label={t('companiesUi.form.taxIdLabel', 'RFC / Tax ID')}
              value={formData.taxId}
              onChange={handleChange('taxId')}
              error={!!errors.taxId}
              helperText={errors.taxId || t('companiesUi.form.taxIdHelper', 'RFC de la empresa')}
              variant="outlined"
              disabled={loading}
              inputProps={{ maxLength: 20 }}
              placeholder={t('companiesUi.form.taxIdPlaceholder', 'Ej: ABC123456XYZ')}
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              required
              label={t('companiesUi.form.folioLabel', 'Folio Mercantil')}
              value={formData.folioMercantil}
              onChange={handleChange('folioMercantil')}
              error={!!errors.folioMercantil}
              helperText={errors.folioMercantil || t('companiesUi.form.folioHelper', 'Folio mercantil de la empresa')}
              variant="outlined"
              disabled={loading}
              inputProps={{ maxLength: 50 }}
              placeholder={t('companiesUi.form.folioPlaceholder', 'Ej: FM-12345')}
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label={t('companiesUi.form.clientLabel', 'Cliente')}
              value={formData.cliente}
              onChange={handleChange('cliente')}
              error={!!errors.cliente}
              helperText={errors.cliente || t('companiesUi.form.clientHelper', 'Cliente asociado a la empresa')}
              variant="outlined"
              disabled={loading}
              inputProps={{ maxLength: 150 }}
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label={t('companiesUi.form.legalNameLabel', 'Razón Social')}
              value={formData.razonSocial}
              onChange={handleChange('razonSocial')}
              error={!!errors.razonSocial}
              helperText={errors.razonSocial || t('companiesUi.form.legalNameHelper', 'Razón social de la empresa')}
              variant="outlined"
              disabled={loading}
              inputProps={{ maxLength: 150 }}
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label={t('companiesUi.form.representativeLabel', 'Representante de la empresa')}
              value={formData.representante}
              onChange={handleChange('representante')}
              error={!!errors.representante}
              helperText={errors.representante || t('companiesUi.form.representativeHelper', 'Nombre del representante legal o contacto')}
              variant="outlined"
              disabled={loading}
              inputProps={{ maxLength: 150 }}
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label={t('companiesUi.form.unionLabel', 'Sindicato')}
              value={formData.sindicato}
              onChange={handleChange('sindicato')}
              error={!!errors.sindicato}
              helperText={errors.sindicato || t('companiesUi.form.unionHelper', 'Sindicato de la empresa (si aplica)')}
              variant="outlined"
              disabled={loading}
              inputProps={{ maxLength: 150 }}
            />
          </Grid>

          <Grid item xs={12}>
            <TextField
              fullWidth
              label={t('companiesUi.form.addressLabel', 'Domicilio')}
              value={formData.domicilio}
              onChange={handleChange('domicilio')}
              error={!!errors.domicilio}
              helperText={errors.domicilio || t('companiesUi.form.addressHelper', 'Domicilio fiscal o comercial de la empresa')}
              variant="outlined"
              disabled={loading}
              inputProps={{ maxLength: 255 }}
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label={t('companiesUi.form.cityLabel', 'Ciudad')}
              value={formData.ciudad}
              onChange={handleChange('ciudad')}
              disabled={loading}
              inputProps={{ maxLength: 100 }}
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label={t('companiesUi.form.postalCodeLabel', 'Código Postal')}
              value={formData.codigoPostal}
              onChange={handleChange('codigoPostal')}
              disabled={loading}
              inputProps={{ maxLength: 20 }}
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label={t('companiesUi.form.phoneLabel', 'Teléfono')}
              type="tel"
              value={formData.telefono}
              onChange={handleChange('telefono')}
              disabled={loading}
              inputProps={{ maxLength: 30 }}
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label={t('companiesUi.form.emailLabel', 'Correo Electrónico')}
              type="email"
              value={formData.correoElectronico}
              onChange={handleChange('correoElectronico')}
              disabled={loading}
              inputProps={{ maxLength: 254 }}
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
                helperText={t('companiesUi.form.idHelper', 'ID de la empresa (no editable)')}
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
            {t('common.cancel', 'Cancelar')}
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
            {loading ? t('companiesUi.form.saving', 'Guardando...') : (company && company.id ? t('companiesUi.form.update', 'Actualizar') : t('companiesUi.form.create', 'Crear Empresa'))}
          </Button>
        </Box>
      </form>
    </Paper>
  );
}