import React, { useState } from "react";
import { TextField, Button, Box } from "@mui/material";
import { createEmployee } from "../api/nom035";

export default function EmployeeForm({ onCreated }) {
  const [form, setForm] = useState({ name: "", department: "", position: "", email: "" });

  const handleChange = e => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async e => {
    e.preventDefault();
    await createEmployee(form);
    setForm({ name: "", department: "", position: "", email: "" });
    if (onCreated) onCreated();
  };

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ display: "flex", gap: 2, mb: 2 }}>
      <TextField label="Name" name="name" value={form.name} onChange={handleChange} required />
      <TextField label="Department" name="department" value={form.department} onChange={handleChange} required />
      <TextField label="Position" name="position" value={form.position} onChange={handleChange} />
      <TextField label="Email" name="email" value={form.email} onChange={handleChange} required />
      <Button type="submit" variant="contained">Add Employee</Button>
    </Box>
  );
}