import React from "react";
import { Box, Typography, Paper } from "@mui/material";

export default function LandingPage() {
  return (
    <Box sx={{ textAlign: "center", mt: 6 }}>
      <Paper elevation={3} sx={{ p: 6 }}>
        <Typography variant="h3" gutterBottom>NOM-035 Survey Platform</Typography>
        <Typography variant="h6" gutterBottom>
          Welcome! Use the sidebar to manage employees, surveys, answers, and view analytics.
        </Typography>
        <Typography variant="body1" sx={{ mt: 2 }}>
          This platform helps organizations comply with NOM-035 by enabling survey management, employee well-being tracking, and risk analytics.
        </Typography>
      </Paper>
    </Box>
  );
}