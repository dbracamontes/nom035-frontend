import React from 'react';
import {
  Box,
  Button,
  Card,
  CardActions,
  CircularProgress,
  Stack,
  Typography,
} from '@mui/material';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';

export default function MedicaLebenConsultoriaPage() {
  const iframeRef = React.useRef(null);
  const [iframeLoaded, setIframeLoaded] = React.useState(false);
  const [iframeError, setIframeError] = React.useState(false);

  const handleIframeLoad = React.useCallback(() => {
    setIframeLoaded(true);
    setIframeError(false);
  }, []);

  const handleIframeError = React.useCallback(() => {
    setIframeLoaded(false);
    setIframeError(true);
  }, []);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Card variant="outlined">
        <CardActions sx={{ px: 2, py: 1.5, justifyContent: 'flex-start' }}>
          <Button
            size="small"
            variant="contained"
            startIcon={<OpenInNewIcon />}
            href="/sistema-consultoria/app_creditos.html"
            target="_blank"
            rel="noopener noreferrer"
            sx={(theme) => ({
              color: '#fff',
              backgroundColor: theme.palette.primary.main,
              transition: 'background-color 0.3s',
              '&:hover': {
                backgroundColor: theme.palette.secondary.main,
              },
              fontWeight: 700,
            })}
          >
            Abrir en pestaña nueva
          </Button>
        </CardActions>
      </Card>

      <Card variant="outlined" sx={{ overflow: 'hidden', position: 'relative' }}>
        {!iframeLoaded && !iframeError && (
          <Stack
            spacing={1}
            alignItems="center"
            justifyContent="center"
            sx={{
              position: 'absolute',
              inset: 0,
              backgroundColor: 'rgba(255,255,255,0.92)',
              zIndex: 1,
            }}
          >
            <CircularProgress size={24} />
            <Typography variant="body2" color="text.secondary">
              Cargando Sistema Consultoría...
            </Typography>
          </Stack>
        )}
        {iframeError && (
          <Box sx={{ p: 2 }}>
            <Typography variant="body2" color="error.main">
              No se pudo cargar el módulo embebido. Verifica que exista /sistema-consultoria/app_creditos.html y recarga.
            </Typography>
          </Box>
        )}
        <Box
          component="iframe"
          ref={iframeRef}
          title="Sistema Consultoría Médica Leben"
          src="/sistema-consultoria/app_creditos.html"
          onLoad={handleIframeLoad}
          onError={handleIframeError}
          sx={{
            width: '100%',
            minHeight: '72vh',
            border: 0,
            display: 'block',
            backgroundColor: '#fff',
          }}
        />
      </Card>
    </Box>
  );
}
