import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import EmployeeForm from './EmployeeForm';
import { UserContext } from '../context/UserContext';

jest.mock('../context/UserContext', () => {
  const React = require('react');
  return {
    UserContext: React.createContext({ user: { roles: [{ authority: 'ROLE_ADMIN' }] } }),
  };
});

jest.mock('../api/nom035', () => ({
  createEmployee: jest.fn(),
  updateEmployee: jest.fn(),
  getCompanies: jest.fn(),
  getEmployeeDocs: jest.fn(),
  createEmployeeDoc: jest.fn(),
  uploadEmployeeDocFile: jest.fn(),
  deleteEmployeeDocFile: jest.fn(),
  getDocumentTypes: jest.fn(),
  downloadEmployeeDocFile: jest.fn(),
}));

const { getCompanies, getEmployeeDocs, getDocumentTypes, createEmployeeDoc, uploadEmployeeDocFile } = require('../api/nom035');
const mockUser = { user: { roles: [{ authority: 'ROLE_ADMIN' }] } };

describe('EmployeeForm document flow', () => {
  beforeEach(() => {
    getCompanies.mockResolvedValue({ data: [{ id: 1, name: 'TechNova SA' }] });
    getEmployeeDocs.mockResolvedValue({ data: [] });
    getDocumentTypes.mockResolvedValue({
      data: [{ id: 1, name: 'Constancia de Situación Fiscal' }],
    });
    createEmployeeDoc.mockResolvedValue({
      data: { id: 77, employeeId: 42, typeId: 1, name: 'Constancia de Situación Fiscal', hasFile: false },
    });
    uploadEmployeeDocFile.mockResolvedValue({ data: { ok: true } });
  });

  test('shows ready-to-upload state when a file is selected before the doc record exists', async () => {
    render(
      <UserContext.Provider value={mockUser}>
        <EmployeeForm employee={{ id: 42, name: 'Ana', email: 'ana@example.com', companyId: 1 }} isEdit />
      </UserContext.Provider>
    );

    await waitFor(() => {
      expect(screen.getByText('Constancia de Situación Fiscal')).toBeInTheDocument();
    });

    const file = new File(['hello'], 'constancia.pdf', { type: 'application/pdf' });
    const input = document.querySelector('input[type="file"]');
    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByText('Listo para subir')).toBeInTheDocument();
    });

    expect(screen.getByRole('button', { name: /Guardar Documentos/i })).not.toBeDisabled();
  });
});
