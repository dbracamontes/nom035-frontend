import React, { useEffect, useState, useRef, useCallback } from "react";
import { getEmployees, getEmployeesByCompany, getCompanies, deleteEmployee } from "../api/nom035";
import EmployeeForm from "./EmployeeForm";
import { Paper, Typography, List, ListItem, ListItemText, IconButton, MenuItem, TextField, Stack, Dialog, DialogTitle, DialogContent, DialogActions, Button } from "@mui/material";
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';

export default function EmployeeList({ refreshFlag }) {
  const [employees, setEmployees] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState("");
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const formRef = useRef();

  useEffect(() => {
    getCompanies().then(res => setCompanies(res.data));
  }, []);

  const fetchEmployees = useCallback(() => {
    if (selectedCompany) {
      getEmployeesByCompany(selectedCompany).then(res => setEmployees(res.data));
    } else {
      getEmployees().then(res => setEmployees(res.data));
    }
  }, [selectedCompany]);

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees, refreshFlag]);

  const handleDelete = async (id) => {
    await deleteEmployee(id);
    fetchEmployees();
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
  };

  const handleGuardar = () => {
    if (formRef.current) {
      formRef.current.submitForm();
    }
  };

  return (
    <Paper sx={{ p: 2 }}>
      <Typography variant="h6">Employees List</Typography>
      <TextField
        select
        label="Filter by Company"
        value={selectedCompany}
        onChange={e => setSelectedCompany(e.target.value)}
        sx={{ mb: 2, minWidth: 200 }}
      >
        <MenuItem value="">All Companies</MenuItem>
        {companies.map(company => (
          <MenuItem key={company.id} value={company.id}>{company.name}</MenuItem>
        ))}
      </TextField>
      <List>
        {employees.map(e => (
          <ListItem key={e.id}
            secondaryAction={
              <Stack direction="row" spacing={1}>
                <IconButton edge="end" aria-label="edit" onClick={() => handleEdit(e)}>
                  <EditIcon />
                </IconButton>
                <IconButton edge="end" aria-label="delete" onClick={() => handleDelete(e.id)}>
                  <DeleteIcon />
                </IconButton>
              </Stack>
            }
          >
            <ListItemText
              primary={e.name}
              secondary={`Company: ${e.companyName || "N/A"} | ${e.department} | ${e.position} | ${e.email}`}
            />
          </ListItem>
        ))}
      </List>
      {/* Dialog para editar empleado */}
      <Dialog open={dialogOpen} onClose={handleDialogClose} maxWidth="sm" fullWidth>
        <DialogTitle>Editar empleado</DialogTitle>
        <DialogContent>
          <EmployeeForm ref={formRef} employee={editingEmployee} onComplete={handleFormComplete} isEdit />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDialogClose}>Cancelar</Button>
          <Button onClick={handleGuardar} variant="contained">Guardar</Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
}