import React, { useState } from 'react';
import { Button, TextField, Paper, Typography, Alert } from '@mui/material';

function LoginPage({ onLogin, error }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    onLogin(username, password);
  };

  return (
    <Paper elevation={3} style={{ maxWidth: 350, margin: '80px auto', padding: 32 }}>
      <Typography variant="h5" align="center" gutterBottom>Iniciar sesión</Typography>
      {error && <Alert severity="error">{error}</Alert>}
      <form onSubmit={handleSubmit}>
        <TextField
          label="Usuario"
          value={username}
          onChange={e => setUsername(e.target.value)}
          fullWidth
          margin="normal"
          autoFocus
        />
        <TextField
          label="Contraseña"
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          fullWidth
          margin="normal"
        />
        <Button type="submit" variant="contained" color="primary" fullWidth sx={{ mt: 2 }}>
          Entrar
        </Button>
      </form>
    </Paper>
  );
}

export default LoginPage;
