import React, { useEffect, useState } from "react";
import { getEmployees } from "../api/nom035";
import { Paper, Typography, List, ListItem, ListItemText } from "@mui/material";

export default function EmployeeList() {
  const [employees, setEmployees] = useState([]);

  useEffect(() => {
    getEmployees().then(res => setEmployees(res.data));
  }, []);

  return (
    <Paper sx={{ p: 2 }}>
      <Typography variant="h6">Employees List</Typography>
      <List>
        {employees.map(e => (
          <ListItem key={e.id}>
            <ListItemText primary={e.name} secondary={`${e.department} | ${e.position} | ${e.email}`} />
          </ListItem>
        ))}
      </List>
    </Paper>
  );
}