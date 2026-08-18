import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import DocumentsPage from './DocumentsPage';
import { getDocumentCenterDocuments } from '../api/nom035';

jest.mock('axios', () => ({
  get: jest.fn(),
  put: jest.fn(),
}));

jest.mock('../api/nom035', () => ({
  getDocumentCenterDocuments: jest.fn(() => Promise.resolve({ data: [] })),
}));

test('renders document center overview and empty state when the backend has no documents', async () => {
  render(<DocumentsPage />);

  expect(screen.getByText(/Centro de Documentos/i)).toBeInTheDocument();

  await waitFor(() => {
    expect(screen.getByLabelText(/Buscar documento/i)).toBeInTheDocument();
  });

  await waitFor(() => {
    expect(screen.getByText(/No se encontraron documentos con los filtros aplicados\./i)).toBeInTheDocument();
  });
});

test('allows approving only documents that require validation', async () => {
  getDocumentCenterDocuments.mockResolvedValue({
    data: [
      {
        id: 21,
        title: 'Comprobante de domicilio',
        division: 'TechNova SA',
        module: 'General',
        category: 'Comprobante de Domicilio',
        status: 'Pendiente',
        owner: 'Ana García',
        uploadedAt: '2026-08-13',
        fileType: 'PDF',
        size: '200 KB',
        relatedTo: 'Empresa: TechNova SA',
        tags: ['documento'],
        security: 'Interno',
        previewText: 'Vista previa del comprobante de domicilio.',
        source: 'EMPLOYEE_DOC',
        requiresApproval: true,
        downloadUrl: '/api/employees/42/documents/21/file',
        previewUrl: '/api/employees/42/documents/21/file',
      },
      {
        id: 99,
        title: 'Contrato generado',
        division: 'TechNova SA',
        module: 'Contratos',
        category: 'Contrato',
        status: 'Aprobado',
        owner: 'Sistema',
        uploadedAt: '2026-08-13',
        fileType: 'PDF',
        size: '600 KB',
        relatedTo: 'Cliente: TechNova SA',
        tags: ['contrato'],
        security: 'Interno',
        previewText: 'Contrato generado para revisión documental.',
        source: 'DOCUMENT_JOB',
        requiresApproval: false,
        downloadUrl: '/api/docgen/99/download/pdf',
        previewUrl: '/api/docgen/99/preview',
      },
    ],
  });

  render(<DocumentsPage />);

  await waitFor(() => {
    expect(screen.getByText('Comprobante de domicilio')).toBeInTheDocument();
  });

  const approveButtons = screen.getAllByRole('button', { name: /Aprobar/i });
  expect(approveButtons.length).toBeGreaterThan(0);
  fireEvent.click(approveButtons[0]);

  await waitFor(() => {
    expect(screen.getAllByText('Aprobado').length).toBeGreaterThan(0);
  });

  expect(screen.queryByRole('button', { name: /Aprobar documento/i })).not.toBeInTheDocument();
});
