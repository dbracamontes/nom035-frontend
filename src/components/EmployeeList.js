import React, { useEffect, useState, useRef, useCallback, useContext } from "react";
import { getEmployees, getEmployeesByCompany, getCompanies, deleteEmployee } from "../api/nom035";
import { Paper, Typography, List, ListItem, ListItemText, IconButton, MenuItem, TextField, Stack, Dialog, DialogTitle, DialogContent, DialogActions, Button, Snackbar, Alert } from "@mui/material";
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import { useTranslation } from 'react-i18next';
import { UserContext } from "../context/UserContext";

export default function EmployeeList({ refreshFlag, selectedCompany: selectedCompanyProp, onSelectedCompanyChange, onEditEmployee }) {
  const { t } = useTranslation();
  const { user } = useContext(UserContext);

  const hasRole = (roleName) => {
    if (!user || !user.roles) return false;
    return user.roles.some(role => role.authority === roleName);
  };

  const [employees, setEmployees] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [error, setError] = useState(null);
  // internal local state fallback when not controlled
  const [selectedCompanyLocal, setSelectedCompanyLocal] = useState("");
  const selectedCompany = (selectedCompanyProp !== undefined && selectedCompanyProp !== null) ? String(selectedCompanyProp) : selectedCompanyLocal;
  const setSelectedCompany = (val) => {
    const v = String(val ?? "");
    if (onSelectedCompanyChange) onSelectedCompanyChange(v);
    else setSelectedCompanyLocal(v);
  };
  const [successOpen, setSuccessOpen] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [employeeToDelete, setEmployeeToDelete] = useState(null);

  // Load companies. If user is a company-role, prefer/set their company as selected.
  useEffect(() => {
    setError(null);
    getCompanies()
      .then(res => {
        setCompanies(res.data);
        if (user && hasRole('ROLE_COMPANY')) {
          const userCompanyId = String(user.companyId || (user.company && user.company.id) || '');
          if (userCompanyId) setSelectedCompany(userCompanyId);
        }
      })
      .catch(err => {
        console.error('Error fetching companies:', err);
        setCompanies([]);
        setError(t('employee.list.errorFetchCompanies') || 'No se pudieron cargar las empresas.');
      });
  }, [t, user]);

  const fetchEmployees = useCallback(() => {
    setError(null);
    // If user is ROLE_COMPANY, always fetch by their company.
    const companyToUse = (user && hasRole('ROLE_COMPANY'))
      ? String(user.companyId || (user.company && user.company.id) || selectedCompany || '')
      : selectedCompany || '';
    console.debug('fetchEmployees: companyToUse, selectedCompany, user', { companyToUse, selectedCompany, user });
    if (companyToUse) {
      getEmployeesByCompany(companyToUse)
        .then(res => {
          console.debug('getEmployeesByCompany response', res?.data);
          setEmployees(res.data)
        })
        .catch(err => {
          console.error('Error fetching employees by company:', err);
          setEmployees([]);
          setError(t('employee.list.errorFetchEmployees') || 'No se pudieron cargar los empleados.');
        });
    } else {
      getEmployees()
        .then(res => {
          console.debug('getEmployees response', res?.data);
          setEmployees(res.data)
        })
        .catch(err => {
          console.error('Error fetching employees:', err);
          setEmployees([]);
          setError(t('employee.list.errorFetchEmployees') || 'No se pudieron cargar los empleados.');
        });
    }
  }, [selectedCompany, t, user]);

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees, refreshFlag]);

  const canManageEmployee = (emp) => {
    if (hasRole('ROLE_ADMIN')) return true;
    if (hasRole('ROLE_COMPANY')) {
      // Derive myCompanyId with fallbacks if not present yet
      let myCompanyId = String(user.companyId || (user.company && user.company.id) || '');
      if (!myCompanyId) {
        // Try selectedCompany or infer from any employee already loaded that matches selectedCompany
        if (selectedCompany) myCompanyId = String(selectedCompany);
        else if (employees.length > 0) {
          const first = employees.find(e => e.companyId || (e.company && e.company.id));
          if (first) myCompanyId = String(first.companyId || (first.company && first.company.id));
        }
      }
      const empCompanyId = String(emp.companyId || emp.company_id || (emp.company && emp.company.id) || '');
      return !!empCompanyId && !!myCompanyId && empCompanyId === myCompanyId;
    }
    return false;
  };

  const handleDelete = async () => {
    if (!employeeToDelete) return;
    setError(null);
    try {
      // Only block for roles that are neither ADMIN nor COMPANY
      if (!hasRole('ROLE_ADMIN') && !hasRole('ROLE_COMPANY')) {
        console.error('Delete permission denied (role) for employee', { employeeToDelete, userRoles: user?.roles });
        setError(t('employee.list.errorNoPermission') || 'No tiene permiso para eliminar este empleado.');
        setConfirmDeleteOpen(false);
        setEmployeeToDelete(null);
        return;
      }
      // Attempt delete; backend will enforce scope (company check) and return 403 if not allowed
      await deleteEmployee(employeeToDelete);
      fetchEmployees();
      setSuccessMsg(t('employee.list.successDelete', 'Empleado eliminado exitosamente'));
      setSuccessOpen(true);
    } catch (err) {
      console.error('Error deleting employee:', err);
      const status = err?.response?.status;
      if (status === 403) {
        setError(t('employee.list.errorNoPermission') || 'No tiene permiso para eliminar este empleado.');
      } else if (status === 404) {
        setError(t('employee.list.errorNotFound') || 'El empleado no existe.');
      } else {
        setError(t('employee.list.errorDelete') || 'Error al eliminar el empleado.');
      }
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
    if (!canManageEmployee(employee)) {
      const empCompanyId = String(employee.companyId || employee.company_id || (employee.company && employee.company.id) || '');
      const myCompanyId = String(user?.companyId || (user?.company && user.company.id) || '');
      console.error('Edit permission denied for employee', { employee, empCompanyId, myCompanyId, userRoles: user?.roles, selectedCompany });
      setError(t('employee.list.errorNoPermission') || 'No tiene permiso para editar este empleado.');
      return;
    }
    // Call the new prop to notify the parent page
    if (onEditEmployee) {
      onEditEmployee(employee);
    }
  };

  return (
    <Paper sx={{ p: 2 }}>
      <Typography variant="h6">{t("employee.list.title")}</Typography>
      {hasRole('ROLE_ADMIN') ? (
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
      ) : (
        <Typography sx={{ mb: 2 }}>{companies.find(c => String(c.id) === String(selectedCompany))?.name || ''}</Typography>
      )}
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