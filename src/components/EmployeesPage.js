import React, { useRef, useState, useEffect, useContext } from "react";
import { Button, Dialog, DialogTitle, DialogContent, DialogActions, Snackbar, Alert } from "@mui/material";
import EmployeeForm from "./EmployeeForm";
import EmployeeList from "./EmployeeList";
import { UserContext } from "../context/UserContext";
import { useTranslation } from 'react-i18next';

export default function EmployeesPage() {
  const { t } = useTranslation();
  const { user } = useContext(UserContext);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const formCreateRef = useRef();
  const [refreshFlag, setRefreshFlag] = useState(false);
  const [successOpen, setSuccessOpen] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState("");

  // Initialize selectedCompany for admin from first load of list (EmployeeList will also adjust). For company role set companyId.
  useEffect(() => {
    if (user && user.roles && user.roles.some(r => r.authority === 'ROLE_COMPANY')) {
      const cid = String(user.companyId || (user.company && user.company.id) || '');
      if (cid) setSelectedCompany(cid);
    }
  }, [user]);

  const handleCreateOpen = () => {
    setCreateDialogOpen(true);
  };

  const handleCreateClose = () => {
    setCreateDialogOpen(false);
    if (formCreateRef.current) {
      formCreateRef.current.resetForm && formCreateRef.current.resetForm();
    }
  };

  const handleCreateComplete = () => {
    setCreateDialogOpen(false);
    setRefreshFlag(f => !f);
    setSuccessOpen(true);
  };

  const handleGuardarCrear = () => {
    if (formCreateRef.current) {
      formCreateRef.current.submitForm();
    }
  };

  return (
    <>
      <Button variant="contained" color="primary" sx={{ mb: 2 }} onClick={handleCreateOpen}>
        {t("employee.page.addEmployee")}
      </Button>
      <EmployeeList
        refreshFlag={refreshFlag}
        selectedCompany={selectedCompany}
        onSelectedCompanyChange={setSelectedCompany}
      />
      <Dialog open={createDialogOpen} onClose={handleCreateClose} maxWidth="sm" fullWidth>
        <DialogTitle>{t("employee.page.addEmployee")}</DialogTitle>
        <DialogContent>
          <EmployeeForm ref={formCreateRef} employee={null} onComplete={handleCreateComplete} isEdit={false} initialCompanyId={selectedCompany} />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCreateClose}>{t("common.cancel")}</Button>
          <Button onClick={handleGuardarCrear} variant="contained">{t("common.save")}</Button>
        </DialogActions>
      </Dialog>
      <Snackbar open={successOpen} autoHideDuration={3000} onClose={() => setSuccessOpen(false)} anchorOrigin={{ vertical: 'top', horizontal: 'center' }}>
        <Alert onClose={() => setSuccessOpen(false)} severity="success" sx={{ width: '100%' }}>
          {t("employee.form.success", "Empleado agregado exitosamente")}
        </Alert>
      </Snackbar>
    </>
  );
}