import React, { useState, useEffect, forwardRef, useImperativeHandle } from "react";
import { TextField, Box, MenuItem } from "@mui/material";
import { createEmployee, updateEmployee, getCompanies } from "../api/nom035";
import { useTranslation } from 'react-i18next';

const EmployeeForm = forwardRef(({ employee, onComplete, isEdit }, ref) => {
  const { t } = useTranslation();
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
      alert(t("employee.form.validation.nameEmailCompanyRequired"));
      return;
    }
    // Prepare payload without companyId
    const { companyId, ...rest } = form;
    const payload = { ...rest, company: { id: companyId } };
    try {
      if (isEdit && employee && employee.id) {
        await updateEmployee(employee.id, payload);
      } else {
        await createEmployee(payload);
      }
      setForm({ name: "", department: "", position: "", email: "", companyId: companies[0]?.id || "" });
      if (onComplete) onComplete();
    } catch (err) {
      let msg = t("employee.form.error.generic");
      if (err && err.response && err.response.data && err.response.data.error) {
        msg = err.response.data.error;
      } else if (err && err.response && err.response.status === 403) {
        msg = t("employee.form.error.forbidden", "Acceso denegado: no tienes permisos suficientes para esta acción.");
      }
      alert(msg);
    }
  };

  useImperativeHandle(ref, () => ({
    submitForm
  }));

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 1 }}>
      <TextField label={t("employee.form.name")} name="name" value={form.name} onChange={handleChange} required fullWidth sx={{ mb: 2 }} />
      <TextField label={t("employee.form.department")} name="department" value={form.department} onChange={handleChange} required fullWidth sx={{ mb: 2 }} />
      <TextField label={t("employee.form.position")} name="position" value={form.position} onChange={handleChange} fullWidth sx={{ mb: 2 }} />
      <TextField label={t("employee.form.email")} name="email" value={form.email} onChange={handleChange} required fullWidth sx={{ mb: 2 }} />
      <TextField
        select
        label={t("employee.form.company")}
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