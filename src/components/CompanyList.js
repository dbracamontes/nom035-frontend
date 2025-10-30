import React, { useState, useEffect } from "react";
import { 
  Box, Button, Table, TableBody, TableCell, TableContainer, 
  TableHead, TableRow, Paper, IconButton, Typography, 
  Dialog, DialogTitle, DialogContent, DialogActions, Chip
} from "@mui/material";
import { Edit as EditIcon, Delete as DeleteIcon } from "@mui/icons-material";
import { useTranslation } from 'react-i18next';
import axios from 'axios';

const API_BASE = "http://localhost:8080/api";

export default function CompanyList({ onEdit, onRefresh, refreshTrigger }) {
  const { t } = useTranslation();
  const [companies, setCompanies] = useState([]);
  const [deleteDialog, setDeleteDialog] = useState({ open: false, company: null });
  const [loading, setLoading] = useState(false);

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

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: 600 }}>
          {t('companies.list.title') || 'Lista de Empresas'}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Total: {companies.length} empresas
        </Typography>
      </Box>

      <TableContainer component={Paper} sx={{ boxShadow: 2 }}>
        <Table>
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
                <TableCell colSpan={5} align="center" sx={{ py: 4 }}>
                  Cargando empresas...
                </TableCell>
              </TableRow>
            ) : companies.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} align="center" sx={{ py: 4 }}>
                  <Typography variant="body2" color="text.secondary">
                    No hay empresas registradas. Crea una nueva empresa para comenzar.
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              companies.map((company) => (
                <TableRow 
                  key={company.id}
                  sx={{ 
                    '&:hover': { backgroundColor: '#f9f9f9' },
                    transition: 'background-color 0.2s'
                  }}
                >
                  <TableCell>
                    <Chip 
                      label={company.id} 
                      size="small" 
                      color="primary" 
                      variant="outlined" 
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body1" sx={{ fontWeight: 500 }}>
                      {company.name}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">
                      {company.taxId || '-'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">
                      {formatDate(company.createdAt)}
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    <IconButton 
                      color="primary" 
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
              ))
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