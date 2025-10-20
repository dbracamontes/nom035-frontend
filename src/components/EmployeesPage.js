import React, { useRef, useState } from "react";
import { Button, Dialog, DialogTitle, DialogContent, DialogActions } from "@mui/material";
import EmployeeForm from "./EmployeeForm";
import EmployeeList from "./EmployeeList";
import { useTranslation } from 'react-i18next';

export default function EmployeesPage() {
  const { t } = useTranslation();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const formCreateRef = useRef();
  const [refreshFlag, setRefreshFlag] = useState(false);

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
      <EmployeeList refreshFlag={refreshFlag} />
      <Dialog open={createDialogOpen} onClose={handleCreateClose} maxWidth="sm" fullWidth>
        <DialogTitle>{t("employee.page.addEmployee")}</DialogTitle>
        <DialogContent>
          <EmployeeForm ref={formCreateRef} employee={null} onComplete={handleCreateComplete} isEdit={false} />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCreateClose}>{t("common.cancel")}</Button>
          <Button onClick={handleGuardarCrear} variant="contained">{t("common.save")}</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
