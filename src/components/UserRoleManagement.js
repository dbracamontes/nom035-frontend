import React, { useContext, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  FormControl,
  IconButton,
  InputAdornment,
  InputLabel,
  ListItemText,
  MenuItem,
  OutlinedInput,
  TextField,
  Paper,
  Select,
  Snackbar,
  Stack,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography
} from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";
import SaveIcon from "@mui/icons-material/Save";
import KeyIcon from "@mui/icons-material/Key";
import LockResetIcon from "@mui/icons-material/LockReset";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import PasswordIcon from "@mui/icons-material/Password";
import {
  generateTemporaryPassword,
  getRolesCatalog,
  getUsersWithRoles,
  requestPasswordReset,
  updateUserRoles,
  getEmployees
} from "../api/nom035";
import { useTranslation } from "react-i18next";
import { UserContext } from "../context/UserContext";
import SearchIcon from "@mui/icons-material/Search";

const ITEM_HEIGHT = 48;
const ITEM_PADDING_TOP = 8;
const MenuProps = {
  PaperProps: {
    style: {
      maxHeight: ITEM_HEIGHT * 4.5 + ITEM_PADDING_TOP,
      width: 260
    }
  }
};

function createRow(user, employeeLookup) {
  const normalizedCompanyId = user.companyId !== null && user.companyId !== undefined
    ? Number(user.companyId)
    : null;

  const byId = employeeLookup.byId || {};
  const byEmail = employeeLookup.byEmail || {};
  const employeeFromId = user.employeeId != null ? byId[user.employeeId] : null;
  const employeeFromEmail = user.email ? byEmail[user.email.toLowerCase()] : null;
  const employee = employeeFromId || employeeFromEmail || null;

  const employeeCompanyId = employee && (employee.companyId ?? (employee.company && employee.company.id));
  const companyId = normalizedCompanyId !== null ? normalizedCompanyId : (employeeCompanyId !== undefined && employeeCompanyId !== null ? Number(employeeCompanyId) : null);
  const companyName = user.companyName ?? employee?.company?.name ?? null;
  const employeeName = user.employeeName || employee?.name || null;
  const resolvedEmployeeId = user.employeeId ?? employee?.id ?? null;

  return {
    data: user,
    selectedRoles: (user.roles || []).map((role) => role.id),
    companyId,
    companyName,
    displayName: employeeName || user.username,
    employeeId: resolvedEmployeeId,
    employeeName,
    department: employee?.department || "",
    position: employee?.position || "",
    enabled: user.enabled,
    busy: false,
    dirty: false
  };
}

export default function UserRoleManagement() {
  const { t } = useTranslation();
  const { user: currentUser } = useContext(UserContext);
  const [rows, setRows] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });
  const [passwordDialog, setPasswordDialog] = useState({ open: false, user: null, password: "" });
  const [resetDialog, setResetDialog] = useState({ open: false, token: "", expiresAt: null });
  const [manualPasswordDialog, setManualPasswordDialog] = useState({ open: false, user: null, value: "", confirm: "" });
  const [searchTerm, setSearchTerm] = useState("");

  const hasData = useMemo(() => rows.length > 0, [rows]);
  const filteredRows = useMemo(() => {
    if (!searchTerm) {
      return rows;
    }
    const term = searchTerm.toLowerCase();
    return rows.filter((row) => {
      const haystack = [
        row.displayName,
        row.data?.username,
        row.data?.email,
        row.companyName,
        row.department,
        row.position
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(term);
    });
  }, [rows, searchTerm]);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [usersRes, rolesRes, employeesRes] = await Promise.all([
        getUsersWithRoles(),
        getRolesCatalog(),
        getEmployees()
      ]);

      const employeeLookup = { byEmail: {}, byId: {} };
      (employeesRes.data || []).forEach((employee) => {
        if (employee && employee.email) {
          employeeLookup.byEmail[employee.email.toLowerCase()] = employee;
        }
        if (employee && employee.id !== undefined && employee.id !== null) {
          employeeLookup.byId[employee.id] = employee;
        }
      });

      setRows(usersRes.data.map((user) => createRow(user, employeeLookup)));
      setRoles(rolesRes.data || []);
    } catch (err) {
      console.error("Error loading users/roles", err);
      setError(t("users.errors.load"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRoleChange = (userId, newRoleIds) => {
    setRows((prev) =>
      prev.map((row) =>
        row.data.id === userId
          ? { ...row, selectedRoles: newRoleIds, dirty: true }
          : row
      )
    );
  };

  const handleEnabledToggle = (userId, enabled) => {
    setRows((prev) =>
      prev.map((row) =>
        row.data.id === userId ? { ...row, enabled, dirty: true } : row
      )
    );
  };

  const handleSave = async (row) => {
    setRows((prev) =>
      prev.map((current) =>
        current.data.id === row.data.id ? { ...current, busy: true } : current
      )
    );
    try {
      await updateUserRoles(row.data.id, {
        roleIds: row.selectedRoles,
        enabled: row.enabled,
        companyId: row.companyId
      });
      setSnackbar({
        open: true,
        message: t("users.feedback.updated"),
        severity: "success"
      });
      await loadData();
    } catch (err) {
      console.error("Error updating user roles", err);
      setSnackbar({
        open: true,
        message: t("users.errors.update"),
        severity: "error"
      });
      setRows((prev) =>
        prev.map((current) =>
          current.data.id === row.data.id ? { ...current, busy: false } : current
        )
      );
    }
  };

  const handleGeneratePassword = async (row) => {
    setRows((prev) =>
      prev.map((current) =>
        current.data.id === row.data.id ? { ...current, busy: true } : current
      )
    );
    try {
      const response = await generateTemporaryPassword(row.data.id);
      const { temporaryPassword } = response.data;
      setPasswordDialog({
        open: true,
        user: row.data,
        password: temporaryPassword
      });
      setSnackbar({
        open: true,
        message: t("users.feedback.passwordGenerated"),
        severity: "success"
      });
    } catch (err) {
      console.error("Error generating password", err);
      setSnackbar({
        open: true,
        message: t("users.errors.generatePassword"),
        severity: "error"
      });
    } finally {
      setRows((prev) =>
        prev.map((current) =>
          current.data.id === row.data.id ? { ...current, busy: false } : current
        )
      );
    }
  };

  const handleOpenManualPassword = (row) => {
    setManualPasswordDialog({ open: true, user: row, value: "", confirm: "" });
  };

  const handleManualPasswordSubmit = async () => {
    if (!manualPasswordDialog.value || manualPasswordDialog.value.length < 6) {
      setSnackbar({
        open: true,
        message: t("users.errors.manualPasswordLength"),
        severity: "warning"
      });
      return;
    }
    if (manualPasswordDialog.value !== manualPasswordDialog.confirm) {
      setSnackbar({
        open: true,
        message: t("users.errors.manualPasswordMismatch"),
        severity: "warning"
      });
      return;
    }

    const row = manualPasswordDialog.user;
    setRows((prev) =>
      prev.map((current) =>
        current.data.id === row.data.id ? { ...current, busy: true } : current
      )
    );

    try {
      await updateUserRoles(row.data.id, {
        roleIds: row.selectedRoles,
        enabled: row.enabled,
        companyId: row.companyId,
        password: manualPasswordDialog.value
      });

      if (currentUser?.username && currentUser.username === row.data.username) {
        const newAuth = window.btoa(`${row.data.username}:${manualPasswordDialog.value}`);
        sessionStorage.setItem("auth", newAuth);
      }

      setSnackbar({
        open: true,
        message: t("users.feedback.manualPasswordSet"),
        severity: "success"
      });
      setManualPasswordDialog({ open: false, user: null, value: "", confirm: "" });
      await loadData();
    } catch (err) {
      console.error("Error setting manual password", err);
      setSnackbar({
        open: true,
        message: t("users.errors.manualPassword"),
        severity: "error"
      });
      setRows((prev) =>
        prev.map((current) =>
          current.data.id === row.data.id ? { ...current, busy: false } : current
        )
      );
    }
  };

  const handleRequestReset = async (row) => {
    if (!row.data.email) {
      setSnackbar({
        open: true,
        message: t("users.errors.emailRequired"),
        severity: "warning"
      });
      return;
    }
    setRows((prev) =>
      prev.map((current) =>
        current.data.id === row.data.id ? { ...current, busy: true } : current
      )
    );
    try {
      const response = await requestPasswordReset(row.data.email);
      setResetDialog({
        open: true,
        token: response.data ? response.data.token : "",
        expiresAt: response.data ? response.data.expiresAt : null
      });
      setSnackbar({
        open: true,
        message: t("users.feedback.resetLink"),
        severity: "info"
      });
    } catch (err) {
      console.error("Error requesting password reset", err);
      setSnackbar({
        open: true,
        message: t("users.errors.requestReset"),
        severity: "error"
      });
    } finally {
      setRows((prev) =>
        prev.map((current) =>
          current.data.id === row.data.id ? { ...current, busy: false } : current
        )
      );
    }
  };

  const handleCopy = async (value) => {
    try {
      await navigator.clipboard.writeText(value);
      setSnackbar({ open: true, message: t("users.feedback.copied"), severity: "success" });
    } catch (err) {
      console.error("Clipboard error", err);
      setSnackbar({ open: true, message: t("users.errors.copy"), severity: "error" });
    }
  };

  return (
    <Box>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={2}
        justifyContent="space-between"
        alignItems={{ xs: "flex-start", sm: "center" }}
        mb={2}
      >
        <Typography variant="h5" fontWeight={600} sx={{ flexGrow: 1 }}>
          {t("users.title")}
        </Typography>
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={1}
          alignItems={{ xs: "stretch", sm: "center" }}
          sx={{ width: { xs: "100%", sm: "auto" } }}
        >
          <TextField
            size="small"
            type="search"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder={t("users.labels.search")}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" color="action" />
                </InputAdornment>
              )
            }}
            sx={{ minWidth: { xs: "100%", sm: 240 } }}
          />
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={loadData}
            disabled={loading}
            sx={{ whiteSpace: "nowrap" }}
          >
            {t("users.actions.refresh")}
          </Button>
        </Stack>
      </Stack>

      {loading && (
        <Box display="flex" justifyContent="center" py={4}>
          <CircularProgress />
        </Box>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {!loading && !hasData && !error && (
        <Alert severity="info" sx={{ mb: 2 }}>
          {t("users.empty")}
        </Alert>
      )}

      {!loading && hasData && (
        <TableContainer component={Paper}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>{t("users.columns.username")}</TableCell>
                <TableCell>{t("users.columns.email")}</TableCell>
                <TableCell>{t("users.columns.company")}</TableCell>
                <TableCell>{t("users.columns.roles")}</TableCell>
                <TableCell>{t("users.columns.enabled")}</TableCell>
                <TableCell align="right">{t("users.columns.actions")}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredRows.map((row) => (
                <TableRow key={row.data.id} hover>
                  <TableCell sx={{ minWidth: 180 }}>
                    <Typography fontWeight={600}>{row.displayName}</Typography>
                    {row.data.username && row.data.username !== row.displayName && (
                      <Typography variant="caption" color="text.secondary">
                        {row.data.username}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell sx={{ minWidth: 200 }}>
                    <Typography>{row.data.email || t("users.labels.noEmail")}</Typography>
                  </TableCell>
                  <TableCell sx={{ minWidth: 220 }}>
                    <Typography>{row.companyName || t("users.labels.noCompany")}</Typography>
                    {(row.department || row.position) && (
                      <Typography variant="caption" color="text.secondary">
                        {[row.department, row.position].filter(Boolean).join(" • ")}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <FormControl size="small" fullWidth>
                      <InputLabel>{t("users.labels.selectRoles")}</InputLabel>
                      <Select
                        multiple
                        value={row.selectedRoles}
                        onChange={(event) => handleRoleChange(row.data.id, event.target.value)}
                        input={<OutlinedInput label={t("users.labels.selectRoles")} />}
                        renderValue={(selected) => (
                          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                            {selected.map((value) => {
                              const role = roles.find((r) => r.id === value);
                              return (
                                <Chip key={value} label={role ? role.name : value} size="small" />
                              );
                            })}
                          </Box>
                        )}
                        MenuProps={MenuProps}
                      >
                        {roles.map((role) => (
                          <MenuItem key={role.id} value={role.id}>
                            <ListItemText primary={role.name} secondary={role.privileges?.map((p) => p.name).join(", ") || ""} />
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={row.enabled}
                      onChange={(event) => handleEnabledToggle(row.data.id, event.target.checked)}
                      color="primary"
                    />
                  </TableCell>
                  <TableCell align="right">
                    <Stack direction="row" spacing={1} justifyContent="flex-end">
                      <Tooltip title={t("users.actions.manualPassword")}>
                        <span>
                          <IconButton
                            size="small"
                            color="primary"
                            onClick={() => handleOpenManualPassword(row)}
                            disabled={row.busy}
                          >
                            <PasswordIcon fontSize="small" />
                          </IconButton>
                        </span>
                      </Tooltip>
                      <Tooltip title={t("users.actions.generatePassword")}>
                        <span>
                          <IconButton
                            size="small"
                            color="primary"
                            onClick={() => handleGeneratePassword(row)}
                            disabled={row.busy}
                          >
                            <KeyIcon fontSize="small" />
                          </IconButton>
                        </span>
                      </Tooltip>
                      <Tooltip title={t("users.actions.requestReset")}
                        >
                        <span>
                          <IconButton
                            size="small"
                            color="secondary"
                            onClick={() => handleRequestReset(row)}
                            disabled={row.busy || !row.data.email}
                          >
                            <LockResetIcon fontSize="small" />
                          </IconButton>
                        </span>
                      </Tooltip>
                      <Tooltip title={t("users.actions.save")}
                        >
                        <span>
                          <IconButton
                            size="small"
                            color="success"
                            onClick={() => handleSave(row)}
                            disabled={row.busy || !row.dirty}
                          >
                            {row.busy ? (
                              <CircularProgress size={18} />
                            ) : (
                              <SaveIcon fontSize="small" />
                            )}
                          </IconButton>
                        </span>
                      </Tooltip>
                    </Stack>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Dialog
        open={passwordDialog.open}
        onClose={() => setPasswordDialog({ open: false, user: null, password: "" })}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>{t("users.dialogs.passwordTitle")}</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            {t("users.dialogs.passwordBody", { username: passwordDialog.user?.username || "" })}
          </DialogContentText>
          <Paper variant="outlined" sx={{ p: 2, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <Typography fontFamily="monospace" fontSize={18} fontWeight={600}>
              {passwordDialog.password}
            </Typography>
            <Tooltip title={t("users.actions.copy")}
              >
              <IconButton onClick={() => handleCopy(passwordDialog.password)}>
                <ContentCopyIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Paper>
          <Alert severity="warning" sx={{ mt: 2 }}>
            {t("users.dialogs.passwordWarning")}
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPasswordDialog({ open: false, user: null, password: "" })}>
            {t("common.cancel")}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={resetDialog.open}
        onClose={() => setResetDialog({ open: false, token: "", expiresAt: null })}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>{t("users.dialogs.resetTitle")}</DialogTitle>
        <DialogContent>
          <DialogContentText>
            {t("users.dialogs.resetBody")}
          </DialogContentText>
          {resetDialog.token && (
            <Paper variant="outlined" sx={{ p: 2, mt: 2, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <Box>
                <Typography fontFamily="monospace" fontSize={16} fontWeight={600}>
                  {resetDialog.token}
                </Typography>
                {resetDialog.expiresAt && (
                  <Typography variant="caption" color="text.secondary">
                    {t("users.labels.expires", { value: new Date(resetDialog.expiresAt).toLocaleString() })}
                  </Typography>
                )}
              </Box>
              <Tooltip title={t("users.actions.copy")}
                >
                <IconButton onClick={() => handleCopy(resetDialog.token)}>
                  <ContentCopyIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Paper>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setResetDialog({ open: false, token: "", expiresAt: null })}>
            {t("common.cancel")}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={manualPasswordDialog.open}
        onClose={() => setManualPasswordDialog({ open: false, user: null, value: "", confirm: "" })}
        maxWidth="sm"
        fullWidth
      >
  <DialogTitle>{t("users.dialogs.manualPasswordTitle", { username: manualPasswordDialog.user?.displayName || manualPasswordDialog.user?.data.username || "" })}</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            {t("users.dialogs.manualPasswordBody")}
          </DialogContentText>
          <Stack spacing={2}>
            <TextField
              label={t("users.dialogs.manualPasswordLabel")}
              type="password"
              value={manualPasswordDialog.value}
              onChange={(event) =>
                setManualPasswordDialog((prev) => ({ ...prev, value: event.target.value }))
              }
              fullWidth
              autoFocus
            />
            <TextField
              label={t("users.dialogs.manualPasswordConfirm")}
              type="password"
              value={manualPasswordDialog.confirm}
              onChange={(event) =>
                setManualPasswordDialog((prev) => ({ ...prev, confirm: event.target.value }))
              }
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setManualPasswordDialog({ open: false, user: null, value: "", confirm: "" })}>
            {t("common.cancel")}
          </Button>
          <Button onClick={handleManualPasswordSubmit} variant="contained">
            {t("users.dialogs.manualPasswordSave")}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
          severity={snackbar.severity}
          sx={{ width: "100%" }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
