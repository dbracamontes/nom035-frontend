import React, { useEffect, useState, useRef, useCallback } from "react";
import { getEmployees, getEmployeesByCompany, getCompanies, deleteEmployee } from "../api/nom035";
import EmployeeForm from "./EmployeeForm";
import { Paper, Typography, List, ListItem, ListItemText, IconButton, MenuItem, TextField, Stack, Dialog, DialogTitle, DialogContent, DialogActions, Button, Snackbar, Alert } from "@mui/material";
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import { useTranslation } from 'react-i18next';

export default function EmployeeList({ refreshFlag }) {
  const { t } = useTranslation();
  const [employees, setEmployees] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [error, setError] = useState(null);
  const [selectedCompany, setSelectedCompany] = useState("");
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [successOpen, setSuccessOpen] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const formRef = useRef();
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [employeeToDelete, setEmployeeToDelete] = useState(null);

  useEffect(() => {
    setError(null);
    getCompanies()
      .then(res => setCompanies(res.data))
      .catch(err => {
        console.error('Error fetching companies:', err);
        setCompanies([]);
        setError(t('employee.list.errorFetchCompanies') || 'No se pudieron cargar las empresas.');
      });
  }, [t]);

  const fetchEmployees = useCallback(() => {
    setError(null);
    if (selectedCompany) {
      getEmployeesByCompany(selectedCompany)
        .then(res => setEmployees(res.data))
        .catch(err => {
          console.error('Error fetching employees by company:', err);
          setEmployees([]);
          setError(t('employee.list.errorFetchEmployees') || 'No se pudieron cargar los empleados.');
        });
    } else {
      getEmployees()
        .then(res => setEmployees(res.data))
        .catch(err => {
          console.error('Error fetching employees:', err);
          setEmployees([]);
          setError(t('employee.list.errorFetchEmployees') || 'No se pudieron cargar los empleados.');
        });
    }
  }, [selectedCompany, t]);

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees, refreshFlag]);

  const handleDelete = async () => {
    if (!employeeToDelete) return;
    setError(null);
    try {
      await deleteEmployee(employeeToDelete);
      fetchEmployees();
      setSuccessMsg(t('employee.list.successDelete', 'Empleado eliminado exitosamente'));
      setSuccessOpen(true);
    } catch (err) {
      console.error('Error deleting employee:', err);
      setError(t('employee.list.errorDelete') || 'Error al eliminar el empleado.');
    }
    setConfirmDeleteOpen(false);
    setEmployeeToDelete(null);
  };

  const handleDeleteClick = (id) => {
    setEmployeeToDelete(id);
    setConfirmDeleteOpen(true);
  };

  const handleCancelDelete = () => {
    setConfirmDeleteOpen(false);
    setEmployeeToDelete(null);
  };

  const handleEdit = (employee) => {
    setEditingEmployee(employee);
    setDialogOpen(true);
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
    setEditingEmployee(null);
  };

  const handleFormComplete = () => {
    setDialogOpen(false);
    setEditingEmployee(null);
    fetchEmployees();
    setSuccessMsg(t('employee.list.successEdit', 'Empleado editado exitosamente'));
    setSuccessOpen(true);
  };

  const handleGuardar = () => {
    if (formRef.current) {
      formRef.current.submitForm();
    }
  };

  return (
    <Paper sx={{ p: 2 }}>
      <Typography variant="h6">{t("employee.list.title")}</Typography>
      <TextField
        select
        label={t("employee.list.filterByCompany")}
        value={selectedCompany}
        onChange={e => setSelectedCompany(e.target.value)}
        sx={{ mb: 2, minWidth: 200 }}
      >
        <MenuItem value="">{t("employee.list.allCompanies")}</MenuItem>
        {companies.map(company => (
          <MenuItem key={company.id} value={company.id}>{company.name}</MenuItem>
        ))}
      </TextField>
      {error && <Typography color="error" sx={{ mb: 2 }}>{error}</Typography>}
      <List>
        {employees.map(e => (
          <ListItem key={e.id}
            secondaryAction={
              <Stack direction="row" spacing={1}>
                <IconButton edge="end" aria-label="edit" onClick={() => handleEdit(e)}>
                  <EditIcon />
                </IconButton>
                <IconButton edge="end" aria-label="delete" onClick={() => handleDeleteClick(e.id)}>
                  <DeleteIcon />
                </IconButton>
              </Stack>
            }
          >
            <ListItemText
              primary={e.name}
              secondary={`${t("employee.list.companyLabel")}: ${e.companyName || t("employee.list.noCompany")} | ${e.department} | ${e.position} | ${e.email}`}
            />
          </ListItem>
        ))}
      </List>
      {/* Dialog para editar empleado */}
      <Dialog open={dialogOpen} onClose={handleDialogClose} maxWidth="sm" fullWidth>
        <DialogTitle>{t("employee.list.editEmployee")}</DialogTitle>
        <DialogContent>
          <EmployeeForm ref={formRef} employee={editingEmployee} onComplete={handleFormComplete} isEdit />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDialogClose}>{t("common.cancel")}</Button>
          <Button onClick={handleGuardar} variant="contained">{t("common.save")}</Button>
        </DialogActions>
      </Dialog>
      <Snackbar open={successOpen} autoHideDuration={3000} onClose={() => setSuccessOpen(false)} anchorOrigin={{ vertical: 'top', horizontal: 'center' }}>
        <Alert onClose={() => setSuccessOpen(false)} severity="success" sx={{ width: '100%' }}>
          {successMsg}
        </Alert>
      </Snackbar>
      <Dialog open={confirmDeleteOpen} onClose={handleCancelDelete}>
        <DialogTitle>{t('employee.list.confirmDeleteTitle', '¿Está seguro de borrar este empleado?')}</DialogTitle>
        <DialogActions>
          <Button onClick={handleCancelDelete}>{t('common.cancel', 'Cancelar')}</Button>
          <Button onClick={handleDelete} color="success" variant="contained">{t('common.confirm', 'Confirmar')}</Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
}