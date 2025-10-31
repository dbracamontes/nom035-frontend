import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    primary: {
      main: '#06b6d4', // cyan
      light: '#8b5cf6', // purple
      dark: '#6366f1', // indigo
      contrastText: '#fff',
    },
    secondary: {
      main: '#8b5cf6', // purple
      contrastText: '#fff',
    },
    background: {
      default: '#f8fafc',
      paper: '#fff',
    },
  },
});

export default theme;
