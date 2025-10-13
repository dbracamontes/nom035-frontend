import React, { useEffect, useState } from "react";
import { getEmployees, getEmployeesByCompany, getCompanies, deleteEmployee } from "../api/nom035";
import { Paper, Typography, List, ListItem, ListItemText, IconButton, MenuItem, TextField } from "@mui/material";
import DeleteIcon from '@mui/icons-material/Delete';

export default function EmployeeList() {
  const [employees, setEmployees] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState("");

  useEffect(() => {
    getCompanies().then(res => setCompanies(res.data));
    fetchEmployees();
  }, []);

  const fetchEmployees = () => {
    if (selectedCompany) {
      getEmployeesByCompany(selectedCompany).then(res => setEmployees(res.data));
    } else {
      getEmployees().then(res => setEmployees(res.data));
    }
  };

  useEffect(() => {
    fetchEmployees();
    // eslint-disable-next-line
  }, [selectedCompany]);

  const handleDelete = async (id) => {
    await deleteEmployee(id);
    fetchEmployees();
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
              <IconButton edge="end" aria-label="delete" onClick={() => handleDelete(e.id)}>
                <DeleteIcon />
              </IconButton>
            }
          >
            <ListItemText
              primary={e.name}
              secondary={`Company: ${e.company?.name || "N/A"} | ${e.department} | ${e.position} | ${e.email}`}
            />
          </ListItem>
        ))}
      </List>
    </Paper>
  );
}