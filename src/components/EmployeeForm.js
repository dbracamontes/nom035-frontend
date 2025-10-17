import React, { useState, useEffect, forwardRef, useImperativeHandle } from "react";
import { TextField, Box, MenuItem } from "@mui/material";
import { createEmployee, updateEmployee, getCompanies } from "../api/nom035";

const EmployeeForm = forwardRef(({ employee, onComplete, isEdit }, ref) => {
  const [form, setForm] = useState({ name: "", department: "", position: "", email: "", companyId: "" });
  const [companies, setCompanies] = useState([]);

  useEffect(() => {
    // Fetch companies only (do not reference `employee` here to keep deps stable).
    getCompanies().then(res => {
      setCompanies(res.data);
      // ensure we have a sensible default companyId in the form when companies load
      setForm(f => ({ ...f, companyId: f.companyId || res.data[0]?.id || "" }));
    });
  }, []);

  useEffect(() => {
    if (employee) {
      setForm({
        name: employee.name || "",
        department: employee.department || "",
        position: employee.position || "",
        email: employee.email || "",
        companyId: (employee.companyId != null ? employee.companyId : (employee.company?.id || companies[0]?.id || ""))
      });
    } else {
      setForm({ name: "", department: "", position: "", email: "", companyId: companies[0]?.id || "" });
    }
  }, [employee, companies]);

  const handleChange = e => setForm({ ...form, [e.target.name]: e.target.value });

  const submitForm = async () => {
    // Robust validation
    if (!form.name || !form.email || !form.companyId || !companies.find(c => c.id === form.companyId)) {
      alert("Name, Email, and Company are required.");
      return;
    }
    // Prepare payload without companyId
    const { companyId, ...rest } = form;
    const payload = { ...rest, company: { id: companyId } };
    if (isEdit && employee && employee.id) {
      await updateEmployee(employee.id, payload);
    } else {
      await createEmployee(payload);
    }
    setForm({ name: "", department: "", position: "", email: "", companyId: companies[0]?.id || "" });
    if (onComplete) onComplete();
  };

  useImperativeHandle(ref, () => ({
    submitForm
  }));

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 1 }}>
      <TextField label="Name" name="name" value={form.name} onChange={handleChange} required fullWidth sx={{ mb: 2 }} />
      <TextField label="Department" name="department" value={form.department} onChange={handleChange} required fullWidth sx={{ mb: 2 }} />
      <TextField label="Position" name="position" value={form.position} onChange={handleChange} fullWidth sx={{ mb: 2 }} />
      <TextField label="Email" name="email" value={form.email} onChange={handleChange} required fullWidth sx={{ mb: 2 }} />
      <TextField
        select
        label="Company"
        name="companyId"
        value={form.companyId}
        onChange={handleChange}
        required
        sx={{ minWidth: 120, mb: 2 }}
        fullWidth
      >
        {companies.map(company => (
          <MenuItem key={company.id} value={company.id}>{company.name}</MenuItem>
        ))}
      </TextField>
    </Box>
  );
});

export default EmployeeForm;