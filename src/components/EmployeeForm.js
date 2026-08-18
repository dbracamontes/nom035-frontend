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
  Tooltip,
} from "@mui/material";
import {
  UploadFile as UploadFileIcon,
  Delete as DeleteIcon,
  Save as SaveIcon,
  Download as DownloadIcon,
} from "@mui/icons-material";
import {
  createEmployee,
  updateEmployee,
  getCompanies,
  getEmployeeDocs,
  createEmployeeDoc,
  uploadEmployeeDocFile,
  deleteEmployeeDocFile,
  getDocumentTypes,
  downloadEmployeeDocFile,
} from "../api/nom035";
import { UserContext } from "../context/UserContext";
import { useTranslation } from 'react-i18next';

const EmployeeForm = forwardRef(({ employee, onComplete, isEdit, initialCompanyId }, ref) => {
  const { t } = useTranslation();
  const [form, setForm] = useState({
    name: "",
    department: "",
    position: "",
    email: "",
    curp: "",
    companyId: "",
    dateOfBirth: "",
    maritalStatus: "",
    gender: "",
    education: "",
    companyCategory: "",
    seniorityYears: ""
  });
  const [companies, setCompanies] = useState([]);
  const [documentTypes, setDocumentTypes] = useState([]);
  const { user } = useContext(UserContext);

  // Local state to hold the newly created employee so we can immediately show documents
  const [localEmployee, setLocalEmployee] = useState(null);

  // State for documents section
  const [docs, setDocs] = useState([]);
  const [docFiles, setDocFiles] = useState({});
  const [uploadingDocIds, setUploadingDocIds] = useState({});
  const [docLoading, setDocLoading] = useState(false);
  const [docError, setDocError] = useState("");
  const [docSuccess, setDocSuccess] = useState("");

  const hasRole = (roleName) => {
    if (!user || !user.roles) return false;
    return user.roles.some(role => role.authority === roleName);
  };

  const normalizeCompanyId = (value, availableCompanies = companies) => {
    if (value === null || value === undefined || value === '') {
      return '';
    }
    const stringValue = String(value);
    return Array.isArray(availableCompanies) && availableCompanies.some(company => String(company.id) === stringValue) ? stringValue : '';
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
      const nextCompanies = Array.isArray(res.data) ? res.data : [];
      setCompanies(nextCompanies);
      setForm(prev => {
        const current = normalizeCompanyId(prev.companyId);
        const employeeCompanyId = employee ? (employee.companyId ?? employee.company?.id) : undefined;
        const userCompanyId = (user && hasRole('ROLE_COMPANY')) ? (user.companyId || (user.company && user.company.id)) : undefined;
        const fallback = nextCompanies.length ? nextCompanies[0].id : "";
        const resolvedCandidate = current || employeeCompanyId || initialCompanyId || userCompanyId || fallback || "";
        const resolved = normalizeCompanyId(resolvedCandidate, nextCompanies);
        return { ...prev, companyId: resolved };
      });
    }).catch(() => {
      setCompanies([]);
      setForm(prev => ({ ...prev, companyId: '' }));
    });
  }, [user, employee, initialCompanyId]);

  // Load document types catalog once
  useEffect(() => {
    getDocumentTypes()
      .then(res => {
        setDocumentTypes(res.data || []);
      })
      .catch(err => {
        console.error("Error loading document types", err);
      });
  }, []);

  useEffect(() => {
    if (employee) {
      setForm({
        name: employee.name || "",
        department: employee.department || "",
        position: employee.position || "",
        email: employee.email || "",
        curp: employee.curp || "",
        companyId: (employee.companyId != null ? employee.companyId : (employee.company?.id || companies[0]?.id || "")),
        dateOfBirth: employee.dateOfBirth || "",
        maritalStatus: employee.maritalStatus || "",
        gender: employee.gender || "",
        education: employee.education || "",
        companyCategory: employee.companyCategory || "",
        seniorityYears: employee.seniorityYears ?? ""
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
        companyId: (localEmployee.companyId != null ? localEmployee.companyId : (localEmployee.company?.id || f.companyId)),
        dateOfBirth: localEmployee.dateOfBirth || f.dateOfBirth,
        maritalStatus: localEmployee.maritalStatus || f.maritalStatus,
        gender: localEmployee.gender || f.gender,
        education: localEmployee.education || f.education,
        companyCategory: localEmployee.companyCategory || f.companyCategory,
        seniorityYears: localEmployee.seniorityYears ?? f.seniorityYears
      }));
    } else {
      setForm(f => ({
        name: "",
        department: "",
        position: "",
        email: "",
        curp: "",
        companyId: f.companyId || initialCompanyId || companies[0]?.id || "",
        dateOfBirth: "",
        maritalStatus: "",
        gender: "",
        education: "",
        companyCategory: "",
        seniorityYears: ""
      }));
    }
  }, [employee, companies, initialCompanyId, localEmployee]);

  const handleChange = e => {
    const nextValue = e.target.name === 'companyId' ? String(e.target.value) : e.target.value;
    setForm({ ...form, [e.target.name]: nextValue });
  };

  const submitForm = async () => {
    const companyIdStr = String(form.companyId || "");
    const hasCompany = !!companyIdStr && companies.some(c => String(c.id) === companyIdStr);
    if (!form.name || !form.email || !hasCompany) {
      alert(t("employee.form.validation.nameEmailCompanyRequired"));
      return;
    }
    const { companyId, ...rest } = form;
    const payload = {
      ...rest,
      dateOfBirth: rest.dateOfBirth || null,
      seniorityYears: rest.seniorityYears !== "" ? Number(rest.seniorityYears) : null,
      company: { id: Number(companyId) }
    };
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
            companyId: (created.companyId != null ? created.companyId : (created.company?.id || form.companyId)),
            dateOfBirth: created.dateOfBirth || form.dateOfBirth,
            maritalStatus: created.maritalStatus || form.maritalStatus,
            gender: created.gender || form.gender,
            education: created.education || form.education,
            companyCategory: created.companyCategory || form.companyCategory,
            seniorityYears: created.seniorityYears ?? form.seniorityYears
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
    setForm({
      name: "",
      department: "",
      position: "",
      email: "",
      curp: "",
      companyId: (initialCompanyId || companies[0]?.id || ""),
      dateOfBirth: "",
      maritalStatus: "",
      gender: "",
      education: "",
      companyCategory: "",
      seniorityYears: ""
    });
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

  const ensureDocRecord = async (docType) => {
    if (!effectiveEmployee || !effectiveEmployee.id) {
      throw new Error("No hay empleado activo para asociar el documento.");
    }

    const existingDoc = docs.find((d) => d.typeId === docType.id || d.name === docType.name);
    if (existingDoc) {
      return existingDoc;
    }

    const payload = {
      employeeId: effectiveEmployee.id,
      name: docType.name,
      typeId: docType.id,
    };
    const response = await createEmployeeDoc(payload);
    const createdDoc = response && response.data ? response.data : null;

    if (!createdDoc || !createdDoc.id) {
      throw new Error("No se pudo crear el registro del documento.");
    }

    setDocs((prev) => {
      const alreadyExists = prev.some((d) => d.id === createdDoc.id || (d.typeId === docType.id && d.name === docType.name));
      return alreadyExists ? prev : [...prev, createdDoc];
    });

    return createdDoc;
  };

  const handleDocFileChange = (docType) => (e) => {
    const file = e.target.files && e.target.files[0] ? e.target.files[0] : null;
    if (!file) return;

    const maxBytes = 5 * 1024 * 1024;
    if (file.size > maxBytes) {
      setDocError("El archivo es demasiado grande. El tamaño máximo permitido es 5 MB.");
      e.target.value = "";
      return;
    }

    setDocError("");
    setDocSuccess("");
    setDocFiles((prev) => ({ ...prev, [docType.id]: file }));
    e.target.value = "";
  };

  const handleSaveDocs = async () => {
    if (!effectiveEmployee || !effectiveEmployee.id) return;
    setDocLoading(true);
    setDocError("");
    setDocSuccess("");
    try {
      const pendingFiles = Object.entries(docFiles).filter(([, file]) => !!file);

      for (const [typeKey, file] of pendingFiles) {
        const maxBytes = 5 * 1024 * 1024;
        if (file.size > maxBytes) {
          throw Object.assign(new Error("file-too-large"), { code: "FILE_TOO_LARGE", docId: typeKey });
        }

        const docType = documentTypes.find((type) => String(type.id) === String(typeKey));
        const existingDoc = docs.find((d) => String(d.typeId) === String(typeKey) || String(d.id) === String(typeKey));
        const docRecord = docType ? (existingDoc || await ensureDocRecord(docType)) : existingDoc;

        if (!docRecord || !docRecord.id) {
          throw new Error("No se pudo localizar o crear el documento para subir el archivo.");
        }

        setUploadingDocIds((prev) => ({ ...prev, [docRecord.id]: true }));
        try {
          await uploadEmployeeDocFile(effectiveEmployee.id, docRecord.id, file);
        } finally {
          setUploadingDocIds((prev) => ({ ...prev, [docRecord.id]: false }));
        }
      }

      setDocFiles({});
      setDocSuccess("Documentos guardados correctamente.");
      await fetchAndPrepareDocs(effectiveEmployee.id);
    } catch (e) {
      console.error("Error saving employee docs", e);
      if (e?.code === "FILE_TOO_LARGE") {
        setDocError("Uno o más archivos superan el tamaño máximo permitido de 5 MB.");
      } else if (e?.response?.status === 413 ||
                 (typeof e?.response?.data === 'string' && e.response.data.includes('Maximum upload size exceeded'))) {
        setDocError("El archivo es demasiado grande. El tamaño máximo permitido es 5 MB.");
      } else {
        setDocError("Error al guardar los documentos.");
      }
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

  const handleDownloadDocFile = async (docId, fileName) => {
    if (!effectiveEmployee || !effectiveEmployee.id) return;
    try {
      const response = await downloadEmployeeDocFile(effectiveEmployee.id, docId);
      const blob = new Blob([response.data]);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName || 'documento-empleado';
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Error descargando archivo', e);
      alert('No se pudo descargar el archivo.');
    }
  };

  const normalizeEmployeeDocStatus = (status) => {
    const value = String(status || '').trim();
    if (!value) return 'Pendiente';
    if (['APPROVED', 'Aprobado', 'approved', 'ACTIVE', 'Activo', 'active'].includes(value)) return 'Aprobado';
    if (['REJECTED', 'Rechazado', 'rejected', 'INACTIVE', 'Inactivo', 'inactive'].includes(value)) return 'Rechazado';
    if (['PENDING', 'Pendiente', 'pending', 'PENDIENTE'].includes(value)) return 'Pendiente';
    return 'Pendiente';
  };

  const employeeDocsOverallStatus = (() => {
    if (!docs || docs.length === 0) return 'Pendiente';
    const statuses = docs.map((doc) => normalizeEmployeeDocStatus(doc?.status));
    if (statuses.some((status) => status === 'Rechazado')) return 'Rechazado';
    if (statuses.some((status) => status === 'Aprobado')) return 'Aprobado';
    return 'Pendiente';
  })();

  const renderDocItem = (docType) => {
    const doc = docs.find(d => d.typeId === docType.id || d.name === docType.name);
    const docId = doc?.id;
    const fileToUpload = docFiles[docType.id] || (docId ? docFiles[docId] : null);
    const hasExistingFile = !!doc?.hasFile;
    const isUploading = !!(docId && uploadingDocIds[docId]);
    const fileName = fileToUpload?.name || doc?.fileName || "Sin archivo";
    const statusValue = isUploading ? 'Pendiente' : normalizeEmployeeDocStatus(doc?.status);
    const statusLabel = isUploading ? 'Subiendo' : statusValue;
    const statusColor = isUploading ? 'warning' : (statusValue === 'Aprobado' ? 'success' : (statusValue === 'Rechazado' ? 'error' : 'warning'));

    return (
      <ListItem
        key={docType.id}
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
          primary={docType.name}
          secondary={fileToUpload ? fileName : (doc ? fileName : "Registro no disponible")}
          sx={{ mr: 2 }}
        />
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Chip
            label={statusLabel}
            color={statusColor}
            size="small"
          />
          {hasExistingFile && (
            <Tooltip title="Descargar archivo">
              <IconButton
                size="small"
                color="primary"
                onClick={() => handleDownloadDocFile(docId, doc?.fileName || docType.name)}
              >
                <DownloadIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
          {!hasExistingFile && (
            <Button
              variant="outlined"
              size="small"
              component="label"
              startIcon={<UploadFileIcon />}
            >
              {fileToUpload ? "Listo para subir" : "Elegir"}
              <input
                type="file"
                hidden
                onChange={handleDocFileChange(docType)}
              />
            </Button>
          )}
          {docId && hasExistingFile && (
            <Tooltip title="Eliminar archivo">
              <IconButton size="small" color="error" onClick={() => handleDeleteDocFile(docId)}>
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
        </Box>
      </ListItem>
    );
  };

  const inputSx = { '& .MuiInputBase-root': { height: 40 } };

  return (
    <Paper sx={{ p: 3, boxShadow: 3, mt: 2 }}>
      <Box component="form" noValidate autoComplete="off">
        <Typography variant="h6" sx={{ mb: 2 }}>Datos del Empleado</Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}><TextField label={t("employee.form.name")} name="name" value={form.name} onChange={handleChange} required fullWidth size="small" sx={inputSx} /></Grid>
          <Grid item xs={12} sm={6}><TextField label={t("employee.form.department")} name="department" value={form.department} onChange={handleChange} required fullWidth size="small" sx={inputSx} /></Grid>
          <Grid item xs={12} sm={6}><TextField label={t("employee.form.position")} name="position" value={form.position} onChange={handleChange} fullWidth size="small" sx={inputSx} /></Grid>
          <Grid item xs={12} sm={6}><TextField type="date" label={t("employee.form.dateOfBirth")} name="dateOfBirth" value={form.dateOfBirth} onChange={handleChange} InputLabelProps={{ shrink: true }} fullWidth size="small" sx={inputSx} /></Grid>
          <Grid item xs={12} sm={6}><TextField select label={t("employee.form.genderLabel")} name="gender" value={form.gender} onChange={handleChange} fullWidth size="small" sx={inputSx}>
              <MenuItem value="">{t("employee.form.genderSelect", "Selecciona sexo")}</MenuItem>
              <MenuItem value="M">{t("employee.form.genderM")}</MenuItem>
              <MenuItem value="F">{t("employee.form.genderF")}</MenuItem>
              <MenuItem value="Otro">{t("employee.form.genderOther")}</MenuItem>
            </TextField></Grid>
          <Grid item xs={12} sm={6}><TextField label={t("employee.form.email")} name="email" value={form.email} onChange={handleChange} required fullWidth size="small" sx={inputSx} /></Grid>
          <Grid item xs={12} sm={6}><TextField select label={t("employee.form.maritalStatusLabel")} name="maritalStatus" value={form.maritalStatus} onChange={handleChange} fullWidth size="small" sx={inputSx}>
              <MenuItem value="">{t("employee.form.maritalStatusSelect")}</MenuItem>
              <MenuItem value="Soltero">{t("employee.form.maritalStatusSingle")}</MenuItem>
              <MenuItem value="Casado">{t("employee.form.maritalStatusMarried")}</MenuItem>
              <MenuItem value="Divorciado">{t("employee.form.maritalStatusDivorced")}</MenuItem>
              <MenuItem value="Viudo">{t("employee.form.maritalStatusWidowed")}</MenuItem>
            </TextField></Grid>
          <Grid item xs={12} sm={6}><TextField label={t("employee.form.curp", "CURP")} name="curp" value={form.curp} onChange={handleChange} fullWidth size="small" sx={inputSx} /></Grid>
          <Grid item xs={12} sm={6}><TextField label={t("employee.form.education")} name="education" value={form.education} onChange={handleChange} fullWidth size="small" sx={inputSx} /></Grid>
          <Grid item xs={12} sm={6}><TextField label={t("employee.form.companyCategory")} name="companyCategory" value={form.companyCategory} onChange={handleChange} fullWidth size="small" sx={inputSx} /></Grid>
          <Grid item xs={12} sm={6}><TextField type="number" inputProps={{ min: 0, step: 1 }} label={t("employee.form.seniorityYears")} name="seniorityYears" value={form.seniorityYears} onChange={handleChange} fullWidth size="small" sx={inputSx} /></Grid>
          <Grid item xs={12} sm={6}>
            {hasRole('ROLE_COMPANY') ? (
              <TextField label={t("employee.form.company")} value={companies.find(c => String(c.id) === String(form.companyId))?.name || ''} disabled fullWidth size="small" sx={inputSx} />
            ) : (
              <TextField select label={t("employee.form.company")} name="companyId" value={normalizeCompanyId(form.companyId, companies)} onChange={handleChange} required fullWidth size="small" sx={inputSx}>
                <MenuItem value="">{t("employee.form.companySelect", "Selecciona una empresa")}</MenuItem>
                {companies.map(company => (<MenuItem key={company.id} value={String(company.id)}>{company.name}</MenuItem>))}
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
              {documentTypes.map(renderDocItem)}
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
