import React, { useState, useEffect, useContext } from "react";
import {
  Box,
  Button,
  Container,
  Typography,
  Fade,
  Slide,
  Snackbar,
  Alert,
  Paper,
} from "@mui/material";
import { Add as AddIcon, People as PeopleIcon, ArrowBack as ArrowBackIcon } from "@mui/icons-material";
import EmployeeForm from "./EmployeeForm";
import EmployeeList from "./EmployeeList";
import { UserContext } from "../context/UserContext";
import { useTranslation } from "react-i18next";

export default function EmployeesPage() {
  const { t } = useTranslation();
  const { user } = useContext(UserContext);

  const [mode, setMode] = useState("list"); // 'list' | 'form'
  const [selectedCompany, setSelectedCompany] = useState("");
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [refreshFlag, setRefreshFlag] = useState(false);
  const [successOpen, setSuccessOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    if (user && user.roles && user.roles.some((r) => r.authority === "ROLE_COMPANY")) {
      const cid = String(user.companyId || (user.company && user.company.id) || "");
      if (cid) setSelectedCompany(cid);
    }
  }, [user]);

  const handleCreateEmployee = () => {
    setSelectedEmployee(null);
    setMode("form");
  };

  const handleEditEmployee = (emp) => {
    setSelectedEmployee(emp);
    setMode("form");
  };

  const handleBackToList = () => {
    setMode("list");
    setSelectedEmployee(null);
  };

  const handleFormComplete = () => {
    setSuccessMessage(
      selectedEmployee
        ? t("employee.form.successUpdate", "Empleado actualizado exitosamente")
        : t("employee.form.successCreate", "Empleado creado exitosamente")
    );
    setSuccessOpen(true);
    setRefreshFlag((f) => !f);
    handleBackToList();
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 2 }}>
          <PeopleIcon sx={{ fontSize: 40, color: "#2563eb" }} />
          <Typography variant="h4" sx={{ fontWeight: 600, color: "#1e293b" }}>
            {t("employee.page.title", "Gestión de Empleados")}
          </Typography>
        </Box>
        <Typography variant="body1" color="text.secondary">
          {mode === 'list'
            ? t("employee.page.subtitle.list", "Crea nuevos empleados o selecciona uno existente para editar sus datos y documentos.")
            : t("employee.page.subtitle.form", selectedEmployee ? "Editando datos del empleado." : "Creando un nuevo empleado.")
          }
        </Typography>
      </Box>

      {mode === "list" ? (
        <Fade in={mode === "list"}>
          <Box>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleCreateEmployee}
              size="large"
              sx={{ mb: 3, backgroundColor: "#2563eb", "&:hover": { backgroundColor: "#1d4ed8" } }}
            >
              {t("employee.page.addEmployee", "Nuevo empleado")}
            </Button>
            <EmployeeList
              refreshFlag={refreshFlag}
              selectedCompany={selectedCompany}
              onSelectedCompanyChange={setSelectedCompany}
              onEditEmployee={handleEditEmployee}
            />
          </Box>
        </Fade>
      ) : (
        <Slide direction="left" in={mode === "form"} mountOnEnter unmountOnExit>
          <Paper sx={{ p: 3 }}>
             <Button
                startIcon={<ArrowBackIcon />}
                onClick={handleBackToList}
                sx={{ mb: 2 }}
              >
                {t('common.backToList', 'Volver a la lista')}
              </Button>
            <EmployeeForm
              employee={selectedEmployee}
              onComplete={handleFormComplete}
              isEdit={!!selectedEmployee}
              initialCompanyId={selectedCompany}
            />
            <Box sx={{ mt: 3, display: "flex", justifyContent: "flex-end", gap: 2 }}>
              <Button variant="outlined" onClick={handleBackToList}>
                {t("common.cancel", "Cancelar")}
              </Button>
            </Box>
          </Paper>
        </Slide>
      )}

      <Snackbar
        open={successOpen}
        autoHideDuration={4000}
        onClose={() => setSuccessOpen(false)}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert onClose={() => setSuccessOpen(false)} severity="success" sx={{ width: "100%" }}>
          {successMessage}
        </Alert>
      </Snackbar>
    </Container>
  );
}