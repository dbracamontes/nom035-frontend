# NOM-035 Frontend

React + MUI frontend for NOM-035 backend.

## Features

- Sidebar navigation (Dashboard, Employees, Surveys, Answer Survey, Responses)
- Dashboard with charts and export (Excel, PDF)
- Employee management (create/list)
- Survey management (create/list, dynamic questions)
- Survey answering
- Responses table with export

## Dependencies

- React
- @mui/material @mui/icons-material
- axios
- recharts
- xlsx, file-saver
- jsPDF, jspdf-autotable
- @mui/x-data-grid

## Run

1. `npm install`
2. `npm start`

## API

- Connects to backend at `http://localhost:8080/api`