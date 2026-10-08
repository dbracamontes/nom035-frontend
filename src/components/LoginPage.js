import React, { useState } from 'react';
import { Button, TextField, Paper, Typography, Alert, Divider, Stack, ToggleButtonGroup, ToggleButton, Box } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { requestPasswordReset, confirmPasswordReset } from '../api/nom035';


function LoginPage({ onLogin }) {
  const { t } = useTranslation();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showRecovery, setShowRecovery] = useState(false);
  const [recoveryMode, setRecoveryMode] = useState('request');
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [recoveryMessage, setRecoveryMessage] = useState(null);
  const [recoveryError, setRecoveryError] = useState(null);
  const [recoveryLoading, setRecoveryLoading] = useState(false);
  const [resetToken, setResetToken] = useState('');
  const [resetPasswordValue, setResetPasswordValue] = useState('');
  const [resetPasswordConfirm, setResetPasswordConfirm] = useState('');
  const [generatedToken, setGeneratedToken] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const result = await onLogin(username, password);
    setLoading(false);
    if (!result.success) {
      setError(result.error || t('login.authError', 'Error de autenticación'));
    }
  };

  const handleRecoveryAction = async () => {
    setRecoveryLoading(true);
    setRecoveryMessage(null);
    setRecoveryError(null);
    try {
      if (recoveryMode === 'request') {
        const response = await requestPasswordReset(recoveryEmail.trim());
        setGeneratedToken(response.data?.token || null);
        const expiresAt = response.data?.expiresAt ? new Date(response.data.expiresAt).toLocaleString() : null;
        setRecoveryMessage(expiresAt ? t('login.tokenGeneratedExpires', 'Token generado. Expira el {{date}}.', { date: expiresAt }) : t('login.tokenGenerated', 'Token generado correctamente.'));
      } else {
        if (resetPasswordValue !== resetPasswordConfirm) {
          throw new Error(t('login.passwordMismatch', 'Las contraseñas no coinciden'));
        }
        await confirmPasswordReset(resetToken.trim(), resetPasswordValue);
        setRecoveryMessage(t('login.passwordResetSuccess', 'Contraseña restablecida. Ya puedes iniciar sesión con la nueva contraseña.'));
        setGeneratedToken(null);
        setResetToken('');
        setResetPasswordValue('');
        setResetPasswordConfirm('');
      }
    } catch (err) {
      const message = err.response?.data?.message || err.message || t('login.operationFailed', 'No se pudo completar la operación');
      setRecoveryError(message);
    } finally {
      setRecoveryLoading(false);
    }
  };

  const isRecoveryActionDisabled = () => {
    if (recoveryMode === 'request') {
      return !recoveryEmail || recoveryLoading;
    }
    return !resetToken || !resetPasswordValue || !resetPasswordConfirm || recoveryLoading;
  };

  return (
    <Paper elevation={3} style={{ maxWidth: 350, margin: '80px auto', padding: 32 }}>
      <Typography variant="h5" align="center" gutterBottom>{t('login.title', 'Iniciar sesión')}</Typography>
      {error && <Alert severity="error">{error}</Alert>}
      <form onSubmit={handleSubmit}>
        <TextField
          label={t('login.userOrEmail', 'Usuario o correo electrónico')}
          value={username}
          onChange={e => setUsername(e.target.value)}
          fullWidth
          margin="normal"
          autoFocus
        />
        <TextField
          label={t('login.password', 'Contraseña')}
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          fullWidth
          margin="normal"
        />
        <Button
          type="submit"
          variant="contained"
          color="primary"
          fullWidth
          sx={(theme) => ({
            mt: 2,
            color: '#fff',
            backgroundColor: theme.palette.primary.main,
            transition: 'background-color 0.3s',
            '&:hover': {
              backgroundColor: theme.palette.secondary.main
            }
          })}
          disabled={loading}
        >
          {loading ? t('login.signingIn', 'Entrando...') : t('login.signIn', 'Entrar')}
        </Button>
      </form>

      <Divider sx={{ my: 3 }}>
        <Button
          size="small"
          onClick={() =>
            setShowRecovery((prev) => {
              const next = !prev;
              if (!next) {
                setRecoveryMode('request');
                setRecoveryEmail('');
                setRecoveryMessage(null);
                setRecoveryError(null);
                setGeneratedToken(null);
                setResetToken('');
                setResetPasswordValue('');
                setResetPasswordConfirm('');
              }
              return next;
            })
          }
        >
          {showRecovery ? t('login.hideRecovery', 'Ocultar recuperación') : t('login.forgotPassword', '¿Olvidaste tu contraseña?')}
        </Button>
      </Divider>

      {showRecovery && (
        <Box>
          <Typography variant="subtitle1" gutterBottom>{t('login.recoveryTitle', 'Recuperación de contraseña')}</Typography>
          <ToggleButtonGroup
            value={recoveryMode}
            exclusive
            onChange={(_, value) => {
              if (!value) return;
              setRecoveryMode(value);
              setRecoveryMessage(null);
              setRecoveryError(null);
              if (value === 'request') {
                setResetToken('');
                setResetPasswordValue('');
                setResetPasswordConfirm('');
              } else {
                setGeneratedToken(null);
                setRecoveryEmail('');
              }
            }}
            fullWidth
            size="small"
            sx={{ mb: 2 }}
          >
            <ToggleButton value="request"            >{t('login.requestToken', 'Solicitar token')}</ToggleButton>
                        <ToggleButton value="confirm">{t('login.reset', 'Restablecer')}</ToggleButton>
          </ToggleButtonGroup>

          <Stack spacing={2}>
            {recoveryMode === 'request' ? (
              <>
                <TextField
                  label={t('login.email', 'Correo electrónico')}
                  type="email"
                  value={recoveryEmail}
                  onChange={e => setRecoveryEmail(e.target.value)}
                  fullWidth
                />
                {generatedToken && (
                  <Alert severity="info">
                    <Typography variant="body2" fontWeight={600}>Token: {generatedToken}</Typography>
                    <Typography variant="caption">{t('login.shareTokenHint', 'Comparte este token con el usuario o úsalo en el formulario de restablecimiento.')}</Typography>
                  </Alert>
                )}
              </>
            ) : (
              <>
                <TextField
                  label={t('login.recoveryToken', 'Token de recuperación')}
                  value={resetToken}
                  onChange={e => setResetToken(e.target.value)}
                  fullWidth
                />
                <TextField
                  label={t('login.newPassword', 'Nueva contraseña')}
                  type="password"
                  value={resetPasswordValue}
                  onChange={e => setResetPasswordValue(e.target.value)}
                  fullWidth
                />
                <TextField
                  label={t('login.confirmPassword', 'Confirmar contraseña')}
                  type="password"
                  value={resetPasswordConfirm}
                  onChange={e => setResetPasswordConfirm(e.target.value)}
                  fullWidth
                />
              </>
            )}

            {recoveryError && <Alert severity="error">{recoveryError}</Alert>}
            {recoveryMessage && <Alert severity="success">{recoveryMessage}</Alert>}

            <Button
              variant="outlined"
              onClick={handleRecoveryAction}
              disabled={isRecoveryActionDisabled()}
            >
              {recoveryLoading ? t('login.processing', 'Procesando...') : (recoveryMode === 'request' ? t('login.generateToken', 'Generar token') : t('login.resetPassword', 'Restablecer contraseña'))}
            </Button>
          </Stack>
        </Box>
      )}
    </Paper>
  );
}

export default LoginPage;
