import React, { useState, useEffect, forwardRef, useImperativeHandle, useContext } from "react";
import {
  TextField,
  Box,
  MenuItem,
  Typography,
  Paper,
  List,
  ListItem,
  ListItemText,
  Chip,
  IconButton,
  Button,
  Alert,
  Grid,
} from "@mui/material";
import {
  UploadFile as UploadFileIcon,
  Delete as DeleteIcon,
  Save as SaveIcon,
} from "@mui/icons-material";
import {
  createEmployee,
  updateEmployee,
  getCompanies,
  getEmployeeDocs,
  createEmployeeDoc,
  uploadEmployeeDocFile,
  deleteEmployeeDocFile,
} from "../api/nom035";
import { UserContext } from "../context/UserContext";
import { useTranslation } from 'react-i18next';

const FIXED_DOCS = [
  { name: "Constancia de Situación Fiscal", key: "csf" },
  { name: "Comprobante de Domicilio", key: "domicilio" },
  { name: "Estado de Cuenta Bancario", key: "cuenta" },
];

const EmployeeForm = forwardRef(({ employee, onComplete, isEdit, initialCompanyId }, ref) => {
  const { t } = useTranslation();
  const [form, setForm] = useState({ name: "", department: "", position: "", email: "", curp: "", companyId: "" });
  const [companies, setCompanies] = useState([]);
  const { user } = useContext(UserContext);

  // Local state to hold the newly created employee so we can immediately show documents
  const [localEmployee, setLocalEmployee] = useState(null);

  // State for documents section
  const [docs, setDocs] = useState([]);
  const [docFiles, setDocFiles] = useState({});
  const [docLoading, setDocLoading] = useState(false);
  const [docError, setDocError] = useState("");
  const [docSuccess, setDocSuccess] = useState("");

  const hasRole = (roleName) => {
    if (!user || !user.roles) return false;
    return user.roles.some(role => role.authority === roleName);
  };

  // effectiveEmployee is either the employee passed in (edit) or the locally created one
  const effectiveEmployee = employee || localEmployee;

  const fetchAndPrepareDocs = async (employeeId) => {
    if (!employeeId) return;
    setDocLoading(true);
    setDocError(""); // Reset error on fetch
    try {
      // 1. Fetch only existing documents
      const { data: existingDocs } = await getEmployeeDocs(employeeId);
      setDocs(existingDocs || []); // Store only what exists
    } catch (e) {
      console.error("Error fetching employee docs", e);
      setDocError("No se pudieron cargar los documentos del empleado.");
    } finally {
      setDocLoading(false);
    }
  };

  useEffect(() => {
    if (effectiveEmployee && effectiveEmployee.id) {
      fetchAndPrepareDocs(effectiveEmployee.id);
    } else {
      setDocs([]);
    }
  }, [effectiveEmployee]);

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
        curp: employee.curp || "",
        companyId: (employee.companyId != null ? employee.companyId : (employee.company?.id || companies[0]?.id || ""))
      });
      // clear local created employee when editing an existing one
      setLocalEmployee(null);
    } else if (localEmployee) {
      // if we have a local created employee, keep the form in sync with it
      setForm(f => ({
        name: localEmployee.name || f.name,
        department: localEmployee.department || f.department,
        position: localEmployee.position || f.position,
        email: localEmployee.email || f.email,
        curp: localEmployee.curp || f.curp,
        companyId: (localEmployee.companyId != null ? localEmployee.companyId : (localEmployee.company?.id || f.companyId))
      }));
    } else {
      setForm(f => ({
        name: "",
        department: "",
        position: "",
        email: "",
        curp: "",
        companyId: f.companyId || initialCompanyId || companies[0]?.id || ""
      }));
    }
  }, [employee, companies, initialCompanyId, localEmployee]);

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
        if (onComplete) onComplete();
      } else {
        const res = await createEmployee(payload);
        const created = res && res.data ? res.data : null;
        if (created && created.id) {
          // Keep the form populated and set local employee so docs section appears
          setLocalEmployee(created);
          setForm({
            name: created.name || form.name,
            department: created.department || form.department,
            position: created.position || form.position,
            email: created.email || form.email,
            curp: created.curp || form.curp,
            companyId: (created.companyId != null ? created.companyId : (created.company?.id || form.companyId))
          });
          setDocSuccess("Empleado creado. Ahora puedes subir los documentos.");
          // fetch documents skeleton/values for the newly created employee
          fetchAndPrepareDocs(created.id);
        } else {
          // fallback: behave like previous implementation
          setForm({ name: "", department: "", position: "", email: "", curp: "", companyId: (initialCompanyId || form.companyId || companies[0]?.id || "") });
          if (onComplete) onComplete();
        }
      }
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
    setForm({ name: "", department: "", position: "", email: "", curp: "", companyId: (initialCompanyId || companies[0]?.id || "") });
    setDocs([]);
    setDocFiles({});
    setDocError("");
    setDocSuccess("");
    setLocalEmployee(null);
  };

  useImperativeHandle(ref, () => ({
    submitForm,
    resetForm
  }));

  const handleDocFileChange = (docId) => (e) => {
    const file = e.target.files && e.target.files[0] ? e.target.files[0] : null;
    setDocFiles((prev) => ({ ...prev, [docId]: file }));
  };

  const handleSaveDocs = async () => {
    if (!effectiveEmployee || !effectiveEmployee.id) return;
    setDocLoading(true);
    setDocError("");
    setDocSuccess("");
    try {
      const uploadPromises = Object.entries(docFiles).map(([docId, file]) => {
        if (file) {
          return uploadEmployeeDocFile(effectiveEmployee.id, docId, file);
        }
        return Promise.resolve();
      });
      await Promise.all(uploadPromises);
      setDocFiles({});
      setDocSuccess("Documentos guardados correctamente.");
      fetchAndPrepareDocs(effectiveEmployee.id); // Refresh docs state
    } catch (e) {
      console.error("Error saving employee docs", e);
      setDocError("Error al guardar los documentos.");
    } finally {
      setDocLoading(false);
    }
  };

  const handleDeleteDocFile = async (docId) => {
    if (!effectiveEmployee || !effectiveEmployee.id) return;
    if (!window.confirm("¿Está seguro de que desea eliminar este archivo?")) return;
    setDocLoading(true);
    setDocError("");
    setDocSuccess("");
    try {
      await deleteEmployeeDocFile(effectiveEmployee.id, docId);
      setDocSuccess("Archivo eliminado correctamente.");
      fetchAndPrepareDocs(effectiveEmployee.id); // Refresh docs state
    } catch (e) {
      console.error("Error deleting doc file", e);
      setDocError("Error al eliminar el archivo.");
    } finally {
      setDocLoading(false);
    }
  };

  const renderDocItem = (fixedDoc) => {
    const doc = docs.find(d => d.name === fixedDoc.name);
    const docId = doc?.id;
    const fileToUpload = docId ? docFiles[docId] : null;
    const hasExistingFile = doc?.hasFile;
    const fileName = fileToUpload?.name || doc?.fileName || "Sin archivo";
    const isAvailable = !!doc;

    return (
      <ListItem
        key={fixedDoc.key}
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 1.5,
          py: 1.5,
          borderBottom: '1px solid #eee'
        }}
      >
        <ListItemText
          primary={fixedDoc.name}
          secondary={isAvailable ? fileName : "Registro no disponible"}
          sx={{ mr: 2 }}
        />
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Chip
            label={!isAvailable ? "No disponible" : (hasExistingFile ? "Cargado" : (fileToUpload ? "Listo para subir" : "Pendiente"))}
            color={!isAvailable ? "default" : (hasExistingFile ? "success" : (fileToUpload ? "primary" : "default"))}
            size="small"
          />
          <Button
            variant="outlined"
            size="small"
            component="label"
            startIcon={<UploadFileIcon />}
            disabled={!isAvailable}
          >
            Elegir
            <input type="file" hidden onChange={handleDocFileChange(docId)} disabled={!isAvailable} />
          </Button>
          {isAvailable && hasExistingFile && (
            <IconButton size="small" color="error" onClick={() => handleDeleteDocFile(docId)}>
              <DeleteIcon fontSize="small" />
            </IconButton>
          )}
        </Box>
      </ListItem>
    );
  };

  return (
    <Paper sx={{ p: 3, boxShadow: 3, mt: 2 }}>
      <Box component="form" noValidate autoComplete="off">
        <Typography variant="h6" sx={{ mb: 2 }}>Datos del Empleado</Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}><TextField label={t("employee.form.name")} name="name" value={form.name} onChange={handleChange} required fullWidth /></Grid>
          <Grid item xs={12} sm={6}><TextField label={t("employee.form.department")} name="department" value={form.department} onChange={handleChange} required fullWidth /></Grid>
          <Grid item xs={12} sm={6}><TextField label={t("employee.form.position")} name="position" value={form.position} onChange={handleChange} fullWidth /></Grid>
          <Grid item xs={12} sm={6}><TextField label={t("employee.form.email")} name="email" value={form.email} onChange={handleChange} required fullWidth /></Grid>
          <Grid item xs={12} sm={6}><TextField label={t("employee.form.curp", "CURP")} name="curp" value={form.curp} onChange={handleChange} fullWidth /></Grid>
          <Grid item xs={12} sm={6}>
            {hasRole('ROLE_COMPANY') ? (
              <TextField label={t("employee.form.company")} value={companies.find(c => String(c.id) === String(form.companyId))?.name || ''} disabled fullWidth />
            ) : (
              <TextField select label={t("employee.form.company")} name="companyId" value={form.companyId} onChange={handleChange} required fullWidth>
                {companies.map(company => (<MenuItem key={company.id} value={company.id}>{company.name}</MenuItem>))}
              </TextField>
            )}
          </Grid>
        </Grid>

        {/* New: Save employee button within the personal data section */}
        <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
          <Button
            variant="outlined"
            onClick={resetForm}
          >
            {t('common.cancel', 'Cancelar')}
          </Button>
          <Button
            variant="contained"
            color="primary"
            startIcon={<SaveIcon />}
            onClick={submitForm}
          >
            {t('employee.form.saveEmployee', 'Guardar Datos del Empleado')}
          </Button>
        </Box>
      </Box>

      {(effectiveEmployee && effectiveEmployee.id) && (
        <Box sx={{ mt: 4 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>Documentos del empleado</Typography>
          {docError && <Alert severity="error" sx={{ mb: 2 }}>{docError}</Alert>}
          {docSuccess && <Alert severity="success" sx={{ mb: 2 }}>{docSuccess}</Alert>}
          
          {docLoading ? (
            <Typography>Cargando documentos...</Typography>
          ) : (
            <List sx={{ p: 0 }}>
              {FIXED_DOCS.map(renderDocItem)}
            </List>
          )}

          <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
            <Button
              variant="contained"
              color="secondary"
              startIcon={<SaveIcon />}
              onClick={handleSaveDocs}
              disabled={docLoading || Object.keys(docFiles).length === 0}
            >
              Guardar Documentos
            </Button>
          </Box>
        </Box>
      )}
    </Paper>
  );
});

export default EmployeeForm;
