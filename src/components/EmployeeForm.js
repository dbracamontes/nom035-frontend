import React, { useState, useEffect } from "react";
import { TextField, Button, Box, MenuItem } from "@mui/material";
import { createEmployee, getCompanies } from "../api/nom035";

export default function EmployeeForm({ onCreated }) {
  const [form, setForm] = useState({ name: "", department: "", position: "", email: "", companyId: "" });
  const [companies, setCompanies] = useState([]);

  useEffect(() => {
    getCompanies().then(res => setCompanies(res.data));
  }, []);

  const handleChange = e => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async e => {
    e.preventDefault();
    const payload = { ...form, company: { id: form.companyId } };
    await createEmployee(payload);
    setForm({ name: "", department: "", position: "", email: "", companyId: "" });
    if (onCreated) onCreated();
  };

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ display: "flex", gap: 2, mb: 2 }}>
      <TextField label="Name" name="name" value={form.name} onChange={handleChange} required />
      <TextField label="Department" name="department" value={form.department} onChange={handleChange} required />
      <TextField label="Position" name="position" value={form.position} onChange={handleChange} />
      <TextField label="Email" name="email" value={form.email} onChange={handleChange} required />
      <TextField
        select
        label="Company"
        name="companyId"
        value={form.companyId}
        onChange={handleChange}
        required
        sx={{ minWidth: 120 }}
      >
        {companies.map(company => (
          <MenuItem key={company.id} value={company.id}>{company.name}</MenuItem>
        ))}
      </TextField>
      <Button type="submit" variant="contained">Add Employee</Button>
    </Box>
  );
}