import React, { useContext } from "react";
import { Box, Typography, Paper, Button } from "@mui/material";
import { useTranslation } from 'react-i18next';
import { UserContext } from "../context/UserContext";

export default function LandingPage() {
  const { t } = useTranslation();
  const { user, logout } = useContext(UserContext);

  return (
    <Box sx={{ textAlign: "center", mt: 6 }}>
      <Paper elevation={3} sx={{ p: 6 }}>
        <Typography variant="h3" gutterBottom>{t("app.title")}</Typography>
        <Typography variant="h6" gutterBottom>
          {user ? `¡Bienvenido, ${user.name || user.username || user.email || "Usuario"}!` : t("landing.welcomeMessage")}
        </Typography>
        <Typography variant="body1" sx={{ mt: 2 }}>
          {t("landing.platformDescription")}
        </Typography>
        {/* Botón de cerrar sesión removido, ahora está en la AppBar */}
      </Paper>
    </Box>
  );
}