import React, { useState, useEffect, forwardRef, useImperativeHandle, useContext } from "react";
import { TextField, Box, MenuItem, Snackbar, Alert, Typography } from "@mui/material";
import { createEmployee, updateEmployee, getCompanies } from "../api/nom035";
import { UserContext } from "../context/UserContext";
import { useTranslation } from 'react-i18next';

const EmployeeForm = forwardRef(({ employee, onComplete, isEdit, initialCompanyId }, ref) => {
  const { t } = useTranslation();
  const [form, setForm] = useState({ name: "", department: "", position: "", email: "", companyId: "" });
  const [companies, setCompanies] = useState([]);
  const { user } = useContext(UserContext);

  const hasRole = (roleName) => {
    if (!user || !user.roles) return false;
    return user.roles.some(role => role.authority === roleName);
  };

  // Load companies and ensure sensible companyId default (prefers employee -> initialCompanyId -> user.company -> first company)
  useEffect(() => {
    getCompanies().then(res => {
      setCompanies(res.data);
      setForm(prev => {
        const current = prev.companyId;
        const employeeCompanyId = employee ? (employee.companyId ?? employee.company?.id) : undefined;
        const userCompanyId = (user && hasRole('ROLE_COMPANY')) ? (user.companyId || (user.company && user.company.id)) : undefined;
        const fallback = res.data && res.data.length ? res.data[0].id : "";
        const resolved = current || employeeCompanyId || initialCompanyId || userCompanyId || fallback || "";
        return { ...prev, companyId: resolved };
      });
    });
  }, [user, employee, initialCompanyId]);

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
      setForm(f => ({
        name: "",
        department: "",
        position: "",
        email: "",
        companyId: f.companyId || initialCompanyId || companies[0]?.id || ""
      }));
    }
  }, [employee, companies, initialCompanyId]);

  const handleChange = e => setForm({ ...form, [e.target.name]: e.target.value });

  const submitForm = async () => {
    const companyIdStr = String(form.companyId || "");
    const hasCompany = !!companyIdStr && companies.some(c => String(c.id) === companyIdStr);
    if (!form.name || !form.email || !hasCompany) {
      alert(t("employee.form.validation.nameEmailCompanyRequired"));
      return;
    }
    const { companyId, ...rest } = form;
    const payload = { ...rest, company: { id: Number(companyId) } };
    try {
      if (isEdit && employee && employee.id) {
        await updateEmployee(employee.id, payload);
      } else {
        await createEmployee(payload);
      }
      // Reset but preserve current selection preference
      setForm({ name: "", department: "", position: "", email: "", companyId: (initialCompanyId || form.companyId || companies[0]?.id || "") });
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

  const resetForm = () => {
    setForm({ name: "", department: "", position: "", email: "", companyId: (initialCompanyId || companies[0]?.id || "") });
  };

  useImperativeHandle(ref, () => ({
    submitForm,
    resetForm
  }));

  return (
    <>
      <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 1 }}>
        <TextField label={t("employee.form.name")} name="name" value={form.name} onChange={handleChange} required fullWidth sx={{ mb: 2 }} />
        <TextField label={t("employee.form.department")} name="department" value={form.department} onChange={handleChange} required fullWidth sx={{ mb: 2 }} />
        <TextField label={t("employee.form.position")} name="position" value={form.position} onChange={handleChange} fullWidth sx={{ mb: 2 }} />
        <TextField label={t("employee.form.email")} name="email" value={form.email} onChange={handleChange} required fullWidth sx={{ mb: 2 }} />
        {hasRole('ROLE_COMPANY') ? (
          <TextField label={t("employee.form.company")} value={companies.find(c => String(c.id) === String(form.companyId))?.name || ''} disabled fullWidth sx={{ mb: 2 }} />
        ) : (
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
        )}
      </Box>
    </>
  );
});

export default EmployeeForm;