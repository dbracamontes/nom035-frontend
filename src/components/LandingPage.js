import React from "react";
import { Box, Typography, Paper } from "@mui/material";
import { useTranslation } from 'react-i18next';

export default function LandingPage() {
  const { t } = useTranslation();
  
  return (
    <Box sx={{ textAlign: "center", mt: 6 }}>
      <Paper elevation={3} sx={{ p: 6 }}>
        <Typography variant="h3" gutterBottom>{t("app.title")}</Typography>
        <Typography variant="h6" gutterBottom>
          {t("landing.welcomeMessage")}
        </Typography>
        <Typography variant="body1" sx={{ mt: 2 }}>
          {t("landing.platformDescription")}
        </Typography>
      </Paper>
    </Box>
  );
}