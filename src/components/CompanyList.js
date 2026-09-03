import React, { useState, useEffect } from "react";
import { 
  Box, Button, Table, TableBody, TableCell, TableContainer, 
  TableHead, TableRow, Paper, IconButton, Typography, 
  Dialog, DialogTitle, DialogContent, DialogActions, Chip,
  TextField, Tooltip
} from "@mui/material";
import { Edit as EditIcon, Delete as DeleteIcon } from "@mui/icons-material";
import { useTranslation } from 'react-i18next';
import axios from 'axios';

const API_BASE = `${process.env.REACT_APP_API_URL || 'http://localhost:8080'}/api`;

export default function CompanyList({ onEdit, onOpenCompanyDocs, onRefresh, refreshTrigger, enableMedicaLebenHighlight = false }) {
  const { t } = useTranslation();
  const [companies, setCompanies] = useState([]);
  const [deleteDialog, setDeleteDialog] = useState({ open: false, company: null });
  const [loading, setLoading] = useState(false);
  const [nameFilter, setNameFilter] = useState("");
  const [rfcFilter, setRfcFilter] = useState("");

  useEffect(() => {
    loadCompanies();
  }, [refreshTrigger]);

  const loadCompanies = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_BASE}/companies`);
      setCompanies(response.data || []);
    } catch (error) {
      console.error("Error loading companies:", error);
      setCompanies([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteDialog.company) return;
    
    try {
      await axios.delete(`${API_BASE}/companies/${deleteDialog.company.id}`);
      setDeleteDialog({ open: false, company: null });
      loadCompanies();
      if (onRefresh) onRefresh();
    } catch (error) {
      console.error("Error deleting company:", error);
      alert("Error al eliminar la empresa. Es posible que tenga empleados asociados.");
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('es-MX', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
      });
    } catch (e) {
      return dateStr;
    }
  };

  const hasMissingMedicaLebenDocs = (company) => {
    if (!enableMedicaLebenHighlight) return false;
    if (typeof company.hasMedicaLebenDocs === 'boolean') {
      return company.hasMedicaLebenDocs === false;
    }
    return false;
  };

  const filteredCompanies = companies.filter((company) => {
    const nameMatch = company.name
      ? company.name.toLowerCase().includes(nameFilter.toLowerCase())
      : false;
    const rfcValue = company.taxId || company.tax_id || "";
    const rfcMatch = rfcValue
      .toLowerCase()
      .includes(rfcFilter.toLowerCase());

    return (
      (!nameFilter || nameMatch) &&
      (!rfcFilter || rfcMatch)
    );
  });

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h5" sx={{ fontWeight: 600 }}>
          {t('companies.list.title') || 'Lista de Empresas'}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Total: {companies.length} empresas
        </Typography>
      </Box>

      {/* Filtros de búsqueda */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
        <TextField
          label="Filtrar por nombre"
          size="small"
          variant="outlined"
          value={nameFilter}
          onChange={(e) => setNameFilter(e.target.value)}
        />
        <TextField
          label="Filtrar por RFC / Tax ID"
          size="small"
          variant="outlined"
          value={rfcFilter}
          onChange={(e) => setRfcFilter(e.target.value)}
        />
      </Box>

      <TableContainer component={Paper} sx={{ boxShadow: 2 }}>
        <Table>
          {/* ...existing table head... */}
          <TableHead sx={{ backgroundColor: '#f5f5f5' }}>
            <TableRow>
              <TableCell sx={{ fontWeight: 'bold' }}>ID</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Nombre</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>RFC / Tax ID</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Fecha de Creación</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }} align="center">Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                  Cargando empresas...
                </TableCell>
              </TableRow>
            ) : filteredCompanies.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                  <Typography variant="body2" color="text.secondary">
                    {companies.length === 0
                      ? 'No hay empresas registradas. Crea una nueva empresa para comenzar.'
                      : 'No se encontraron empresas que coincidan con los filtros.'}
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              filteredCompanies.map((company) => {
                const missingDocs = hasMissingMedicaLebenDocs(company);
                const row = (
                  <TableRow 
                    key={company.id}
                    sx={{ 
                      '&:hover': { backgroundColor: missingDocs ? '#fee2e2' : '#f9f9f9' },
                      transition: 'background-color 0.2s',
                      backgroundColor: missingDocs ? '#fee2e2' : 'inherit'
                    }}
                  >
                    <TableCell>
                      <Chip 
                        label={company.id} 
                        size="small" 
                        color={missingDocs ? "error" : "primary"} 
                        variant="outlined" 
                      />
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="body1" sx={{ fontWeight: 500 }}>
                          {company.name}
                        </Typography>
                        {missingDocs && (
                          <Chip
                            label="Docs Médica LEBEN faltantes"
                            color="error"
                            size="small"
                            variant="outlined"
                          />
                        )}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {company.taxId || company.tax_id || '-'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {formatDate(company.createdAt)}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <IconButton 
                        color={missingDocs ? "error" : "primary"}
                        onClick={() => onEdit(company)}
                        size="small"
                        sx={{ mr: 1 }}
                      >
                        <EditIcon />
                      </IconButton>
                      <IconButton 
                        color="error" 
                        onClick={() => setDeleteDialog({ open: true, company })}
                        size="small"
                      >
                        <DeleteIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                );

                return missingDocs ? (
                  <Tooltip
                    key={company.id}
                    title="Documentación Médica LEBEN faltante. Haz clic en el ícono de edición para capturarla."
                    arrow
                    placement="top"
                  >
                    {row}
                  </Tooltip>
                ) : (
                  row
                );
              })
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Delete Confirmation Dialog */}
      <Dialog 
        open={deleteDialog.open} 
        onClose={() => setDeleteDialog({ open: false, company: null })}
      >
        <DialogTitle>Confirmar Eliminación</DialogTitle>
        <DialogContent>
          <Typography>
            ¿Está seguro que desea eliminar la empresa <strong>{deleteDialog.company?.name}</strong>?
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            Esta acción no se puede deshacer. Si la empresa tiene empleados o encuestas asociadas, 
            la eliminación podría fallar.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialog({ open: false, company: null })}>
            Cancelar
          </Button>
          <Button onClick={handleDelete} color="error" variant="contained">
            Eliminar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}